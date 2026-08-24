package portal.ti.queiroz.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import portal.ti.queiroz.model.ZebraEnvio;

import java.util.List;

public interface ZebraEnvioRepository extends JpaRepository<ZebraEnvio, Long> {
    // Mais recente primeiro; ordena no banco em vez de carregar tudo para ordenar em memória.
    List<ZebraEnvio> findByOrderByDataEnvioDesc();
}