package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "credenciais")
public class Credencial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    private String notes;
}