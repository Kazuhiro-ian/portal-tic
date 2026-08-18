package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;

/**
 * Uma linha por DATA concreta do calendário, dizendo qual grupo recebe material nela.
 *
 * Guardar a data concreta (em vez de só o padrão semanal do mês) resolve os dois casos
 * com um único modelo: aplicar o padrão do mês expande para linhas, e um feriado é
 * simplesmente a edição de uma linha (ajusteManual = true).
 */
@Data
@Entity
@Table(name = "dias_recebimento",
        uniqueConstraints = @UniqueConstraint(name = "uk_dias_recebimento_data", columnNames = "data"))
public class DiaRecebimento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate data;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoDiaRecebimento tipo;

    /**
     * true quando o dia foi ajustado à mão (feriado, entrega extra). Esses dias
     * sobrevivem a uma reaplicação do padrão semanal, salvo se o usuário pedir
     * explicitamente para sobrescrever.
     */
    @Column(name = "ajuste_manual")
    private Boolean ajusteManual;

    private String observacao;
}
