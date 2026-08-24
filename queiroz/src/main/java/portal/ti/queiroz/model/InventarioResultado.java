package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// Resumo calculado de um inventário, gravado em vez de recalculado a cada consulta:
// a tela de acuracidade compara vários meses/filiais ao mesmo tempo.
@Data
@Entity
@Table(name = "inventario_resultados",
        uniqueConstraints = @UniqueConstraint(name = "uk_inv_resultado_armazem", columnNames = {"inventario_id", "armazem"}))
public class InventarioResultado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "inventario_id", nullable = false)
    private Long inventarioId;

    // Filial dividida pode ter até dois resultados para o mesmo inventário, um por armazém
    // (por isso a unicidade acima é composta). Null = filial não dividida.
    @Enumerated(EnumType.STRING)
    @Column(name = "armazem")
    private Armazem armazem;

    @Column(name = "estoque_inicial_valor", precision = 18, scale = 2)
    private BigDecimal estoqueInicialValor;

    @Column(name = "estoque_final_valor", precision = 18, scale = 2)
    private BigDecimal estoqueFinalValor;

    @Column(name = "perda_valor", precision = 18, scale = 2) // soma das divergências negativas, guardado negativo
    private BigDecimal perdaValor;

    @Column(name = "ganho_valor", precision = 18, scale = 2) // soma das divergências positivas
    private BigDecimal ganhoValor;

    @Column(name = "total_ajuste_valor", precision = 18, scale = 2) // |perda| + |ganho|
    private BigDecimal totalAjusteValor;

    @Column(name = "percentual_perda", precision = 9, scale = 6)
    private BigDecimal percentualPerda;

    @Column(name = "percentual_ganho", precision = 9, scale = 6)
    private BigDecimal percentualGanho;

    @Column(name = "percentual_inacuracia", precision = 9, scale = 6) // % perda + % ganho; meta de 2%
    private BigDecimal percentualInacuracia;

    @Column(name = "total_produtos")
    private Integer totalProdutos;

    @Column(name = "produtos_contados")
    private Integer produtosContados;

    @Column(name = "produtos_zerados")
    private Integer produtosZerados;

    @Column(name = "produtos_acurados")
    private Integer produtosAcurados;

    @Column(name = "produtos_inacurados")
    private Integer produtosInacurados;

    @Column(name = "percentual_acuracidade", precision = 9, scale = 6) // meta de 75%
    private BigDecimal percentualAcuracidade;

    @Column(name = "percentual_inacurados", precision = 9, scale = 6)
    private BigDecimal percentualInacurados;

    @Column(name = "produtos_com_perda")
    private Integer produtosComPerda;

    @Column(name = "produtos_com_ganho")
    private Integer produtosComGanho;

    @Column(name = "quantidade_inicial", precision = 18, scale = 3)
    private BigDecimal quantidadeInicial;

    @Column(name = "quantidade_final", precision = 18, scale = 3)
    private BigDecimal quantidadeFinal;

    @Column(name = "unidades_perda", precision = 18, scale = 3)
    private BigDecimal unidadesPerda;

    @Column(name = "unidades_ganho", precision = 18, scale = 3)
    private BigDecimal unidadesGanho;

    // false quando o inventário passa do limite configurado de produtos (regra de negócio),
    // guardado junto do resultado para o número continuar explicável se a configuração mudar.
    @Column(name = "considerou_zerados", nullable = false)
    private Boolean considerouZerados;

    @Column(name = "arquivo_nome")
    private String arquivoNome;

    @Column(name = "importado_em", nullable = false)
    private LocalDateTime importadoEm;

    @Column(name = "importado_por")
    private String importadoPor;
}
