package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.dto.ItemRanking;
import portal.ti.queiroz.dto.RelatorioAcuracidadeResponse;
import portal.ti.queiroz.dto.ResumoFilialAcuracidade;
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
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

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

        List<Filiais> filiais = filiaisRepository.findAll().stream()
                .sorted(Comparator.comparing(Filiais::getNumeroFilial))
                .toList();

        Map<Long, InventarioResultado> resultadoAtual = resultadosPorFilial(inventariosMaisRecentesPorFilial(mesAtual));
        Map<Long, InventarioResultado> resultadoAnterior = resultadosPorFilial(inventariosMaisRecentesPorFilial(mesAnterior));

        List<ResumoFilialAcuracidade> linhas = filiais.stream()
                .map(f -> new ResumoFilialAcuracidade(
                        f.getId(), f.getNumeroFilial(), f.getNome(), f.getTipoFilial(),
                        resultadoAtual.get(f.getId()), resultadoAnterior.get(f.getId())))
                .toList();

        ResumoFilialAcuracidade cds = agregado("Centros de Distribuição", TipoFilial.CD, filiais, resultadoAtual, resultadoAnterior);
        ResumoFilialAcuracidade lojas = agregado("Lojas", TipoFilial.LOJA, filiais, resultadoAtual, resultadoAnterior);
        ResumoFilialAcuracidade geral = agregado("Geral", null, filiais, resultadoAtual, resultadoAnterior);

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
                somarSeExistir(idsDoGrupo, atual), somarSeExistir(idsDoGrupo, anterior));
    }

    private InventarioResultado somarSeExistir(List<Long> filialIds, Map<Long, InventarioResultado> porFilial) {
        List<InventarioResultado> resultados = filialIds.stream()
                .map(porFilial::get)
                .filter(Objects::nonNull)
                .toList();
        return resultados.isEmpty() ? null : acuracidadeService.somarResultados(resultados);
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

    private Map<Long, InventarioResultado> resultadosPorFilial(Map<Long, Inventario> inventariosPorFilial) {
        if (inventariosPorFilial.isEmpty()) return Map.of();

        List<Long> inventarioIds = inventariosPorFilial.values().stream().map(Inventario::getId).toList();
        Map<Long, InventarioResultado> porInventario = resultadoRepository.findByInventarioIdIn(inventarioIds).stream()
                .collect(Collectors.toMap(InventarioResultado::getInventarioId, r -> r));

        Map<Long, InventarioResultado> porFilial = new LinkedHashMap<>();
        inventariosPorFilial.forEach((filialId, inv) -> {
            InventarioResultado resultado = porInventario.get(inv.getId());
            if (resultado != null) porFilial.put(filialId, resultado);
        });
        return porFilial;
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
