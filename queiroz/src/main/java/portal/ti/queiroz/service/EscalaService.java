package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.model.Escala;
import portal.ti.queiroz.repository.EscalaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class EscalaService {

    @Autowired
    private EscalaRepository repository;

    public List<Escala> buscarPorPeriodo(LocalDate inicio, LocalDate fim) {
        return repository.findByDataBetween(inicio, fim);
    }

    public Escala salvarOuAtualizar(Escala escala) {
        // Se já existir uma escala para esse colaborador nesse dia, ele atualiza o turno existente
        Optional<Escala> existente = repository.findByColaboradorIdAndData(escala.getColaboradorId(), escala.getData());

        if (existente.isPresent()) {
            Escala e = existente.get();
            e.setTurno(escala.getTurno());
            return repository.save(e);
        } else {
            return repository.save(escala);
        }
    }
}