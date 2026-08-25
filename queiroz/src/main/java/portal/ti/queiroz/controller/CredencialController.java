package portal.ti.queiroz.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.dto.AtualizarCredencialRequest;
import portal.ti.queiroz.dto.CredencialResponse;
import portal.ti.queiroz.dto.CriarCredencialRequest;
import portal.ti.queiroz.dto.RevelarSenhaResponse;
import portal.ti.queiroz.model.TipoAcaoCredencial;
import portal.ti.queiroz.service.CredencialService;

import java.util.List;

@RestController
@RequestMapping("/api/credenciais")
public class CredencialController {

    @Autowired
    private CredencialService service;

    @GetMapping
    public List<CredencialResponse> listar() {
        return service.listarTodas();
    }

    @GetMapping("/{id}/revelar")
    public RevelarSenhaResponse revelar(@PathVariable Long id,
                                         @RequestParam(required = false) TipoAcaoCredencial acao) {
        return new RevelarSenhaResponse(service.revelarSenha(id, acao));
    }

    @PostMapping
    public CredencialResponse criar(@Valid @RequestBody CriarCredencialRequest request) {
        return service.salvar(request.paraEntidade());
    }

    @PutMapping("/{id}")
    public CredencialResponse atualizar(@PathVariable Long id, @Valid @RequestBody AtualizarCredencialRequest request) {
        return service.atualizar(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
