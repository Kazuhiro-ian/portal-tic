package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import portal.ti.queiroz.dto.SalvarEscalasRequest;
import portal.ti.queiroz.dto.SalvarEscalasResponse;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.Escala;
import portal.ti.queiroz.repository.EscalaRepository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

// Consulta e grava a escala de turnos dos colaboradores.
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

    /**
     * Salva vários turnos de uma vez ("pintados" na grade da Escala, um único clique em Salvar
     * no final) -- mesma ideia de {@link portal.ti.queiroz.service.DiaEquipeService#salvarDias}.
     * Busca as escalas
     * existentes do período com uma única query em vez de uma por item, para não trocar N
     * requisições HTTP por N consultas ao banco.
     * Leva @Transactional pelo mesmo motivo de {@link PlanoInventarioService#salvarPlano}.
     */
    @Transactional
    public SalvarEscalasResponse salvarVarias(SalvarEscalasRequest request) {
        List<SalvarEscalasRequest.ItemEscala> itens = request.itens();
        if (itens == null || itens.isEmpty()) {
            throw new RegraDeNegocioException("Nenhum turno selecionado para salvar.");
        }

        LocalDate minData = itens.stream().map(SalvarEscalasRequest.ItemEscala::data)
                .min(LocalDate::compareTo).orElseThrow();
        LocalDate maxData = itens.stream().map(SalvarEscalasRequest.ItemEscala::data)
                .max(LocalDate::compareTo).orElseThrow();

        Map<String, Escala> existentes = repository.findByDataBetween(minData, maxData).stream()
                .collect(java.util.stream.Collectors.toMap(
                        e -> e.getColaboradorId() + "_" + e.getData(), e -> e));

        List<Escala> paraSalvar = new ArrayList<>();
        for (var item : itens) {
            Escala existente = existentes.get(item.colaboradorId() + "_" + item.data());
            Escala escala = existente != null ? existente : new Escala();
            escala.setColaboradorId(item.colaboradorId());
            escala.setData(item.data());
            escala.setTurno(item.turno());
            paraSalvar.add(escala);
        }

        repository.saveAll(paraSalvar);
        return new SalvarEscalasResponse(paraSalvar.size());
    }
}