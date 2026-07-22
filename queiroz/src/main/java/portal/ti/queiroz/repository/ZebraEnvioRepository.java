package portal.ti.queiroz.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import portal.ti.queiroz.model.ZebraEnvio;

import java.util.List;

public interface ZebraEnvioRepository extends JpaRepository<ZebraEnvio, Long> {
    List<ZebraEnvio> findByOrderByDataEnvioDesc();
}