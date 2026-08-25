package portal.ti.queiroz.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

// Aviso exibido no Dashboard. Antes era persistido no localStorage do navegador.
@Data
@Entity
@Table(name = "avisos")
public class Aviso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, columnDefinition = "TEXT")
    private String mensagem;

    // Não validado com @NotBlank de propósito: o autor é sempre resolvido do usuário
    // autenticado no servidor (AvisoService), o cliente não precisa (e não deve) enviá-lo.
    @Column(nullable = false)
    private String autor;

    @NotNull
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
