package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.TarefaPlantao;
import portal.ti.queiroz.repository.TarefaPlantaoRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class TarefaPlantaoService {

    @Autowired
    private TarefaPlantaoRepository repository;

    public List<TarefaPlantao> buscarPorData(LocalDate data) {
        return repository.findByData(data);
    }

    public TarefaPlantao salvar(TarefaPlantao tarefa) {
        if (tarefa.getStatus() == null) {
            tarefa.setStatus("PENDENTE");
        }
        return repository.save(tarefa);
    }

    public TarefaPlantao atualizarStatus(Long id, String novoStatus) {
        Optional<TarefaPlantao> opt = repository.findById(id);
        if (opt.isPresent()) {
            TarefaPlantao t = opt.get();
            t.setStatus(novoStatus);
            return repository.save(t);
        }
        throw new RecursoNaoEncontradoException("Tarefa não encontrada: " + id);
    }

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Tarefa não encontrada: " + id);
        }
        repository.deleteById(id);
    }
}
