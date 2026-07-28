package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.model.DiaEquipe;
import portal.ti.queiroz.service.DiaEquipeService;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/qualidade/equipe-calendario")
public class DiaEquipeController {

    @Autowired
    private DiaEquipeService service;

    @GetMapping
    public List<DiaEquipe> buscarPorPeriodo(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim) {
        return service.buscarPorPeriodo(inicio, fim);
    }

    @PutMapping("/dia")
    public ResponseEntity<DiaEquipe> alternar(@RequestBody DiaEquipe dia) {
        return service.alternar(dia.getData(), dia.getTipo())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }
}