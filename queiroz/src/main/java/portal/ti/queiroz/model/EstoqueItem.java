package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "estoque_itens")
public class EstoqueItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String category;

    @Column
    private String subcategory;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "min_quantity", nullable = false)
    private Integer minQuantity;

    @Column(nullable = false)
    private String location;

    @Column(name = "categoria_zebra")
    private String categoriaZebra;
}