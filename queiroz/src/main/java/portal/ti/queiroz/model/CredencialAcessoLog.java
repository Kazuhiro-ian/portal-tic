package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Registro de auditoria do cofre de credenciais: quem acessou/alterou o quê e quando.
 *
 * Guarda um snapshot do nome da credencial (não uma FK) de propósito -- o log precisa
 * continuar legível mesmo que a credencial original seja excluída depois.
 */
@Data
@Entity
@Table(name = "credencial_acesso_logs")
public class CredencialAcessoLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "credencial_id", nullable = false)
    private Long credencialId;

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
