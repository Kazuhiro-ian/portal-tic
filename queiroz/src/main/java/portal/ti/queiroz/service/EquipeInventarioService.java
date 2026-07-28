package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.EquipeInventario;
import portal.ti.queiroz.repository.EquipeInventarioRepository;

import java.util.List;
import java.util.Optional;

@Service
public class EquipeInventarioService {
    @Autowired
    private EquipeInventarioRepository repository;

    public List<EquipeInventario> listarTodas() {
        return repository.findAll();
    }

    public EquipeInventario salvar(EquipeInventario equipe) {
        return repository.save(equipe);
    }

    public EquipeInventario atualizar(Long id, EquipeInventario equipeAtualizada) {
        Optional<EquipeInventario> equipeExistente = repository.findById(id);

        if(equipeExistente.isPresent()) {
            EquipeInventario equipe = equipeExistente.get();
            equipe.setNome(equipeAtualizada.getNome());
            return repository.save(equipe);
        }
        throw new RecursoNaoEncontradoException("Equipe não encontrada com o ID: " + id);
    }

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Equipe não encontrada com o ID: " + id);
        }
        repository.deleteById(id);
    }
}