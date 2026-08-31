package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.Filiais;
import portal.ti.queiroz.model.PeriodicidadeInventario;
import portal.ti.queiroz.model.TipoFilial;
import portal.ti.queiroz.repository.FiliaisRepository;

import java.util.List;

// CRUD de filiais, com a regra de que só Lojas podem ter estoque dividido em armazéns.
@Service
public class FiliaisServices {

    @Autowired
    private FiliaisRepository repository;

    public List<Filiais> listarTodas() {
        return repository.findAll();
    }

    public Filiais salvar(Filiais filial) {
        validarEstoqueDividido(filial);
        normalizarPeriodicidade(filial);
        // Zera o id recebido no corpo: sem isso, um POST com um id existente no JSON
        // vira UPDATE silencioso daquele registro em vez de criar um novo.
        filial.setId(null);
        return repository.save(filial);
    }

    public Filiais atualizar(Long id, Filiais filialAtualizada) {
        Filiais filial = repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Filial não encontrada com o ID: " + id));

        validarEstoqueDividido(filialAtualizada);
        normalizarPeriodicidade(filialAtualizada);

        filial.setNumeroFilial(filialAtualizada.getNumeroFilial());
        filial.setNome(filialAtualizada.getNome());
        filial.setCnpj(filialAtualizada.getCnpj());
        filial.setEndereco(filialAtualizada.getEndereco());
        filial.setGrupoRecebimento(filialAtualizada.getGrupoRecebimento());
        filial.setTipoFilial(filialAtualizada.getTipoFilial());
        filial.setEstoqueDividido(filialAtualizada.getEstoqueDividido());
        filial.setPeriodicidadeInventario(filialAtualizada.getPeriodicidadeInventario());
        filial.setReferenciaBimestral(filialAtualizada.getReferenciaBimestral());
        filial.setRamal(filialAtualizada.getRamal());
        filial.setWhatsapp(filialAtualizada.getWhatsapp());
        
        return repository.save(filial);
    }

    /** Estoque dividido em armazéns (01/03) só faz sentido para Lojas. */
    private void validarEstoqueDividido(Filiais filial) {
        if (Boolean.TRUE.equals(filial.getEstoqueDividido()) && filial.getTipoFilial() != TipoFilial.LOJA) {
            throw new RegraDeNegocioException("Só filiais do tipo Loja podem ter o estoque dividido em armazéns.");
        }
    }

    /**
     * Bimestral exige a referência de qual mês é "sim". Para as demais periodicidades a
     * referência não tem sentido, então é limpa aqui em vez de confiar só no frontend --
     * o endpoint aceita chamadas diretas.
     */
    private void normalizarPeriodicidade(Filiais filial) {
        if (filial.getPeriodicidadeInventario() == PeriodicidadeInventario.BIMESTRAL) {
            if (filial.getReferenciaBimestral() == null) {
                throw new RegraDeNegocioException("Informe o mês de referência do ciclo bimestral.");
            }
        } else {
            filial.setReferenciaBimestral(null);
        }
    }

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Filial não encontrada com o ID: " + id);
        }
        repository.deleteById(id);
    }
}
