package portal.ti.queiroz.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import portal.ti.queiroz.model.EstoqueItem;

public interface EstoqueItemRepository extends JpaRepository<EstoqueItem, Long> {
}