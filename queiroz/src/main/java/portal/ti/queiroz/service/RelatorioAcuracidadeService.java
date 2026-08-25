package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.dto.DetalheFilialAcuracidadeResponse;
import portal.ti.queiroz.dto.DetalheFilialSemanalAcuracidadeResponse;
import portal.ti.queiroz.dto.DivergenciaCruzada;
import portal.ti.queiroz.dto.InventarioResumo;
import portal.ti.queiroz.dto.ItemRanking;
import portal.ti.queiroz.dto.RelatorioAcuracidadeResponse;
import portal.ti.queiroz.dto.ResultadoArmazem;
import portal.ti.queiroz.dto.ResumoFilialAcuracidade;
import portal.ti.queiroz.dto.SemanaAcuracidade;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.Armazem;
import portal.ti.queiroz.model.Filiais;
import portal.ti.queiroz.model.Inventario;
import portal.ti.queiroz.model.InventarioItem;
import portal.ti.queiroz.model.InventarioResultado;
import portal.ti.queiroz.model.PeriodicidadeInventario;
import portal.ti.queiroz.model.StatusInventario;
import portal.ti.queiroz.model.TipoFilial;
import portal.ti.queiroz.repository.FiliaisRepository;
import portal.ti.queiroz.repository.InventarioItemRepository;
import portal.ti.queiroz.repository.InventarioRepository;
import portal.ti.queiroz.repository.InventarioResultadoRepository;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Monta o relatório de acuracidade (o equivalente ao "dashboard" da planilha do
 * setor): comparativo mês atual x anterior por filial, agregados CDs/Lojas/Geral,
 * ranking dos produtos com maior sobra/falta, e o detalhamento por armazém (Loja/
 * Estoque) das filiais que aderiram ao estoque dividido.
 *
 * Para filiais de periodicidade MENSAL/BIMESTRAL, "o resultado do mês" é o do upload mais
 * recente no período — não a soma de vários uploads da mesma filial (não haveria por quê:
 * a filial só tem um inventário planejado por mês). Filiais SEMANAL (ex: CD 00) são a
 * exceção: cada sábado sobe um relatório PARCIAL (um subconjunto do catálogo), não o mês
 * inteiro consolidado, então "o resultado do mês" precisa fundir todos os sábados por
 * produto -- ver {@link #geralSemanal}. Já os agregados por grupo (CDs/Lojas/Geral) somam
 * entre filiais DIFERENTES, o que continua seguro independente da periodicidade — cada
 * filial é um estoque genuinamente separado.
 *
 * Filiais com estoque dividido são a exceção dentro da própria filial: Loja e Estoque são
 * contados no MESMO dia (um único {@link Inventario}), só que em duas planilhas separadas —
 * e como as duas compartilham o mesmo catálogo de produtos, o "Geral" da filial não pode
 * somar os {@link InventarioResultado} prontos dos dois armazéns (duplicaria SKU); precisa
 * mesclar os itens por código de produto antes de calcular. Ver {@link #geral}.
 */
@Service
public class RelatorioAcuracidadeService {

    private static final int LIMITE_RANKING_PADRAO = 10;

    @Autowired
    private InventarioRepository inventarioRepository;

    @Autowired
    private InventarioResultadoRepository resultadoRepository;

    @Autowired
    private InventarioItemRepository itemRepository;

    @Autowired
    private FiliaisRepository filiaisRepository;

    @Autowired
    private AcuracidadeService acuracidadeService;

    public RelatorioAcuracidadeResponse relatorioMensal(int ano, int mes) {
        YearMonth mesAtual = YearMonth.of(ano, mes);
        YearMonth mesAnterior = mesAtual.minusMonths(1);
        int limiteZerados = acuracidadeService.configuracaoAtual().getLimiteZerados();

        List<Filiais> filiais = filiaisRepository.findAll().stream()
                .sorted(Comparator.comparing(Filiais::getNumeroFilial))
                .toList();

        Map<Long, Inventario> inventariosAtual = inventariosMaisRecentesPorFilial(mesAtual);
        Map<Long, Inventario> inventariosAnterior = inventariosMaisRecentesPorFilial(mesAnterior);

        Map<Long, InventarioResultado> resultadoAtual01 = resultadosPorArmazem(inventariosAtual, Armazem.ARMAZEM_01);
        Map<Long, InventarioResultado> resultadoAtual03 = resultadosPorArmazem(inventariosAtual, Armazem.ARMAZEM_03);
        Map<Long, InventarioResultado> resultadoAnterior01 = resultadosPorArmazem(inventariosAnterior, Armazem.ARMAZEM_01);
        Map<Long, InventarioResultado> resultadoAnterior03 = resultadosPorArmazem(inventariosAnterior, Armazem.ARMAZEM_03);

        // Pré-carrega os itens dos dois armazéns de TODAS as filiais divididas do período de uma
        // vez (uma query por armazém), em vez de deixar geral()/divergenciasCruzadas() buscarem
        // item por filial dentro do loop abaixo -- isso chegava a disparar 6 queries síncronas
        // por filial dividida (2 em cada chamada de geral() para atual/anterior, mais 2 em
        // divergenciasCruzadas(), repetindo a mesma busca que geral() já tinha feito para o mês
        // atual) para montar um único relatório.
        List<Long> inventarioIdsDivididos = filiais.stream()
                .filter(f -> Boolean.TRUE.equals(f.getEstoqueDividido()))
                .flatMap(f -> Stream.of(inventariosAtual.get(f.getId()), inventariosAnterior.get(f.getId())))
                .filter(Objects::nonNull)
                .map(Inventario::getId)
                .distinct()
                .toList();
        Map<Long, List<InventarioItem>> itens01PorInventario = itensPorInventario(inventarioIdsDivididos, Armazem.ARMAZEM_01);
        Map<Long, List<InventarioItem>> itens03PorInventario = itensPorInventario(inventarioIdsDivididos, Armazem.ARMAZEM_03);

        Map<Long, InventarioResultado> geralAtual = new LinkedHashMap<>();
        Map<Long, InventarioResultado> geralAnterior = new LinkedHashMap<>();
        List<ResumoFilialAcuracidade> linhas = new ArrayList<>();

        for (Filiais f : filiais) {
            InventarioResultado r01Atual = resultadoAtual01.get(f.getId());
            InventarioResultado r03Atual = resultadoAtual03.get(f.getId());
            InventarioResultado r01Anterior = resultadoAnterior01.get(f.getId());
            InventarioResultado r03Anterior = resultadoAnterior03.get(f.getId());

            PeriodicidadeInventario periodicidade = periodicidadeDe(f);
            InventarioResultado rGeralAtual;
            InventarioResultado rGeralAnterior;
            if (periodicidade == PeriodicidadeInventario.SEMANAL) {
                rGeralAtual = geralSemanal(f, mesAtual, limiteZerados);
                rGeralAnterior = geralSemanal(f, mesAnterior, limiteZerados);
            } else {
                rGeralAtual = geral(inventariosAtual.get(f.getId()), r01Atual, r03Atual, limiteZerados,
                        itens01PorInventario, itens03PorInventario);
                rGeralAnterior = geral(inventariosAnterior.get(f.getId()), r01Anterior, r03Anterior, limiteZerados,
                        itens01PorInventario, itens03PorInventario);
            }
            if (rGeralAtual != null) geralAtual.put(f.getId(), rGeralAtual);
            if (rGeralAnterior != null) geralAnterior.put(f.getId(), rGeralAnterior);

            boolean dividida = Boolean.TRUE.equals(f.getEstoqueDividido());
            ResultadoArmazem armazem01 = dividida && (r01Atual != null || r01Anterior != null)
                    ? new ResultadoArmazem(r01Atual, r01Anterior) : null;
            ResultadoArmazem armazem03 = dividida && (r03Atual != null || r03Anterior != null)
                    ? new ResultadoArmazem(r03Atual, r03Anterior) : null;

            Integer divergenciasCruzadas = null;
            if (dividida) {
                int quantidade = divergenciasCruzadas(inventariosAtual.get(f.getId()),
                        itens01PorInventario, itens03PorInventario).size();
                divergenciasCruzadas = quantidade > 0 ? quantidade : null;
            }

            linhas.add(new ResumoFilialAcuracidade(
                    f.getId(), f.getNumeroFilial(), f.getNome(), f.getTipoFilial(), periodicidade,
                    rGeralAtual, rGeralAnterior, armazem01, armazem03, divergenciasCruzadas));
        }

        ResumoFilialAcuracidade cds = agregado("Centros de Distribuição", TipoFilial.CD, filiais, geralAtual, geralAnterior);
        ResumoFilialAcuracidade lojas = agregado("Lojas", TipoFilial.LOJA, filiais, geralAtual, geralAnterior);
        ResumoFilialAcuracidade geral = agregado("Geral", null, filiais, geralAtual, geralAnterior);

        return new RelatorioAcuracidadeResponse(
                ano, mes, mesAnterior.getYear(), mesAnterior.getMonthValue(), linhas, cds, lojas, geral);
    }

    private ResumoFilialAcuracidade agregado(String nome, TipoFilial tipo, List<Filiais> filiais,
                                              Map<Long, InventarioResultado> atual, Map<Long, InventarioResultado> anterior) {
        List<Long> idsDoGrupo = filiais.stream()
                .filter(f -> tipo == null || f.getTipoFilial() == tipo)
                .map(Filiais::getId)
                .toList();

        return new ResumoFilialAcuracidade(null, null, nome, tipo, null,
                somarSeExistir(idsDoGrupo, atual), somarSeExistir(idsDoGrupo, anterior),
                null, null, null);
    }

    private InventarioResultado somarSeExistir(List<Long> filialIds, Map<Long, InventarioResultado> porFilial) {
        List<InventarioResultado> resultados = filialIds.stream()
                .map(porFilial::get)
                .filter(Objects::nonNull)
                .toList();
        return resultados.isEmpty() ? null : acuracidadeService.somarResultados(resultados);
    }

    /**
     * Resultado geral de uma filial no período. Quando os dois armazéns têm resultado, NÃO
     * soma os {@link InventarioResultado} prontos (isso duplicaria SKU, já que Loja e Estoque
     * compartilham o mesmo catálogo de produtos — diferente de somar filiais distintas, que é
     * seguro): em vez disso mescla os itens por código de produto e recalcula em cima do
     * catálogo já unificado. Se só um armazém tem resultado, devolve ele direto, sem recalcular
     * nada (preserva os valores originais, inclusive {@code considerouZerados}).
     *
     * Busca os itens direto no banco -- uso pontual (uma filial só), como em {@link #detalheFilial}.
     * Para o relatório mensal (todas as filiais de uma vez), use a sobrecarga com os mapas
     * pré-carregados, senão vira uma query por filial dentro do loop.
     */
    private InventarioResultado geral(Inventario inventario, InventarioResultado r01, InventarioResultado r03, int limiteZerados) {
        if (r01 != null && r03 != null) {
            List<InventarioItem> itens01 = itemRepository.findByInventarioIdAndArmazem(inventario.getId(), Armazem.ARMAZEM_01);
            List<InventarioItem> itens03 = itemRepository.findByInventarioIdAndArmazem(inventario.getId(), Armazem.ARMAZEM_03);
            return geralDosItens(itens01, itens03, limiteZerados);
        }
        return r01 != null ? r01 : r03;
    }

    /** Mesma regra de {@link #geral}, mas lendo de mapas já carregados em memória (sem query). */
    private InventarioResultado geral(Inventario inventario, InventarioResultado r01, InventarioResultado r03, int limiteZerados,
                                       Map<Long, List<InventarioItem>> itens01PorInventario,
                                       Map<Long, List<InventarioItem>> itens03PorInventario) {
        if (r01 != null && r03 != null) {
            List<InventarioItem> itens01 = itens01PorInventario.getOrDefault(inventario.getId(), List.of());
            List<InventarioItem> itens03 = itens03PorInventario.getOrDefault(inventario.getId(), List.of());
            return geralDosItens(itens01, itens03, limiteZerados);
        }
        return r01 != null ? r01 : r03;
    }

    private InventarioResultado geralDosItens(List<InventarioItem> itens01, List<InventarioItem> itens03, int limiteZerados) {
        List<InventarioItem> mesclados = acuracidadeService.mesclarPorProduto(itens01, itens03);
        return acuracidadeService.calcular(mesclados, limiteZerados);
    }

    /** Periodicidade da filial; null (filial ainda não configurada) é tratado como MENSAL. */
    private PeriodicidadeInventario periodicidadeDe(Filiais filial) {
        return filial.getPeriodicidadeInventario() != null
                ? filial.getPeriodicidadeInventario()
                : PeriodicidadeInventario.MENSAL;
    }

    /**
     * "Geral" do mês de uma filial SEMANAL (ex: CD 00): funde todos os inventários REALIZADO
     * do mês por produto, mantendo o valor da semana mais recente quando um SKU se repete (ver
     * {@link AcuracidadeService#mesclarMaisRecentePorProduto}). Sem continuidade entre meses --
     * cada chamada só olha os inventários daquele mês específico.
     */
    private InventarioResultado geralSemanal(Filiais filial, YearMonth mes, int limiteZerados) {
        List<Inventario> semanas = inventarioRepository
                .findByFilialIdAndDataBetween(filial.getId(), mes.atDay(1), mes.atEndOfMonth()).stream()
                .filter(i -> i.getStatus() == StatusInventario.REALIZADO)
                .sorted(Comparator.comparing(Inventario::getData))
                .toList();

        if (semanas.isEmpty()) {
            return null;
        }

        // Uma única query com IN (via itensPorInventario) em vez de uma por semana do mês.
        List<Long> inventarioIds = semanas.stream().map(Inventario::getId).toList();
        Map<Long, List<InventarioItem>> itensPorInventario = itensPorInventario(inventarioIds, null);
        List<List<InventarioItem>> itensPorSemana = semanas.stream()
                .map(inv -> itensPorInventario.getOrDefault(inv.getId(), List.of()))
                .toList();

        List<InventarioItem> mesclados = acuracidadeService.mesclarMaisRecentePorProduto(itensPorSemana);
        return acuracidadeService.calcular(mesclados, limiteZerados);
    }

    /** Agrupa por inventarioId os itens de um armazém, de vários inventários, numa única query. */
    private Map<Long, List<InventarioItem>> itensPorInventario(List<Long> inventarioIds, Armazem armazem) {
        if (inventarioIds.isEmpty()) return Map.of();
        return itemRepository.findByInventarioIdInAndArmazem(inventarioIds, armazem).stream()
                .collect(Collectors.groupingBy(InventarioItem::getInventarioId));
    }

    /** O inventário mais recente (por data, depois por id) de cada filial que teve algo REALIZADO no período. */
    private Map<Long, Inventario> inventariosMaisRecentesPorFilial(YearMonth mes) {
        List<Inventario> doMes = inventarioRepository.findByDataBetween(mes.atDay(1), mes.atEndOfMonth()).stream()
                .filter(i -> i.getStatus() == StatusInventario.REALIZADO)
                .toList();

        Map<Long, Inventario> maisRecentePorFilial = new LinkedHashMap<>();
        for (Inventario inv : doMes) {
            Inventario atual = maisRecentePorFilial.get(inv.getFilialId());
            if (atual == null
                    || inv.getData().isAfter(atual.getData())
                    || (inv.getData().isEqual(atual.getData()) && inv.getId() > atual.getId())) {
                maisRecentePorFilial.put(inv.getFilialId(), inv);
            }
        }
        return maisRecentePorFilial;
    }

    /**
     * Resultado de um armazém específico, para cada filial que tem inventário no mapa. Um
     * resultado sem armazém definido (filial não dividida) conta como ARMAZEM_01.
     */
    private Map<Long, InventarioResultado> resultadosPorArmazem(Map<Long, Inventario> inventariosPorFilial, Armazem armazem) {
        if (inventariosPorFilial.isEmpty()) return Map.of();

        List<Long> inventarioIds = inventariosPorFilial.values().stream().map(Inventario::getId).toList();
        Map<Long, List<InventarioResultado>> porInventario = resultadoRepository.findByInventarioIdIn(inventarioIds).stream()
                .collect(Collectors.groupingBy(InventarioResultado::getInventarioId));

        Map<Long, InventarioResultado> porFilial = new LinkedHashMap<>();
        inventariosPorFilial.forEach((filialId, inv) -> porInventario.getOrDefault(inv.getId(), List.of()).stream()
                .filter(r -> corresponde(r.getArmazem(), armazem))
                .findFirst()
                .ifPresent(r -> porFilial.put(filialId, r)));
        return porFilial;
    }

    private boolean corresponde(Armazem doResultado, Armazem filtro) {
        if (filtro == Armazem.ARMAZEM_01) {
            return doResultado == null || doResultado == Armazem.ARMAZEM_01;
        }
        return doResultado == filtro;
    }

    // --- Divergência cruzada entre armazéns ---

    /**
     * Produtos com indício de transferência entre os armazéns de uma filial dividida no mês:
     * a divergência de um armazém é exatamente o oposto da do outro (ex: +20 na Loja, -20 no
     * Estoque). Não altera o percentual de Loja nem o de Estoque isolados, mas afeta o "Geral"
     * — ver {@link #percentualSemTransferencias}.
     */
    public List<DivergenciaCruzada> divergenciasCruzadas(Long filialId, int ano, int mes) {
        Inventario inventario = inventariosMaisRecentesPorFilial(YearMonth.of(ano, mes)).get(filialId);
        return divergenciasCruzadas(inventario);
    }

    private List<DivergenciaCruzada> divergenciasCruzadas(Inventario inventario) {
        if (inventario == null) {
            return List.of();
        }
        List<InventarioItem> itens01 = itemRepository.findByInventarioIdAndArmazem(inventario.getId(), Armazem.ARMAZEM_01);
        List<InventarioItem> itens03 = itemRepository.findByInventarioIdAndArmazem(inventario.getId(), Armazem.ARMAZEM_03);
        return divergenciasCruzadasDosItens(itens01, itens03);
    }

    /** Mesma regra de {@link #divergenciasCruzadas(Inventario)}, mas sem query -- lendo dos mapas já carregados. */
    private List<DivergenciaCruzada> divergenciasCruzadas(Inventario inventario,
                                                            Map<Long, List<InventarioItem>> itens01PorInventario,
                                                            Map<Long, List<InventarioItem>> itens03PorInventario) {
        if (inventario == null) {
            return List.of();
        }
        List<InventarioItem> itens01 = itens01PorInventario.getOrDefault(inventario.getId(), List.of());
        List<InventarioItem> itens03 = itens03PorInventario.getOrDefault(inventario.getId(), List.of());
        return divergenciasCruzadasDosItens(itens01, itens03);
    }

    private List<DivergenciaCruzada> divergenciasCruzadasDosItens(List<InventarioItem> itens01, List<InventarioItem> itens03) {
        if (itens01.isEmpty() || itens03.isEmpty()) {
            return List.of();
        }

        Map<String, InventarioItem> porProduto01 = itens01.stream()
                .filter(i -> i.getCodProduto() != null)
                .collect(Collectors.toMap(InventarioItem::getCodProduto, i -> i, (a, b) -> a));
        Map<String, InventarioItem> porProduto03 = itens03.stream()
                .filter(i -> i.getCodProduto() != null)
                .collect(Collectors.toMap(InventarioItem::getCodProduto, i -> i, (a, b) -> a));

        List<DivergenciaCruzada> divergencias = new ArrayList<>();
        for (Map.Entry<String, InventarioItem> entry : porProduto01.entrySet()) {
            InventarioItem item03 = porProduto03.get(entry.getKey());
            if (item03 == null) continue;

            BigDecimal divergencia01 = valorOuZero(entry.getValue().getDivergencia());
            BigDecimal divergencia03 = valorOuZero(item03.getDivergencia());

            boolean opostasExatas = divergencia01.signum() != 0
                    && divergencia01.add(divergencia03).compareTo(BigDecimal.ZERO) == 0;

            if (opostasExatas) {
                divergencias.add(new DivergenciaCruzada(
                        entry.getKey(), entry.getValue().getDescricao(), divergencia01, divergencia03));
            }
        }
        return divergencias;
    }

    private BigDecimal valorOuZero(BigDecimal valor) {
        return valor == null ? BigDecimal.ZERO : valor;
    }

    // --- Detalhe por grupo (aba Dashboards: Lojas, CDs ou Geral) ---

    /**
     * Mesmo formato de {@link #detalheFilial}, mas agregado por grupo em vez de uma única
     * filial -- reaproveita os agregados já calculados em {@link #relatorioMensal} (cds/lojas/
     * geral) e o {@link #ranking} filtrado por tipo. Sem armazém01/03 nem divergências cruzadas:
     * esse detalhamento por Loja/Estoque só faz sentido dentro de uma única filial dividida, não
     * ao somar várias filiais diferentes.
     *
     * @param tipo restringe a CD ou LOJA; null = Geral (todas as filiais)
     */
    public DetalheFilialAcuracidadeResponse detalheGrupo(TipoFilial tipo, int ano, int mes) {
        RelatorioAcuracidadeResponse relatorio = relatorioMensal(ano, mes);
        ResumoFilialAcuracidade resumo = tipo == TipoFilial.CD ? relatorio.cds()
                : tipo == TipoFilial.LOJA ? relatorio.lojas()
                : relatorio.geral();

        Ranking ranking = ranking(ano, mes, tipo, null, null);

        return new DetalheFilialAcuracidadeResponse(
                null, null, resumo.nome(), tipo, false,
                new ResultadoArmazem(resumo.atual(), resumo.anterior()),
                null, null,
                List.of(),
                null, null, null,
                ranking.maioresFaltas(), ranking.maioresSobras(),
                null, null);
    }

    // --- Detalhe por filial (painel lateral / dashboard da tela de Acuracidade) ---

    public DetalheFilialAcuracidadeResponse detalheFilial(Long filialId, int ano, int mes) {
        Filiais filial = filiaisRepository.findById(filialId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Filial não encontrada com o ID: " + filialId));

        YearMonth mesAtual = YearMonth.of(ano, mes);
        YearMonth mesAnterior = mesAtual.minusMonths(1);
        int limiteZerados = acuracidadeService.configuracaoAtual().getLimiteZerados();

        Inventario invAtual = inventariosMaisRecentesPorFilial(mesAtual).get(filialId);
        Inventario invAnterior = inventariosMaisRecentesPorFilial(mesAnterior).get(filialId);

        boolean dividida = Boolean.TRUE.equals(filial.getEstoqueDividido());
        boolean semanal = periodicidadeDe(filial) == PeriodicidadeInventario.SEMANAL;

        // Filial não dividida grava o resultado com armazem = null (ver
        // AcuracidadeService.validarArmazem) -- buscar direto por ARMAZEM_01 nesse caso
        // nunca acharia nada, já que "armazem = 'ARMAZEM_01'" não bate com uma linha NULL.
        InventarioResultado r01Atual = resultadoDe(invAtual, dividida ? Armazem.ARMAZEM_01 : null);
        InventarioResultado r03Atual = resultadoDe(invAtual, Armazem.ARMAZEM_03);
        InventarioResultado r01Anterior = resultadoDe(invAnterior, dividida ? Armazem.ARMAZEM_01 : null);
        InventarioResultado r03Anterior = resultadoDe(invAnterior, Armazem.ARMAZEM_03);

        // Filial semanal: "geral" é a fusão dos sábados do mês (geralSemanal), não o
        // inventário mais recente -- ver o Javadoc de classe. O detalhamento por semana em
        // si vive só no novo endpoint (detalheSemanalFilial), não aqui.
        InventarioResultado geralAtual = semanal
                ? geralSemanal(filial, mesAtual, limiteZerados)
                : geral(invAtual, r01Atual, r03Atual, limiteZerados);
        InventarioResultado geralAnteriorResultado = semanal
                ? geralSemanal(filial, mesAnterior, limiteZerados)
                : geral(invAnterior, r01Anterior, r03Anterior, limiteZerados);
        ResultadoArmazem geral = new ResultadoArmazem(geralAtual, geralAnteriorResultado);
        ResultadoArmazem armazem01 = semanal ? null : new ResultadoArmazem(r01Atual, r01Anterior);
        ResultadoArmazem armazem03 = dividida ? new ResultadoArmazem(r03Atual, r03Anterior) : null;

        List<DivergenciaCruzada> divergencias = dividida ? divergenciasCruzadas(invAtual) : List.of();

        Ranking ranking = ranking(ano, mes, null, filialId, null);

        return new DetalheFilialAcuracidadeResponse(
                filial.getId(), filial.getNumeroFilial(), filial.getNome(), filial.getTipoFilial(), dividida,
                geral, armazem01, armazem03,
                divergencias,
                percentualSemTransferencias(geralAtual, divergencias.size()),
                produtosAcuradosSemTransferencias(geralAtual, divergencias.size()),
                produtosInacuradosSemTransferencias(geralAtual, divergencias.size()),
                ranking.maioresFaltas(), ranking.maioresSobras(),
                semanal ? null : resumoDe(invAtual, r01Atual), dividida ? resumoDe(invAtual, r03Atual) : null);
    }

    // --- Detalhe por semana (dashboard específico de filiais SEMANAL, ex: CD 00) ---

    /**
     * Cada sábado do mês individualmente, mais o "Geral" (fusão de todos por produto, mantendo
     * o valor mais recente quando um SKU se repete). Só faz sentido para filiais SEMANAL.
     */
    public DetalheFilialSemanalAcuracidadeResponse detalheSemanalFilial(Long filialId, int ano, int mes) {
        Filiais filial = filiaisRepository.findById(filialId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Filial não encontrada com o ID: " + filialId));

        if (periodicidadeDe(filial) != PeriodicidadeInventario.SEMANAL) {
            throw new RegraDeNegocioException(
                    "A filial %s - %s não tem periodicidade semanal.".formatted(filial.getNumeroFilial(), filial.getNome()));
        }

        YearMonth mesAlvo = YearMonth.of(ano, mes);
        int limiteZerados = acuracidadeService.configuracaoAtual().getLimiteZerados();

        List<Inventario> semanas = inventarioRepository
                .findByFilialIdAndDataBetween(filial.getId(), mesAlvo.atDay(1), mesAlvo.atEndOfMonth()).stream()
                .filter(i -> i.getStatus() == StatusInventario.REALIZADO)
                .sorted(Comparator.comparing(Inventario::getData))
                .toList();

        // Uma única query com IN (via itensPorInventario) em vez de uma por semana do mês.
        List<Long> inventarioIdsDoMes = semanas.stream().map(Inventario::getId).toList();
        Map<Long, List<InventarioItem>> itensPorInventarioDoMes = itensPorInventario(inventarioIdsDoMes, null);

        List<SemanaAcuracidade> semanasResposta = new ArrayList<>();
        List<List<InventarioItem>> itensPorSemana = new ArrayList<>();
        for (int i = 0; i < semanas.size(); i++) {
            Inventario inv = semanas.get(i);
            InventarioResultado resultado = resultadoDe(inv, null);
            semanasResposta.add(new SemanaAcuracidade(i + 1, inv.getData(), resumoDe(inv, resultado), resultado));
            itensPorSemana.add(itensPorInventarioDoMes.getOrDefault(inv.getId(), List.of()));
        }

        List<InventarioItem> mesclados = itensPorSemana.isEmpty()
                ? List.of()
                : acuracidadeService.mesclarMaisRecentePorProduto(itensPorSemana);
        InventarioResultado geralDoMes = mesclados.isEmpty() ? null : acuracidadeService.calcular(mesclados, limiteZerados);

        List<ItemRanking> maioresFaltas = mesclados.stream()
                .filter(i -> i.getValorDivergencia() != null && i.getValorDivergencia().signum() < 0)
                .sorted(Comparator.comparing(InventarioItem::getValorDivergencia))
                .limit(LIMITE_RANKING_PADRAO)
                .map(i -> paraRankingSemFilial(i, filial))
                .toList();
        List<ItemRanking> maioresSobras = mesclados.stream()
                .filter(i -> i.getValorDivergencia() != null && i.getValorDivergencia().signum() > 0)
                .sorted(Comparator.comparing(InventarioItem::getValorDivergencia, Comparator.reverseOrder()))
                .limit(LIMITE_RANKING_PADRAO)
                .map(i -> paraRankingSemFilial(i, filial))
                .toList();

        return new DetalheFilialSemanalAcuracidadeResponse(
                filial.getId(), filial.getNumeroFilial(), filial.getNome(), ano, mes,
                semanasResposta, geralDoMes, maioresFaltas, maioresSobras);
    }

    private ItemRanking paraRankingSemFilial(InventarioItem item, Filiais filial) {
        return new ItemRanking(
                item.getCodProduto(), item.getDescricao(), item.getDivergencia(), item.getValorDivergencia(),
                filial.getId(), filial.getNumeroFilial(), filial.getNome());
    }

    /**
     * Percentual de acuracidade do "Geral" se as divergências cruzadas (possíveis transferências
     * entre armazéns, ver {@link #divergenciasCruzadas}) NÃO tivessem se cancelado na mesclagem —
     * ou seja, contando esses produtos como inacurados, do jeito que já contam em Loja e Estoque
     * isoladamente. Todo produto com divergência cruzada tem, por definição, divergência líquida
     * zero no mesclado (a de um armazém é exatamente o oposto da do outro), então ele sempre conta
     * como acurado no {@code geral} recebido aqui — subtrair a quantidade de acurados (e somar de
     * volta aos inacurados) desfaz exatamente esse efeito, sem precisar refazer a mesclagem.
     */
    private BigDecimal percentualSemTransferencias(InventarioResultado geral, int qtdDivergenciasCruzadas) {
        if (geral == null || qtdDivergenciasCruzadas == 0) {
            return geral != null ? geral.getPercentualAcuracidade() : null;
        }
        int acurados = geral.getProdutosAcurados() - qtdDivergenciasCruzadas;
        int denominador = Boolean.TRUE.equals(geral.getConsiderouZerados())
                ? geral.getTotalProdutos() : geral.getProdutosContados();
        return acuracidadeService.dividir(BigDecimal.valueOf(acurados), BigDecimal.valueOf(denominador));
    }

    private Integer produtosAcuradosSemTransferencias(InventarioResultado geral, int qtdDivergenciasCruzadas) {
        return geral == null ? null : geral.getProdutosAcurados() - qtdDivergenciasCruzadas;
    }

    private Integer produtosInacuradosSemTransferencias(InventarioResultado geral, int qtdDivergenciasCruzadas) {
        return geral == null ? null : geral.getProdutosInacurados() + qtdDivergenciasCruzadas;
    }

    private InventarioResultado resultadoDe(Inventario inv, Armazem armazem) {
        if (inv == null) return null;
        return resultadoRepository.findByInventarioIdAndArmazem(inv.getId(), armazem).orElse(null);
    }

    private InventarioResumo resumoDe(Inventario inv, InventarioResultado resultado) {
        if (inv == null) return null;
        return new InventarioResumo(
                inv.getId(), inv.getData(), inv.getStatus(),
                resultado != null ? resultado.getArquivoNome() : null,
                resultado != null ? resultado.getImportadoEm() : null,
                resultado != null ? resultado.getImportadoPor() : null);
    }

    // --- Ranking ---

    public record Ranking(List<ItemRanking> maioresFaltas, List<ItemRanking> maioresSobras) {
    }

    /**
     * @param tipoFiltro   restringe a CD ou LOJA; null = todas as filiais
     * @param filialIdFiltro restringe a uma filial específica; null = todas dentro do tipoFiltro
     */
    public Ranking ranking(int ano, int mes, TipoFilial tipoFiltro, Long filialIdFiltro, Integer limite) {
        int tamanho = limite != null && limite > 0 ? limite : LIMITE_RANKING_PADRAO;
        YearMonth mesAtual = YearMonth.of(ano, mes);

        Map<Long, Inventario> inventariosPorFilial = inventariosMaisRecentesPorFilial(mesAtual);
        if (inventariosPorFilial.isEmpty()) {
            return new Ranking(List.of(), List.of());
        }

        Map<Long, Filiais> filialPorId = filiaisRepository.findAllById(inventariosPorFilial.keySet()).stream()
                .collect(Collectors.toMap(Filiais::getId, f -> f));

        List<Long> inventarioIds = inventariosPorFilial.entrySet().stream()
                .filter(e -> filialIdFiltro == null || filialIdFiltro.equals(e.getKey()))
                .filter(e -> tipoFiltro == null || tipoFiltro == filialTipoOuNull(filialPorId.get(e.getKey())))
                .map(e -> e.getValue().getId())
                .toList();

        if (inventarioIds.isEmpty()) {
            return new Ranking(List.of(), List.of());
        }

        Map<Long, Filiais> filialPorInventario = new LinkedHashMap<>();
        inventariosPorFilial.forEach((filialId, inv) -> {
            if (inventarioIds.contains(inv.getId())) {
                filialPorInventario.put(inv.getId(), filialPorId.get(filialId));
            }
        });

        Pageable pagina = PageRequest.of(0, tamanho);
        List<InventarioItem> faltas = itemRepository
                .findByInventarioIdInAndValorDivergenciaLessThanOrderByValorDivergenciaAsc(inventarioIds, BigDecimal.ZERO, pagina);
        List<InventarioItem> sobras = itemRepository
                .findByInventarioIdInAndValorDivergenciaGreaterThanOrderByValorDivergenciaDesc(inventarioIds, BigDecimal.ZERO, pagina);

        return new Ranking(
                faltas.stream().map(i -> paraRanking(i, filialPorInventario)).toList(),
                sobras.stream().map(i -> paraRanking(i, filialPorInventario)).toList());
    }

    private TipoFilial filialTipoOuNull(Filiais filial) {
        return filial == null ? null : filial.getTipoFilial();
    }

    private ItemRanking paraRanking(InventarioItem item, Map<Long, Filiais> filialPorInventario) {
        Filiais filial = filialPorInventario.get(item.getInventarioId());
        return new ItemRanking(
                item.getCodProduto(), item.getDescricao(), item.getDivergencia(), item.getValorDivergencia(),
                filial != null ? filial.getId() : null,
                filial != null ? filial.getNumeroFilial() : null,
                filial != null ? filial.getNome() : null);
    }
}
