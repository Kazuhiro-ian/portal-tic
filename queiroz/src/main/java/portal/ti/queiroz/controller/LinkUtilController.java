package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.model.LinkUtil;
import portal.ti.queiroz.service.LinkUtilService;

import java.util.List;

@RestController
@RequestMapping("/api/links")
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
    public LinkUtil atualizar(@PathVariable Long id, @RequestBody LinkUtil linkAtualizado) {
        return service.atualizar(id, linkAtualizado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
