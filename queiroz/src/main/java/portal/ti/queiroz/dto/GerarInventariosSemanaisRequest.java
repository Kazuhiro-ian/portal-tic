package portal.ti.queiroz.dto;

import java.time.DayOfWeek;

public record GerarInventariosSemanaisRequest(Long filialId, DayOfWeek diaSemana, Integer ano, Integer mes) {
    
}
