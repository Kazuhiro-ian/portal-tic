package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.Credencial;
import portal.ti.queiroz.repository.CredencialRepository;

import java.util.List;
import java.util.Optional;

@Service
public class CredencialService {

    @Autowired
    private CredencialRepository repository;

    public List<Credencial> listarTodas() {
        return repository.findAll();
    }

    public Credencial salvar(Credencial credencial) {
        return repository.save(credencial);
    }

    public Credencial atualizar(Long id, Credencial credencialAtualizada) {
        Optional<Credencial> existente = repository.findById(id);
        if (existente.isPresent()) {
            Credencial c = existente.get();
            c.setName(credencialAtualizada.getName());
            c.setUsername(credencialAtualizada.getUsername());
            c.setPassword(credencialAtualizada.getPassword());
            c.setNotes(credencialAtualizada.getNotes());
            return repository.save(c);
        }
        throw new RecursoNaoEncontradoException("Credencial não encontrada: " + id);
    }

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Credencial não encontrada: " + id);
        }
        repository.deleteById(id);
    }
}
