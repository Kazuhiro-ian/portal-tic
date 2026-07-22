package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
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
        Optional<ZebraCota> existente = repository.findByFilialId(cota.getFilialId());
        if (existente.isPresent() && !existente.get().getId().equals(cota.getId())) {
            throw new RuntimeException("Já existe uma cota para esta filial.");
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
        }).orElseThrow(() -> new RuntimeException("Cota não encontrada."));
    }

    public void deletar(Long id) {
        repository.deleteById(id);
    }
}