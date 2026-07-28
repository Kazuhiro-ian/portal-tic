package portal.ti.queiroz.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import portal.ti.queiroz.model.Aviso;

public interface AvisoRepository extends JpaRepository<Aviso, Long> {
}
