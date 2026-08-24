package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;

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

    // Frequência de inventário da filial. Null = MENSAL (mesmo motivo de nullable dos campos
    // acima: ddl-auto=update não popula NOT NULL em tabela já existente).
    @Enumerated(EnumType.STRING)
    @Column(name = "periodicidade_inventario")
    private PeriodicidadeInventario periodicidadeInventario;

    // Primeiro dia de um mês "sim" do ciclo bimestral (ex: 2026-08-01). Só usado quando
    // periodicidadeInventario = BIMESTRAL; a paridade dos meses seguintes é calculada a
    // partir daqui, então mudar esta data só afeta propostas futuras, nunca inventários
    // já gravados.
    @Column(name = "referencia_bimestral_sim")
    private LocalDate referenciaBimestral;
}