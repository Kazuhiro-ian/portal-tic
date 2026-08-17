package portal.ti.queiroz.dto;

import portal.ti.queiroz.model.InventarioResultado;

/** Resultado de acuracidade de um armazém específico (Loja ou Estoque), mês atual x anterior. */
public record ResultadoArmazem(
        InventarioResultado atual,
        InventarioResultado anterior
) {
}
