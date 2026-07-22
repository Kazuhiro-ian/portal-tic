package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.model.ZebraCota;
import portal.ti.queiroz.service.ZebraCotaService;

import java.util.List;

@RestController
@RequestMapping("/api/zebra-cotas")
@CrossOrigin(origins = {"http://localhost:5173", "http://172.128.100.104:5173"})
public class ZebraCotaController {

    @Autowired
    private ZebraCotaService service;

    @GetMapping
    public List<ZebraCota> listar() {
        return service.listarTodas();
    }

    @PostMapping
    public ResponseEntity<?> criar(@RequestBody ZebraCota cota) {
        try {
            return ResponseEntity.ok(service.salvar(cota));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> atualizar(@PathVariable Long id, @RequestBody ZebraCota cota) {
        try {
            return ResponseEntity.ok(service.atualizar(id, cota));
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