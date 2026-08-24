package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.LinkUtil;
import portal.ti.queiroz.repository.LinkUtilRepository;

import java.util.List;

// CRUD dos links úteis favoritados, organizados por categoria e tags.
@Service
public class LinkUtilService {

    @Autowired
    private LinkUtilRepository repository;

    public List<LinkUtil> listarTodos() {
        return repository.findAll();
    }

    public LinkUtil salvar(LinkUtil link) {
        // Zera o id recebido no corpo: sem isso, um POST com um id existente no JSON
        // vira UPDATE silencioso daquele registro em vez de criar um novo.
        link.setId(null);
        return repository.save(link);
    }

    public LinkUtil atualizar(Long id, LinkUtil linkAtualizado) {
        LinkUtil link = repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Link não encontrado: " + id));

        link.setName(linkAtualizado.getName());
        link.setUrl(linkAtualizado.getUrl());
        link.setCategory(linkAtualizado.getCategory());
        link.setTags(linkAtualizado.getTags());

        return repository.save(link);
    }

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Link não encontrado: " + id);
        }
        repository.deleteById(id);
    }
}
