package portal.ti.queiroz.dto;

import jakarta.validation.constraints.NotNull;
import portal.ti.queiroz.model.TipoDiaRecebimento;

import java.time.DayOfWeek;
import java.util.Map;

/**
 * Padrão semanal de recebimento definido para um mês: o que é cada dia da semana.
 * O serviço expande isso para uma linha por data concreta do mês.
 */
public record PadraoMensalRequest(
        @NotNull(message = "informe o ano") Integer ano,
        @NotNull(message = "informe o mês") Integer mes,
        @NotNull(message = "informe o padrão da semana") Map<DayOfWeek, TipoDiaRecebimento> padrao,
        Boolean sobrescreverAjustesManuais) {
}
