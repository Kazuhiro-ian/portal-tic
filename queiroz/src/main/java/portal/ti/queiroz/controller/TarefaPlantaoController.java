package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.model.TarefaPlantao;
import portal.ti.queiroz.service.TarefaPlantaoService;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/tarefas-plantao")
@CrossOrigin(origins = {"http://localhost:5173", "http://172.128.100.104:5173"})
public class TarefaPlantaoController {

    @Autowired
    private TarefaPlantaoService service;

    @GetMapping
    public List<TarefaPlantao> listarPorData(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data) {
        return service.buscarPorData(data);
    }

    @PostMapping
    public TarefaPlantao criar(@RequestBody TarefaPlantao tarefa) {
        return service.salvar(tarefa);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<TarefaPlantao> atualizarStatus(@PathVariable Long id, @RequestBody String status) {
        try {
            // Remove aspas caso enviadas via body
            String statusLimpo = status.replace("\"", "").trim();
            TarefaPlantao atualizada = service.atualizarStatus(id, statusLimpo);
            return ResponseEntity.ok(atualizada);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        if (service.deletar(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}