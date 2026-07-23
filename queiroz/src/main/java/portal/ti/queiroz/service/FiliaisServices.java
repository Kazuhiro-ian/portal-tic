package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.Filiais;
import portal.ti.queiroz.repository.FiliaisRepository;

import java.util.List;
import java.util.Optional;

@Service
public class FiliaisServices {

    @Autowired
    private FiliaisRepository repository;

    public List<Filiais> listarTodas() {
        return repository.findAll();
    }

    public Filiais salvar(Filiais filial) {
        return repository.save(filial);
    }

    public Filiais atualizar(Long id, Filiais filialAtualizada) {
        Optional<Filiais> filialExistente = repository.findById(id);

        if (filialExistente.isPresent()) {
            Filiais filial = filialExistente.get();
            filial.setNumeroFilial(filialAtualizada.getNumeroFilial());
            filial.setNome(filialAtualizada.getNome());
            filial.setCnpj(filialAtualizada.getCnpj());
            filial.setEndereco(filialAtualizada.getEndereco());

            return repository.save(filial);
        }
        throw new RecursoNaoEncontradoException("Filial não encontrada com o ID: " + id);
    }

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Filial não encontrada com o ID: " + id);
        }
        repository.deleteById(id);
    }
}
