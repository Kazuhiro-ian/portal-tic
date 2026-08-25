package portal.ti.queiroz.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;

@Data
@Entity
@Table(name = "zebra_envios")
public class ZebraEnvio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(nullable = false)
    private Long filialId;

    @NotNull
    @Min(0)
    @Column(nullable = false)
    private Integer qtdEtiquetas;

    @NotNull
    @Min(0)
    @Column(nullable = false)
    private Integer qtdRibbons;

    @NotNull
    @Column(nullable = false)
    private LocalDate dataEnvio;

    @NotBlank
    @Column(nullable = false) // "REGULAR" ou "EXTRA"
    private String tipoEnvio;

    @Column(columnDefinition = "TEXT")
    private String motivoExtra; // obrigatório apenas se tipoEnvio for "EXTRA"
}