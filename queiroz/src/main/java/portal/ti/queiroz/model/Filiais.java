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

    // Grupo de recebimento da loja, usado em Qualidade para saber em quais dias ela recebe
    // material. Nullable porque ddl-auto=update não adiciona coluna NOT NULL em tabela populada;
    // filial sem grupo é tratada como "não planejável" na UI.
    @Enumerated(EnumType.STRING)
    @Column(name = "grupo_recebimento")
    private GrupoRecebimento grupoRecebimento;

    // CD ou Loja, usado para montar os agregados do relatório de acuracidade. Mesmo motivo de
    // nullable acima; filial sem tipo fica fora dos agregados.
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_filial")
    private TipoFilial tipoFilial;

    // Estoque separado em dois armazéns (01 = Loja, 03 = Estoque). Só se aplica a tipoFilial LOJA.
    @Column(name = "estoque_dividido")
    private Boolean estoqueDividido;
}