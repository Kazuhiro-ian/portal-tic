package portal.ti.queiroz.dto;

import portal.ti.queiroz.model.InventarioResultado;

import java.util.List;

/**
 * Detalhe de acuracidade de uma filial com periodicidade semanal (ex: CD 00): cada semana
 * (sábado) do mês individualmente, mais o "Geral" -- a fusão de todas elas por produto,
 * mantendo o valor mais recente quando um SKU se repete (ver
 * {@code AcuracidadeService.mesclarMaisRecentePorProduto}). Sem continuidade entre meses.
 */
public record DetalheFilialSemanalAcuracidadeResponse(
        Long filialId,
        Integer numeroFilial,
        String nome,
        int ano,
        int mes,
        List<SemanaAcuracidade> semanas,
        InventarioResultado geral,
        List<ItemRanking> maioresFaltas,
        List<ItemRanking> maioresSobras
) {
}
