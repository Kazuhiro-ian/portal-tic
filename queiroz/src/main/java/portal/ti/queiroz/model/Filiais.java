package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "filiais")
public class Filiais {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer numeroFilial;

    @Column(nullable = false)
    private String cnpj;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false)
    private String endereco;

    /**
     * Grupo de recebimento da loja, usado pelo módulo de Qualidade para saber
     * em quais dias ela recebe material (e portanto não pode inventariar).
     *
     * NULLABLE de propósito: ddl-auto=update não consegue adicionar uma coluna
     * NOT NULL em tabela já populada — isso derrubaria o boot da aplicação inteira.
     * Filial sem grupo é tratada como "não planejável" e sinalizada na UI.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "grupo_recebimento")
    private GrupoRecebimento grupoRecebimento;

    /**
     * CD ou Loja, usado pelo relatório de acuracidade para montar os agregados
     * "CDs", "Lojas" e "Geral".
     *
     * NULLABLE pelo mesmo motivo do grupoRecebimento acima: ddl-auto=update não
     * adiciona coluna NOT NULL em tabela já populada. Filial sem tipo fica fora
     * dos agregados e é sinalizada na tela de acuracidade.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_filial")
    private TipoFilial tipoFilial;

    /**
     * Indica se a loja opera com o estoque dividido em dois armazéns (01 = Loja,
     * 03 = Estoque), gerando um inventário e um resultado de acuracidade por armazém.
     *
     * NULLABLE pelo mesmo motivo dos campos acima. Só faz sentido true para tipoFilial
     * LOJA — validado em {@link portal.ti.queiroz.controller.FiliaisController}.
     */
    @Column(name = "estoque_dividido")
    private Boolean estoqueDividido;
}