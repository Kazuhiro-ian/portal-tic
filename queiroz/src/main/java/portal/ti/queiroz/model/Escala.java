package portal.ti.queiroz.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;

@Data
@Entity
@Table(name = "escalas")
public class Escala {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "colaborador_id", nullable = false)
    private Long colaboradorId;

    @NotNull
    @Column(nullable = false)
    private LocalDate data;

    @NotBlank
    @Column(nullable = false) // Ex: "08:00 - 17:00", "Folga", "Plantão"
    private String turno;
}