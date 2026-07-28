package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.model.EquipeInventario;
import portal.ti.queiroz.service.EquipeInventarioService;

import java.util.List; 

@RestController
@RequestMapping("/api/qualidade/equipes")
public class EquipeInventarioController {
    @Autowired
    private EquipeInventarioService service;

    @GetMapping
    public List<EquipeInventario> listar() {
        return service.listarTodas();
    }

    @PostMapping 
    public EquipeInventario criar(@RequestBody EquipeInventario equipe) {
        return service.salvar(equipe);
    }

    @PutMapping("/{id}")
    public EquipeInventario atualizar(@PathVariable Long id, @RequestBody EquipeInventario equipeAtualizada) {
        return service.atualizar(id, equipeAtualizada);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}