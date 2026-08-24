package portal.ti.queiroz.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import portal.ti.queiroz.model.Escala;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface EscalaRepository extends JpaRepository<Escala, Long> {

    // Escalas em um intervalo de datas (semana/mês).
    List<Escala> findByDataBetween(LocalDate inicio, LocalDate fim);

    // Escala de um colaborador em um dia específico.
    Optional<Escala> findByColaboradorIdAndData(Long colaboradorId, LocalDate data);
}