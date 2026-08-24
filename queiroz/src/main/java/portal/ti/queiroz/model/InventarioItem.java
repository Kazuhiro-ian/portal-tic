package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;

// Uma linha do relatório de produtos exportado do Protheus, vinculada ao inventário que a
// originou. Guardar o detalhe por SKU permite recalcular tudo e montar rankings sem reimportar.
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

    // Armazém de origem para filiais com estoque dividido; null = filial não dividida.
    @Enumerated(EnumType.STRING)
    @Column(name = "armazem")
    private Armazem armazem;

    // Campos abaixo vêm direto do relatório do Protheus.
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

    @Column(name = "quantidade_sistema", precision = 15, scale = 3) // saldo que o Protheus tinha antes da contagem
    private BigDecimal quantidadeSistema;

    @Column(precision = 15, scale = 3)
    private BigDecimal contagem1;

    @Column(precision = 15, scale = 3)
    private BigDecimal contagem2;

    @Column(precision = 15, scale = 3)
    private BigDecimal contagem3;

    @Column(precision = 15, scale = 3) // negativa = falta, positiva = sobra
    private BigDecimal divergencia;

    @Column(name = "valor_divergencia", precision = 15, scale = 2) // divergência x valor unitário
    private BigDecimal valorDivergencia;

    @Column(name = "cod_barras")
    private String codBarras;

    @Column(length = 300)
    private String observacao;

    // Campos abaixo são derivados, calculados a partir dos anteriores.
    @Column(name = "valor_inicial", precision = 15, scale = 2)
    private BigDecimal valorInicial;

    @Column(name = "quantidade_final", precision = 15, scale = 3) // última contagem preenchida: 3ª, senão 2ª, senão 1ª
    private BigDecimal quantidadeFinal;

    @Column(name = "valor_final", precision = 15, scale = 2)
    private BigDecimal valorFinal;

    @Column(nullable = false) // true quando saldo, contagens e divergência são todos zero
    private Boolean zerado;
}
