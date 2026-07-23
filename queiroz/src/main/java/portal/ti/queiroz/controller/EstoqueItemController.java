package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.model.EstoqueItem;
import portal.ti.queiroz.service.EstoqueItemService;

import java.util.List;

@RestController
@RequestMapping("/api/estoque/itens")
public class EstoqueItemController {

    @Autowired
    private EstoqueItemService service;

    @GetMapping
    public List<EstoqueItem> listar() {
        return service.listarTodos();
    }

    @PostMapping
    public EstoqueItem criar(@RequestBody EstoqueItem item) {
        return service.salvar(item);
    }

    @PutMapping("/{id}")
    public EstoqueItem atualizar(@PathVariable Long id, @RequestBody EstoqueItem itemAtualizado) {
        return service.atualizar(id, itemAtualizado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
