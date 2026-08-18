package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.Filiais;
import portal.ti.queiroz.model.TipoFilial;
import portal.ti.queiroz.repository.FiliaisRepository;

import java.util.List;

@Service
public class FiliaisServices {

    @Autowired
    private FiliaisRepository repository;

    public List<Filiais> listarTodas() {
        return repository.findAll();
    }

    public Filiais salvar(Filiais filial) {
        validarEstoqueDividido(filial);
        // Zera o id recebido no corpo: sem isso, um POST com um id existente no JSON
        // vira UPDATE silencioso daquele registro em vez de criar um novo.
        filial.setId(null);
        return repository.save(filial);
    }

    public Filiais atualizar(Long id, Filiais filialAtualizada) {
        Filiais filial = repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Filial não encontrada com o ID: " + id));

        validarEstoqueDividido(filialAtualizada);

        filial.setNumeroFilial(filialAtualizada.getNumeroFilial());
        filial.setNome(filialAtualizada.getNome());
        filial.setCnpj(filialAtualizada.getCnpj());
        filial.setEndereco(filialAtualizada.getEndereco());
        filial.setGrupoRecebimento(filialAtualizada.getGrupoRecebimento());
        filial.setTipoFilial(filialAtualizada.getTipoFilial());
        filial.setEstoqueDividido(filialAtualizada.getEstoqueDividido());

        return repository.save(filial);
    }

    /** Estoque dividido em armazéns (01/03) só faz sentido para Lojas. */
    private void validarEstoqueDividido(Filiais filial) {
        if (Boolean.TRUE.equals(filial.getEstoqueDividido()) && filial.getTipoFilial() != TipoFilial.LOJA) {
            throw new RegraDeNegocioException("Só filiais do tipo Loja podem ter o estoque dividido em armazéns.");
        }
    }

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Filial não encontrada com o ID: " + id);
        }
        repository.deleteById(id);
    }
}
