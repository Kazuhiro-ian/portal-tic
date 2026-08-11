package portal.ti.queiroz.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import portal.ti.queiroz.model.InventarioResultado;

import java.util.List;
import java.util.Optional;

public interface InventarioResultadoRepository extends JpaRepository<InventarioResultado, Long> {

    Optional<InventarioResultado> findByInventarioId(Long inventarioId);

    List<InventarioResultado> findByInventarioIdIn(List<Long> inventarioIds);

    void deleteByInventarioId(Long inventarioId);
}
