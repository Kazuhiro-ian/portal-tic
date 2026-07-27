package portal.ti.queiroz.dto;

import java.util.List;

/**
 * Resumo do que a aplicação do padrão semanal fez no mês, mais os inventários que
 * ficaram em conflito por causa da mudança.
 */
public record PadraoMensalResponse(
        int criados,
        int atualizados,
        int preservados,
        List<ConflitoInventario> conflitos) {
}
