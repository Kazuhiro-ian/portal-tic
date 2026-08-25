package portal.ti.queiroz.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

/** Vários turnos da escala marcados de uma vez ("pintados" na grade, salvos juntos). */
public record SalvarEscalasRequest(@NotEmpty List<@Valid ItemEscala> itens) {

    public record ItemEscala(
            @NotNull Long colaboradorId,
            @NotNull LocalDate data,
            @NotBlank String turno
    ) {
    }
}
