package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import portal.ti.queiroz.dto.DetalheFilialAcuracidadeResponse;
import portal.ti.queiroz.dto.DetalheFilialSemanalAcuracidadeResponse;
import portal.ti.queiroz.dto.RelatorioAcuracidadeResponse;
import portal.ti.queiroz.model.TipoFilial;
import portal.ti.queiroz.service.RelatorioAcuracidadeService;

/** Relatório de acuracidade de estoque (o "dashboard" que antes vinha da planilha do setor). */
@RestController
@RequestMapping("/api/qualidade/acuracidade")
public class RelatorioAcuracidadeController {

    @Autowired
    private RelatorioAcuracidadeService service;

    // GET /api/qualidade/acuracidade?ano=2026&mes=8
    @GetMapping
    public RelatorioAcuracidadeResponse relatorioMensal(@RequestParam Integer ano, @RequestParam Integer mes) {
        return service.relatorioMensal(ano, mes);
    }

    // GET /api/qualidade/acuracidade/ranking?ano=2026&mes=8&tipoFilial=CD&filialId=&limite=10
    @GetMapping("/ranking")
    public RelatorioAcuracidadeService.Ranking ranking(
            @RequestParam Integer ano,
            @RequestParam Integer mes,
            @RequestParam(required = false) TipoFilial tipoFilial,
            @RequestParam(required = false) Long filialId,
            @RequestParam(required = false) Integer limite) {
        return service.ranking(ano, mes, tipoFilial, filialId, limite);
    }

    // GET /api/qualidade/acuracidade/filial/42?ano=2026&mes=8
    @GetMapping("/filial/{filialId}")
    public DetalheFilialAcuracidadeResponse detalheFilial(
            @PathVariable Long filialId, @RequestParam Integer ano, @RequestParam Integer mes) {
        return service.detalheFilial(filialId, ano, mes);
    }

    // GET /api/qualidade/acuracidade/filial/42/semanal?ano=2026&mes=8 -- só filiais periodicidade SEMANAL
    @GetMapping("/filial/{filialId}/semanal")
    public DetalheFilialSemanalAcuracidadeResponse detalheSemanalFilial(
            @PathVariable Long filialId, @RequestParam Integer ano, @RequestParam Integer mes) {
        return service.detalheSemanalFilial(filialId, ano, mes);
    }

    // GET /api/qualidade/acuracidade/grupo?tipo=LOJA&ano=2026&mes=8 (tipo omitido = Geral)
    @GetMapping("/grupo")
    public DetalheFilialAcuracidadeResponse detalheGrupo(
            @RequestParam(required = false) TipoFilial tipo,
            @RequestParam Integer ano, @RequestParam Integer mes) {
        return service.detalheGrupo(tipo, ano, mes);
    }
}
