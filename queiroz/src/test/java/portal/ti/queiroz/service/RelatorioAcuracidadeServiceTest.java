package portal.ti.queiroz.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import portal.ti.queiroz.dto.RelatorioAcuracidadeResponse;
import portal.ti.queiroz.dto.ResumoFilialAcuracidade;
import portal.ti.queiroz.model.Filiais;
import portal.ti.queiroz.model.Inventario;
import portal.ti.queiroz.model.InventarioItem;
import portal.ti.queiroz.model.InventarioResultado;
import portal.ti.queiroz.model.StatusInventario;
import portal.ti.queiroz.model.TipoFilial;
import portal.ti.queiroz.repository.FiliaisRepository;
import portal.ti.queiroz.repository.InventarioItemRepository;
import portal.ti.queiroz.repository.InventarioRepository;
import portal.ti.queiroz.repository.InventarioResultadoRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RelatorioAcuracidadeServiceTest {

    @Mock
    private InventarioRepository inventarioRepository;

    @Mock
    private InventarioResultadoRepository resultadoRepository;

    @Mock
    private InventarioItemRepository itemRepository;

    @Mock
    private FiliaisRepository filiaisRepository;

    // Real (não mock): somarResultados é cálculo puro, sem dependências externas.
    @Spy
    private AcuracidadeService acuracidadeService = new AcuracidadeService();

    @InjectMocks
    private RelatorioAcuracidadeService service;

    private Filiais filial(long id, int numero, String nome, TipoFilial tipo) {
        Filiais f = new Filiais();
        f.setId(id);
        f.setNumeroFilial(numero);
        f.setNome(nome);
        f.setTipoFilial(tipo);
        return f;
    }

    private Inventario inventario(long id, Long filialId, LocalDate data) {
        Inventario i = new Inventario();
        i.setId(id);
        i.setFilialId(filialId);
        i.setData(data);
        i.setStatus(StatusInventario.REALIZADO);
        return i;
    }

    private InventarioResultado resultado(long inventarioId, int totalProdutos, int acurados, int inacurados,
                                           String estoqueInicial, String perda, String ganho) {
        InventarioResultado r = new InventarioResultado();
        r.setInventarioId(inventarioId);
        r.setTotalProdutos(totalProdutos);
        r.setProdutosContados(totalProdutos);
        r.setProdutosZerados(0);
        r.setProdutosAcurados(acurados);
        r.setProdutosInacurados(inacurados);
        r.setProdutosComPerda(1);
        r.setProdutosComGanho(1);
        r.setEstoqueInicialValor(new BigDecimal(estoqueInicial));
        r.setEstoqueFinalValor(new BigDecimal(estoqueInicial));
        r.setPerdaValor(new BigDecimal(perda));
        r.setGanhoValor(new BigDecimal(ganho));
        r.setQuantidadeInicial(BigDecimal.ZERO);
        r.setQuantidadeFinal(BigDecimal.ZERO);
        r.setUnidadesPerda(BigDecimal.ZERO);
        r.setUnidadesGanho(BigDecimal.ZERO);
        return r;
    }

    private void semDadosNoMesAnterior(YearMonth mesAtual) {
        YearMonth anterior = mesAtual.minusMonths(1);
        when(inventarioRepository.findByDataBetween(anterior.atDay(1), anterior.atEndOfMonth()))
                .thenReturn(List.of());
    }

    private void resultadosDisponiveis(InventarioResultado... resultados) {
        when(resultadoRepository.findByInventarioIdIn(any())).thenAnswer(chamada -> {
            List<Long> ids = chamada.getArgument(0);
            return List.of(resultados).stream().filter(r -> ids.contains(r.getInventarioId())).toList();
        });
    }

    @Test
    void deveUsarOResultadoDoInventarioMaisRecenteQuandoFilialTemMaisDeUmNoMes() {
        // CD 00 fazendo contagem em dois sábados do mesmo mês.
        Filiais cd = filial(1L, 0, "Centro de Distribuição", TipoFilial.CD);
        when(filiaisRepository.findAll()).thenReturn(List.of(cd));

        YearMonth agosto = YearMonth.of(2026, 8);
        Inventario sabado1 = inventario(10L, 1L, LocalDate.of(2026, 8, 1));
        Inventario sabado2 = inventario(11L, 1L, LocalDate.of(2026, 8, 8));
        when(inventarioRepository.findByDataBetween(agosto.atDay(1), agosto.atEndOfMonth()))
                .thenReturn(List.of(sabado1, sabado2));
        semDadosNoMesAnterior(agosto);

        InventarioResultado resultadoSabado1 = resultado(10L, 700, 500, 200, "10000", "-100", "50");
        InventarioResultado resultadoSabado2 = resultado(11L, 700, 600, 100, "10000", "-50", "20");
        resultadosDisponiveis(resultadoSabado1, resultadoSabado2);

        RelatorioAcuracidadeResponse resposta = service.relatorioMensal(2026, 8);

        ResumoFilialAcuracidade linha = resposta.filiais().get(0);
        assertThat(linha.atual()).isNotNull();
        assertThat(linha.atual().getInventarioId()).isEqualTo(11L);
        assertThat(linha.atual().getProdutosAcurados()).isEqualTo(600);
    }

    @Test
    void agregadoDeLojasDeveSomarResultadosDeFiliaisDiferentes() {
        Filiais loja1 = filial(1L, 1, "Loja 1", TipoFilial.LOJA);
        Filiais loja2 = filial(2L, 2, "Loja 2", TipoFilial.LOJA);
        when(filiaisRepository.findAll()).thenReturn(List.of(loja1, loja2));

        YearMonth agosto = YearMonth.of(2026, 8);
        Inventario invLoja1 = inventario(10L, 1L, LocalDate.of(2026, 8, 5));
        Inventario invLoja2 = inventario(11L, 2L, LocalDate.of(2026, 8, 6));
        when(inventarioRepository.findByDataBetween(agosto.atDay(1), agosto.atEndOfMonth()))
                .thenReturn(List.of(invLoja1, invLoja2));
        semDadosNoMesAnterior(agosto);

        resultadosDisponiveis(
                resultado(10L, 700, 500, 200, "10000", "-100", "50"),
                resultado(11L, 700, 600, 100, "8000", "-80", "40"));

        RelatorioAcuracidadeResponse resposta = service.relatorioMensal(2026, 8);

        ResumoFilialAcuracidade lojas = resposta.lojas();
        assertThat(lojas.atual().getTotalProdutos()).isEqualTo(1400);
        assertThat(lojas.atual().getProdutosAcurados()).isEqualTo(1100);
        assertThat(lojas.atual().getEstoqueInicialValor()).isEqualByComparingTo("18000.00");
    }

    @Test
    void filialSemInventarioRealizadoNoMesFicaComResultadoNulo() {
        Filiais loja = filial(1L, 1, "Loja 1", TipoFilial.LOJA);
        when(filiaisRepository.findAll()).thenReturn(List.of(loja));

        YearMonth agosto = YearMonth.of(2026, 8);
        when(inventarioRepository.findByDataBetween(agosto.atDay(1), agosto.atEndOfMonth())).thenReturn(List.of());
        semDadosNoMesAnterior(agosto);

        RelatorioAcuracidadeResponse resposta = service.relatorioMensal(2026, 8);

        assertThat(resposta.filiais().get(0).atual()).isNull();
        assertThat(resposta.geral().atual()).isNull();
    }

    @Test
    void rankingDeveSepararFaltasESobrasEAnexarDadosDaFilial() {
        Filiais loja = filial(1L, 5, "Loja 5", TipoFilial.LOJA);
        when(filiaisRepository.findAllById(any())).thenReturn(List.of(loja));

        YearMonth agosto = YearMonth.of(2026, 8);
        Inventario inv = inventario(20L, 1L, LocalDate.of(2026, 8, 10));
        when(inventarioRepository.findByDataBetween(agosto.atDay(1), agosto.atEndOfMonth()))
                .thenReturn(List.of(inv));

        InventarioItem falta = new InventarioItem();
        falta.setInventarioId(20L);
        falta.setCodProduto("000001");
        falta.setDescricao("PRODUTO FALTA");
        falta.setDivergencia(new BigDecimal("-50"));
        falta.setValorDivergencia(new BigDecimal("-200"));

        InventarioItem sobra = new InventarioItem();
        sobra.setInventarioId(20L);
        sobra.setCodProduto("000002");
        sobra.setDescricao("PRODUTO SOBRA");
        sobra.setDivergencia(new BigDecimal("30"));
        sobra.setValorDivergencia(new BigDecimal("90"));

        when(itemRepository.findByInventarioIdInAndValorDivergenciaLessThanOrderByValorDivergenciaAsc(any(), eq(BigDecimal.ZERO), any()))
                .thenReturn(List.of(falta));
        when(itemRepository.findByInventarioIdInAndValorDivergenciaGreaterThanOrderByValorDivergenciaDesc(any(), eq(BigDecimal.ZERO), any()))
                .thenReturn(List.of(sobra));

        RelatorioAcuracidadeService.Ranking ranking = service.ranking(2026, 8, null, null, 10);

        assertThat(ranking.maioresFaltas()).hasSize(1);
        assertThat(ranking.maioresFaltas().get(0).codProduto()).isEqualTo("000001");
        assertThat(ranking.maioresFaltas().get(0).numeroFilial()).isEqualTo(5);
        assertThat(ranking.maioresSobras()).hasSize(1);
        assertThat(ranking.maioresSobras().get(0).codProduto()).isEqualTo("000002");
    }

    @SuppressWarnings("unchecked")
    @Test
    void rankingComFiltroDeTipoDeveExcluirInventariosDeFiliaisDeOutroTipo() {
        Filiais cd = filial(1L, 0, "CD", TipoFilial.CD);
        Filiais loja = filial(2L, 1, "Loja", TipoFilial.LOJA);
        when(filiaisRepository.findAllById(any())).thenReturn(List.of(cd, loja));

        YearMonth agosto = YearMonth.of(2026, 8);
        Inventario invCd = inventario(20L, 1L, LocalDate.of(2026, 8, 1));
        Inventario invLoja = inventario(21L, 2L, LocalDate.of(2026, 8, 5));
        when(inventarioRepository.findByDataBetween(agosto.atDay(1), agosto.atEndOfMonth()))
                .thenReturn(List.of(invCd, invLoja));

        ArgumentCaptor<List<Long>> captor = ArgumentCaptor.forClass(List.class);
        when(itemRepository.findByInventarioIdInAndValorDivergenciaLessThanOrderByValorDivergenciaAsc(captor.capture(), eq(BigDecimal.ZERO), any()))
                .thenReturn(List.of());
        when(itemRepository.findByInventarioIdInAndValorDivergenciaGreaterThanOrderByValorDivergenciaDesc(any(), eq(BigDecimal.ZERO), any()))
                .thenReturn(List.of());

        service.ranking(2026, 8, TipoFilial.CD, null, 10);

        assertThat(captor.getValue()).containsExactly(20L);
    }
}
