package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

// Auditoria do cofre de credenciais: quem acessou/alterou o quê e quando.
@Data
@Entity
@Table(name = "credencial_acesso_logs")
public class CredencialAcessoLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "credencial_id", nullable = false)
    private Long credencialId;

    // Snapshot do nome, não uma FK: o log deve continuar legível mesmo após excluir a credencial.
    @Column(name = "credencial_nome", nullable = false)
    private String credencialNome;

    @Column(nullable = false)
    private String usuario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoAcaoCredencial acao;

    @Column(name = "data_hora", nullable = false)
    private LocalDateTime dataHora;

    @PrePersist
    public void prePersist() {
        if (dataHora == null) {
            dataHora = LocalDateTime.now();
        }
    }
}
