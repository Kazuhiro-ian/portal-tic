package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.Artigo;
import portal.ti.queiroz.repository.ArtigoRepository;

import java.util.List;

// CRUD dos artigos da wiki interna.
@Service
public class ArtigoService {

    @Autowired
    private ArtigoRepository repository;

    public List<Artigo> listarTodos() {
        return repository.findAll();
    }

    public Artigo salvar(Artigo artigo) {
        // Zera o id recebido no corpo: sem isso, um POST com um id existente no JSON
        // vira UPDATE silencioso daquele registro em vez de criar um novo.
        artigo.setId(null);
        return repository.save(artigo);
    }

    public Artigo atualizar(Long id, Artigo artigoAtualizado) {
        Artigo a = repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Artigo não encontrado: " + id));

        a.setTitle(artigoAtualizado.getTitle());
        a.setCategory(artigoAtualizado.getCategory());
        a.setSummary(artigoAtualizado.getSummary());
        a.setContent(artigoAtualizado.getContent());
        a.setAuthor(artigoAtualizado.getAuthor());
        return repository.save(a);
    }

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Artigo não encontrado: " + id);
        }
        repository.deleteById(id);
    }
}
