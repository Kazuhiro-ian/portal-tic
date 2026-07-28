package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "equipes_inventario")
public class EquipeInventario {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;
}