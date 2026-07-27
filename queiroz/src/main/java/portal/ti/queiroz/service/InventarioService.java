package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.*;
import portal.ti.queiroz.repository.DiaRecebimentoRepository;
import portal.ti.queiroz.repository.FiliaisRepository;
import portal.ti.queiroz.repository.InventarioRepository;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@Service
public class InventarioService {

    private static final DateTimeFormatter BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Autowired
    private InventarioRepository repository;

    @Autowired
    private FiliaisRepository filiaisRepository;

    @Autowired
    private DiaRecebimentoRepository diaRecebimentoRepository;

    public List<Inventario> buscarPorPeriodo(LocalDate inicio, LocalDate fim) {
        return repository.findByDataBetween(inicio, fim);
    }

    public Inventario salvar(Inventario inventario) {
        prepararEValidar(inventario, null);
        return repository.save(inventario);
    }

    public Inventario atualizar(Long id, Inventario atualizado) {
        Inventario inventario = repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Inventário não encontrado com o ID: " + id));

        inventario.setFilialId(atualizado.getFilialId());
        inventario.setData(atualizado.getData());
        inventario.setStatus(atualizado.getStatus());
        inventario.setResponsavel(atualizado.getResponsavel());
        inventario.setObservacao(atualizado.getObservacao());
        inventario.setDiaPreferencial(atualizado.getDiaPreferencial());
        inventario.setHorarioInicio(atualizado.getHorarioInicio());
        inventario.setHorarioFim(atualizado.getHorarioFim());

        prepararEValidar(inventario, id);
        return repository.save(inventario);
    }

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Inventário não encontrado com o ID: " + id);
        }
        repository.deleteById(id);
    }

    /**
     * Aplica os defaults e as três regras do módulo:
     * conflito com dia de recebimento, um inventário por filial por mês, e filial sem grupo.
     *
     * @param idIgnorado id do próprio registro, para não conflitar consigo mesmo na edição
     */
    private void prepararEValidar(Inventario inventario, Long idIgnorado) {
        if (inventario.getFilialId() == null) {
            throw new RegraDeNegocioException("Informe a filial do inventário.");
        }
        if (inventario.getData() == null) {
            throw new RegraDeNegocioException("Informe a data do inventário.");
        }
        if (inventario.getHorarioInicio() != null && inventario.getHorarioFim() != null && !inventario.getHorarioFim().isAfter(inventario.getHorarioInicio())) {
            throw new RegraDeNegocioException("O horário do término deve ser depois do horário de início");
        }
        if (inventario.getStatus() == null) {
            inventario.setStatus(StatusInventario.PLANEJADO);
        }
        if (inventario.getDiaPreferencial() == null) {
            inventario.setDiaPreferencial(inventario.getData().getDayOfMonth());
        }

        Filiais filial = filiaisRepository.findById(inventario.getFilialId())
                .orElseThrow(() -> new RecursoNaoEncontradoException(
                        "Filial não encontrada com o ID: " + inventario.getFilialId()));

        if (filial.getGrupoRecebimento() == null) {
            throw new RegraDeNegocioException(
                    "A filial %s - %s não tem grupo de recebimento definido. Defina o grupo em Gestão de Filiais antes de agendar o inventário."
                            .formatted(filial.getNumeroFilial(), filial.getNome()));
        }

        // Um inventário por filial por mês (CANCELADO não conta).
        YearMonth mes = YearMonth.from(inventario.getData());
        List<Inventario> doMes = repository.findByFilialIdAndDataBetween(
                filial.getId(), mes.atDay(1), mes.atEndOfMonth());

        boolean jaExiste = doMes.stream()
                .filter(i -> idIgnorado == null || !idIgnorado.equals(i.getId()))
                .anyMatch(i -> i.getStatus() != StatusInventario.CANCELADO);

        if (jaExiste) {
            throw new RegraDeNegocioException(
                    "A filial %s - %s já possui inventário agendado em %02d/%d. Cancele o existente antes de criar outro."
                            .formatted(filial.getNumeroFilial(), filial.getNome(),
                                    mes.getMonthValue(), mes.getYear()));
        }

        validarConflitoRecebimento(filial, inventario.getData());
    }

    /**
     * O dia é inválido quando o calendário marca recebimento para o grupo da própria filial.
     * Um dia sem linha no calendário é tratado como sem restrição conhecida.
     */
    private void validarConflitoRecebimento(Filiais filial, LocalDate data) {
        Optional<DiaRecebimento> dia = diaRecebimentoRepository.findByData(data);
        if (dia.isEmpty()) {
            return;
        }
        if (dia.get().getTipo().name().equals(filial.getGrupoRecebimento().name())) {
            throw new RegraDeNegocioException(
                    "A filial %s - %s pertence ao %s e recebe material em %s. Escolha outra data para o inventário."
                            .formatted(filial.getNumeroFilial(), filial.getNome(),
                                    RecebimentoService.rotulo(filial.getGrupoRecebimento()),
                                    data.format(BR)));
        }
    }
}
