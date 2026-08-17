package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import portal.ti.queiroz.model.Armazem;
import portal.ti.queiroz.model.InventarioItem;
import portal.ti.queiroz.model.InventarioResultado;
import portal.ti.queiroz.service.AcuracidadeService;

import java.util.List;

/**
 * Importação e consulta dos resultados de inventário (acuracidade de estoque).
 *
 * Fica sob /api/qualidade/** para herdar as regras de papel já definidas no
 * SecurityConfig: leitura para ADMIN/TECNICO/LEITURA/QUALIDADE, escrita para
 * ADMIN/TECNICO/QUALIDADE.
 *
 * O parâmetro `armazem` é opcional e só se aplica a filiais com estoque dividido: o mesmo
 * inventário (mesmo dia) recebe até duas planilhas, uma por armazém (Loja/Estoque).
 */
@RestController
@RequestMapping("/api/qualidade/inventarios")
public class AcuracidadeController {

    @Autowired
    private AcuracidadeService service;

    /** Upload do relatório de produtos exportado do Protheus (XML). */
    @PostMapping("/{id}/resultado")
    public InventarioResultado importar(@PathVariable Long id,
                                        @RequestParam("arquivo") MultipartFile arquivo,
                                        @RequestParam(required = false) Armazem armazem,
                                        Authentication authentication) {
        return service.importar(id, armazem, arquivo, authentication.getName());
    }

    /** 204 quando o inventário (daquele armazém) ainda não teve relatório importado. */
    @GetMapping("/{id}/resultado")
    public ResponseEntity<InventarioResultado> buscarResultado(
            @PathVariable Long id, @RequestParam(required = false) Armazem armazem) {
        return service.buscarResultado(id, armazem)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/{id}/itens")
    public List<InventarioItem> buscarItens(@PathVariable Long id, @RequestParam(required = false) Armazem armazem) {
        return service.buscarItens(id, armazem);
    }

    @DeleteMapping("/{id}/resultado")
    public ResponseEntity<Void> removerResultado(@PathVariable Long id, @RequestParam(required = false) Armazem armazem) {
        service.removerResultado(id, armazem);
        return ResponseEntity.noContent().build();
    }
}
