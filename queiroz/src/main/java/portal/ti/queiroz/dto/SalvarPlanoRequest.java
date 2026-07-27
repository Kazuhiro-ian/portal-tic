package portal.ti.queiroz.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record SalvarPlanoRequest(
        @NotNull(message = "informe o ano") Integer ano,
        @NotNull(message = "informe o mês") Integer mes,
        @NotNull(message = "informe os itens do plano") List<ItemPlano> itens) {

    public record ItemPlano(
            Long filialId,
            LocalDate data,
            Integer diaPreferencial,
            String responsavel,
            String observacao) {
    }
}
