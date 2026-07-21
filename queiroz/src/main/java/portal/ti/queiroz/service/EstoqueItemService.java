package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.model.EstoqueItem;
import portal.ti.queiroz.repository.EstoqueItemRepository;

import java.util.List;
import java.util.Optional;

@Service
public class EstoqueItemService {

    @Autowired
    private EstoqueItemRepository repository;

    public List<EstoqueItem> listarTodos() {
        return repository.findAll();
    }

    public EstoqueItem salvar(EstoqueItem item) {
        return repository.save(item);
    }

    public EstoqueItem atualizar(Long id, EstoqueItem itemAtualizado) {
        Optional<EstoqueItem> itemExistente = repository.findById(id);

        if (itemExistente.isPresent()) {
            EstoqueItem item = itemExistente.get();
            item.setName(itemAtualizado.getName());
            item.setCategory(itemAtualizado.getCategory());
            item.setSubcategory(itemAtualizado.getSubcategory());
            item.setQuantity(itemAtualizado.getQuantity());
            item.setMinQuantity(itemAtualizado.getMinQuantity());
            item.setLocation(itemAtualizado.getLocation());

            return repository.save(item);
        } else {
            throw new RuntimeException("Item não encontrado no estoque com o ID: " + id);
        }
    }

    public boolean deletar(Long id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return true;
        }
        return false;
    }
}