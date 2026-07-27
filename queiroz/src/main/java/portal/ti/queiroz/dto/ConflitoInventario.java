package portal.ti.queiroz.dto;

import portal.ti.queiroz.model.GrupoRecebimento;

import java.time.LocalDate;

/**
 * Inventário já planejado que caiu em um dia de recebimento do próprio grupo da filial —
 * situação que só surge quando o padrão de recebimento é alterado DEPOIS do plano salvo.
 */
public record ConflitoInventario(
        Long inventarioId,
        Long filialId,
        Integer numeroFilial,
        String nomeFilial,
        GrupoRecebimento grupo,
        LocalDate data,
        String mensagem) {
}
