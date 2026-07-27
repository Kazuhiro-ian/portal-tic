package portal.ti.queiroz.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.dto.ConflitoInventario;
import portal.ti.queiroz.dto.PadraoMensalRequest;
import portal.ti.queiroz.dto.PadraoMensalResponse;
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

    // PUT: sobrescreve um dia específico (feriado, entrega extra)
    @PutMapping("/dia")
    public DiaRecebimento salvarDia(@RequestBody DiaRecebimento dia) {
        return service.salvarDia(dia.getData(), dia.getTipo(), dia.getObservacao());
    }

    // GET: inventários planejados que batem com dia de recebimento do próprio grupo
    @GetMapping("/conflitos")
    public List<ConflitoInventario> conflitos(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim) {
        return service.detectarConflitos(inicio, fim);
    }
}
