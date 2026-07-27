package portal.ti.queiroz.dto;

import java.util.List;

public record SalvarPlanoResponse(
        int criados,
        int atualizados,
        int ignoradosRealizados,
        List<String> avisos) {
}
