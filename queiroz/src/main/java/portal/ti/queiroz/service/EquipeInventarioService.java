package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.EquipeInventario;
import portal.ti.queiroz.repository.EquipeInventarioRepository;

import java.util.List;

// CRUD das equipes de inventário.
@Service
public class EquipeInventarioService {
    @Autowired
    private EquipeInventarioRepository repository;

    public List<EquipeInventario> listarTodas() {
        return repository.findAll();
    }

    public EquipeInventario salvar(EquipeInventario equipe) {
        // Zera o id recebido no corpo: sem isso, um POST com um id existente no JSON
        // vira UPDATE silencioso daquele registro em vez de criar um novo.
        equipe.setId(null);
        return repository.save(equipe);
    }

    public EquipeInventario atualizar(Long id, EquipeInventario equipeAtualizada) {
        EquipeInventario equipe = repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Equipe não encontrada com o ID: " + id));
        equipe.setNome(equipeAtualizada.getNome());
        return repository.save(equipe);
    }

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Equipe não encontrada com o ID: " + id);
        }
        repository.deleteById(id);
    }
}