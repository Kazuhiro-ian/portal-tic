package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import portal.ti.queiroz.dto.ConflitoInventario;
import portal.ti.queiroz.dto.PadraoMensalRequest;
import portal.ti.queiroz.dto.PadraoMensalResponse;
import portal.ti.queiroz.dto.SalvarDiasRecebimentoRequest;
import portal.ti.queiroz.dto.SalvarDiasRecebimentoResponse;
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
     * Salva de uma vez os dias que o usuário marcou clicando no calendário (um tipo
     * escolhido como "pincel", vários dias pintados, um único save no final). Cada dia vira
     * uma sobrescrita pontual (ajusteManual = true), para que a próxima aplicação do padrão
     * semanal não apague o ajuste. Leva @Transactional pelo mesmo motivo de
     * {@link PlanoInventarioService#salvarPlano}: sem ela, uma falha no meio da lista deixaria
     * parte dos dias salvos e parte não, sem o usuário saber quais.
     */
    @Transactional
    public SalvarDiasRecebimentoResponse salvarDias(SalvarDiasRecebimentoRequest request) {
        List<SalvarDiasRecebimentoRequest.ItemDiaRecebimento> itens = request.itens();
        if (itens == null || itens.isEmpty()) {
            throw new RegraDeNegocioException("Nenhum dia selecionado para salvar.");
        }
        for (var item : itens) {
            if (item.data() == null || item.tipo() == null) {
                throw new RegraDeNegocioException("Informe a data e o tipo de cada dia selecionado.");
            }
        }

        LocalDate minData = itens.stream().map(SalvarDiasRecebimentoRequest.ItemDiaRecebimento::data)
                .min(LocalDate::compareTo).orElseThrow();
        LocalDate maxData = itens.stream().map(SalvarDiasRecebimentoRequest.ItemDiaRecebimento::data)
                .max(LocalDate::compareTo).orElseThrow();

        Map<LocalDate, DiaRecebimento> existentes = repository.findByDataBetween(minData, maxData).stream()
                .collect(Collectors.toMap(DiaRecebimento::getData, Function.identity()));

        List<DiaRecebimento> paraSalvar = new ArrayList<>();
        for (var item : itens) {
            DiaRecebimento dia = existentes.get(item.data());
            if (dia == null) {
                dia = new DiaRecebimento();
                dia.setData(item.data());
            }
            dia.setTipo(item.tipo());
            dia.setAjusteManual(true);
            paraSalvar.add(dia);
        }

        repository.saveAll(paraSalvar);
        return new SalvarDiasRecebimentoResponse(paraSalvar.size());
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
