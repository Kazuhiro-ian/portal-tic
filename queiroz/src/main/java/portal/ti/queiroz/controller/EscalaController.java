package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.model.Escala;
import portal.ti.queiroz.service.EscalaService;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/escalas")
@CrossOrigin(origins = {"http://localhost:5173", "http://172.128.100.104:5173"})
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
    public ResponseEntity<Escala> salvar(@RequestBody Escala escala) {
        Escala salva = service.salvarOuAtualizar(escala);
        return ResponseEntity.ok(salva);
    }
}