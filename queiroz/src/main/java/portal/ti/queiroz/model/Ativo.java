package portal.ti.queiroz.model;

import jakarta.persistence.*;
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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoAtivo tipo;

    @Column(nullable = false)
    private String marca;

    @Column(nullable = false)
    private String modelo;

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
