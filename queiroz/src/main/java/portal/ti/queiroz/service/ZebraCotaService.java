package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.ZebraCota;
import portal.ti.queiroz.repository.ZebraCotaRepository;

import java.util.List;
import java.util.Optional;

@Service
public class ZebraCotaService {

    @Autowired
    private ZebraCotaRepository repository;

    public List<ZebraCota> listarTodas() {
        return repository.findAll();
    }

    public ZebraCota salvar(ZebraCota cota) {
        // Zera o id recebido no corpo: sem isso, um POST com um id existente no JSON
        // vira UPDATE silencioso daquele registro (e, aqui, também driblaria a checagem
        // de duplicidade abaixo) em vez de criar um novo -- edição de verdade já tem seu
        // próprio endpoint em atualizar(id, ...).
        cota.setId(null);
        Optional<ZebraCota> existente = repository.findByFilialId(cota.getFilialId());
        if (existente.isPresent()) {
            throw new RegraDeNegocioException("Já existe uma cota para esta filial.");
        }
        return repository.save(cota);
    }

    public ZebraCota atualizar(Long id, ZebraCota cotaAtualizada) {
        return repository.findById(id).map(cota -> {
            cota.setEtiquetasPadrao(cotaAtualizada.getEtiquetasPadrao());
            cota.setRibbonsPadrao(cotaAtualizada.getRibbonsPadrao());
            cota.setDiaEnvio1(cotaAtualizada.getDiaEnvio1());
            cota.setDiaEnvio2(cotaAtualizada.getDiaEnvio2());
            return repository.save(cota);
        }).orElseThrow(() -> new RecursoNaoEncontradoException("Cota não encontrada."));
    }

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Cota não encontrada.");
        }
        repository.deleteById(id);
    }
}
