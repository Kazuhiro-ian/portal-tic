package portal.ti.queiroz.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import portal.ti.queiroz.model.TarefaPlantao;

import java.time.LocalDate;
import java.util.List;

public interface TarefaPlantaoRepository extends JpaRepository<TarefaPlantao, Long> {
    List<TarefaPlantao> findByData(LocalDate data);
}