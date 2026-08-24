package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.dto.SalvarDiasEquipeRequest;
import portal.ti.queiroz.dto.SalvarDiasEquipeResponse;
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

    // PUT: salva de uma vez os dias marcados no calendário (pincel + vários cliques + 1 save)
    @PutMapping("/dias")
    public SalvarDiasEquipeResponse salvarDias(@RequestBody SalvarDiasEquipeRequest request) {
        return service.salvarDias(request);
    }
}