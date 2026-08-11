package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Resumo calculado de um inventário — o equivalente a uma coluna da aba
 * "resumo_atual" da planilha que o setor usava.
 *
 * Fica gravado (em vez de recalculado a cada consulta) porque a tela de
 * acuracidade compara vários meses de várias filiais ao mesmo tempo: somar
 * ~220 mil linhas de itens a cada abertura deixaria a tela lenta sem necessidade.
 */
@Data
@Entity
@Table(name = "inventario_resultados")
public class InventarioResultado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "inventario_id", nullable = false, unique = true)
    private Long inventarioId;

    // --- Valores em R$ ---

    @Column(name = "estoque_inicial_valor", precision = 18, scale = 2)
    private BigDecimal estoqueInicialValor;

    @Column(name = "estoque_final_valor", precision = 18, scale = 2)
    private BigDecimal estoqueFinalValor;

    /** Soma das divergências negativas (falta). Guardado negativo, como na planilha. */
    @Column(name = "perda_valor", precision = 18, scale = 2)
    private BigDecimal perdaValor;

    /** Soma das divergências positivas (sobra). */
    @Column(name = "ganho_valor", precision = 18, scale = 2)
    private BigDecimal ganhoValor;

    /** |perda| + |ganho| — o "Total (R$)" da planilha. */
    @Column(name = "total_ajuste_valor", precision = 18, scale = 2)
    private BigDecimal totalAjusteValor;

    @Column(name = "percentual_perda", precision = 9, scale = 6)
    private BigDecimal percentualPerda;

    @Column(name = "percentual_ganho", precision = 9, scale = 6)
    private BigDecimal percentualGanho;

    /** % de perda + % de ganho. É o indicador com meta de 2% na apresentação. */
    @Column(name = "percentual_inacuracia", precision = 9, scale = 6)
    private BigDecimal percentualInacuracia;

    // --- Contagem de produtos ---

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

    /** Indicador com meta de 75% na apresentação. */
    @Column(name = "percentual_acuracidade", precision = 9, scale = 6)
    private BigDecimal percentualAcuracidade;

    @Column(name = "percentual_inacurados", precision = 9, scale = 6)
    private BigDecimal percentualInacurados;

    @Column(name = "produtos_com_perda")
    private Integer produtosComPerda;

    @Column(name = "produtos_com_ganho")
    private Integer produtosComGanho;

    // --- Unidades ---

    @Column(name = "quantidade_inicial", precision = 18, scale = 3)
    private BigDecimal quantidadeInicial;

    @Column(name = "quantidade_final", precision = 18, scale = 3)
    private BigDecimal quantidadeFinal;

    @Column(name = "unidades_perda", precision = 18, scale = 3)
    private BigDecimal unidadesPerda;

    @Column(name = "unidades_ganho", precision = 18, scale = 3)
    private BigDecimal unidadesGanho;

    /**
     * Se os produtos zerados entraram no cálculo de acuracidade.
     * Fica false quando o inventário passa do limite configurado (3000 produtos),
     * espelhando a regra "Zerados ?" da planilha. Guardado junto do resultado
     * para que um número antigo continue explicável mesmo se a configuração mudar.
     */
    @Column(name = "considerou_zerados", nullable = false)
    private Boolean considerouZerados;

    // --- Rastreabilidade da importação ---

    @Column(name = "arquivo_nome")
    private String arquivoNome;

    @Column(name = "importado_em", nullable = false)
    private LocalDateTime importadoEm;

    @Column(name = "importado_por")
    private String importadoPor;
}
