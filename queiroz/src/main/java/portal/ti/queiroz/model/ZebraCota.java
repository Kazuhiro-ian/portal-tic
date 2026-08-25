package portal.ti.queiroz.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

// Cota mensal de etiquetas/ribbons Zebra por filial e os dias em que são enviados.
@Data
@Entity
@Table(name = "zebra_cotas",
        uniqueConstraints = @UniqueConstraint(name = "uk_zebra_cotas_filial_id", columnNames = "filial_id"))
public class ZebraCota {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(nullable = false)
    private Long filialId;

    @NotNull
    @Min(0)
    @Column(nullable = false)
    private Integer etiquetasPadrao;

    @NotNull
    @Min(0)
    @Column(nullable = false)
    private Integer ribbonsPadrao;

    @NotNull
    @Min(1) @Max(31)
    @Column(nullable = false)
    private Integer diaEnvio1; // Ex: dia 5

    @NotNull
    @Min(1) @Max(31)
    @Column(nullable = false)
    private Integer diaEnvio2; // Ex: dia 20
}