package portal.ti.queiroz.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.dto.SalvarEscalasRequest;
import portal.ti.queiroz.dto.SalvarEscalasResponse;
import portal.ti.queiroz.model.Escala;
import portal.ti.queiroz.service.EscalaService;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/escalas")
public class EscalaController {

    @Autowired
    private EscalaService service;

    // GET: Buscar escalas de um período (ex: /api/escalas?inicio=2026-07-20&fim=2026-07-26)
    @GetMapping
    public List<Escala> buscarPorPeriodo(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim) {
        return service.buscarPorPeriodo(inicio, fim);
    }

    // POST: Salvar ou Atualizar a escala de um dia
    @PostMapping
    public ResponseEntity<Escala> salvar(@Valid @RequestBody Escala escala) {
        Escala salva = service.salvarOuAtualizar(escala);
        return ResponseEntity.ok(salva);
    }

    // PUT: salva de uma vez vários turnos marcados na grade (pincel + vários cliques + 1 save)
    @PutMapping("/dias")
    public SalvarEscalasResponse salvarVarias(@Valid @RequestBody SalvarEscalasRequest request) {
        return service.salvarVarias(request);
    }
}