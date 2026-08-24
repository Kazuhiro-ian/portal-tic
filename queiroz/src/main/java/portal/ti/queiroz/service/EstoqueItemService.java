package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.EstoqueItem;
import portal.ti.queiroz.repository.EstoqueItemRepository;

import java.util.List;

// CRUD dos itens de estoque (consumíveis e ativos rastreados por número de série).
@Service
public class EstoqueItemService {

    @Autowired
    private EstoqueItemRepository repository;

    public List<EstoqueItem> listarTodos() {
        return repository.findAll();
    }

    public EstoqueItem salvar(EstoqueItem item) {
        // Zera o id recebido no corpo: sem isso, um POST com um id existente no JSON
        // vira UPDATE silencioso daquele registro em vez de criar um novo.
        item.setId(null);
        return repository.save(item);
    }

    public EstoqueItem atualizar(Long id, EstoqueItem itemAtualizado) {
        EstoqueItem item = repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Item não encontrado no estoque com o ID: " + id));

        item.setName(itemAtualizado.getName());
        item.setCategory(itemAtualizado.getCategory());
        item.setSubcategory(itemAtualizado.getSubcategory());
        item.setQuantity(itemAtualizado.getQuantity());
        item.setMinQuantity(itemAtualizado.getMinQuantity());
        item.setLocation(itemAtualizado.getLocation());
        item.setSerialNumber(itemAtualizado.getSerialNumber());
        item.setResponsavel(itemAtualizado.getResponsavel());

        return repository.save(item);
    }

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Item não encontrado no estoque com o ID: " + id);
        }
        repository.deleteById(id);
    }
}
