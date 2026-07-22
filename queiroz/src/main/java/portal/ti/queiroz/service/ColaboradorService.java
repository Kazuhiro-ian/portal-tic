package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.model.Colaborador;
import portal.ti.queiroz.repository.ColaboradorRepository;

import java.util.List;
import java.util.Optional;

@Service
public class ColaboradorService {

    @Autowired
    private ColaboradorRepository repository;

    public List<Colaborador> listarTodos() {
        return repository.findAll();
    }

    public Colaborador salvar(Colaborador colaborador) {
        return repository.save(colaborador);
    }

    public Colaborador atualizar(Long id, Colaborador colaboradorAtualizado) {
        Optional<Colaborador> colaboradorExistente = repository.findById(id);

        if (colaboradorExistente.isPresent()) {
            Colaborador colaborador = colaboradorExistente.get();
            colaborador.setName(colaboradorAtualizado.getName());
            colaborador.setRole(colaboradorAtualizado.getRole());
            colaborador.setIsOnCall(colaboradorAtualizado.getIsOnCall());

            return repository.save(colaborador);
        } else {
            throw new RuntimeException("Colaborador não encontrado com o ID: " + id);
        }
    }

    public boolean deletar(Long id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return true;
        }
        return false;
    }
}