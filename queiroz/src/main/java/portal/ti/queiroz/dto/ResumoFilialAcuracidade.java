package portal.ti.queiroz.dto;

import portal.ti.queiroz.model.InventarioResultado;
import portal.ti.queiroz.model.TipoFilial;

/**
 * Uma linha do relatório de acuracidade: uma filial (ou um agregado como "CDs",
 * "Lojas" ou "Geral", quando filialId é null) com o resultado do mês atual e do
 * mês anterior lado a lado, prontos pra tela comparar.
 */
public record ResumoFilialAcuracidade(
        Long filialId,
        Integer numeroFilial,
        String nome,
        TipoFilial tipoFilial,
        InventarioResultado atual,
        InventarioResultado anterior
) {
}
