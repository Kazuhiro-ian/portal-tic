package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.Armazem;
import portal.ti.queiroz.model.ConfiguracaoQualidade;
import portal.ti.queiroz.model.Filiais;
import portal.ti.queiroz.model.Inventario;
import portal.ti.queiroz.model.InventarioItem;
import portal.ti.queiroz.model.InventarioResultado;
import portal.ti.queiroz.model.StatusInventario;
import portal.ti.queiroz.repository.ConfiguracaoQualidadeRepository;
import portal.ti.queiroz.repository.FiliaisRepository;
import portal.ti.queiroz.repository.InventarioItemRepository;
import portal.ti.queiroz.repository.InventarioRepository;
import portal.ti.queiroz.repository.InventarioResultadoRepository;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class AcuracidadeService {

    /** Casas decimais dos percentuais. 6 casas = precisão de 0,0001% no relatório. */
    private static final int ESCALA_PERCENTUAL = 6;

    @Autowired
    private InventarioRepository inventarioRepository;

    @Autowired
    private FiliaisRepository filiaisRepository;

    @Autowired
    private InventarioItemRepository itemRepository;

    @Autowired
    private InventarioResultadoRepository resultadoRepository;

    @Autowired
    private ConfiguracaoQualidadeRepository configuracaoRepository;

    @Autowired
    private RelatorioProtheusParser parser;

    /**
     * @param armazem obrigatório quando a filial tem estoque dividido (qual das duas
     *                planilhas do dia está sendo importada); deve ser null caso contrário
     */
    @Transactional
    public InventarioResultado importar(Long inventarioId, Armazem armazem, MultipartFile arquivo, String usuario) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new RegraDeNegocioException("Selecione o arquivo do relatório antes de importar.");
        }

        Inventario inventario = inventarioRepository.findById(inventarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException(
                        "Inventário não encontrado com o ID: " + inventarioId));

        if (inventario.getStatus() == StatusInventario.CANCELADO) {
            throw new RegraDeNegocioException(
                    "Este inventário está cancelado. Reative-o antes de importar o relatório.");
        }

        Filiais filial = filiaisRepository.findById(inventario.getFilialId())
                .orElseThrow(() -> new RecursoNaoEncontradoException(
                        "Filial não encontrada com o ID: " + inventario.getFilialId()));
        validarArmazem(filial, armazem);

        List<InventarioItem> itens;
        try (InputStream entrada = arquivo.getInputStream()) {
            itens = parser.ler(entrada);
        } catch (IOException e) {
            throw new RegraDeNegocioException("Não foi possível ler o arquivo enviado.");
        }

        ConfiguracaoQualidade config = configuracaoAtual();
        InventarioResultado resultado = calcular(itens, config.getLimiteZerados());

        resultado.setInventarioId(inventarioId);
        resultado.setArmazem(armazem);
        resultado.setArquivoNome(arquivo.getOriginalFilename());
        resultado.setImportadoEm(LocalDateTime.now());
        resultado.setImportadoPor(usuario);

        // Reimportar substitui o resultado anterior por inteiro, em vez de somar em
        // cima do antigo — o caso comum é corrigir um arquivo enviado errado. Escopado por
        // armazém: reimportar a planilha da Loja não pode apagar o que já foi importado do
        // Estoque no mesmo inventário.
        itemRepository.deleteByInventarioIdAndArmazem(inventarioId, armazem);
        resultadoRepository.findByInventarioIdAndArmazem(inventarioId, armazem)
                .ifPresent(anterior -> resultado.setId(anterior.getId()));

        itens.forEach(item -> {
            item.setInventarioId(inventarioId);
            item.setArmazem(armazem);
        });
        itemRepository.saveAll(itens);
        InventarioResultado salvo = resultadoRepository.save(resultado);

        // Ter relatório importado é o que caracteriza inventário concluído (a primeira
        // planilha do dia já basta, mesmo que a filial seja dividida e falte a segunda).
        // O status é gravado direto (sem passar pelo InventarioService) de propósito:
        // as validações de agendamento — conflito de recebimento, um por mês — valem
        // para planejar uma data futura, não para registrar algo que já aconteceu.
        if (inventario.getStatus() != StatusInventario.REALIZADO) {
            inventario.setStatus(StatusInventario.REALIZADO);
            inventarioRepository.save(inventario);
        }

        return salvo;
    }

    private void validarArmazem(Filiais filial, Armazem armazem) {
        boolean dividida = Boolean.TRUE.equals(filial.getEstoqueDividido());
        if (dividida && armazem == null) {
            throw new RegraDeNegocioException(
                    "A filial %s - %s tem o estoque dividido em armazéns. Informe se este relatório é da Loja ou do Estoque."
                            .formatted(filial.getNumeroFilial(), filial.getNome()));
        }
        if (!dividida && armazem != null) {
            throw new RegraDeNegocioException(
                    "A filial %s - %s não tem o estoque dividido em armazéns."
                            .formatted(filial.getNumeroFilial(), filial.getNome()));
        }
    }

    /**
     * Traduz a aba "resumo_atual" da planilha. Recebe os itens já lidos e devolve o
     * resumo — sem tocar em banco, para poder ser testado isoladamente.
     *
     * @param limiteZerados acima deste total de produtos, os itens zerados deixam de
     *                      contar como acurados (regra "Zerados ?" da planilha)
     */
    public InventarioResultado calcular(List<InventarioItem> itens, int limiteZerados) {
        InventarioResultado r = new InventarioResultado();

        BigDecimal estoqueInicial = BigDecimal.ZERO;
        BigDecimal estoqueFinal = BigDecimal.ZERO;
        BigDecimal perdaValor = BigDecimal.ZERO;
        BigDecimal ganhoValor = BigDecimal.ZERO;
        BigDecimal quantidadeInicial = BigDecimal.ZERO;
        BigDecimal quantidadeFinal = BigDecimal.ZERO;
        BigDecimal unidadesPerda = BigDecimal.ZERO;
        BigDecimal unidadesGanho = BigDecimal.ZERO;

        int zerados = 0;
        int semDivergencia = 0;
        int comPerda = 0;
        int comGanho = 0;

        for (InventarioItem item : itens) {
            estoqueInicial = estoqueInicial.add(valor(item.getValorInicial()));
            estoqueFinal = estoqueFinal.add(valor(item.getValorFinal()));
            quantidadeInicial = quantidadeInicial.add(valor(item.getQuantidadeSistema()));
            quantidadeFinal = quantidadeFinal.add(valor(item.getQuantidadeFinal()));

            BigDecimal valorDivergencia = valor(item.getValorDivergencia());
            if (valorDivergencia.signum() < 0) {
                perdaValor = perdaValor.add(valorDivergencia);
            } else if (valorDivergencia.signum() > 0) {
                ganhoValor = ganhoValor.add(valorDivergencia);
            }

            BigDecimal divergencia = valor(item.getDivergencia());
            if (divergencia.signum() < 0) {
                unidadesPerda = unidadesPerda.add(divergencia);
                comPerda++;
            } else if (divergencia.signum() > 0) {
                unidadesGanho = unidadesGanho.add(divergencia);
                comGanho++;
            } else {
                semDivergencia++;
            }

            if (Boolean.TRUE.equals(item.getZerado())) {
                zerados++;
            }
        }

        int total = itens.size();
        int contados = total - zerados;
        // Inventário grande (CD) tem milhares de itens zerados que nunca foram
        // contados; deixá-los como "acurados" inflaria o indicador artificialmente.
        boolean considerouZerados = total <= limiteZerados;

        int acurados = considerouZerados ? semDivergencia : semDivergencia - zerados;
        int denominador = considerouZerados ? total : contados;
        int inacurados = denominador - acurados;

        r.setEstoqueInicialValor(escalaValor(estoqueInicial));
        r.setEstoqueFinalValor(escalaValor(estoqueFinal));
        r.setPerdaValor(escalaValor(perdaValor));
        r.setGanhoValor(escalaValor(ganhoValor));
        r.setTotalAjusteValor(escalaValor(perdaValor.abs().add(ganhoValor.abs())));

        r.setPercentualPerda(dividir(perdaValor.abs(), estoqueInicial));
        r.setPercentualGanho(dividir(ganhoValor.abs(), estoqueInicial));
        // Dividido em uma única operação em vez de somar os dois percentuais já
        // arredondados: somar arredondamentos acumula erro e o número passa a
        // divergir da planilha na 6ª casa.
        r.setPercentualInacuracia(dividir(perdaValor.abs().add(ganhoValor.abs()), estoqueInicial));

        r.setTotalProdutos(total);
        r.setProdutosContados(contados);
        r.setProdutosZerados(zerados);
        r.setProdutosAcurados(acurados);
        r.setProdutosInacurados(inacurados);
        r.setProdutosComPerda(comPerda);
        r.setProdutosComGanho(comGanho);
        r.setConsiderouZerados(considerouZerados);

        r.setPercentualAcuracidade(dividir(BigDecimal.valueOf(acurados), BigDecimal.valueOf(denominador)));
        r.setPercentualInacurados(dividir(BigDecimal.valueOf(inacurados), BigDecimal.valueOf(denominador)));

        r.setQuantidadeInicial(quantidadeInicial);
        r.setQuantidadeFinal(quantidadeFinal);
        r.setUnidadesPerda(unidadesPerda);
        r.setUnidadesGanho(unidadesGanho);

        return r;
    }

    /**
     * Soma os resumos de várias filiais em um só (usado nos agregados CDs/Lojas/Geral).
     * Cada filial já contribui com um resultado corretamente calculado na sua própria
     * escala — somar os valores brutos (R$, contagens) e só então recalcular os
     * percentuais é o mesmo que a planilha antiga fazia com SUMIFS por grupo de filiais.
     * Diferente de {@link #calcular}, não junta itens (SKU) de filiais diferentes: aqui
     * não existe risco de duplicidade, já que cada filial é um estoque genuinamente
     * separado do outro.
     */
    public InventarioResultado somarResultados(List<InventarioResultado> resultados) {
        InventarioResultado r = new InventarioResultado();

        BigDecimal estoqueInicial = somar(resultados, InventarioResultado::getEstoqueInicialValor);
        BigDecimal estoqueFinal = somar(resultados, InventarioResultado::getEstoqueFinalValor);
        BigDecimal perdaValor = somar(resultados, InventarioResultado::getPerdaValor);
        BigDecimal ganhoValor = somar(resultados, InventarioResultado::getGanhoValor);

        r.setEstoqueInicialValor(escalaValor(estoqueInicial));
        r.setEstoqueFinalValor(escalaValor(estoqueFinal));
        r.setPerdaValor(escalaValor(perdaValor));
        r.setGanhoValor(escalaValor(ganhoValor));
        r.setTotalAjusteValor(escalaValor(perdaValor.abs().add(ganhoValor.abs())));

        r.setPercentualPerda(dividir(perdaValor.abs(), estoqueInicial));
        r.setPercentualGanho(dividir(ganhoValor.abs(), estoqueInicial));
        r.setPercentualInacuracia(dividir(perdaValor.abs().add(ganhoValor.abs()), estoqueInicial));

        int totalProdutos = somarInt(resultados, InventarioResultado::getTotalProdutos);
        int produtosContados = somarInt(resultados, InventarioResultado::getProdutosContados);
        int produtosZerados = somarInt(resultados, InventarioResultado::getProdutosZerados);
        int produtosAcurados = somarInt(resultados, InventarioResultado::getProdutosAcurados);
        int produtosInacurados = somarInt(resultados, InventarioResultado::getProdutosInacurados);

        r.setTotalProdutos(totalProdutos);
        r.setProdutosContados(produtosContados);
        r.setProdutosZerados(produtosZerados);
        r.setProdutosAcurados(produtosAcurados);
        r.setProdutosInacurados(produtosInacurados);
        r.setProdutosComPerda(somarInt(resultados, InventarioResultado::getProdutosComPerda));
        r.setProdutosComGanho(somarInt(resultados, InventarioResultado::getProdutosComGanho));
        // Cada filial já decidiu, na sua própria escala, se considerou zerados -- os
        // acurados/inacurados somados aqui já refletem essa decisão individualmente.
        r.setConsiderouZerados(null);

        int denominador = produtosAcurados + produtosInacurados;
        r.setPercentualAcuracidade(dividir(BigDecimal.valueOf(produtosAcurados), BigDecimal.valueOf(denominador)));
        r.setPercentualInacurados(dividir(BigDecimal.valueOf(produtosInacurados), BigDecimal.valueOf(denominador)));

        r.setQuantidadeInicial(somar(resultados, InventarioResultado::getQuantidadeInicial));
        r.setQuantidadeFinal(somar(resultados, InventarioResultado::getQuantidadeFinal));
        r.setUnidadesPerda(somar(resultados, InventarioResultado::getUnidadesPerda));
        r.setUnidadesGanho(somar(resultados, InventarioResultado::getUnidadesGanho));

        return r;
    }

    private BigDecimal somar(List<InventarioResultado> resultados, java.util.function.Function<InventarioResultado, BigDecimal> campo) {
        return resultados.stream().map(campo).filter(java.util.Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private int somarInt(List<InventarioResultado> resultados, java.util.function.Function<InventarioResultado, Integer> campo) {
        return resultados.stream().map(campo).filter(java.util.Objects::nonNull).mapToInt(Integer::intValue).sum();
    }

    /**
     * Divisão protegida: denominador zero vira 0, como o IFERROR da planilha. Pacote (não
     * private) porque {@link RelatorioAcuracidadeService} reaproveita pra recalcular o "Geral"
     * desconsiderando as divergências cruzadas, sem duplicar a lógica de arredondamento.
     */
    BigDecimal dividir(BigDecimal numerador, BigDecimal denominador) {
        if (denominador == null || denominador.signum() == 0) {
            return BigDecimal.ZERO.setScale(ESCALA_PERCENTUAL);
        }
        return numerador.divide(denominador, ESCALA_PERCENTUAL, RoundingMode.HALF_UP);
    }

    private BigDecimal valor(BigDecimal valor) {
        return valor == null ? BigDecimal.ZERO : valor;
    }

    private BigDecimal escalaValor(BigDecimal valor) {
        return valor.setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Junta os itens de dois armazéns por código de produto -- usado para calcular o
     * "Geral" de uma filial dividida sem duplicar SKU. Loja e Estoque compartilham o mesmo
     * catálogo de produtos (um produto com 600 un. na loja e 400 no estoque é 1 SKU, não 2),
     * então somar os {@link InventarioResultado} prontos dos dois (como {@link #somarResultados}
     * faz para filiais DIFERENTES) inflaria a contagem de produtos. Aqui a soma acontece antes,
     * no nível do item, e só depois {@link #calcular} roda em cima do catálogo já mesclado.
     *
     * Só popula os campos que {@link #calcular} lê -- a lista resultante nunca é persistida.
     */
    public List<InventarioItem> mesclarPorProduto(List<InventarioItem> itensA, List<InventarioItem> itensB) {
        Map<String, InventarioItem> mesclados = new LinkedHashMap<>();

        for (InventarioItem item : itensA) {
            mesclados.put(item.getCodProduto(), copiaParaMesclagem(item));
        }
        for (InventarioItem item : itensB) {
            InventarioItem existente = mesclados.get(item.getCodProduto());
            if (existente == null) {
                mesclados.put(item.getCodProduto(), copiaParaMesclagem(item));
            } else {
                existente.setValorInicial(somaCampo(existente.getValorInicial(), item.getValorInicial()));
                existente.setValorFinal(somaCampo(existente.getValorFinal(), item.getValorFinal()));
                existente.setQuantidadeSistema(somaCampo(existente.getQuantidadeSistema(), item.getQuantidadeSistema()));
                existente.setQuantidadeFinal(somaCampo(existente.getQuantidadeFinal(), item.getQuantidadeFinal()));
                existente.setValorDivergencia(somaCampo(existente.getValorDivergencia(), item.getValorDivergencia()));
                existente.setDivergencia(somaCampo(existente.getDivergencia(), item.getDivergencia()));
            }
        }

        for (InventarioItem item : mesclados.values()) {
            item.setZerado(valor(item.getValorInicial()).signum() == 0
                    && valor(item.getQuantidadeSistema()).signum() == 0
                    && valor(item.getDivergencia()).signum() == 0);
        }

        return List.copyOf(mesclados.values());
    }

    private InventarioItem copiaParaMesclagem(InventarioItem original) {
        InventarioItem copia = new InventarioItem();
        copia.setCodProduto(original.getCodProduto());
        copia.setDescricao(original.getDescricao());
        copia.setValorInicial(original.getValorInicial());
        copia.setValorFinal(original.getValorFinal());
        copia.setQuantidadeSistema(original.getQuantidadeSistema());
        copia.setQuantidadeFinal(original.getQuantidadeFinal());
        copia.setValorDivergencia(original.getValorDivergencia());
        copia.setDivergencia(original.getDivergencia());
        return copia;
    }

    private BigDecimal somaCampo(BigDecimal a, BigDecimal b) {
        return valor(a).add(valor(b));
    }

    // --- Consultas ---

    public Optional<InventarioResultado> buscarResultado(Long inventarioId, Armazem armazem) {
        return resultadoRepository.findByInventarioIdAndArmazem(inventarioId, armazem);
    }

    public List<InventarioItem> buscarItens(Long inventarioId, Armazem armazem) {
        return itemRepository.findByInventarioIdAndArmazem(inventarioId, armazem);
    }

    @Transactional
    public void removerResultado(Long inventarioId, Armazem armazem) {
        itemRepository.deleteByInventarioIdAndArmazem(inventarioId, armazem);
        resultadoRepository.deleteByInventarioIdAndArmazem(inventarioId, armazem);
    }

    // --- Configuração (metas) ---

    /** Cria a linha padrão no primeiro acesso, para não exigir seed manual do banco. */
    @Transactional
    public ConfiguracaoQualidade configuracaoAtual() {
        return configuracaoRepository.findById(ConfiguracaoQualidade.ID_UNICO)
                .orElseGet(() -> configuracaoRepository.save(ConfiguracaoQualidade.padrao()));
    }

    @Transactional
    public ConfiguracaoQualidade salvarConfiguracao(ConfiguracaoQualidade nova) {
        ConfiguracaoQualidade atual = configuracaoAtual();

        if (nova.getMetaAcuracidade() != null) atual.setMetaAcuracidade(nova.getMetaAcuracidade());
        if (nova.getMetaInacuracia() != null) atual.setMetaInacuracia(nova.getMetaInacuracia());
        if (nova.getLimiteZerados() != null) atual.setLimiteZerados(nova.getLimiteZerados());

        validarConfiguracao(atual);
        return configuracaoRepository.save(atual);
    }

    private void validarConfiguracao(ConfiguracaoQualidade c) {
        if (foraDeZeroAUm(c.getMetaAcuracidade())) {
            throw new RegraDeNegocioException("A meta de acuracidade deve ficar entre 0 e 1 (ex: 0,75 para 75%).");
        }
        if (foraDeZeroAUm(c.getMetaInacuracia())) {
            throw new RegraDeNegocioException("A meta de ajuste deve ficar entre 0 e 1 (ex: 0,02 para 2%).");
        }
        if (c.getLimiteZerados() == null || c.getLimiteZerados() < 1) {
            throw new RegraDeNegocioException("O limite de produtos para desconsiderar zerados deve ser maior que zero.");
        }
    }

    private boolean foraDeZeroAUm(BigDecimal valor) {
        return valor == null || valor.signum() < 0 || valor.compareTo(BigDecimal.ONE) > 0;
    }
}
