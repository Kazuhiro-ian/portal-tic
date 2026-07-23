package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.model.ZebraCota;
import portal.ti.queiroz.service.ZebraCotaService;

import java.util.List;

@RestController
@RequestMapping("/api/zebra-cotas")
public class ZebraCotaController {

    @Autowired
    private ZebraCotaService service;

    @GetMapping
    public List<ZebraCota> listar() {
        return service.listarTodas();
    }

    @PostMapping
    public ZebraCota criar(@RequestBody ZebraCota cota) {
        return service.salvar(cota);
    }

    @PutMapping("/{id}")
    public ZebraCota atualizar(@PathVariable Long id, @RequestBody ZebraCota cota) {
        return service.atualizar(id, cota);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
