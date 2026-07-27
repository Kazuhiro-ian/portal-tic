package portal.ti.queiroz.dto;

import java.util.List;

public record PlanoMensalResponse(
        int ano,
        int mes,
        List<PropostaInventario> itens,
        List<String> avisos) {
}
