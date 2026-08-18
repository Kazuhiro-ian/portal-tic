package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.TarefaPlantao;
import portal.ti.queiroz.repository.TarefaPlantaoRepository;

import java.time.LocalDate;
import java.util.List;

@Service
public class TarefaPlantaoService {

    @Autowired
    private TarefaPlantaoRepository repository;

    public List<TarefaPlantao> buscarPorData(LocalDate data) {
        return repository.findByData(data);
    }

    public TarefaPlantao salvar(TarefaPlantao tarefa) {
        // Zera o id recebido no corpo: sem isso, um POST com um id existente no JSON
        // vira UPDATE silencioso daquele registro em vez de criar um novo.
        tarefa.setId(null);
        if (tarefa.getStatus() == null) {
            tarefa.setStatus("PENDENTE");
        }
        return repository.save(tarefa);
    }

    public TarefaPlantao atualizarStatus(Long id, String novoStatus) {
        TarefaPlantao tarefa = repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Tarefa não encontrada: " + id));
        tarefa.setStatus(novoStatus);
        return repository.save(tarefa);
    }

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Tarefa não encontrada: " + id);
        }
        repository.deleteById(id);
    }
}
