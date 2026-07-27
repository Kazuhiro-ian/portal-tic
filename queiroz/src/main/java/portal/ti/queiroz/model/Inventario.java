package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Entity
@Table(name = "inventarios")
public class Inventario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "filial_id", nullable = false)
    private Long filialId;

    @Column(nullable = false)
    private LocalDate data;

    @Column(name = "horario_inicio")
    private LocalTime horarioInicio;
    
    @Column(name = "horario_fim")
    private LocalTime horarioFim;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatusInventario status;

    @Column(name = "dia_preferencial")
    private Integer diaPreferencial;

    private String responsavel;

    private String observacao;
}
