package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;

// Uma linha por data concreta, indicando qual grupo recebe material nela.
// Aplicar o padrão semanal do mês expande em linhas; um feriado é a edição de uma linha.
@Data
@Entity
@Table(name = "dias_recebimento", uniqueConstraints = @UniqueConstraint(name = "uk_dias_recebimento_data", columnNames = "data"))
public class DiaRecebimento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate data;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoDiaRecebimento tipo;

    // true quando o dia foi ajustado manualmente; sobrevive a uma reaplicação do padrão semanal.
    @Column(name = "ajuste_manual")
    private Boolean ajusteManual;

    private String observacao;
}
