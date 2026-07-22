package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Data
@Entity
@Table(name = "zebra_envios")
public class ZebraEnvio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long filialId;

    @Column(nullable = false)
    private Integer qtdEtiquetas;

    @Column(nullable = false)
    private Integer qtdRibbons;

    @Column(nullable = false)
    private LocalDate dataEnvio;

    @Column(nullable = false)
    private String tipoEnvio; // "REGULAR" ou "EXTRA"

    @Column(columnDefinition = "TEXT")
    private String motivoExtra; // Obrigatório apenas se for "EXTRA"
}