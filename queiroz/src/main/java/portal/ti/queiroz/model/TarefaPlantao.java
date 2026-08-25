package portal.ti.queiroz.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;

@Data
@Entity
@Table(name = "tarefas_plantao")
public class TarefaPlantao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(nullable = false)
    private LocalDate data;

    @NotBlank
    @Column(nullable = false)
    private String descricao;

    // Não validado com @NotNull: TarefaPlantaoService.salvar preenche com PENDENTE quando nulo.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatusTarefaPlantao status;
}