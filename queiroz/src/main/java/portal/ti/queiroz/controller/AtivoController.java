package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.dto.TesteConexaoResponse;
import portal.ti.queiroz.model.Ativo;
import portal.ti.queiroz.service.AtivoService;

import java.util.List;

@RestController
@RequestMapping("/api/ativos")
public class AtivoController {

    @Autowired
    private AtivoService service;

    @GetMapping
    public List<Ativo> listar() {
        return service.listarTodos();
    }

    @PostMapping
    public Ativo criar(@RequestBody Ativo ativo) {
        return service.salvar(ativo);
    }

    @PutMapping("/{id}")
    public Ativo atualizar(@PathVariable Long id, @RequestBody Ativo ativoAtualizado) {
        return service.atualizar(id, ativoAtualizado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/ping")
    public TesteConexaoResponse ping(@PathVariable Long id) {
        return service.testarConexao(id);
    }
}