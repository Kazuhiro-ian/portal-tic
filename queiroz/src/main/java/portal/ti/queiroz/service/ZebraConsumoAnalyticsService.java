package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.dto.PrevisaoConsumoZebra;
import portal.ti.queiroz.dto.RankingConsumoZebra;
import portal.ti.queiroz.dto.ResumoConsumoZebra;
import portal.ti.queiroz.model.Filiais;
import portal.ti.queiroz.model.StatusZebraEnvio;
import portal.ti.queiroz.model.ZebraEnvio;
import portal.ti.queiroz.repository.FiliaisRepository;
import portal.ti.queiroz.repository.ZebraEnvioRepository;

import java.time.YearMonth;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Analytics de consumo de etiquetas/ribbons (Insumos Zebra): resumo mensal com classificação
 * calculada, previsão de compra do próximo mês e ranking de filiais que mais consomem. Molde em
 * RelatorioAcuracidadeService -- agregação por filial a partir dos envios já confirmados (ENVIADO).
 *
 * Importante: ZebraEnvio.filialId guarda o NÚMERO da loja (numeroFilial), não o id do banco --
 * mesma convenção usada em todo o módulo Zebra (ZebraCota, formulário manual, utils/filiais.js
 * no frontend). Por isso os mapas aqui são sempre indexados por numeroFilial, nunca por Filiais.id.
 */
@Service
public class ZebraConsumoAnalyticsService {

    @Autowired
    private ZebraEnvioRepository repository;

    @Autowired
    private FiliaisRepository filiaisRepository;

    public List<ResumoConsumoZebra> resumoMensal(Integer ano, Integer mes) {
        YearMonth alvo = RecebimentoService.mesDe(ano, mes);
        List<Filiais> filiais = filiaisRepository.findAll();

        Map<Long, int[]> totaisPorFilial = totaisPorFilial(
                repository.findByStatusAndDataEnvioBetween(StatusZebraEnvio.ENVIADO, alvo.atDay(1), alvo.atEndOfMonth()));

        Map<Long, String> classificacao = classificarConsumo(alvo);

        return filiais.stream()
                .filter(f -> f.getNumeroFilial() != null)
                .sorted(Comparator.comparing(Filiais::getNumeroFilial))
                .map(f -> {
                    Long chave = Long.valueOf(f.getNumeroFilial());
                    int[] totais = totaisPorFilial.getOrDefault(chave, new int[2]);
                    String rotulo = classificacao.getOrDefault(chave, "Sem histórico");
                    return new ResumoConsumoZebra(chave, f.getNumeroFilial(), f.getNome(), totais[0], totais[1], rotulo);
                })
                .toList();
    }

    /** Média móvel dos últimos 3 meses (ENVIADO) por filial, como previsão simples do próximo mês. */
    public List<PrevisaoConsumoZebra> previsaoProximoMes() {
        YearMonth mesAtual = YearMonth.now();
        YearMonth inicio3Meses = mesAtual.minusMonths(2);

        Map<Long, int[]> totaisPorFilial = totaisPorFilial(
                repository.findByStatusAndDataEnvioBetween(StatusZebraEnvio.ENVIADO, inicio3Meses.atDay(1), mesAtual.atEndOfMonth()));

        Map<Integer, Filiais> filiaisPorNumero = filiaisPorNumero();

        return totaisPorFilial.entrySet().stream()
                .map(entry -> {
                    Filiais f = filiaisPorNumero.get(entry.getKey().intValue());
                    if (f == null) return null;
                    int[] totais = entry.getValue();
                    return new PrevisaoConsumoZebra(entry.getKey(), f.getNumeroFilial(), f.getNome(),
                            totais[0] / 3.0, totais[1] / 3.0);
                })
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(PrevisaoConsumoZebra::numeroFilial))
                .toList();
    }

    public List<RankingConsumoZebra> rankingConsumo(Integer ano, Integer mes, Integer limite) {
        YearMonth alvo = RecebimentoService.mesDe(ano, mes);
        Map<Long, int[]> totaisPorFilial = totaisPorFilial(
                repository.findByStatusAndDataEnvioBetween(StatusZebraEnvio.ENVIADO, alvo.atDay(1), alvo.atEndOfMonth()));

        Map<Integer, Filiais> filiaisPorNumero = filiaisPorNumero();
        int max = limite != null ? limite : 10;

        return totaisPorFilial.entrySet().stream()
                .map(entry -> {
                    Filiais f = filiaisPorNumero.get(entry.getKey().intValue());
                    if (f == null) return null;
                    int[] totais = entry.getValue();
                    return new RankingConsumoZebra(entry.getKey(), f.getNumeroFilial(), f.getNome(), totais[0], totais[1]);
                })
                .filter(Objects::nonNull)
                .sorted(Comparator.comparingInt((RankingConsumoZebra r) -> r.totalEtiquetas() + r.totalRibbons()).reversed())
                .limit(max)
                .toList();
    }

    /** Soma etiquetas[0]/ribbons[1] por filial (chave = numeroFilial) a partir dos envios ENVIADO. */
    private Map<Long, int[]> totaisPorFilial(List<ZebraEnvio> envios) {
        Map<Long, int[]> totais = new HashMap<>();
        for (ZebraEnvio e : envios) {
            int[] par = totais.computeIfAbsent(e.getFilialId(), k -> new int[2]);
            par[0] += e.getQtdEtiquetas();
            par[1] += e.getQtdRibbons();
        }
        return totais;
    }

    private Map<Integer, Filiais> filiaisPorNumero() {
        return filiaisRepository.findAll().stream()
                .filter(f -> f.getNumeroFilial() != null)
                .collect(Collectors.toMap(Filiais::getNumeroFilial, f -> f, (a, b) -> a));
    }

    /**
     * Classifica cada filial em 3 faixas (Muito Alto / Alto / Médio-Baixo Consumo) comparando
     * o total dos últimos 3 meses entre si -- substitui a coluna preenchida à mão na planilha.
     */
    private Map<Long, String> classificarConsumo(YearMonth alvo) {
        YearMonth inicio3Meses = alvo.minusMonths(2);
        Map<Long, int[]> totaisPorFilial = totaisPorFilial(
                repository.findByStatusAndDataEnvioBetween(StatusZebraEnvio.ENVIADO, inicio3Meses.atDay(1), alvo.atEndOfMonth()));

        List<Long> ordenado = totaisPorFilial.entrySet().stream()
                .sorted(Comparator.comparingInt(e -> e.getValue()[0] + e.getValue()[1]))
                .map(Map.Entry::getKey)
                .toList();

        int total = ordenado.size();
        Map<Long, String> classificacao = new HashMap<>();
        for (int i = 0; i < total; i++) {
            String rotulo;
            if (i >= total * 2 / 3) {
                rotulo = "Muito Alto Consumo";
            } else if (i >= total / 3) {
                rotulo = "Alto Consumo";
            } else {
                rotulo = "Médio/Baixo Consumo";
            }
            classificacao.put(ordenado.get(i), rotulo);
        }
        return classificacao;
    }
}
