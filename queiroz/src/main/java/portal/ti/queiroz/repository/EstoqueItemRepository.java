package portal.ti.queiroz.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import portal.ti.queiroz.model.EstoqueItem;

import java.util.List;

public interface EstoqueItemRepository extends JpaRepository<EstoqueItem, Long> {

    /**
     * Usado por ZebraEnvioService para dar baixa: traz só os itens já categorizados como
     * "categoriaZebra" mais os sem categoria (candidatos ao fallback por nome), em vez de
     * carregar a tabela de estoque inteira na memória a cada envio.
     */
    List<EstoqueItem> findByCategoriaZebraOrCategoriaZebraIsNull(String categoriaZebra);
}