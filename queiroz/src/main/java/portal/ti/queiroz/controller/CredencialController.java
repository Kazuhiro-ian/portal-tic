package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.model.Credencial;
import portal.ti.queiroz.service.CredencialService;

import java.util.List;

@RestController
@RequestMapping("/api/credenciais")
@CrossOrigin(origins = {"http://localhost:5173", "http://172.128.100.104:5173"})
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
    public ResponseEntity<Credencial> atualizar(@PathVariable Long id, @RequestBody Credencial credencial) {
        try {
            return ResponseEntity.ok(service.atualizar(id, credencial));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        if (service.deletar(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}