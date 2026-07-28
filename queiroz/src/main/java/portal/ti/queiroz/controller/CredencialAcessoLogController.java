package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import portal.ti.queiroz.model.CredencialAcessoLog;
import portal.ti.queiroz.service.CredencialAcessoLogService;

import java.util.List;

@RestController
@RequestMapping("/api/credenciais/auditoria")
public class CredencialAcessoLogController {

    @Autowired
    private CredencialAcessoLogService service;

    @GetMapping
    public List<CredencialAcessoLog> listar() {
        return service.listarTodos();
    }
}
