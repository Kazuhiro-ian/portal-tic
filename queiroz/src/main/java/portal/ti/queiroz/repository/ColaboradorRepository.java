package portal.ti.queiroz.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import portal.ti.queiroz.model.Colaborador;

public interface ColaboradorRepository extends JpaRepository<Colaborador, Long> {
}