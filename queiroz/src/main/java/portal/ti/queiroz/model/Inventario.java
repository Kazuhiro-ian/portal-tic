package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;

/**
 * Inventário planejado de uma filial. Cada filial faz um por mês, e nunca em um dia
 * em que ela recebe material (ver InventarioService).
 */
@Data
@Entity
@Table(name = "inventarios")
public class Inventario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "filial_id", nullable = false)
    private Long filialId;

    @Column(nullable = false)
    private LocalDate data;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatusInventario status;

    /**
     * Dia-do-mês DESEJADO da filial — a âncora usada pelo gerador do plano para
     * repetir o mesmo dia mês a mês.
     *
     * Guarda o dia pretendido, não o efetivamente usado: se um conflito de recebimento
     * empurrou o inventário do dia 12 para o 13, este campo continua 12. Sem isso, o
     * deslocamento pontual viraria o novo padrão permanente da loja (deriva mês a mês).
     */
    @Column(name = "dia_preferencial")
    private Integer diaPreferencial;

    private String responsavel;

    private String observacao;
}
