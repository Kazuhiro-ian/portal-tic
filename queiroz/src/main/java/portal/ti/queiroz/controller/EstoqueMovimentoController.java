package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import portal.ti.queiroz.model.EstoqueMovimento;
import portal.ti.queiroz.service.EstoqueMovimentoService;

import java.util.List;

@RestController
@RequestMapping("/api/estoque/movimentos")
public class EstoqueMovimentoController {

    @Autowired
    private EstoqueMovimentoService service;

    @GetMapping
    public List<EstoqueMovimento> listar() {
        return service.listarTodos();
    }

    @PostMapping
    public EstoqueMovimento criar(@RequestBody EstoqueMovimento movimento) {
        return service.salvar(movimento);
    }
}