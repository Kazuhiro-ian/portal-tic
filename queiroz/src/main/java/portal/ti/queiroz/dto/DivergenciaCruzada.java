package portal.ti.queiroz.dto;

import java.math.BigDecimal;

/**
 * Produto com indício de transferência entre os armazéns de uma filial dividida: a
 * divergência de um armazém é exatamente o oposto da do outro (ex: +20 na Loja, -20 no
 * Estoque). Não altera o percentual de Loja nem o de Estoque, que continuam calculados de
 * forma independente -- mas afeta sim o "Geral" (ver
 * {@code DetalheFilialAcuracidadeResponse.percentualAcuracidadeGeralSemTransferencias}),
 * já que a divergência líquida desses produtos zera na mesclagem e eles passam a contar
 * como acurados ali.
 */
public record DivergenciaCruzada(
        String codProduto,
        String descricao,
        BigDecimal divergenciaLoja,
        BigDecimal divergenciaEstoque
) {
}
