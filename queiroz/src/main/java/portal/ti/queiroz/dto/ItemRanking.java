package portal.ti.queiroz.dto;

import java.math.BigDecimal;

/** Um produto no ranking de maiores sobras ou maiores faltas do período. */
public record ItemRanking(
        String codProduto,
        String descricao,
        BigDecimal divergencia,
        BigDecimal valorDivergencia,
        Long filialId,
        Integer numeroFilial,
        String nomeFilial
) {
}
