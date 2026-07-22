package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.model.Artigo;
import portal.ti.queiroz.service.ArtigoService;

import java.util.List;

@RestController
@RequestMapping("/api/artigos")
@CrossOrigin(origins = {"http://localhost:5173", "http://172.128.100.104:5173"})
public class ArtigoController {

    @Autowired
    private ArtigoService service;

    @GetMapping
    public List<Artigo> listar() {
        return service.listarTodos();
    }

    @PostMapping
    public Artigo criar(@RequestBody Artigo artigo) {
        return service.salvar(artigo);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Artigo> atualizar(@PathVariable Long id, @RequestBody Artigo artigo) {
        try {
            return ResponseEntity.ok(service.atualizar(id, artigo));
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