package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import portal.ti.queiroz.dto.SalvarDiasEquipeRequest;
import portal.ti.queiroz.dto.SalvarDiasEquipeResponse;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.DiaEquipe;
import portal.ti.queiroz.repository.DiaEquipeRepository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

// Marca/desmarca de uma vez os dias que o usuário pintou no calendário da equipe (um tipo
// escolhido como "pincel", vários dias clicados, um único save no final).
@Service
public class DiaEquipeService {

    @Autowired
    private DiaEquipeRepository repository;

    public List<DiaEquipe> buscarPorPeriodo(LocalDate inicio, LocalDate fim) {
        return repository.findByDataBetween(inicio, fim);
    }

    /**
     * @param itens tipo null remove a marcação daquele dia (equivalente ao antigo "clicar de
     *              novo no mesmo tipo apaga"), tipo preenchido cria ou substitui a marcação.
     *              Leva @Transactional pelo mesmo motivo de {@link PlanoInventarioService#salvarPlano}.
     */
    @Transactional
    public SalvarDiasEquipeResponse salvarDias(SalvarDiasEquipeRequest request) {
        List<SalvarDiasEquipeRequest.ItemDiaEquipe> itens = request.itens();
        if (itens == null || itens.isEmpty()) {
            throw new RegraDeNegocioException("Nenhum dia selecionado para salvar.");
        }
        for (var item : itens) {
            if (item.data() == null) {
                throw new RegraDeNegocioException("Informe a data de cada dia selecionado.");
            }
        }

        LocalDate minData = itens.stream().map(SalvarDiasEquipeRequest.ItemDiaEquipe::data)
                .min(LocalDate::compareTo).orElseThrow();
        LocalDate maxData = itens.stream().map(SalvarDiasEquipeRequest.ItemDiaEquipe::data)
                .max(LocalDate::compareTo).orElseThrow();

        Map<LocalDate, DiaEquipe> existentes = repository.findByDataBetween(minData, maxData).stream()
                .collect(Collectors.toMap(DiaEquipe::getData, Function.identity()));

        List<DiaEquipe> paraSalvar = new ArrayList<>();
        List<DiaEquipe> paraRemover = new ArrayList<>();
        for (var item : itens) {
            DiaEquipe existente = existentes.get(item.data());
            if (item.tipo() == null) {
                if (existente != null) {
                    paraRemover.add(existente);
                }
                continue;
            }
            DiaEquipe dia = existente != null ? existente : new DiaEquipe();
            dia.setData(item.data());
            dia.setTipo(item.tipo());
            paraSalvar.add(dia);
        }

        repository.saveAll(paraSalvar);
        repository.deleteAll(paraRemover);
        return new SalvarDiasEquipeResponse(paraSalvar.size(), paraRemover.size());
    }
}