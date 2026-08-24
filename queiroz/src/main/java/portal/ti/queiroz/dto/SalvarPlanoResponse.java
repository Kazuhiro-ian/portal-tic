package portal.ti.queiroz.dto;

import java.util.List;

public record SalvarPlanoResponse(
        int criados,
        int atualizados,
        int ignoradosRealizados, // itens que já estavam com status REALIZADO não são sobrescritos
        List<String> avisos) {
}
