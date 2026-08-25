package portal.ti.queiroz.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;


// Ativo de TI cadastrado (desktop, notebook, celular, impressora etc.).
@Data
@Entity
@Table(name = "ativos")
public class Ativo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoAtivo tipo;

    // Sem @NotBlank de propósito: quais campos são obrigatórios depende do tipo do ativo (ex.:
    // Desktop não pede marca/modelo -- só etiqueta/IP/processador/memória/armazenamento/filial/
    // setor, ver AssetFormPanel.jsx CAMPOS_POR_TIPO), e essa regra já é aplicada no frontend.
    // Uma anotação fixa aqui rejeitaria o cadastro de Desktop, que sempre manda os dois vazios.
    @Column(nullable = false)
    private String marca;

    @Column(nullable = false)
    private String modelo;

    @NotBlank
    @Column(nullable = false)
    private String status;

    private String etiqueta;

    private String ip;

    @Column(name = "numero_serie")
    private String numeroSerie;

    @Column(name = "mac_address")
    private String macAddress;

    private String imei;

    @Column(name = "filial_id")
    private Long filialId;

    private String setor;

    @Column(name = "responsavel_atual")
    private String responsavelAtual;

    @Column(columnDefinition = "TEXT")
    private String observacoes;

    @Column(name = "last_maintenance")
    private LocalDate lastMaintenance;

    private String processador;

    private String memoria;

    private String armazenamento;

}
