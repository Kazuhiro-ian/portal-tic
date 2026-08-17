package portal.ti.queiroz.dto;

import java.math.BigDecimal;

/**
 * Produto com indício de transferência entre os armazéns de uma filial dividida: a
 * divergência de um armazém é exatamente o oposto da do outro (ex: +20 na Loja, -20 no
 * Estoque). Puramente informativo -- não altera o percentual de acuracidade de nenhum
 * dos dois armazéns, que continuam calculados de forma independente.
 */
public record DivergenciaCruzada(
        String codProduto,
        String descricao,
        BigDecimal divergenciaLoja,
        BigDecimal divergenciaEstoque
) {
}
