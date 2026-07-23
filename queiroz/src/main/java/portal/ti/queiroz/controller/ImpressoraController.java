package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.model.Impressora;
import portal.ti.queiroz.service.ImpressoraService;

import java.util.List;

@RestController
@RequestMapping("/api/impressoras")
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
    public Impressora atualizar(@PathVariable Long id, @RequestBody Impressora impressoraAtualizada) {
        return service.atualizar(id, impressoraAtualizada);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
