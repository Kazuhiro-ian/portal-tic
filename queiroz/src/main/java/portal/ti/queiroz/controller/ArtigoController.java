package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.model.Artigo;
import portal.ti.queiroz.service.ArtigoService;

import java.util.List;

@RestController
@RequestMapping("/api/artigos")
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
    public Artigo atualizar(@PathVariable Long id, @RequestBody Artigo artigo) {
        return service.atualizar(id, artigo);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
