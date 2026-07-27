package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import portal.ti.queiroz.dto.*;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.*;
import portal.ti.queiroz.repository.DiaRecebimentoRepository;
import portal.ti.queiroz.repository.FiliaisRepository;
import portal.ti.queiroz.repository.InventarioRepository;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Gera a proposta de plano mensal de inventários.
 *
 * Critério definido pelo setor de Qualidade: repetir o mesmo dia do mês anterior,
 * deslocando apenas quando a data bater com um dia de recebimento do grupo da filial.
 */
@Service
public class PlanoInventarioService {

    private static final DateTimeFormatter BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Autowired
    private InventarioRepository inventarioRepository;

    @Autowired
    private FiliaisRepository filiaisRepository;

    @Autowired
    private DiaRecebimentoRepository diaRecebimentoRepository;

    // ------------------------------------------------------------------
    // Geração da proposta (nada é persistido aqui)
    // ------------------------------------------------------------------

    public PlanoMensalResponse gerarPlanoMensal(Integer ano, Integer mes) {
        YearMonth alvo = RecebimentoService.mesDe(ano, mes);
        YearMonth anterior = alvo.minusMonths(1);

        Map<LocalDate, TipoDiaRecebimento> calendario = calendarioDe(alvo);
        List<String> avisos = new ArrayList<>();

        if (calendario.isEmpty()) {
            avisos.add("Nenhum dia de recebimento foi configurado para %02d/%d — o plano foi gerado sem restrições de conflito."
                    .formatted(alvo.getMonthValue(), alvo.getYear()));
        }

        Map<Long, Inventario> noMesAlvo = porFilial(alvo);
        Map<Long, Inventario> noMesAnterior = porFilial(anterior);

        List<Filiais> filiais = filiaisRepository.findAll().stream()
                .sorted(Comparator.comparing(Filiais::getNumeroFilial,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        // Quantas filiais já caíram em cada data — usado para distribuir as sem histórico.
        Map<LocalDate, Integer> carga = new HashMap<>();
        List<PropostaInventario> itens = new ArrayList<>();
        int semGrupo = 0;

        for (Filiais filial : filiais) {
            Inventario atual = noMesAlvo.get(filial.getId());
            LocalDate dataAtual = atual != null ? atual.getData() : null;

            if (filial.getGrupoRecebimento() == null) {
                semGrupo++;
                itens.add(new PropostaInventario(filial.getId(), filial.getNumeroFilial(), filial.getNome(),
                        null, null, dataAtual, null, MotivoProposta.SEM_GRUPO,
                        "Filial sem grupo de recebimento — defina o grupo em Gestão de Filiais.", false));
                continue;
            }

            // Inventário já executado não é replanejado.
            if (atual != null && atual.getStatus() == StatusInventario.REALIZADO) {
                carga.merge(atual.getData(), 1, Integer::sum);
                itens.add(new PropostaInventario(filial.getId(), filial.getNumeroFilial(), filial.getNome(),
                        filial.getGrupoRecebimento(), atual.getData(), dataAtual, atual.getDiaPreferencial(),
                        MotivoProposta.JA_REALIZADO,
                        "Inventário já realizado em %s.".formatted(atual.getData().format(BR)), false));
                continue;
            }

            List<LocalDate> validos = diasValidos(alvo, filial.getGrupoRecebimento(), calendario);

            if (validos.isEmpty()) {
                itens.add(new PropostaInventario(filial.getId(), filial.getNumeroFilial(), filial.getNome(),
                        filial.getGrupoRecebimento(), null, dataAtual, null, MotivoProposta.SEM_DIA_VALIDO,
                        "Nenhum dia de %02d/%d está livre para o %s — revise o padrão de recebimento."
                                .formatted(alvo.getMonthValue(), alvo.getYear(),
                                        RecebimentoService.rotulo(filial.getGrupoRecebimento())),
                        false));
                continue;
            }

            Integer ancora = ancoraDe(noMesAnterior.get(filial.getId()));

            PropostaInventario proposta = (ancora == null)
                    ? semear(filial, alvo, validos, carga, dataAtual)
                    : repetirAncora(filial, alvo, ancora, validos, calendario, dataAtual);

            if (proposta.dataSugerida() != null) {
                carga.merge(proposta.dataSugerida(), 1, Integer::sum);
            }
            itens.add(proposta);
        }

        if (semGrupo > 0) {
            avisos.add("%d %s sem grupo de recebimento %s de fora do plano."
                    .formatted(semGrupo,
                            semGrupo == 1 ? "filial" : "filiais",
                            semGrupo == 1 ? "ficou" : "ficaram"));
        }

        return new PlanoMensalResponse(alvo.getYear(), alvo.getMonthValue(), itens, avisos);
    }

    /**
     * Filial sem inventário no mês anterior: escolhe o dia válido menos carregado,
     * espalhando as lojas em vez de amontoá-las no dia 1.
     */
    private PropostaInventario semear(Filiais filial, YearMonth alvo, List<LocalDate> validos,
                                      Map<LocalDate, Integer> carga, LocalDate dataAtual) {
        LocalDate escolhida = validos.stream()
                .min(Comparator
                        .comparingInt((LocalDate d) -> carga.getOrDefault(d, 0))
                        .thenComparing(d -> d))
                .orElseThrow();

        return new PropostaInventario(filial.getId(), filial.getNumeroFilial(), filial.getNome(),
                filial.getGrupoRecebimento(), escolhida, dataAtual, escolhida.getDayOfMonth(),
                MotivoProposta.SEM_HISTORICO,
                "Sem inventário em %02d/%d — data distribuída automaticamente."
                        .formatted(alvo.minusMonths(1).getMonthValue(), alvo.minusMonths(1).getYear()),
                true);
    }

    /**
     * Tenta repetir o dia-do-mês da âncora; se não der, busca o dia válido mais próximo.
     *
     * O diaPreferencial devolvido é sempre a ÂNCORA, nunca a data efetiva: assim um
     * deslocamento pontual não vira o novo padrão permanente da loja.
     */
    private PropostaInventario repetirAncora(Filiais filial, YearMonth alvo, int ancora,
                                             List<LocalDate> validos,
                                             Map<LocalDate, TipoDiaRecebimento> calendario,
                                             LocalDate dataAtual) {
        int ultimoDia = alvo.lengthOfMonth();
        boolean mesCurto = ancora > ultimoDia;
        LocalDate candidata = alvo.atDay(Math.min(ancora, ultimoDia));

        if (diaLivre(candidata, filial.getGrupoRecebimento(), calendario)) {
            MotivoProposta motivo = mesCurto ? MotivoProposta.AJUSTADO_MES_CURTO : MotivoProposta.MANTIDO;
            String descricao = mesCurto
                    ? "Dia %d não existe em %02d/%d — ajustado para o último dia do mês."
                            .formatted(ancora, alvo.getMonthValue(), alvo.getYear())
                    : "Mesmo dia do mês anterior (dia %d).".formatted(ancora);

            return new PropostaInventario(filial.getId(), filial.getNumeroFilial(), filial.getNome(),
                    filial.getGrupoRecebimento(), candidata, dataAtual, ancora, motivo, descricao, true);
        }

        LocalDate encontrada = buscarMaisProxima(candidata, alvo, filial.getGrupoRecebimento(), calendario);

        if (encontrada == null) {
            // A lista de dias válidos não é vazia (já checado), então isto é defensivo.
            encontrada = validos.get(0);
        }

        return new PropostaInventario(filial.getId(), filial.getNumeroFilial(), filial.getNome(),
                filial.getGrupoRecebimento(), encontrada, dataAtual, ancora, MotivoProposta.DESLOCADO,
                "Dia %d é recebimento do %s — movido para %s."
                        .formatted(candidata.getDayOfMonth(),
                                RecebimentoService.rotulo(filial.getGrupoRecebimento()),
                                encontrada.format(BR)),
                true);
    }

    /** Busca em espiral a partir da candidata: +1, -1, +2, -2… sem sair do mês. */
    private LocalDate buscarMaisProxima(LocalDate candidata, YearMonth alvo, GrupoRecebimento grupo,
                                        Map<LocalDate, TipoDiaRecebimento> calendario) {
        for (int offset = 1; offset <= alvo.lengthOfMonth(); offset++) {
            for (int sinal : new int[]{1, -1}) {
                LocalDate tentativa = candidata.plusDays((long) offset * sinal);
                if (YearMonth.from(tentativa).equals(alvo) && diaLivre(tentativa, grupo, calendario)) {
                    return tentativa;
                }
            }
        }
        return null;
    }

    // ------------------------------------------------------------------
    // Persistência do plano revisado
    // ------------------------------------------------------------------

    /**
     * Grava o plano do mês fazendo upsert por (filial, mês).
     *
     * Leva @Transactional — única exceção deliberada à convenção do projeto: sem ela, uma
     * exceção no item 40 de 60 deixaria 39 inventários gravados e o usuário sem saber quais.
     */
    @Transactional
    public SalvarPlanoResponse salvarPlano(SalvarPlanoRequest request) {
        YearMonth alvo = RecebimentoService.mesDe(request.ano(), request.mes());

        if (request.itens() == null || request.itens().isEmpty()) {
            throw new RegraDeNegocioException("O plano não tem nenhum item para salvar.");
        }

        Map<LocalDate, TipoDiaRecebimento> calendario = calendarioDe(alvo);
        Map<Long, Inventario> existentes = porFilial(alvo);
        Map<Long, Filiais> filiais = filiaisRepository.findAll().stream()
                .collect(Collectors.toMap(Filiais::getId, f -> f));

        int criados = 0, atualizados = 0, ignorados = 0;
        List<String> avisos = new ArrayList<>();
        List<Inventario> paraSalvar = new ArrayList<>();

        for (SalvarPlanoRequest.ItemPlano item : request.itens()) {
            if (item.filialId() == null || item.data() == null) {
                continue; // linhas SEM_GRUPO / SEM_DIA_VALIDO chegam sem data
            }

            Filiais filial = filiais.get(item.filialId());
            if (filial == null) {
                avisos.add("Filial de ID %d não encontrada — item ignorado.".formatted(item.filialId()));
                continue;
            }
            if (filial.getGrupoRecebimento() == null) {
                avisos.add("Filial %s - %s está sem grupo — item ignorado."
                        .formatted(filial.getNumeroFilial(), filial.getNome()));
                continue;
            }
            if (!YearMonth.from(item.data()).equals(alvo)) {
                throw new RegraDeNegocioException(
                        "A data %s da filial %s - %s não pertence a %02d/%d."
                                .formatted(item.data().format(BR), filial.getNumeroFilial(), filial.getNome(),
                                        alvo.getMonthValue(), alvo.getYear()));
            }

            Inventario existente = existentes.get(filial.getId());

            if (existente != null && existente.getStatus() == StatusInventario.REALIZADO) {
                ignorados++;
                continue;
            }

            if (!diaLivre(item.data(), filial.getGrupoRecebimento(), calendario)) {
                throw new RegraDeNegocioException(
                        "A filial %s - %s pertence ao %s e recebe material em %s. Ajuste a data antes de salvar o plano."
                                .formatted(filial.getNumeroFilial(), filial.getNome(),
                                        RecebimentoService.rotulo(filial.getGrupoRecebimento()),
                                        item.data().format(BR)));
            }

            Inventario inventario = existente != null ? existente : new Inventario();
            inventario.setFilialId(filial.getId());
            inventario.setData(item.data());
            inventario.setStatus(StatusInventario.PLANEJADO);
            inventario.setDiaPreferencial(
                    item.diaPreferencial() != null ? item.diaPreferencial() : item.data().getDayOfMonth());
            if (item.responsavel() != null) {
                inventario.setResponsavel(item.responsavel());
            }
            if (item.observacao() != null) {
                inventario.setObservacao(item.observacao());
            }

            if (existente != null) {
                atualizados++;
            } else {
                criados++;
            }
            paraSalvar.add(inventario);
        }

        inventarioRepository.saveAll(paraSalvar);

        if (ignorados > 0) {
            avisos.add("%d %s já realizado%s e não %s alterado%s."
                    .formatted(ignorados,
                            ignorados == 1 ? "inventário" : "inventários",
                            ignorados == 1 ? "" : "s",
                            ignorados == 1 ? "foi" : "foram",
                            ignorados == 1 ? "" : "s"));
        }

        return new SalvarPlanoResponse(criados, atualizados, ignorados, avisos);
    }

    // ------------------------------------------------------------------
    // Auxiliares
    // ------------------------------------------------------------------

    private Map<LocalDate, TipoDiaRecebimento> calendarioDe(YearMonth mes) {
        return diaRecebimentoRepository.findByDataBetween(mes.atDay(1), mes.atEndOfMonth())
                .stream()
                .collect(Collectors.toMap(DiaRecebimento::getData, DiaRecebimento::getTipo));
    }

    /**
     * Inventários do mês indexados por filial. CANCELADO é ignorado; havendo mais de um
     * (dado sujo), fica o de maior data.
     */
    private Map<Long, Inventario> porFilial(YearMonth mes) {
        Map<Long, Inventario> mapa = new HashMap<>();
        for (Inventario inv : inventarioRepository.findByDataBetween(mes.atDay(1), mes.atEndOfMonth())) {
            if (inv.getStatus() == StatusInventario.CANCELADO) {
                continue;
            }
            Inventario anterior = mapa.get(inv.getFilialId());
            if (anterior == null || inv.getData().isAfter(anterior.getData())) {
                mapa.put(inv.getFilialId(), inv);
            }
        }
        return mapa;
    }

    /** Dia-do-mês desejado da filial: o diaPreferencial salvo ou, na falta dele, a data usada. */
    private Integer ancoraDe(Inventario anterior) {
        if (anterior == null) {
            return null;
        }
        return anterior.getDiaPreferencial() != null
                ? anterior.getDiaPreferencial()
                : anterior.getData().getDayOfMonth();
    }

    /** Um dia sem linha no calendário é tratado como sem restrição conhecida. */
    private boolean diaLivre(LocalDate data, GrupoRecebimento grupo,
                             Map<LocalDate, TipoDiaRecebimento> calendario) {
        TipoDiaRecebimento tipo = calendario.get(data);
        return tipo == null || !tipo.name().equals(grupo.name());
    }

    private List<LocalDate> diasValidos(YearMonth mes, GrupoRecebimento grupo,
                                        Map<LocalDate, TipoDiaRecebimento> calendario) {
        List<LocalDate> dias = new ArrayList<>();
        for (int d = 1; d <= mes.lengthOfMonth(); d++) {
            LocalDate data = mes.atDay(d);
            if (diaLivre(data, grupo, calendario)) {
                dias.add(data);
            }
        }
        return dias;
    }
}
