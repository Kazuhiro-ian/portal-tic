package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.EstoqueItem;
import portal.ti.queiroz.model.EstoqueMovimento;
import portal.ti.queiroz.repository.EstoqueItemRepository;
import portal.ti.queiroz.repository.EstoqueMovimentoRepository;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class EstoqueMovimentoService {

    @Autowired
    private EstoqueMovimentoRepository repository;

    @Autowired
    private EstoqueItemRepository itemRepository;

    public List<EstoqueMovimento> listarTodos() {
        return repository.findByOrderByDateDesc();
    }

    /**
     * Registra um movimento de estoque E atualiza a quantidade do item na MESMA transação.
     * Antes, o "histórico de movimentação" era um log solto que não decrementava/incrementava
     * o item de verdade -- dava pra o estoque exibido divergir do próprio histórico. Com
     * @Transactional, se qualquer parte falhar (item inexistente, saída maior que o disponível),
     * nada é persistido -- nem o movimento, nem a mudança de quantidade. Mesma exceção deliberada
     * à convenção do projeto já usada em PlanoInventarioService.salvarPlano.
     */
    @Transactional
    public EstoqueMovimento registrar(EstoqueMovimento movimento) {
        Long itemId = parseItemId(movimento.getItemId());
        EstoqueItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Item de estoque não encontrado: " + itemId));

        int delta = "IN".equals(movimento.getType()) ? movimento.getQuantity() : -movimento.getQuantity();
        int novaQuantidade = item.getQuantity() + delta;
        if (novaQuantidade < 0) {
            throw new RegraDeNegocioException(
                    "Estoque insuficiente para \"" + item.getName() + "\". Disponível: " + item.getQuantity() + ".");
        }

        item.setQuantity(novaQuantidade);
        itemRepository.save(item);

        movimento.setItemName(item.getName());
        if (movimento.getDate() == null) {
            movimento.setDate(LocalDateTime.now());
        }
        return repository.save(movimento);
    }

    private Long parseItemId(String itemId) {
        try {
            return Long.valueOf(itemId);
        } catch (NumberFormatException e) {
            throw new RegraDeNegocioException("Identificador de item inválido: " + itemId);
        }
    }
}
