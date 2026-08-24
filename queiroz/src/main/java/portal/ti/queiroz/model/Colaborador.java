package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;

// Colaborador da equipe, usado na escala e no plantão.
@Data
@Entity
@Table(name = "colaboradores")
public class Colaborador {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String role;

    @Column(name = "is_on_call", nullable = false)
    private Boolean isOnCall;
}