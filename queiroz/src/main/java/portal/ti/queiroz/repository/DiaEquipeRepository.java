package portal.ti.queiroz.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import portal.ti.queiroz.model.DiaEquipe;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DiaEquipeRepository extends JpaRepository<DiaEquipe, Long> {
    List<DiaEquipe> findByDataBetween(LocalDate inicio, LocalDate fim);
    Optional<DiaEquipe> findByData(LocalDate data);
}