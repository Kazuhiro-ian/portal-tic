package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.model.Impressora;
import portal.ti.queiroz.repository.ImpressoraRepository;

import java.util.List;
import java.util.Optional;

@Service
public class ImpressoraService {

    @Autowired
    private ImpressoraRepository repository;

    public List<Impressora> listarTodas() {
        return repository.findAll();
    }

    public Impressora salvar(Impressora impressora) {
        return repository.save(impressora);
    }

    public Impressora atualizar(Long id, Impressora impressoraAtualizada) {
        Optional<Impressora> impressoraExistente = repository.findById(id);

        if (impressoraExistente.isPresent()) {
            Impressora impressora = impressoraExistente.get();
            impressora.setIp(impressoraAtualizada.getIp());
            impressora.setLocation(impressoraAtualizada.getLocation());
            impressora.setBrand(impressoraAtualizada.getBrand());
            impressora.setModel(impressoraAtualizada.getModel());
            impressora.setSerialNumber(impressoraAtualizada.getSerialNumber());
            impressora.setStatus(impressoraAtualizada.getStatus());
            impressora.setLastMaintenance(impressoraAtualizada.getLastMaintenance());

            return repository.save(impressora);
        } else {
            throw new RuntimeException("Impressora não encontrada com o ID: " + id);
        }
    }

    public boolean deletar(Long id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return true;
        }
        return false;
    }
}