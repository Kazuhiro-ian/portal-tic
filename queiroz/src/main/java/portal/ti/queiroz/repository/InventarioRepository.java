package portal.ti.queiroz.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import portal.ti.queiroz.model.Inventario;

import java.time.LocalDate;
import java.util.List;

public interface InventarioRepository extends JpaRepository<Inventario, Long> {

    List<Inventario> findByDataBetween(LocalDate inicio, LocalDate fim);

    List<Inventario> findByFilialIdAndDataBetween(Long filialId, LocalDate inicio, LocalDate fim);
}
