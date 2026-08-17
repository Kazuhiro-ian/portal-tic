package portal.ti.queiroz.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.Armazem;
import portal.ti.queiroz.model.ConfiguracaoQualidade;
import portal.ti.queiroz.model.Filiais;
import portal.ti.queiroz.model.Inventario;
import portal.ti.queiroz.model.InventarioItem;
import portal.ti.queiroz.model.InventarioResultado;
import portal.ti.queiroz.model.StatusInventario;
import portal.ti.queiroz.model.TipoFilial;
import portal.ti.queiroz.repository.ConfiguracaoQualidadeRepository;
import portal.ti.queiroz.repository.FiliaisRepository;
import portal.ti.queiroz.repository.InventarioItemRepository;
import portal.ti.queiroz.repository.InventarioRepository;
import portal.ti.queiroz.repository.InventarioResultadoRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Cobre a tradução das fórmulas da aba "resumo_atual" da planilha do setor.
 * São os números que vão para a reunião mensal, então cada regra tem teste próprio.
 */
@ExtendWith(MockitoExtension.class)
class AcuracidadeServiceTest {

    private static final int LIMITE_PADRAO = 3000;

    @Mock
    private InventarioRepository inventarioRepository;

    @Mock
    private FiliaisRepository filiaisRepository;

    @Mock
    private InventarioItemRepository itemRepository;

    @Mock
    private InventarioResultadoRepository resultadoRepository;

    @Mock
    private ConfiguracaoQualidadeRepository configuracaoRepository;

    @Mock
    private RelatorioProtheusParser parser;

    @InjectMocks
    private AcuracidadeService service;

    /**
     * @param divergencia diferença em unidades (negativa = falta)
     */
    private InventarioItem item(String valorUnitario, String quantidade, String contagem1, String divergencia) {
        InventarioItem item = new InventarioItem();
        BigDecimal vu = new BigDecimal(valorUnitario);
        BigDecimal qtd = new BigDecimal(quantidade);
        BigDecimal c1 = new BigDecimal(contagem1);
        BigDecimal div = new BigDecimal(divergencia);

        item.setValorUnitario(vu);
        item.setQuantidadeSistema(qtd);
        item.setContagem1(c1);
        item.setContagem2(BigDecimal.ZERO);
        item.setContagem3(BigDecimal.ZERO);
        item.setDivergencia(div);
        item.setValorDivergencia(div.multiply(vu));
        item.setValorInicial(qtd.multiply(vu));
        item.setQuantidadeFinal(c1);
        item.setValorFinal(c1.multiply(vu));
        item.setZerado(qtd.signum() == 0 && c1.signum() == 0 && div.signum() == 0);
        return item;
    }

    private InventarioItem itemZerado() {
        return item("5", "0", "0", "0");
    }

    @Test
    void deveSomarPerdasGanhosEPercentuaisSobreOEstoqueInicial() {
        List<InventarioItem> itens = List.of(
                item("10", "10", "10", "0"),   // acurado
                item("10", "10", "8", "-2"),   // falta de R$ 20
                item("10", "10", "12", "2"));  // sobra de R$ 20

        InventarioResultado r = service.calcular(itens, LIMITE_PADRAO);

        assertThat(r.getEstoqueInicialValor()).isEqualByComparingTo("300.00");
        assertThat(r.getEstoqueFinalValor()).isEqualByComparingTo("300.00");
        assertThat(r.getPerdaValor()).isEqualByComparingTo("-20.00");
        assertThat(r.getGanhoValor()).isEqualByComparingTo("20.00");
        assertThat(r.getTotalAjusteValor()).isEqualByComparingTo("40.00");

        // 20/300 = 0,066667 em cada lado. A inacurácia sai de (20+20)/300 em uma
        // divisão só — somar os dois já arredondados daria 0,133334, e a planilha
        // (que soma os valores cheios) dá 0,133333.
        assertThat(r.getPercentualPerda()).isEqualByComparingTo("0.066667");
        assertThat(r.getPercentualGanho()).isEqualByComparingTo("0.066667");
        assertThat(r.getPercentualInacuracia()).isEqualByComparingTo("0.133333");

        assertThat(r.getProdutosComPerda()).isEqualTo(1);
        assertThat(r.getProdutosComGanho()).isEqualTo(1);
        assertThat(r.getUnidadesPerda()).isEqualByComparingTo("-2");
        assertThat(r.getUnidadesGanho()).isEqualByComparingTo("2");
    }

    @Test
    void deveContarZeradosComoAcuradosQuandoInventarioEstaAbaixoDoLimite() {
        // 4 produtos: 1 com falta, 1 acurado, 2 zerados
        List<InventarioItem> itens = List.of(
                item("10", "10", "5", "-5"),
                item("10", "10", "10", "0"),
                itemZerado(),
                itemZerado());

        InventarioResultado r = service.calcular(itens, LIMITE_PADRAO);

        assertThat(r.getConsiderouZerados()).isTrue();
        assertThat(r.getTotalProdutos()).isEqualTo(4);
        assertThat(r.getProdutosZerados()).isEqualTo(2);
        assertThat(r.getProdutosContados()).isEqualTo(2);
        // acurados = os 3 sem divergência (inclui os zerados); denominador = total
        assertThat(r.getProdutosAcurados()).isEqualTo(3);
        assertThat(r.getProdutosInacurados()).isEqualTo(1);
        assertThat(r.getPercentualAcuracidade()).isEqualByComparingTo("0.750000");
    }

    @Test
    void deveDescartarZeradosQuandoInventarioPassaDoLimite() {
        List<InventarioItem> itens = List.of(
                item("10", "10", "5", "-5"),
                item("10", "10", "10", "0"),
                itemZerado(),
                itemZerado());

        // Mesmos itens do teste anterior, mas agora 4 produtos > limite 3
        InventarioResultado r = service.calcular(itens, 3);

        assertThat(r.getConsiderouZerados()).isFalse();
        // acurados perde os 2 zerados e o denominador passa a ser só os contados
        assertThat(r.getProdutosAcurados()).isEqualTo(1);
        assertThat(r.getProdutosInacurados()).isEqualTo(1);
        assertThat(r.getPercentualAcuracidade()).isEqualByComparingTo("0.500000");
    }

    @Test
    void naoDeveQuebrarQuandoEstoqueInicialEZero() {
        // Inventário só de itens zerados: divisão por zero em todos os percentuais
        List<InventarioItem> itens = List.of(itemZerado(), itemZerado());

        InventarioResultado r = service.calcular(itens, LIMITE_PADRAO);

        assertThat(r.getPercentualPerda()).isEqualByComparingTo("0");
        assertThat(r.getPercentualGanho()).isEqualByComparingTo("0");
        assertThat(r.getPercentualInacuracia()).isEqualByComparingTo("0");
        assertThat(r.getPercentualAcuracidade()).isEqualByComparingTo("1");
    }

    private InventarioResultado resultadoPronto(int totalProdutos, int acurados, int inacurados,
                                                 String estoqueInicial, String perda, String ganho) {
        InventarioResultado r = new InventarioResultado();
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

    @Test
    void deveSomarValoresBrutosDeVariasFiliaisERecalcularOsPercentuaisDasSomas() {
        InventarioResultado filialA = resultadoPronto(700, 500, 200, "10000", "-100", "50");
        InventarioResultado filialB = resultadoPronto(700, 600, 100, "8000", "-80", "40");

        InventarioResultado somado = service.somarResultados(List.of(filialA, filialB));

        assertThat(somado.getTotalProdutos()).isEqualTo(1400);
        assertThat(somado.getProdutosAcurados()).isEqualTo(1100);
        assertThat(somado.getProdutosInacurados()).isEqualTo(300);
        assertThat(somado.getEstoqueInicialValor()).isEqualByComparingTo("18000.00");
        assertThat(somado.getPerdaValor()).isEqualByComparingTo("-180.00");
        assertThat(somado.getGanhoValor()).isEqualByComparingTo("90.00");
        // % acuracidade recalculado da SOMA (1100/1400), não a média dos dois percentuais
        assertThat(somado.getPercentualAcuracidade()).isEqualByComparingTo("0.785714");
        // % inacurácia recalculado sobre o estoque inicial somado: (180+90)/18000
        assertThat(somado.getPercentualInacuracia()).isEqualByComparingTo("0.015000");
    }

    @Test
    void deveSomarResultadosDeUmaSoFilialSemAlterarOsNumeros() {
        InventarioResultado unico = resultadoPronto(700, 500, 200, "10000", "-100", "50");

        InventarioResultado somado = service.somarResultados(List.of(unico));

        assertThat(somado.getTotalProdutos()).isEqualTo(700);
        assertThat(somado.getProdutosAcurados()).isEqualTo(500);
        assertThat(somado.getEstoqueInicialValor()).isEqualByComparingTo("10000.00");
    }

    @Test
    void deveCriarConfiguracaoPadraoNoPrimeiroAcesso() {
        when(configuracaoRepository.findById(ConfiguracaoQualidade.ID_UNICO)).thenReturn(Optional.empty());
        when(configuracaoRepository.save(org.mockito.ArgumentMatchers.any(ConfiguracaoQualidade.class)))
                .thenAnswer(invocacao -> invocacao.getArgument(0));

        ConfiguracaoQualidade config = service.configuracaoAtual();

        assertThat(config.getMetaAcuracidade()).isEqualByComparingTo("0.75");
        assertThat(config.getMetaInacuracia()).isEqualByComparingTo("0.02");
        assertThat(config.getLimiteZerados()).isEqualTo(3000);
    }

    @Test
    void deveRecusarMetaForaDoIntervaloDeZeroAUm() {
        when(configuracaoRepository.findById(ConfiguracaoQualidade.ID_UNICO))
                .thenReturn(Optional.of(ConfiguracaoQualidade.padrao()));

        ConfiguracaoQualidade nova = new ConfiguracaoQualidade();
        nova.setMetaAcuracidade(new BigDecimal("75")); // 75 em vez de 0,75

        assertThatThrownBy(() -> service.salvarConfiguracao(nova))
                .isInstanceOf(RegraDeNegocioException.class)
                .hasMessageContaining("entre 0 e 1");
    }

    // --- mesclarPorProduto: Loja e Estoque compartilham o mesmo catálogo de produtos ---

    @Test
    void deveSomarQuantidadesDoMesmoProdutoEntreLojaEEstoque() {
        // O exemplo do usuário: 1000 un. de um produto no dia do inventário, 600 contadas na
        // loja e 400 no estoque -- deve virar 1 produto de 1000 un. no "Geral", não 2 de 600+400.
        InventarioItem naLoja = item("10", "600", "600", "0");
        naLoja.setCodProduto("P1");
        InventarioItem noEstoque = item("10", "400", "400", "0");
        noEstoque.setCodProduto("P1");

        List<InventarioItem> mesclados = service.mesclarPorProduto(List.of(naLoja), List.of(noEstoque));

        assertThat(mesclados).hasSize(1);
        InventarioItem mesclado = mesclados.get(0);
        assertThat(mesclado.getCodProduto()).isEqualTo("P1");
        assertThat(mesclado.getQuantidadeSistema()).isEqualByComparingTo("1000");
        assertThat(mesclado.getValorInicial()).isEqualByComparingTo("10000");
        assertThat(mesclado.getZerado()).isFalse();
    }

    @Test
    void produtoPresenteSoEmUmArmazemEntraSemAlteracao() {
        InventarioItem soNaLoja = item("10", "50", "50", "0");
        soNaLoja.setCodProduto("P2");

        List<InventarioItem> mesclados = service.mesclarPorProduto(List.of(soNaLoja), List.of());

        assertThat(mesclados).hasSize(1);
        assertThat(mesclados.get(0).getQuantidadeSistema()).isEqualByComparingTo("50");
    }

    @Test
    void produtoZeradoNosDoisArmazensContinuaZeradoAposMesclar() {
        InventarioItem zeradoLoja = itemZerado();
        zeradoLoja.setCodProduto("P3");
        InventarioItem zeradoEstoque = itemZerado();
        zeradoEstoque.setCodProduto("P3");

        List<InventarioItem> mesclados = service.mesclarPorProduto(List.of(zeradoLoja), List.of(zeradoEstoque));

        assertThat(mesclados).hasSize(1);
        assertThat(mesclados.get(0).getZerado()).isTrue();
    }

    @Test
    void calcularSobreItensMescladosNaoDuplicaTotalDeProdutos() {
        InventarioItem p1Loja = item("10", "600", "600", "0");
        p1Loja.setCodProduto("P1");
        InventarioItem p1Estoque = item("10", "400", "400", "0");
        p1Estoque.setCodProduto("P1");
        InventarioItem p2SoLoja = item("10", "50", "45", "-5");
        p2SoLoja.setCodProduto("P2");

        List<InventarioItem> mesclados = service.mesclarPorProduto(List.of(p1Loja, p2SoLoja), List.of(p1Estoque));
        InventarioResultado geral = service.calcular(mesclados, LIMITE_PADRAO);

        // 2 produtos únicos (P1 mesclado + P2), não 3 (que seria a contagem ingênua de itens)
        assertThat(geral.getTotalProdutos()).isEqualTo(2);
    }

    // --- importar: obrigatoriedade do armazém conforme a filial ---

    private Inventario inventarioDaFilial(Long filialId) {
        Inventario inv = new Inventario();
        inv.setId(10L);
        inv.setFilialId(filialId);
        inv.setStatus(StatusInventario.PLANEJADO);
        return inv;
    }

    private MockMultipartFile arquivoFalso() {
        return new MockMultipartFile("arquivo", "relatorio.xml", "text/xml", "conteudo".getBytes());
    }

    @Test
    void deveExigirArmazemAoImportarParaFilialComEstoqueDividido() {
        Filiais filial = new Filiais();
        filial.setId(1L);
        filial.setTipoFilial(TipoFilial.LOJA);
        filial.setEstoqueDividido(true);

        when(inventarioRepository.findById(10L)).thenReturn(Optional.of(inventarioDaFilial(1L)));
        when(filiaisRepository.findById(1L)).thenReturn(Optional.of(filial));

        assertThatThrownBy(() -> service.importar(10L, null, arquivoFalso(), "usuario"))
                .isInstanceOf(RegraDeNegocioException.class)
                .hasMessageContaining("armazéns");
    }

    @Test
    void naoDevePermitirArmazemAoImportarParaFilialSemEstoqueDividido() {
        Filiais filial = new Filiais();
        filial.setId(1L);
        filial.setTipoFilial(TipoFilial.LOJA);

        when(inventarioRepository.findById(10L)).thenReturn(Optional.of(inventarioDaFilial(1L)));
        when(filiaisRepository.findById(1L)).thenReturn(Optional.of(filial));

        assertThatThrownBy(() -> service.importar(10L, Armazem.ARMAZEM_01, arquivoFalso(), "usuario"))
                .isInstanceOf(RegraDeNegocioException.class)
                .hasMessageContaining("não tem o estoque dividido");
    }
}
