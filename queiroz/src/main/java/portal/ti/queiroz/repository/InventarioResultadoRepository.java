package portal.ti.queiroz.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import portal.ti.queiroz.model.Armazem;
import portal.ti.queiroz.model.InventarioResultado;

import java.util.List;
import java.util.Optional;

public interface InventarioResultadoRepository extends JpaRepository<InventarioResultado, Long> {

    /** armazem null busca o resultado de filial não dividida (Spring Data gera "IS NULL"). */
    Optional<InventarioResultado> findByInventarioIdAndArmazem(Long inventarioId, Armazem armazem);

    /** Todos os resultados (um ou dois, conforme a filial seja dividida) de uma lista de inventários. */
    List<InventarioResultado> findByInventarioIdIn(List<Long> inventarioIds);

    void deleteByInventarioIdAndArmazem(Long inventarioId, Armazem armazem);
}
