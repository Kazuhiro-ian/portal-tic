package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.model.ZebraEnvio;
import portal.ti.queiroz.service.ZebraEnvioService;

import java.util.List;

@RestController
@RequestMapping("/api/zebra-envios")
public class ZebraEnvioController {

    @Autowired
    private ZebraEnvioService service;

    @GetMapping
    public List<ZebraEnvio> listar() {
        return service.listarTodos();
    }

    @PostMapping
    public ZebraEnvio criar(@RequestBody ZebraEnvio envio) {
        return service.salvar(envio);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
