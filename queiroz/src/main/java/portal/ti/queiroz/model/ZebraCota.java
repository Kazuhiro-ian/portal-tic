package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "zebra_cotas",
        uniqueConstraints = @UniqueConstraint(name = "uk_zebra_cotas_filial_id", columnNames = "filial_id"))
public class ZebraCota {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long filialId;

    @Column(nullable = false)
    private Integer etiquetasPadrao;

    @Column(nullable = false)
    private Integer ribbonsPadrao;

    @Column(nullable = false)
    private Integer diaEnvio1; // Ex: dia 5

    @Column(nullable = false)
    private Integer diaEnvio2; // Ex: dia 20
}