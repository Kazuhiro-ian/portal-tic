package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.model.EstoqueItem;
import portal.ti.queiroz.service.EstoqueItemService;

import java.util.List;

@RestController
@RequestMapping("/api/estoque/itens")
@CrossOrigin(origins = {"http://localhost:5173", "http://172.128.100.104:5173"})
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
    public ResponseEntity<EstoqueItem> atualizar(@PathVariable Long id, @RequestBody EstoqueItem itemAtualizado) {
        try {
            EstoqueItem itemSalvo = service.atualizar(id, itemAtualizado);
            return ResponseEntity.ok(itemSalvo);
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