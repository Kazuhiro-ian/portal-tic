package portal.ti.queiroz.dto;

import portal.ti.queiroz.model.TipoFilial;

import java.math.BigDecimal;
import java.util.List;

/**
 * Detalhe de acuracidade de uma única filial no mês, para o painel lateral e o dashboard da
 * tela de Acuracidade.
 *
 * {@code percentualAcuracidadeGeralSemTransferencias}/{@code produtosAcuradosGeralSemTransferencias}/
 * {@code produtosInacuradosGeralSemTransferencias} são o contraponto ao {@code geral}: o mesmo
 * cálculo, mas tratando os produtos de {@code divergenciasCruzadas} como inacurados (do jeito que
 * já contam em Loja e Estoque isoladamente) em vez de deixar a divergência líquida zerada os
 * "perdoar". Ficam {@code null} quando a filial não é dividida ou não há resultado no período.
 */
public record DetalheFilialAcuracidadeResponse(
        Long filialId,
        Integer numeroFilial,
        String nome,
        TipoFilial tipoFilial,
        boolean estoqueDividido,
        ResultadoArmazem geral,
        ResultadoArmazem armazem01,
        ResultadoArmazem armazem03,
        List<DivergenciaCruzada> divergenciasCruzadas,
        BigDecimal percentualAcuracidadeGeralSemTransferencias,
        Integer produtosAcuradosGeralSemTransferencias,
        Integer produtosInacuradosGeralSemTransferencias,
        List<ItemRanking> maioresFaltas,
        List<ItemRanking> maioresSobras,
        InventarioResumo inventarioArmazem01,
        InventarioResumo inventarioArmazem03
) {
}
