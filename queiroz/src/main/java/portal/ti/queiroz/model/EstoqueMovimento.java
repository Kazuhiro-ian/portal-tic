package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "estoque_movimentos")
public class EstoqueMovimento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "item_id", nullable = false)
    private String itemId;

    @Column(name = "item_name", nullable = false)
    private String itemName;

    @Column(nullable = false)
    private String type; // "IN" (Entrada) ou "OUT" (Saída)

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private String destination;

    @Column(nullable = false)
    private LocalDateTime date;

    @Column
    private String notes;
}