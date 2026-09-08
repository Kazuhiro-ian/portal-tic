package portal.ti.queiroz.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import portal.ti.queiroz.model.StatusZebraEnvio;
import portal.ti.queiroz.model.ZebraEnvio;

import java.time.LocalDate;
import java.util.List;

public interface ZebraEnvioRepository extends JpaRepository<ZebraEnvio, Long> {
    // Cronograma do mês: envios (qualquer status) cuja data prevista cai no período.
    List<ZebraEnvio> findByDataPrevistaBetweenOrderByDataPrevistaDesc(LocalDate inicio, LocalDate fim);

    // Consumo real (analytics): envios já confirmados cuja data real de envio cai no período.
    List<ZebraEnvio> findByStatusAndDataEnvioBetween(StatusZebraEnvio status, LocalDate inicio, LocalDate fim);
}