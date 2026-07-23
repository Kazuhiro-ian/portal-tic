package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;
import portal.ti.queiroz.security.CredencialPasswordConverter;

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

    @Convert(converter = CredencialPasswordConverter.class)
    @Column(nullable = false, columnDefinition = "TEXT")
    private String password;

    private String notes;
}