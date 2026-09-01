package portal.ti.queiroz.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import portal.ti.queiroz.dto.GerarInventariosSemanaisRequest;
import portal.ti.queiroz.dto.GerarInventariosSemanaisResponse;
import portal.ti.queiroz.dto.PlanoMensalResponse;
import portal.ti.queiroz.dto.SalvarPlanoRequest;
import portal.ti.queiroz.dto.SalvarPlanoResponse;
import portal.ti.queiroz.model.Inventario;
import portal.ti.queiroz.service.InventarioService;
import portal.ti.queiroz.service.PlanoInventarioService;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/qualidade/inventarios")
public class QualidadeInventarioController {

    @Autowired
    private InventarioService service;

    @Autowired
    private PlanoInventarioService planoService;

    // GET /api/qualidade/inventarios?inicio=2026-08-01&fim=2026-08-31
    @GetMapping
    public List<Inventario> buscarPorPeriodo(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim) {
        return service.buscarPorPeriodo(inicio, fim);
    }

    @PostMapping
    public Inventario criar(@RequestBody Inventario inventario) {
        return service.salvar(inventario);
    }

    @PutMapping("/{id}")
    public Inventario atualizar(@PathVariable Long id, @RequestBody Inventario inventario) {
        return service.atualizar(id, inventario);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }

    // POST: apenas calcula a proposta, sem persistir nada
    @PostMapping("/gerar-plano")
    public PlanoMensalResponse gerarPlano(@RequestParam Integer ano, @RequestParam Integer mes) {
        return planoService.gerarPlanoMensal(ano, mes);
    }

    // POST: grava o plano já revisado pelo usuário
    @PostMapping("/salvar-plano")
    public SalvarPlanoResponse salvarPlano(@Valid @RequestBody SalvarPlanoRequest request) {
        return planoService.salvarPlano(request);
    }

    @PostMapping("/gerar-dia-semana")
    public GerarInventariosSemanaisResponse gerarPorDiaSemana(@RequestBody GerarInventariosSemanaisRequest request) {
        return planoService.gerarInventariosPorDiaSemana(request);
    }
}
