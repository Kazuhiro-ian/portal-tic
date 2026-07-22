package portal.ti.queiroz.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import portal.ti.queiroz.model.Escala;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface EscalaRepository extends JpaRepository<Escala, Long> {

    // Busca todas as escalas entre um intervalo de datas (para carregar a semana/mês)
    List<Escala> findByDataBetween(LocalDate inicio, LocalDate fim);

    // Busca a escala específica de um colaborador em determinado dia
    Optional<Escala> findByColaboradorIdAndData(Long colaboradorId, LocalDate data);
}