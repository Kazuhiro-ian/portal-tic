package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Aviso da equipe, exibido no Dashboard. Antes vivia só no localStorage do navegador
 * (não persistia entre dispositivos, autor era uma string fixa) -- agora é real.
 */
@Data
@Entity
@Table(name = "avisos")
public class Aviso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String mensagem;

    @Column(nullable = false)
    private String autor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PrioridadeAviso prioridade;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
