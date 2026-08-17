package portal.ti.queiroz.dto;

import portal.ti.queiroz.model.TipoFilial;

import java.util.List;

/** Detalhe de acuracidade de uma única filial no mês, para o painel lateral da tela de Acuracidade. */
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
        List<ItemRanking> maioresFaltas,
        List<ItemRanking> maioresSobras,
        InventarioResumo inventarioArmazem01,
        InventarioResumo inventarioArmazem03
) {
}
