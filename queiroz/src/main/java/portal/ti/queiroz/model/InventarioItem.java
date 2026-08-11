package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Uma linha do relatório de produtos exportado do Protheus, já vinculada ao
 * inventário que a originou.
 *
 * Guardar o detalhe por SKU (e não só o resumo) é o que permite os rankings de
 * maiores sobras/perdas e recalcular tudo se alguma regra mudar — sem precisar
 * pedir o arquivo de novo.
 */
@Data
@Entity
@Table(name = "inventario_itens", indexes = {
        @Index(name = "idx_inventario_itens_inventario", columnList = "inventario_id")
})
public class InventarioItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "inventario_id", nullable = false)
    private Long inventarioId;

    // --- Campos vindos do relatório do Protheus ---

    @Column(name = "cod_produto")
    private String codProduto;

    @Column(length = 300)
    private String descricao;

    @Column(name = "valor_unitario", precision = 15, scale = 4)
    private BigDecimal valorUnitario;

    private String unidade;

    @Column(name = "local_armazenamento")
    private String localArmazenamento;

    private String familia;

    private String fabricante;

    /** Saldo que o sistema (Protheus) acreditava ter antes da contagem. */
    @Column(name = "quantidade_sistema", precision = 15, scale = 3)
    private BigDecimal quantidadeSistema;

    @Column(precision = 15, scale = 3)
    private BigDecimal contagem1;

    @Column(precision = 15, scale = 3)
    private BigDecimal contagem2;

    @Column(precision = 15, scale = 3)
    private BigDecimal contagem3;

    /** Diferença em unidades: negativa = falta, positiva = sobra. */
    @Column(precision = 15, scale = 3)
    private BigDecimal divergencia;

    /** Diferença em R$ (divergência x valor unitário), como o Protheus já entrega. */
    @Column(name = "valor_divergencia", precision = 15, scale = 2)
    private BigDecimal valorDivergencia;

    @Column(name = "cod_barras")
    private String codBarras;

    @Column(length = 300)
    private String observacao;

    // --- Campos derivados (a planilha calculava em colunas auxiliares) ---

    @Column(name = "valor_inicial", precision = 15, scale = 2)
    private BigDecimal valorInicial;

    /** Última contagem preenchida: a 3ª se houver, senão a 2ª, senão a 1ª. */
    @Column(name = "quantidade_final", precision = 15, scale = 3)
    private BigDecimal quantidadeFinal;

    @Column(name = "valor_final", precision = 15, scale = 2)
    private BigDecimal valorFinal;

    /** True quando saldo, todas as contagens e a divergência são zero. */
    @Column(nullable = false)
    private Boolean zerado;
}
