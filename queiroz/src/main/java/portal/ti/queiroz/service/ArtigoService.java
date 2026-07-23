package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.Artigo;
import portal.ti.queiroz.repository.ArtigoRepository;

import java.util.List;
import java.util.Optional;

@Service
public class ArtigoService {

    @Autowired
    private ArtigoRepository repository;

    public List<Artigo> listarTodos() {
        return repository.findAll();
    }

    public Artigo salvar(Artigo artigo) {
        return repository.save(artigo);
    }

    public Artigo atualizar(Long id, Artigo artigoAtualizado) {
        Optional<Artigo> existente = repository.findById(id);
        if (existente.isPresent()) {
            Artigo a = existente.get();
            a.setTitle(artigoAtualizado.getTitle());
            a.setCategory(artigoAtualizado.getCategory());
            a.setSummary(artigoAtualizado.getSummary());
            a.setContent(artigoAtualizado.getContent());
            a.setAuthor(artigoAtualizado.getAuthor());
            return repository.save(a);
        }
        throw new RecursoNaoEncontradoException("Artigo não encontrado: " + id);
    }

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Artigo não encontrado: " + id);
        }
        repository.deleteById(id);
    }
}
