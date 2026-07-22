package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.model.ZebraEnvio;
import portal.ti.queiroz.repository.ZebraEnvioRepository;

import java.util.List;

@Service
public class ZebraEnvioService {

    @Autowired
    private ZebraEnvioRepository repository;

    public List<ZebraEnvio> listarTodos() {
        return repository.findByOrderByDataEnvioDesc();
    }

    public ZebraEnvio salvar(ZebraEnvio envio) {
        if ("EXTRA".equalsIgnoreCase(envio.getTipoEnvio()) && (envio.getMotivoExtra() == null || envio.getMotivoExtra().trim().isEmpty())) {
            throw new RuntimeException("O motivo é obrigatório para envios extras.");
        }
        return repository.save(envio);
    }

    public void deletar(Long id) {
        repository.deleteById(id);
    }
}