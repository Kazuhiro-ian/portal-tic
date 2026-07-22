package portal.ti.queiroz.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import portal.ti.queiroz.model.ZebraCota;

import java.util.Optional;

public interface ZebraCotaRepository extends JpaRepository<ZebraCota, Long> {
    Optional<ZebraCota> findByFilialId(Long filialId);
}