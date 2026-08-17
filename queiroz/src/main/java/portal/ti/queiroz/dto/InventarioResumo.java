package portal.ti.queiroz.dto;

import portal.ti.queiroz.model.StatusInventario;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Metadados leves de um inventário (data, status, quem/quando importou), para o rodapé do painel de detalhes. */
public record InventarioResumo(
        Long inventarioId,
        LocalDate data,
        StatusInventario status,
        String arquivoNome,
        LocalDateTime importadoEm,
        String importadoPor
) {
}
