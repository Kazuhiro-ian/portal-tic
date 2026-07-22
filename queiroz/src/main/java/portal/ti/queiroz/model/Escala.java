package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Data
@Entity
@Table(name = "escalas")
public class Escala {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "colaborador_id", nullable = false)
    private Long colaboradorId;

    @Column(nullable = false)
    private LocalDate data;

    @Column(nullable = false)
    private String turno; // Ex: "08:00 - 17:00", "Folga", "12:00 - 21:00", "Plantão"
}