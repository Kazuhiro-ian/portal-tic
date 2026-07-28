package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.model.Aviso;
import portal.ti.queiroz.service.AvisoService;

import java.util.List;

@RestController
@RequestMapping("/api/avisos")
public class AvisoController {

    @Autowired
    private AvisoService service;

    @GetMapping
    public List<Aviso> listar() {
        return service.listarTodos();
    }

    @PostMapping
    public Aviso criar(@RequestBody Aviso aviso, Authentication authentication) {
        return service.salvar(aviso, authentication.getName());
    }

    @PutMapping("/{id}")
    public Aviso atualizar(@PathVariable Long id, @RequestBody Aviso aviso) {
        return service.atualizar(id, aviso);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
