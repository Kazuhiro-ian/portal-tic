package portal.ti.queiroz.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.dto.ConflitoInventario;
import portal.ti.queiroz.dto.PadraoMensalRequest;
import portal.ti.queiroz.dto.PadraoMensalResponse;
import portal.ti.queiroz.dto.SalvarDiasRecebimentoRequest;
import portal.ti.queiroz.dto.SalvarDiasRecebimentoResponse;
import portal.ti.queiroz.model.DiaRecebimento;
import portal.ti.queiroz.service.RecebimentoService;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/qualidade/recebimentos")
public class QualidadeRecebimentoController {

    @Autowired
    private RecebimentoService service;

    // GET /api/qualidade/recebimentos?inicio=2026-08-01&fim=2026-08-31
    @GetMapping
    public List<DiaRecebimento> buscarPorPeriodo(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim) {
        return service.buscarPorPeriodo(inicio, fim);
    }

    // POST: expande o padrão semanal para todas as datas do mês
    @PostMapping("/padrao-mensal")
    public PadraoMensalResponse aplicarPadraoMensal(@Valid @RequestBody PadraoMensalRequest request) {
        return service.aplicarPadraoMensal(request);
    }

    // PUT: salva de uma vez os dias marcados no calendário (pincel + vários cliques + 1 save)
    @PutMapping("/dias")
    public SalvarDiasRecebimentoResponse salvarDias(@RequestBody SalvarDiasRecebimentoRequest request) {
        return service.salvarDias(request);
    }

    // GET: inventários planejados que batem com dia de recebimento do próprio grupo
    @GetMapping("/conflitos")
    public List<ConflitoInventario> conflitos(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim) {
        return service.detectarConflitos(inicio, fim);
    }
}
