package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.model.DiaEquipe;
import portal.ti.queiroz.model.TipoDiaEquipe;
import portal.ti.queiroz.repository.DiaEquipeRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class DiaEquipeService {

    @Autowired
    private DiaEquipeRepository repository;

    public List<DiaEquipe> buscarPorPeriodo(LocalDate inicio, LocalDate fim) {
        return repository.findByDataBetween(inicio, fim);
    }
    
    public Optional<DiaEquipe> alternar(LocalDate data, TipoDiaEquipe tipo) {
        Optional<DiaEquipe> existente = repository.findByData(data);

        if (existente.isPresent()) {
            DiaEquipe dia = existente.get();
            if (dia.getTipo() == tipo) {
                repository.delete(dia);
                return Optional.empty();
            }
            dia.setTipo(tipo);
            return Optional.of(repository.save(dia));
        }

        DiaEquipe novo = new DiaEquipe();
        novo.setData(data);
        novo.setTipo(tipo);
        return Optional.of(repository.save(novo));
    }
}