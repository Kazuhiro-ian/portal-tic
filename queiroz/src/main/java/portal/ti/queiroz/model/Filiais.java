package portal.ti.queiroz.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
@Entity
@Table(name = "filiais")
public class Filiais {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(nullable = false)
    private Integer numeroFilial;

    // cnpj e endereco ficam sem @NotBlank de propósito: na tela de Gestão de Filiais só
    // "Número da Filial" e "Nome da Filial" são marcados como obrigatórios (BranchManagement.jsx),
    // e o cadastro sempre aceitou filial sem CNPJ/endereço, gravando string vazia. Exigi-los aqui
    // rejeitaria esse cadastro que sempre funcionou -- mesma armadilha do formulário de Desktop
    // em Ativos. Se um dia virarem obrigatórios de verdade, o lugar de começar é a tela.
    @Column(nullable = false)
    private String cnpj;

    @NotBlank
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

    // Ramal do telefone fixo da loja, "Formato 3305-XXXX", Opcional
    @Column(name = "ramal")
    private String ramal;

    // Número de whatsapp da loja, usado para contato, Opcional.
    @Column(name = "whatsapp")
    private String whatsapp;
}