package portal.ti.queiroz.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import portal.ti.queiroz.model.Credencial;

public interface CredencialRepository extends JpaRepository<Credencial, Long> {
}