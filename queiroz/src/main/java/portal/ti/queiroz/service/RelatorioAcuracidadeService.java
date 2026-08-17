package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.dto.DetalheFilialAcuracidadeResponse;
import portal.ti.queiroz.dto.DivergenciaCruzada;
import portal.ti.queiroz.dto.InventarioResumo;
import portal.ti.queiroz.dto.ItemRanking;
import portal.ti.queiroz.dto.RelatorioAcuracidadeResponse;
import portal.ti.queiroz.dto.ResultadoArmazem;
import portal.ti.queiroz.dto.ResumoFilialAcuracidade;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.Armazem;
import portal.ti.queiroz.model.Filiais;
import portal.ti.queiroz.model.Inventario;
import portal.ti.queiroz.model.InventarioItem;
import portal.ti.queiroz.model.InventarioResultado;
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

/**
 * Monta o relatório de acuracidade (o equivalente ao "dashboard" da planilha do
 * setor): comparativo mês atual x anterior por filial, agregados CDs/Lojas/Geral,
 * ranking dos produtos com maior sobra/falta, e o detalhamento por armazém (Loja/
 * Estoque) das filiais que aderiram ao estoque dividido.
 *
 * Para cada filial, "o resultado do mês" é o do upload mais recente no período —
 * não a soma de vários uploads da mesma filial. O Protheus já consolida contagens
 * feitas em datas diferentes (ex: os sábados do CD 00) quando a consulta roda com
 * o intervalo do mês inteiro, então re-somar itens de inventários diferentes da
 * MESMA filial aqui duplicaria contagem. Já os agregados por grupo (CDs/Lojas/
 * Geral) somam entre filiais DIFERENTES, o que é seguro — cada filial é um
 * estoque genuinamente separado.
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

        Map<Long, InventarioResultado> geralAtual = new LinkedHashMap<>();
        Map<Long, InventarioResultado> geralAnterior = new LinkedHashMap<>();
        List<ResumoFilialAcuracidade> linhas = new ArrayList<>();

        for (Filiais f : filiais) {
            InventarioResultado r01Atual = resultadoAtual01.get(f.getId());
            InventarioResultado r03Atual = resultadoAtual03.get(f.getId());
            InventarioResultado r01Anterior = resultadoAnterior01.get(f.getId());
            InventarioResultado r03Anterior = resultadoAnterior03.get(f.getId());

            InventarioResultado rGeralAtual = geral(inventariosAtual.get(f.getId()), r01Atual, r03Atual, limiteZerados);
            InventarioResultado rGeralAnterior = geral(inventariosAnterior.get(f.getId()), r01Anterior, r03Anterior, limiteZerados);
            if (rGeralAtual != null) geralAtual.put(f.getId(), rGeralAtual);
            if (rGeralAnterior != null) geralAnterior.put(f.getId(), rGeralAnterior);

            boolean dividida = Boolean.TRUE.equals(f.getEstoqueDividido());
            ResultadoArmazem armazem01 = dividida && (r01Atual != null || r01Anterior != null)
                    ? new ResultadoArmazem(r01Atual, r01Anterior) : null;
            ResultadoArmazem armazem03 = dividida && (r03Atual != null || r03Anterior != null)
                    ? new ResultadoArmazem(r03Atual, r03Anterior) : null;

            Integer divergenciasCruzadas = null;
            if (dividida) {
                int quantidade = divergenciasCruzadas(inventariosAtual.get(f.getId())).size();
                divergenciasCruzadas = quantidade > 0 ? quantidade : null;
            }

            linhas.add(new ResumoFilialAcuracidade(
                    f.getId(), f.getNumeroFilial(), f.getNome(), f.getTipoFilial(),
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

        return new ResumoFilialAcuracidade(null, null, nome, tipo,
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
     */
    private InventarioResultado geral(Inventario inventario, InventarioResultado r01, InventarioResultado r03, int limiteZerados) {
        if (r01 != null && r03 != null) {
            List<InventarioItem> itens01 = itemRepository.findByInventarioIdAndArmazem(inventario.getId(), Armazem.ARMAZEM_01);
            List<InventarioItem> itens03 = itemRepository.findByInventarioIdAndArmazem(inventario.getId(), Armazem.ARMAZEM_03);
            List<InventarioItem> mesclados = acuracidadeService.mesclarPorProduto(itens01, itens03);
            return acuracidadeService.calcular(mesclados, limiteZerados);
        }
        return r01 != null ? r01 : r03;
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
     * Estoque). Não altera o percentual de acuracidade de nenhum dos dois armazéns — é apenas
     * um alerta informativo.
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

    // --- Detalhe por filial (painel lateral / dashboard da tela de Acuracidade) ---

    public DetalheFilialAcuracidadeResponse detalheFilial(Long filialId, int ano, int mes) {
        Filiais filial = filiaisRepository.findById(filialId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Filial não encontrada com o ID: " + filialId));

        YearMonth mesAtual = YearMonth.of(ano, mes);
        YearMonth mesAnterior = mesAtual.minusMonths(1);
        int limiteZerados = acuracidadeService.configuracaoAtual().getLimiteZerados();

        Inventario invAtual = inventariosMaisRecentesPorFilial(mesAtual).get(filialId);
        Inventario invAnterior = inventariosMaisRecentesPorFilial(mesAnterior).get(filialId);

        InventarioResultado r01Atual = resultadoDe(invAtual, Armazem.ARMAZEM_01);
        InventarioResultado r03Atual = resultadoDe(invAtual, Armazem.ARMAZEM_03);
        InventarioResultado r01Anterior = resultadoDe(invAnterior, Armazem.ARMAZEM_01);
        InventarioResultado r03Anterior = resultadoDe(invAnterior, Armazem.ARMAZEM_03);

        boolean dividida = Boolean.TRUE.equals(filial.getEstoqueDividido());

        ResultadoArmazem geral = new ResultadoArmazem(
                geral(invAtual, r01Atual, r03Atual, limiteZerados),
                geral(invAnterior, r01Anterior, r03Anterior, limiteZerados));
        ResultadoArmazem armazem01 = new ResultadoArmazem(r01Atual, r01Anterior);
        ResultadoArmazem armazem03 = dividida ? new ResultadoArmazem(r03Atual, r03Anterior) : null;

        List<DivergenciaCruzada> divergencias = dividida ? divergenciasCruzadas(invAtual) : List.of();

        Ranking ranking = ranking(ano, mes, null, filialId, null);

        return new DetalheFilialAcuracidadeResponse(
                filial.getId(), filial.getNumeroFilial(), filial.getNome(), filial.getTipoFilial(), dividida,
                geral, armazem01, armazem03,
                divergencias, ranking.maioresFaltas(), ranking.maioresSobras(),
                resumoDe(invAtual, r01Atual), dividida ? resumoDe(invAtual, r03Atual) : null);
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
