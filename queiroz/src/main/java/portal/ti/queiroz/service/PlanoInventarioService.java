package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import portal.ti.queiroz.dto.*;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.*;
import portal.ti.queiroz.repository.DiaEquipeRepository;
import portal.ti.queiroz.repository.DiaRecebimentoRepository;
import portal.ti.queiroz.repository.FiliaisRepository;
import portal.ti.queiroz.repository.InventarioRepository;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Predicate;
import java.util.stream.Collectors;

/**
 * Gera a proposta de plano mensal de inventários.
 *
 * Critério definido pelo setor de Qualidade: repetir o mesmo dia do mês anterior,
 * deslocando quando a data bater com um dia de recebimento do grupo da filial, com um dia
 * marcado no Calendário da Equipe (DSR/Folga/Reunião/Feriado), ou -- preferencialmente --
 * quando outra filial já ficou com aquele dia neste mesmo plano.
 *
 * Filiais BIMESTRAL fora do ciclo do mês nem entram na lista; filiais SEMANAL (contagem
 * parcial, ex: CD 00) não passam por este fluxo de "1 dia por mês" e aparecem só como
 * aviso para agendamento manual sábado a sábado.
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

    @Autowired
    private DiaEquipeRepository diaEquipeRepository;

    // ------------------------------------------------------------------
    // Geração da proposta (nada é persistido aqui)
    // ------------------------------------------------------------------

    public PlanoMensalResponse gerarPlanoMensal(Integer ano, Integer mes) {
        YearMonth alvo = RecebimentoService.mesDe(ano, mes);
        YearMonth anterior = alvo.minusMonths(1);

        Map<LocalDate, TipoDiaRecebimento> calendario = calendarioDe(alvo);
        Set<LocalDate> diasEquipe = diasBloqueadosPelaEquipe(alvo);
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

        // Quantas filiais já caíram em cada data — usado para distribuir as sem histórico e
        // para o gerador preferir não repetir uma data já usada por outra filial.
        Map<LocalDate, Integer> carga = new HashMap<>();
        List<PropostaInventario> itens = new ArrayList<>();
        int semGrupo = 0;
        int semReferenciaBimestral = 0;

        for (Filiais filial : filiais) {
            Inventario atual = noMesAlvo.get(filial.getId());
            LocalDate dataAtual = atual != null ? atual.getData() : null;

            PeriodicidadeInventario periodicidade = periodicidadeDe(filial);

            if (periodicidade == PeriodicidadeInventario.BIMESTRAL) {
                if (filial.getReferenciaBimestral() == null) {
                    // Sem referência configurada: trata como sempre ativa (mensal) em vez de
                    // sumir a filial do plano por erro de configuração, e avisa no rodapé.
                    semReferenciaBimestral++;
                } else if (!cicloBimestralAtivo(filial, alvo)) {
                    continue; // mês "não" do ciclo -- fora do plano deste mês, de propósito
                }
            }

            if (periodicidade == PeriodicidadeInventario.SEMANAL) {
                itens.add(new PropostaInventario(filial.getId(), filial.getNumeroFilial(), filial.getNome(),
                        filial.getGrupoRecebimento(), null, dataAtual, null, MotivoProposta.PERIODICIDADE_SEMANAL,
                        "Periodicidade semanal — agende cada sábado manualmente na aba de inventários.", false));
                continue;
            }

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

            List<LocalDate> validos = diasValidos(alvo, filial.getGrupoRecebimento(), calendario, diasEquipe);

            if (validos.isEmpty()) {
                itens.add(new PropostaInventario(filial.getId(), filial.getNumeroFilial(), filial.getNome(),
                        filial.getGrupoRecebimento(), null, dataAtual, null, MotivoProposta.SEM_DIA_VALIDO,
                        "Nenhum dia de %02d/%d está livre para o %s — revise o padrão de recebimento ou o Calendário da Equipe."
                                .formatted(alvo.getMonthValue(), alvo.getYear(),
                                        RecebimentoService.rotulo(filial.getGrupoRecebimento())),
                        false));
                continue;
            }

            Integer ancora = ancoraDe(noMesAnterior.get(filial.getId()));

            PropostaInventario proposta = (ancora == null)
                    ? semear(filial, alvo, validos, carga, dataAtual)
                    : repetirAncora(filial, alvo, ancora, validos, calendario, diasEquipe, carga, dataAtual);

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
        if (semReferenciaBimestral > 0) {
            avisos.add("%d %s bimestral%s sem mês de referência configurado %s tratada%s como mensal neste plano."
                    .formatted(semReferenciaBimestral,
                            semReferenciaBimestral == 1 ? "filial" : "filiais",
                            semReferenciaBimestral == 1 ? "" : "is",
                            semReferenciaBimestral == 1 ? "foi" : "foram",
                            semReferenciaBimestral == 1 ? "" : "s"));
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
     *
     * @param carga quantas filiais (já processadas neste plano) ficaram em cada data --
     *              usado só como preferência (evitar repetir o dia de outra filial), nunca
     *              bloqueia: se não sobrar dia livre E desocupado, cai de volta para
     *              qualquer dia livre, igual ao comportamento antes desta preferência existir.
     */
    private PropostaInventario repetirAncora(Filiais filial, YearMonth alvo, int ancora,
                                             List<LocalDate> validos,
                                             Map<LocalDate, TipoDiaRecebimento> calendario,
                                             Set<LocalDate> diasEquipe,
                                             Map<LocalDate, Integer> carga,
                                             LocalDate dataAtual) {
        int ultimoDia = alvo.lengthOfMonth();
        boolean mesCurto = ancora > ultimoDia;
        LocalDate candidata = alvo.atDay(Math.min(ancora, ultimoDia));

        boolean candidataLivre = diaLivre(candidata, filial.getGrupoRecebimento(), calendario, diasEquipe);
        boolean candidataOcupada = carga.getOrDefault(candidata, 0) > 0;

        if (candidataLivre && !candidataOcupada) {
            MotivoProposta motivo = mesCurto ? MotivoProposta.AJUSTADO_MES_CURTO : MotivoProposta.MANTIDO;
            String descricao = mesCurto
                    ? "Dia %d não existe em %02d/%d — ajustado para o último dia do mês."
                            .formatted(ancora, alvo.getMonthValue(), alvo.getYear())
                    : "Mesmo dia do mês anterior (dia %d).".formatted(ancora);

            return new PropostaInventario(filial.getId(), filial.getNumeroFilial(), filial.getNome(),
                    filial.getGrupoRecebimento(), candidata, dataAtual, ancora, motivo, descricao, true);
        }

        LocalDate encontrada = buscarMaisProxima(candidata, alvo, filial.getGrupoRecebimento(), calendario, diasEquipe, carga);

        if (encontrada == null) {
            // A lista de dias válidos não é vazia (já checado), então isto é defensivo.
            encontrada = validos.get(0);
        }

        // candidataLivre continua true aqui quando o único problema foi a colisão com outra
        // filial -- distingue a mensagem desse caso do de recebimento/equipe.
        String descricao = candidataLivre
                ? "Dia %d já tinha outra filial agendada — movido para %s (preferência de uma filial por dia)."
                        .formatted(candidata.getDayOfMonth(), encontrada.format(BR))
                : "Dia %d é recebimento do grupo ou está marcado no Calendário da Equipe — movido para %s."
                        .formatted(candidata.getDayOfMonth(), encontrada.format(BR));

        return new PropostaInventario(filial.getId(), filial.getNumeroFilial(), filial.getNome(),
                filial.getGrupoRecebimento(), encontrada, dataAtual, ancora, MotivoProposta.DESLOCADO,
                descricao, true);
    }

    /**
     * Busca em espiral a partir da candidata: +1, -1, +2, -2… sem sair do mês, em duas
     * passadas. A primeira evita dias já ocupados por outra filial (preferência de uma
     * filial por dia); se ela não achar nada no mês inteiro, a segunda repete a busca só
     * exigindo o dia livre (ignora ocupação) -- a preferência nunca pode transformar um
     * caso hoje resolvível (DESLOCADO) em SEM_DIA_VALIDO.
     */
    private LocalDate buscarMaisProxima(LocalDate candidata, YearMonth alvo, GrupoRecebimento grupo,
                                        Map<LocalDate, TipoDiaRecebimento> calendario, Set<LocalDate> diasEquipe,
                                        Map<LocalDate, Integer> carga) {
        LocalDate semColisao = buscarMaisProxima(candidata, alvo,
                data -> diaLivre(data, grupo, calendario, diasEquipe) && carga.getOrDefault(data, 0) == 0);
        if (semColisao != null) {
            return semColisao;
        }
        return buscarMaisProxima(candidata, alvo, data -> diaLivre(data, grupo, calendario, diasEquipe));
    }

    private LocalDate buscarMaisProxima(LocalDate candidata, YearMonth alvo, Predicate<LocalDate> aceitavel) {
        for (int offset = 1; offset <= alvo.lengthOfMonth(); offset++) {
            for (int sinal : new int[]{1, -1}) {
                LocalDate tentativa = candidata.plusDays((long) offset * sinal);
                if (YearMonth.from(tentativa).equals(alvo) && aceitavel.test(tentativa)) {
                    return tentativa;
                }
            }
        }
        return null;
    }

    /** Periodicidade da filial; null (filial ainda não configurada) é tratado como MENSAL. */
    private PeriodicidadeInventario periodicidadeDe(Filiais filial) {
        return filial.getPeriodicidadeInventario() != null
                ? filial.getPeriodicidadeInventario()
                : PeriodicidadeInventario.MENSAL;
    }

    /**
     * Paridade do ciclo bimestral: o mês de referência (referenciaBimestral) é "sim", e a
     * cada mês a paridade alterna. Só chamar com referenciaBimestral não nula.
     */
    private boolean cicloBimestralAtivo(Filiais filial, YearMonth alvo) {
        YearMonth referencia = YearMonth.from(filial.getReferenciaBimestral());
        long diferencaMeses = ChronoUnit.MONTHS.between(referencia, alvo);
        return Math.floorMod(diferencaMeses, 2) == 0;
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
        Set<LocalDate> diasEquipe = diasBloqueadosPelaEquipe(alvo);
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

            if (!diaLivre(item.data(), filial.getGrupoRecebimento(), calendario, diasEquipe)) {
                throw new RegraDeNegocioException(
                        "A filial %s - %s pertence ao %s ou o dia está marcado no Calendário da Equipe (%s). Ajuste a data antes de salvar o plano."
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

    /**
     * Datas do mês marcadas no Calendário da Equipe (DSR, Folga, Reunião ou Feriado) —
     * qualquer marcação bloqueia o dia igualmente, não importa o tipo.
     */
    private Set<LocalDate> diasBloqueadosPelaEquipe(YearMonth mes) {
        return diaEquipeRepository.findByDataBetween(mes.atDay(1), mes.atEndOfMonth())
                .stream()
                .map(DiaEquipe::getData)
                .collect(Collectors.toSet());
    }

    /**
     * Um dia é livre quando não é dia de recebimento do grupo da filial E não está
     * marcado no Calendário da Equipe.
     */
    private boolean diaLivre(LocalDate data, GrupoRecebimento grupo,
                             Map<LocalDate, TipoDiaRecebimento> calendario, Set<LocalDate> diasEquipe) {
        TipoDiaRecebimento tipo = calendario.get(data);
        boolean livreRecebimento = tipo == null || !tipo.name().equals(grupo.name());
        boolean livreEquipe = !diasEquipe.contains(data);
        return livreRecebimento && livreEquipe;
    }

    private List<LocalDate> diasValidos(YearMonth mes, GrupoRecebimento grupo,
                                        Map<LocalDate, TipoDiaRecebimento> calendario, Set<LocalDate> diasEquipe) {
        List<LocalDate> dias = new ArrayList<>();
        for (int d = 1; d <= mes.lengthOfMonth(); d++) {
            LocalDate data = mes.atDay(d);
            if (diaLivre(data, grupo, calendario, diasEquipe)) {
                dias.add(data);
            }
        }
        return dias;
    }
}
