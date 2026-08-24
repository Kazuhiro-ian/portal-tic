package portal.ti.queiroz.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import portal.ti.queiroz.model.EstoqueMovimento;

import java.util.List;

public interface EstoqueMovimentoRepository extends JpaRepository<EstoqueMovimento, Long> {

    // Mais recente primeiro; ordena no banco em vez de carregar tudo para ordenar em memória.
    List<EstoqueMovimento> findByOrderByDateDesc();
}