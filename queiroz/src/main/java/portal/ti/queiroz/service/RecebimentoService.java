package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.dto.ConflitoInventario;
import portal.ti.queiroz.dto.PadraoMensalRequest;
import portal.ti.queiroz.dto.PadraoMensalResponse;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.*;
import portal.ti.queiroz.repository.DiaRecebimentoRepository;
import portal.ti.queiroz.repository.FiliaisRepository;
import portal.ti.queiroz.repository.InventarioRepository;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Calendário de recebimento de material: qual grupo recebe em cada dia.
 */
@Service
public class RecebimentoService {

    private static final DateTimeFormatter BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Autowired
    private DiaRecebimentoRepository repository;

    @Autowired
    private InventarioRepository inventarioRepository;

    @Autowired
    private FiliaisRepository filiaisRepository;

    public List<DiaRecebimento> buscarPorPeriodo(LocalDate inicio, LocalDate fim) {
        return repository.findByDataBetween(inicio, fim);
    }

    /**
     * Expande o padrão semanal para uma linha por data do mês.
     * Dias marcados como ajuste manual (feriados) são preservados, salvo se o
     * chamador pedir explicitamente para sobrescrevê-los.
     */
    public PadraoMensalResponse aplicarPadraoMensal(PadraoMensalRequest request) {
        YearMonth mes = mesDe(request.ano(), request.mes());
        Map<DayOfWeek, TipoDiaRecebimento> padrao = request.padrao();

        if (padrao == null || padrao.isEmpty()) {
            throw new RegraDeNegocioException("Informe o padrão de recebimento da semana.");
        }

        boolean sobrescrever = Boolean.TRUE.equals(request.sobrescreverAjustesManuais());

        LocalDate primeiro = mes.atDay(1);
        LocalDate ultimo = mes.atEndOfMonth();

        Map<LocalDate, DiaRecebimento> existentes = repository.findByDataBetween(primeiro, ultimo)
                .stream()
                .collect(Collectors.toMap(DiaRecebimento::getData, Function.identity()));

        int criados = 0, atualizados = 0, preservados = 0;
        List<DiaRecebimento> paraSalvar = new ArrayList<>();

        for (LocalDate data = primeiro; !data.isAfter(ultimo); data = data.plusDays(1)) {
            TipoDiaRecebimento tipo = padrao.get(data.getDayOfWeek());
            if (tipo == null) {
                continue; // dia da semana não informado no padrão: mantém o que já existe
            }

            DiaRecebimento dia = existentes.get(data);

            if (dia == null) {
                dia = new DiaRecebimento();
                dia.setData(data);
                dia.setTipo(tipo);
                dia.setAjusteManual(false);
                paraSalvar.add(dia);
                criados++;
            } else if (Boolean.TRUE.equals(dia.getAjusteManual()) && !sobrescrever) {
                preservados++;
            } else {
                dia.setTipo(tipo);
                dia.setAjusteManual(false);
                dia.setObservacao(null);
                paraSalvar.add(dia);
                atualizados++;
            }
        }

        repository.saveAll(paraSalvar);

        // A mudança do padrão pode ter invalidado inventários já planejados.
        return new PadraoMensalResponse(criados, atualizados, preservados,
                detectarConflitos(primeiro, ultimo));
    }

    /**
     * Sobrescrita pontual de um dia (feriado, entrega extra). Marca ajusteManual
     * para que a próxima aplicação do padrão semanal não apague o ajuste.
     */
    public DiaRecebimento salvarDia(LocalDate data, TipoDiaRecebimento tipo, String observacao) {
        if (data == null) {
            throw new RegraDeNegocioException("Informe a data do dia de recebimento.");
        }
        if (tipo == null) {
            throw new RegraDeNegocioException("Informe o tipo do dia de recebimento.");
        }

        DiaRecebimento dia = repository.findByData(data).orElseGet(() -> {
            DiaRecebimento novo = new DiaRecebimento();
            novo.setData(data);
            return novo;
        });

        dia.setTipo(tipo);
        dia.setAjusteManual(true);
        dia.setObservacao(observacao);

        return repository.save(dia);
    }

    /**
     * Inventários PLANEJADO que caíram em um dia de recebimento do próprio grupo da filial.
     */
    public List<ConflitoInventario> detectarConflitos(LocalDate inicio, LocalDate fim) {
        Map<LocalDate, TipoDiaRecebimento> calendario = repository.findByDataBetween(inicio, fim)
                .stream()
                .collect(Collectors.toMap(DiaRecebimento::getData, DiaRecebimento::getTipo));

        Map<Long, Filiais> filiais = filiaisRepository.findAll()
                .stream()
                .collect(Collectors.toMap(Filiais::getId, Function.identity()));

        List<ConflitoInventario> conflitos = new ArrayList<>();

        for (Inventario inv : inventarioRepository.findByDataBetween(inicio, fim)) {
            if (inv.getStatus() != StatusInventario.PLANEJADO) {
                continue;
            }
            if (Boolean.TRUE.equals(inv.getCienteConflitoRecebimento())) {
                continue; // usuário já confirmou ciência deste conflito ao salvar
            }
            Filiais filial = filiais.get(inv.getFilialId());
            if (filial == null || filial.getGrupoRecebimento() == null) {
                continue;
            }
            TipoDiaRecebimento tipo = calendario.get(inv.getData());
            if (tipo != null && tipo.name().equals(filial.getGrupoRecebimento().name())) {
                conflitos.add(new ConflitoInventario(
                        inv.getId(),
                        filial.getId(),
                        filial.getNumeroFilial(),
                        filial.getNome(),
                        filial.getGrupoRecebimento(),
                        inv.getData(),
                        "Inventário em %s coincide com dia de recebimento do %s."
                                .formatted(inv.getData().format(BR), rotulo(filial.getGrupoRecebimento()))));
            }
        }

        return conflitos;
    }

    static YearMonth mesDe(Integer ano, Integer mes) {
        if (ano == null || mes == null) {
            throw new RegraDeNegocioException("Informe o ano e o mês.");
        }
        if (mes < 1 || mes > 12) {
            throw new RegraDeNegocioException("Mês inválido: " + mes + ". Use um valor entre 1 e 12.");
        }
        return YearMonth.of(ano, mes);
    }

    static String rotulo(GrupoRecebimento grupo) {
        return grupo == GrupoRecebimento.GRUPO_1 ? "Grupo 1" : "Grupo 2";
    }
}
