package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.LinkUtil;
import portal.ti.queiroz.repository.LinkUtilRepository;

import java.util.List;
import java.util.Optional;

@Service
public class LinkUtilService {

    @Autowired
    private LinkUtilRepository repository;

    public List<LinkUtil> listarTodos() {
        return repository.findAll();
    }

    public LinkUtil salvar(LinkUtil link) {
        return repository.save(link);
    }

    public LinkUtil atualizar(Long id, LinkUtil linkAtualizado) {
        Optional<LinkUtil> linkExistente = repository.findById(id);

        if (linkExistente.isPresent()) {
            LinkUtil link = linkExistente.get();
            link.setName(linkAtualizado.getName());
            link.setUrl(linkAtualizado.getUrl());
            link.setCategory(linkAtualizado.getCategory());
            link.setTags(linkAtualizado.getTags());

            return repository.save(link);
        }
        throw new RecursoNaoEncontradoException("Link não encontrado: " + id);
    }

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Link não encontrado: " + id);
        }
        repository.deleteById(id);
    }
}
