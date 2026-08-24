package portal.ti.queiroz.dto;

import portal.ti.queiroz.model.InventarioResultado;

import java.time.LocalDate;

/**
 * Uma semana (sábado) de uma filial com periodicidade semanal (ex: CD 00). {@code numero} é
 * a posição cronológica dentro do mês (1, 2, 3...), contada pelos inventários realizados que
 * de fato existem -- não fixa em 4, então funciona igual em meses com 4 ou 5 sábados.
 */
public record SemanaAcuracidade(
        int numero,
        LocalDate data,
        InventarioResumo inventario,
        InventarioResultado resultado
) {
}
