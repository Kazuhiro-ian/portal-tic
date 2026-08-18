package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.Colaborador;
import portal.ti.queiroz.repository.ColaboradorRepository;

import java.util.List;

@Service
public class ColaboradorService {

    @Autowired
    private ColaboradorRepository repository;

    public List<Colaborador> listarTodos() {
        return repository.findAll();
    }

    public Colaborador salvar(Colaborador colaborador) {
        // Zera o id recebido no corpo: sem isso, um POST com um id existente no JSON
        // vira UPDATE silencioso daquele registro em vez de criar um novo.
        colaborador.setId(null);
        return repository.save(colaborador);
    }

    public Colaborador atualizar(Long id, Colaborador colaboradorAtualizado) {
        Colaborador colaborador = repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Colaborador não encontrado com o ID: " + id));

        colaborador.setName(colaboradorAtualizado.getName());
        colaborador.setRole(colaboradorAtualizado.getRole());
        colaborador.setIsOnCall(colaboradorAtualizado.getIsOnCall());

        return repository.save(colaborador);
    }

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Colaborador não encontrado com o ID: " + id);
        }
        repository.deleteById(id);
    }
}
