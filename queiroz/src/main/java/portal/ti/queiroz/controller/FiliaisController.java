package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.model.Filiais;
import portal.ti.queiroz.service.FiliaisServices;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/filiais")
@CrossOrigin(origins = "*") // Permite que o seu React (localhost:5173) acesse essa API na sua máquina local
public class FiliaisController {

    @Autowired
    private FiliaisServices service;

    @GetMapping
    public List<Filiais> listar() {
        return service.listarTodas();
    }

    @PostMapping
    public Filiais criar(@RequestBody Filiais filial) {
        return service.salvar(filial);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Filiais> atualizar(@PathVariable Long id, @RequestBody Filiais filialAtualizada) {
        try {
            Filiais filialSalva = service.atualizar(id, filialAtualizada);
            return ResponseEntity.ok(filialSalva);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        boolean deletado = service.deletar(id);
        if (deletado) {
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}