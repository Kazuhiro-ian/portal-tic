package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;

// Um inventário agendado ou realizado para uma filial em uma data.
@Data
@Entity
@Table(name = "inventarios", indexes = {
        // RelatorioAcuracidadeService/PlanoInventarioService consultam o tempo todo por
        // filial + intervalo de data (findByDataBetween, findByFilialIdAndDataBetween).
        @Index(name = "idx_inventarios_filial_data", columnList = "filial_id, data")
})
public class Inventario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "filial_id", nullable = false)
    private Long filialId;

    @Column(nullable = false)
    private LocalDate data;

    @Column(name = "horario_inicio")
    private LocalTime horarioInicio;
    
    @Column(name = "horario_fim")
    private LocalTime horarioFim;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatusInventario status;

    @Column(name = "dia_preferencial")
    private Integer diaPreferencial;

    private String responsavel;

    private String observacao;

    // true quando o usuário confirmou o agendamento mesmo caindo em dia de recebimento.
    @Column(name = "ciente_conflito_recebimento")
    private Boolean cienteConflitoRecebimento;
}
