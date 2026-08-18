package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;

@Data
@Entity
@Table(name = "dias_equipe",
        uniqueConstraints = @UniqueConstraint(name = "uk_dias_equipe_data", columnNames = "data"))
public class DiaEquipe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate data;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoDiaEquipe tipo;

    private String observacao;
}