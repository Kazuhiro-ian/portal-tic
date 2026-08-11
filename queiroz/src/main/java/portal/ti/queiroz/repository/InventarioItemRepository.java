package portal.ti.queiroz.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import portal.ti.queiroz.model.InventarioItem;

import java.math.BigDecimal;
import java.util.List;

public interface InventarioItemRepository extends JpaRepository<InventarioItem, Long> {

    List<InventarioItem> findByInventarioId(Long inventarioId);

    /** Usado na reimportação: o resultado antigo é descartado antes de gravar o novo. */
    void deleteByInventarioId(Long inventarioId);

    /** Maiores faltas: só divergência negativa, da mais negativa pra menos. */
    List<InventarioItem> findByInventarioIdInAndValorDivergenciaLessThanOrderByValorDivergenciaAsc(
            List<Long> inventarioIds, BigDecimal zero, Pageable pageable);

    /** Maiores sobras: só divergência positiva, da maior pra menor. */
    List<InventarioItem> findByInventarioIdInAndValorDivergenciaGreaterThanOrderByValorDivergenciaDesc(
            List<Long> inventarioIds, BigDecimal zero, Pageable pageable);
}
