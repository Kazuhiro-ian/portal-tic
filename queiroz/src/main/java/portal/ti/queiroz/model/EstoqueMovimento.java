package portal.ti.queiroz.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDateTime;

// Registro de entrada/saída de um item do estoque.
@Data
@Entity
@Table(name = "estoque_movimentos")
public class EstoqueMovimento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(name = "item_id", nullable = false)
    private String itemId;

    // Não validado: sempre sobrescrito a partir do item em EstoqueMovimentoService.registrar.
    @Column(name = "item_name", nullable = false)
    private String itemName;

    @NotBlank
    @Column(nullable = false)
    private String type; // "IN" (Entrada) ou "OUT" (Saída)

    @NotNull
    @Min(1)
    @Column(nullable = false)
    private Integer quantity;

    @NotBlank
    @Column(nullable = false)
    private String destination;

    // Não validado: EstoqueMovimentoService.registrar preenche com "agora" quando vier nulo.
    @Column(nullable = false)
    private LocalDateTime date;

    @Column
    private String notes;
}