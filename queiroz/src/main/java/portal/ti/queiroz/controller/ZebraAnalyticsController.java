package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.dto.PrevisaoConsumoZebra;
import portal.ti.queiroz.dto.RankingConsumoZebra;
import portal.ti.queiroz.dto.ResumoConsumoZebra;
import portal.ti.queiroz.service.ZebraConsumoAnalyticsService;

import java.util.List;

@RestController
@RequestMapping("/api/zebra-envios/analytics")
public class ZebraAnalyticsController {

    @Autowired
    private ZebraConsumoAnalyticsService service;

    // GET /api/zebra-envios/analytics/resumo-mensal?ano=2026&mes=9
    @GetMapping("/resumo-mensal")
    public List<ResumoConsumoZebra> resumoMensal(@RequestParam Integer ano, @RequestParam Integer mes) {
        return service.resumoMensal(ano, mes);
    }

    // GET /api/zebra-envios/analytics/previsao-proximo-mes
    @GetMapping("/previsao-proximo-mes")
    public List<PrevisaoConsumoZebra> previsaoProximoMes() {
        return service.previsaoProximoMes();
    }

    // GET /api/zebra-envios/analytics/ranking?ano=2026&mes=9&limite=10
    @GetMapping("/ranking")
    public List<RankingConsumoZebra> ranking(@RequestParam Integer ano, @RequestParam Integer mes,
                                              @RequestParam(required = false) Integer limite) {
        return service.rankingConsumo(ano, mes, limite);
    }
}
