package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Data
@Entity
@Table(name = "tarefas_plantao")
public class TarefaPlantao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate data;

    @Column(nullable = false)
    private String descricao;

    @Column(nullable = false)
    private String status; // "PENDENTE", "EM_ANDAMENTO", "CONCLUIDO"
}