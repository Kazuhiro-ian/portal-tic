package portal.ti.queiroz.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import portal.ti.queiroz.model.DiaRecebimento;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DiaRecebimentoRepository extends JpaRepository<DiaRecebimento, Long> {

    List<DiaRecebimento> findByDataBetween(LocalDate inicio, LocalDate fim);

    Optional<DiaRecebimento> findByData(LocalDate data);
}
