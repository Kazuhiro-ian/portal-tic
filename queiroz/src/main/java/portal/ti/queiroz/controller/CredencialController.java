package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.model.Credencial;
import portal.ti.queiroz.service.CredencialService;

import java.util.List;

@RestController
@RequestMapping("/api/credenciais")
public class CredencialController {

    @Autowired
    private CredencialService service;

    @GetMapping
    public List<Credencial> listar() {
        return service.listarTodas();
    }

    @PostMapping
    public Credencial criar(@RequestBody Credencial credencial) {
        return service.salvar(credencial);
    }

    @PutMapping("/{id}")
    public Credencial atualizar(@PathVariable Long id, @RequestBody Credencial credencial) {
        return service.atualizar(id, credencial);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
