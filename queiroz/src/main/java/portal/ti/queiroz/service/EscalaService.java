package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.model.Escala;
import portal.ti.queiroz.repository.EscalaRepository;

import java.time.LocalDate;
import java.util.List;

@Service
public class EscalaService {

    @Autowired
    private EscalaRepository repository;

    public List<Escala> buscarPorPeriodo(LocalDate inicio, LocalDate fim) {
        return repository.findByDataBetween(inicio, fim);
    }

    public Escala salvarOuAtualizar(Escala escala) {
        // Se já existir uma escala para esse colaborador nesse dia, atualiza o turno existente
        // em vez de inserir uma segunda linha para o mesmo par colaborador/data.
        return repository.findByColaboradorIdAndData(escala.getColaboradorId(), escala.getData())
                .map(existente -> {
                    existente.setTurno(escala.getTurno());
                    return repository.save(existente);
                })
                .orElseGet(() -> repository.save(escala));
    }
}