package portal.ti.queiroz.dto;

import java.time.LocalDate;

public record ConfirmarEnvioZebraRequest(LocalDate dataEnvio, Integer qtdEtiquetas, Integer qtdRibbons) {
    
}