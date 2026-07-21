package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.model.Impressora;
import portal.ti.queiroz.service.ImpressoraService;

import java.util.List;

@RestController
@RequestMapping("/api/impressoras")
@CrossOrigin(origins = {"http://localhost:5173", "http://172.128.100.104:5173"})
public class ImpressoraController {

    @Autowired
    private ImpressoraService service;

    @GetMapping
    public List<Impressora> listar() {
        return service.listarTodas();
    }

    @PostMapping
    public Impressora criar(@RequestBody Impressora impressora) {
        return service.salvar(impressora);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Impressora> atualizar(@PathVariable Long id, @RequestBody Impressora impressoraAtualizada) {
        try {
            Impressora impressoraSalva = service.atualizar(id, impressoraAtualizada);
            return ResponseEntity.ok(impressoraSalva);
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