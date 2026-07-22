package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.model.Colaborador;
import portal.ti.queiroz.service.ColaboradorService;

import java.util.List;

@RestController
@RequestMapping("/api/colaboradores")
@CrossOrigin(origins = {"http://localhost:5173", "http://172.128.100.104:5173"})
public class ColaboradorController {

    @Autowired
    private ColaboradorService service;

    @GetMapping
    public List<Colaborador> listar() {
        return service.listarTodos();
    }

    @PostMapping
    public Colaborador criar(@RequestBody Colaborador colaborador) {
        return service.salvar(colaborador);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Colaborador> atualizar(@PathVariable Long id, @RequestBody Colaborador colaboradorAtualizado) {
        try {
            Colaborador colaboradorSalvo = service.atualizar(id, colaboradorAtualizado);
            return ResponseEntity.ok(colaboradorSalvo);
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