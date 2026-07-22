package portal.ti.queiroz.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import portal.ti.queiroz.model.Artigo;

public interface ArtigoRepository extends JpaRepository<Artigo, Long> {
}