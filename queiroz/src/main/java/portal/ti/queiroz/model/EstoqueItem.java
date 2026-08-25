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

    // Trava otimista: sem isto, duas baixas concorrentes no mesmo item (EstoqueMovimentoService,
    // ZebraEnvioService) podiam ler a mesma quantidade e a segunda gravação sobrescrevia a
    // primeira silenciosamente. Com @Version, a segunda gravação lança
    // ObjectOptimisticLockingFailureException em vez de perder a baixa.
    @Version
    private Long version;

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

    // Campos abaixo suportam ativos além de consumíveis (notebooks, celulares, licenças).
    @Column(name = "serial_number")
    private String serialNumber;

    @Column
    private String responsavel;
}