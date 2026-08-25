package portal.ti.queiroz.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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

    @NotBlank
    @Column(nullable = false)
    private String name;

    @NotBlank
    @Column(nullable = false)
    private String category;

    @Column
    private String subcategory;

    @NotNull
    @Min(0)
    @Column(nullable = false)
    private Integer quantity;

    @NotNull
    @Min(0)
    @Column(name = "min_quantity", nullable = false)
    private Integer minQuantity;

    @NotBlank
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