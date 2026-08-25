package portal.ti.queiroz.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.dto.PingDisponibilidadeResponse;
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
    public Ativo criar(@Valid @RequestBody Ativo ativo) {
        return service.salvar(ativo);
    }

    @PutMapping("/{id}")
    public Ativo atualizar(@PathVariable Long id, @Valid @RequestBody Ativo ativoAtualizado) {
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

    /** Consultado pelo frontend na abertura da tela para decidir se mostra o botão de teste. */
    @GetMapping("/ping-habilitado")
    public PingDisponibilidadeResponse pingHabilitado() {
        boolean habilitado = service.isPingHabilitado();
        return new PingDisponibilidadeResponse(habilitado, habilitado ? null : AtivoService.MOTIVO_PING_DESABILITADO);
    }
}