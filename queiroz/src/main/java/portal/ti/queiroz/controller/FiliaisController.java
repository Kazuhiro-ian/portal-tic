package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.model.Filiais;
import portal.ti.queiroz.service.FiliaisServices;

import java.util.List;

@RestController
@RequestMapping("/api/filiais")
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
    public Filiais atualizar(@PathVariable Long id, @RequestBody Filiais filialAtualizada) {
        return service.atualizar(id, filialAtualizada);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
