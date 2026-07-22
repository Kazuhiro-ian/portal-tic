package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.model.ZebraEnvio;
import portal.ti.queiroz.service.ZebraEnvioService;

import java.util.List;

@RestController
@RequestMapping("/api/zebra-envios")
@CrossOrigin(origins = {"http://localhost:5173", "http://172.128.100.104:5173"})
public class ZebraEnvioController {

    @Autowired
    private ZebraEnvioService service;

    @GetMapping
    public List<ZebraEnvio> listar() {
        return service.listarTodos();
    }

    @PostMapping
    public ResponseEntity<?> criar(@RequestBody ZebraEnvio envio) {
        try {
            return ResponseEntity.ok(service.salvar(envio));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}