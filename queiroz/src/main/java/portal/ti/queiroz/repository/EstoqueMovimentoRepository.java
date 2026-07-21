package portal.ti.queiroz.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import portal.ti.queiroz.model.EstoqueMovimento;

public interface EstoqueMovimentoRepository extends JpaRepository<EstoqueMovimento, Long> {
}