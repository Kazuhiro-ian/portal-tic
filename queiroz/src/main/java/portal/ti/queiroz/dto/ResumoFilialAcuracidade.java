package portal.ti.queiroz.dto;

import portal.ti.queiroz.model.InventarioResultado;
import portal.ti.queiroz.model.TipoFilial;

/**
 * Uma linha do relatório de acuracidade: uma filial (ou um agregado como "CDs",
 * "Lojas" ou "Geral", quando filialId é null) com o resultado do mês atual e do
 * mês anterior lado a lado, prontos pra tela comparar.
 *
 * {@code atual}/{@code anterior} sempre representam o GERAL da filial: para uma filial não
 * dividida é o único resultado, como sempre foi; para uma filial com estoque dividido é a soma
 * dos armazéns 01 (Loja) e 03 (Estoque) -- por isso a tabela/cards principais não mudam de
 * comportamento. {@code armazem01}/{@code armazem03} trazem o detalhamento por armazém, usado
 * pelo painel de detalhes da filial; ficam null quando a filial não é dividida.
 */
public record ResumoFilialAcuracidade(
        Long filialId,
        Integer numeroFilial,
        String nome,
        TipoFilial tipoFilial,
        InventarioResultado atual,
        InventarioResultado anterior,
        ResultadoArmazem armazem01,
        ResultadoArmazem armazem03,
        Integer produtosComDivergenciaCruzada
) {
}
