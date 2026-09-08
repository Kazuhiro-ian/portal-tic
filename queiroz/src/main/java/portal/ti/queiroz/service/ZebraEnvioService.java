package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.EstoqueItem;
import portal.ti.queiroz.model.ZebraEnvio;
import portal.ti.queiroz.repository.EstoqueItemRepository;
import portal.ti.queiroz.repository.ZebraEnvioRepository;
import portal.ti.queiroz.model.StatusZebraEnvio;
import portal.ti.queiroz.dto.ConfirmarEnvioZebraRequest;
import portal.ti.queiroz.dto.ImportarCronogramaZebraResponse;
import portal.ti.queiroz.model.Filiais;
import portal.ti.queiroz.repository.FiliaisRepository;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Map;
import java.util.stream.Collectors;

import java.util.List;

@Service
public class ZebraEnvioService {

    @Autowired
    private ZebraEnvioRepository repository;

    @Autowired
    private EstoqueItemRepository itemRepository;

    @Autowired
    private FiliaisRepository filiaisRepository;

    public List<ZebraEnvio> listarPorPeriodo(LocalDate inicio, LocalDate fim) {
        return repository.findByDataPrevistaBetweenOrderByDataPrevistaDesc(inicio, fim);
    }

    /**
     * Cria o envio como PREVISTO e, se jaEnviado=true, confirma na mesma transação
     * (baixa o estoque) -- preserva o clique único do formulário manual pra quem já
     * despachou o material na hora do cadastro.
     */
    @Transactional
    public ZebraEnvio salvar(ZebraEnvio envio, boolean jaEnviado) {
        ZebraEnvio criado = criarPrevisto(envio);
        if (!jaEnviado) {
            return criado;
        }
        return confirmarEnvio(criado.getId(),
                new ConfirmarEnvioZebraRequest(criado.getDataPrevista(), null, null));
    }

    /**
     * Confirma que um envio PREVISTO saiu de fato: dá baixa no estoque (reaproveitando
     * baixarEstoque) e grava a data/quantidade reais. Se a quantidade real divergir da
     * prevista, o pedido pode informar o valor ajustado; se vier nulo, mantém o previsto.
     */
    @Transactional
    public ZebraEnvio confirmarEnvio(Long id, ConfirmarEnvioZebraRequest request) {
        ZebraEnvio envio = repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Envio não encontrado: " + id));

        if (envio.getStatus() != StatusZebraEnvio.PREVISTO) {
            throw new RegraDeNegocioException("Só é possível confirmar um envio que ainda está PREVISTO.");
        }
        if (request.dataEnvio() == null) {
            throw new RegraDeNegocioException("Informe a data em que o envio saiu.");
        }

        int qtdEtiquetas = request.qtdEtiquetas() != null ? request.qtdEtiquetas() : envio.getQtdEtiquetas();
        int qtdRibbons = request.qtdRibbons() != null ? request.qtdRibbons() : envio.getQtdRibbons();

        baixarEstoque("ETIQUETA", "etiqueta", qtdEtiquetas, "etiquetas", "rolos");
        baixarEstoque("RIBBON", "ribbon", qtdRibbons, "ribbons", "unidades");

        envio.setQtdEtiquetas(qtdEtiquetas);
        envio.setQtdRibbons(qtdRibbons);
        envio.setDataEnvio(request.dataEnvio());
        envio.setStatus(StatusZebraEnvio.ENVIADO);
        return repository.save(envio);
    }

    @Transactional
    public ZebraEnvio cancelar(Long id) {
        ZebraEnvio envio = repository.findById(id).orElseThrow(() -> new RecursoNaoEncontradoException("Envio não encontrado: " + id));

        if (envio.getStatus() != StatusZebraEnvio.PREVISTO) {
            throw new RegraDeNegocioException("Só é possível cancelar um envio que ainda está previsto.");
        }

        envio.setStatus(StatusZebraEnvio.CANCELADO);
        return repository.save(envio);
    }

    private void validarDadosBasicos(ZebraEnvio envio) {
        if (envio.getFilialId() == null) {
            throw new RegraDeNegocioException("Selecione a filial de destino.");
        }
        int qtdEtiquetas = envio.getQtdEtiquetas() != null ? envio.getQtdEtiquetas() : 0;

        int qtdRibbons = envio.getQtdRibbons() != null ? envio.getQtdRibbons() : 0;

        if (qtdEtiquetas <= 0 && qtdRibbons <= 0) {
            throw new RegraDeNegocioException("Informe ao menos uma quantidade maior que zero");
        }

        if ("EXTRA".equalsIgnoreCase(envio.getTipoEnvio()) && (envio.getMotivoExtra() == null || envio.getMotivoExtra().trim().isEmpty())) {
            throw new RegraDeNegocioException("O motivo é obrigatório para envios extras.");
        }

        if (envio.getDataPrevista() == null) {
            throw new RegraDeNegocioException("Informe a data prevista para envio.");
        }
    }

    @Transactional
    public ZebraEnvio criarPrevisto(ZebraEnvio envio) {
        validarDadosBasicos(envio);
        envio.setId(null);
        envio.setStatus(StatusZebraEnvio.PREVISTO);
        envio.setDataEnvio(null);
        return repository.save(envio);
    }

    /**
     * Dá baixa espalhando a quantidade necessária pelos itens de estoque da categoria
     * (campo categoriaZebra) ou, na ausência dela, pelo nome do item -- mesma regra de
     * fallback que o frontend usava, preservada aqui pra não exigir recategorizar o
     * estoque já cadastrado.
     */
    private void baixarEstoque(String categoria, String palavraChave, int quantidadeNecessaria, String rotuloPlural, String unidade) {
        if (quantidadeNecessaria <= 0) return;

        // Traz só os itens já categorizados como "categoria" mais os sem categoria (candidatos
        // ao fallback por nome), em vez de carregar a tabela de estoque inteira.
        List<EstoqueItem> itensDoTipo = itemRepository.findByCategoriaZebraOrCategoriaZebraIsNull(categoria).stream()
                .filter(i -> categoria.equals(i.getCategoriaZebra())
                        || (i.getCategoriaZebra() == null && i.getName().toLowerCase().contains(palavraChave)))
                .toList();

        int disponivel = itensDoTipo.stream().mapToInt(EstoqueItem::getQuantity).sum();
        if (quantidadeNecessaria > disponivel) {
            throw new RegraDeNegocioException(
                    "Estoque insuficiente de " + rotuloPlural + ". Disponível: " + disponivel + " " + unidade + ".");
        }

        int restante = quantidadeNecessaria;
        for (EstoqueItem item : itensDoTipo) {
            if (restante <= 0) break;
            int deduzir = Math.min(item.getQuantity(), restante);
            item.setQuantity(item.getQuantity() - deduzir);
            restante -= deduzir;
            // saveAndFlush (não save): ver o mesmo comentário em EstoqueMovimentoService.registrar.
            try {
                itemRepository.saveAndFlush(item);
            } catch (ObjectOptimisticLockingFailureException e) {
                throw new RegraDeNegocioException(
                        "O estoque de \"" + item.getName() + "\" foi alterado por outra operação ao mesmo tempo. Tente novamente.");
            }
        }
    }

    public void deletar(Long id) {
        ZebraEnvio envio = repository.findById(id).orElseThrow(() -> new RecursoNaoEncontradoException("Envio não encontrado: " + id));

        if(envio.getStatus() == StatusZebraEnvio.ENVIADO) {
            throw new RegraDeNegocioException("Não é possível excluir um envio já confirmado - O estoque já foi descontado, cancele antes, se ainda estiver como previsto.");
        }

        repository.deleteById(id);
    }

    private static final DateTimeFormatter FORMATO_DATA_CSV = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private record LinhaCronogramaCsv(Integer numeroFilial, Integer envioNumero, int qtdEtiquetas,
                                       int qtdRibbons, LocalDate dataPrevista, String observacao) {
    }

    private List<LinhaCronogramaCsv> lerLinhasValidas(MultipartFile arquivo, List<String> avisos) {
        List<LinhaCronogramaCsv> linhas = new ArrayList<>();
        try (BufferedReader leitor = new BufferedReader(
                new InputStreamReader(arquivo.getInputStream(), StandardCharsets.UTF_8))) {
            String linha;
            int numeroLinha = 0;
            while ((linha = leitor.readLine()) != null) {
                numeroLinha++;
                String[] colunas = linha.split(",", -1);
                if (colunas.length < 6) {
                    continue; // linha em branco/curta demais -- título, descrição etc.
                }
                Integer numeroFilial = paraInteiroOuNulo(colunas[0].trim());
                if (numeroFilial == null) {
                    continue; // cabeçalho, TOTAL CONSOLIDADO, ou qualquer linha que não é dado
                }
                try {
                    linhas.add(parseLinha(colunas, numeroFilial));
                } catch (Exception e) {
                    avisos.add("Linha %d da planilha ignorada: %s".formatted(numeroLinha, e.getMessage()));
                }
            }
        } catch (IOException e) {
            throw new RegraDeNegocioException("Não foi possível ler o arquivo enviado.");
        }
        return linhas;
    }

    private Integer paraInteiroOuNulo(String texto) {
        try {
            return Integer.parseInt(texto);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private LinhaCronogramaCsv parseLinha(String[] colunas, Integer numeroFilial) {
        Integer envioNumero = colunas[2].trim().startsWith("2") ? 2 : 1;
        int qtdEtiquetas = Integer.parseInt(colunas[3].trim());
        int qtdRibbons = Integer.parseInt(colunas[4].trim());
        LocalDate dataPrevista = LocalDate.parse(colunas[5].trim(), FORMATO_DATA_CSV);
        String observacao = colunas.length > 9 ? colunas[9].trim() : null;
        return new LinhaCronogramaCsv(numeroFilial, envioNumero, qtdEtiquetas, qtdRibbons, dataPrevista,
                observacao == null || observacao.isEmpty() ? null : observacao);
    }

    @Transactional
    public ImportarCronogramaZebraResponse importarCronograma(MultipartFile arquivo) {
        List<String> avisos = new ArrayList<>();
        List<LinhaCronogramaCsv> linhas = lerLinhasValidas(arquivo, avisos);

        if (linhas.isEmpty()) {
            throw new RegraDeNegocioException("Nenhuma linha de envio encontrada na planilha.");
        }

        Map<Integer, Filiais> filiaisPorNumero = filiaisRepository.findAll().stream()
                .filter(f -> f.getNumeroFilial() != null)
                .collect(Collectors.toMap(Filiais::getNumeroFilial, f -> f, (a, b) -> a));

        LocalDate minData = linhas.stream().map(LinhaCronogramaCsv::dataPrevista).min(LocalDate::compareTo).orElseThrow();
        LocalDate maxData = linhas.stream().map(LinhaCronogramaCsv::dataPrevista).max(LocalDate::compareTo).orElseThrow();

        Map<String, ZebraEnvio> existentes = repository.findByDataPrevistaBetweenOrderByDataPrevistaDesc(minData, maxData)
                .stream()
                .collect(Collectors.toMap(
                        e -> chaveUpsert(e.getFilialId(), e.getEnvioNumero(), YearMonth.from(e.getDataPrevista())),
                        e -> e, (a, b) -> a));

        int criados = 0, atualizados = 0, ignorados = 0;
        List<ZebraEnvio> paraSalvar = new ArrayList<>();

        for (LinhaCronogramaCsv linha : linhas) {
            Filiais filial = filiaisPorNumero.get(linha.numeroFilial());
            if (filial == null) {
                avisos.add("Filial %d não encontrada — linha ignorada.".formatted(linha.numeroFilial()));
                ignorados++;
                continue;
            }

            // filialId aqui é o NÚMERO da loja, não o id do banco -- mesma convenção que o
            // resto do módulo Zebra já usa (ver ZebraCota/formulário manual e utils/filiais.js
            // no frontend, que casam tudo por numeroFilial).
            Long filialId = Long.valueOf(linha.numeroFilial());
            String chave = chaveUpsert(filialId, linha.envioNumero(), YearMonth.from(linha.dataPrevista()));
            ZebraEnvio existente = existentes.get(chave);

            if (existente != null && existente.getStatus() == StatusZebraEnvio.ENVIADO) {
                ignorados++;
                continue; // não sobrescreve envio já confirmado
            }

            ZebraEnvio envio = existente != null ? existente : new ZebraEnvio();
            envio.setFilialId(filialId);
            envio.setEnvioNumero(linha.envioNumero());
            envio.setQtdEtiquetas(linha.qtdEtiquetas());
            envio.setQtdRibbons(linha.qtdRibbons());
            envio.setDataPrevista(linha.dataPrevista());
            envio.setTipoEnvio("REGULAR");
            envio.setObservacao(linha.observacao());
            envio.setStatus(StatusZebraEnvio.PREVISTO);
            envio.setDataEnvio(null);

            if (existente != null) {
                atualizados++;
            } else {
                criados++;
            }
            paraSalvar.add(envio);
        }

        repository.saveAll(paraSalvar);
        return new ImportarCronogramaZebraResponse(criados, atualizados, ignorados, avisos);
    }

    private String chaveUpsert(Long filialId, Integer envioNumero, YearMonth mes) {
        return filialId + "|" + envioNumero + "|" + mes;
    }
}
