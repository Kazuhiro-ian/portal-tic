package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.model.LinkUtil;
import portal.ti.queiroz.service.LinkUtilService;

import java.util.List;

@RestController
@RequestMapping("/api/links")
@CrossOrigin(origins = {"http://localhost:5173", "http://172.128.100.104:5173"})
public class LinkUtilController {

    @Autowired
    private LinkUtilService service;

    @GetMapping
    public List<LinkUtil> listar() {
        return service.listarTodos();
    }

    @PostMapping
    public LinkUtil criar(@RequestBody LinkUtil link) {
        return service.salvar(link);
    }

    @PutMapping("/{id}")
    public ResponseEntity<LinkUtil> atualizar(@PathVariable Long id, @RequestBody LinkUtil linkAtualizado) {
        try {
            LinkUtil linkSalvo = service.atualizar(id, linkAtualizado);
            return ResponseEntity.ok(linkSalvo);
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