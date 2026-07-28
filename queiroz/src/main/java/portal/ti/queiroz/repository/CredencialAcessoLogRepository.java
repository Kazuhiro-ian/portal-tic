package portal.ti.queiroz.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import portal.ti.queiroz.model.CredencialAcessoLog;

public interface CredencialAcessoLogRepository extends JpaRepository<CredencialAcessoLog, Long> {
}
