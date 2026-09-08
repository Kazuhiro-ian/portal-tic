package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import portal.ti.queiroz.dto.ConfirmarEnvioZebraRequest;
import portal.ti.queiroz.dto.ImportarCronogramaZebraResponse;
import portal.ti.queiroz.model.ZebraEnvio;
import portal.ti.queiroz.service.ZebraEnvioService;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/zebra-envios")
public class ZebraEnvioController {

    @Autowired
    private ZebraEnvioService service;

    // GET /api/zebra-envios?inicio=2026-09-01&fim=2026-09-30
    @GetMapping
    public List<ZebraEnvio> listar(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim) {
        return service.listarPorPeriodo(inicio, fim);
    }

    @PostMapping
    public ZebraEnvio criar(@RequestParam(defaultValue = "false") boolean jaEnviado,
                             @RequestBody ZebraEnvio envio) {
        return service.salvar(envio, jaEnviado);
    }

    @PostMapping("/{id}/confirmar")
    public ZebraEnvio confirmar(@PathVariable Long id, @RequestBody ConfirmarEnvioZebraRequest request) {
        return service.confirmarEnvio(id, request);
    }

    @PostMapping("/{id}/cancelar")
    public ZebraEnvio cancelar(@PathVariable Long id) {
        return service.cancelar(id);
    }

    @PostMapping("/importar-cronograma")
    public ImportarCronogramaZebraResponse importarCronograma(@RequestParam MultipartFile arquivo) {
        return service.importarCronograma(arquivo);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}