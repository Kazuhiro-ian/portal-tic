package portal.ti.queiroz.service;

import org.junit.jupiter.api.Test;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.InventarioItem;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * O Protheus exporta esse relatório no XML antigo do Excel (SpreadsheetML 2003),
 * não em .xlsx. Os fixtures abaixo reproduzem a estrutura real: aba "Parametros"
 * (que o parser deve ignorar) seguida da aba de dados com o cabeçalho de verdade
 * (Vlr.Unit, Estoque, 1ª/2ª/3ª Contagem, Vlr.Diverg.) — sem coluna de Filial,
 * que o export bruto do Protheus não tem.
 */
class RelatorioProtheusParserTest {

    private final RelatorioProtheusParser parser = new RelatorioProtheusParser();

    private static final String PARAMETROS = """
            <Worksheet ss:Name="Parametros">
            <Table>
            <Row><Cell><Data ss:Type="String">Dt.Ref: 11/08/2026</Data></Cell></Row>
            <Row>
            <Cell ss:Index="1"><Data ss:Type="String">Pergunta 02 : Local de Estoque</Data></Cell>
            <Cell ss:Index="2"><Data ss:Type="String">01</Data></Cell>
            </Row>
            </Table>
            </Worksheet>
            """;

    private static final String CABECALHO_DADOS = """
            <Cell ss:Index="1"><Data ss:Type="String">Cod Produto</Data></Cell>
            <Cell ss:Index="2"><Data ss:Type="String">Descricao</Data></Cell>
            <Cell ss:Index="3"><Data ss:Type="String">Vlr.Unit</Data></Cell>
            <Cell ss:Index="4"><Data ss:Type="String">Unidade</Data></Cell>
            <Cell ss:Index="5"><Data ss:Type="String">Local</Data></Cell>
            <Cell ss:Index="6"><Data ss:Type="String">Familia</Data></Cell>
            <Cell ss:Index="7"><Data ss:Type="String">Fabricante</Data></Cell>
            <Cell ss:Index="8"><Data ss:Type="String">Estoque</Data></Cell>
            <Cell ss:Index="9"><Data ss:Type="String">1&#170; Contagem</Data></Cell>
            <Cell ss:Index="10"><Data ss:Type="String">2&#170; Contagem</Data></Cell>
            <Cell ss:Index="11"><Data ss:Type="String">3&#170; Contagem</Data></Cell>
            <Cell ss:Index="12"><Data ss:Type="String">Divergencia</Data></Cell>
            <Cell ss:Index="13"><Data ss:Type="String">Vlr.Diverg.</Data></Cell>
            <Cell ss:Index="14"><Data ss:Type="String">Obs.</Data></Cell>
            <Cell ss:Index="15"><Data ss:Type="String">Cod Barras</Data></Cell>
            """;

    /** Placeholder que o Protheus grava numa contagem que não foi feita — não é um número. */
    private static final String VAZIO_DATA = "<Data ss:Type=\"String\"><![CDATA[,   ,   ,   .]]></Data>";

    /**
     * Cada célula real do arquivo vem embrulhada em &lt;Cell ss:Index="N"&gt;,
     * não só o &lt;Data&gt; solto — é o índice que o parser usa para saber a
     * qual coluna do cabeçalho aquele valor pertence.
     */
    private String celula(int indice, String dataXml) {
        return "<Cell ss:Index=\"" + indice + "\">" + dataXml + "</Cell>";
    }

    private String numeroData(double v) {
        return "<Data ss:Type=\"Number\">" + v + "</Data>";
    }

    private String textoData(String v) {
        return "<Data ss:Type=\"String\"><![CDATA[" + v + "]]></Data>";
    }

    /**
     * Monta um workbook completo (Parametros + aba de dados) com as linhas de
     * produto passadas prontas (cada uma já como uma sequência de &lt;Cell&gt;).
     */
    private InputStream workbook(List<String> linhasDeProduto) {
        StringBuilder linhas = new StringBuilder();
        for (String linha : linhasDeProduto) {
            linhas.append("<Row>").append(linha).append("</Row>\n");
        }

        String xml = """
                <?xml version="1.0" encoding="UTF-8" ?>
                <?mso-application progid="Excel.Sheet"?>
                <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
                %s
                <Worksheet ss:Name="01-03 - Relatório de Conferênc">
                <Table>
                <Row>
                %s
                </Row>
                %s
                </Table>
                </Worksheet>
                </Workbook>
                """.formatted(PARAMETROS, CABECALHO_DADOS, linhas);

        return new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8));
    }

    /** contagemN nula = casa não preenchida (o placeholder de máscara vazia do Protheus). */
    private String linhaProduto(String cod, String descricao, double valorUn, double estoque,
                                 Double contagem1, Double contagem2, Double contagem3,
                                 double divergencia, double valorDiverg) {
        return celula(1, textoData(cod))
                + celula(2, textoData(descricao))
                + celula(3, numeroData(valorUn))
                + celula(4, textoData("UN"))
                + celula(5, textoData("01"))
                + celula(6, textoData("DESCARTAVEL"))
                + celula(7, textoData("COPOBRAS"))
                + celula(8, numeroData(estoque))
                + celula(9, contagem1 != null ? numeroData(contagem1) : VAZIO_DATA)
                + celula(10, contagem2 != null ? numeroData(contagem2) : VAZIO_DATA)
                + celula(11, contagem3 != null ? numeroData(contagem3) : VAZIO_DATA)
                + celula(12, numeroData(divergencia))
                + celula(13, numeroData(valorDiverg))
                + celula(14, textoData(""))
                + celula(15, textoData("7896030800528"));
    }

    @Test
    void deveIgnorarAAbaDeParametrosEEncontrarACabecalhoDeDados() {
        InputStream entrada = workbook(List.of(
                linhaProduto("000001", "COPO PLAST 50ML", 3.39, 101, 104.0, null, null, -3, 10.17)));

        List<InventarioItem> itens = parser.ler(entrada);

        assertThat(itens).hasSize(1);
        assertThat(itens.get(0).getCodProduto()).isEqualTo("000001");
        assertThat(itens.get(0).getDescricao()).isEqualTo("COPO PLAST 50ML");
    }

    @Test
    void deveCalcularColunasDerivadasUsandoEstoqueEVlrUnit() {
        // saldo 100, 1a contagem 90, sem 2a/3a -> falta de 10 unidades a R$ 2,50
        InputStream entrada = workbook(List.of(
                linhaProduto("000008", "ITEM X", 2.5, 100, 90.0, null, null, -10, -25)));

        InventarioItem item = parser.ler(entrada).get(0);

        assertThat(item.getValorUnitario()).isEqualByComparingTo("2.5");
        assertThat(item.getQuantidadeSistema()).isEqualByComparingTo("100");
        assertThat(item.getValorInicial()).isEqualByComparingTo("250.00");
        assertThat(item.getQuantidadeFinal()).isEqualByComparingTo("90");
        assertThat(item.getValorFinal()).isEqualByComparingTo("225.00");
        assertThat(item.getZerado()).isFalse();
    }

    @Test
    void deveUsarAUltimaContagemPreenchidaComoQuantidadeFinal() {
        // 1a contagem 50, 2a 60, 3a 55 -> vale a 3a
        InputStream entrada = workbook(List.of(
                linhaProduto("000009", "ITEM Y", 10, 50, 50.0, 60.0, 55.0, 5, 50)));

        InventarioItem item = parser.ler(entrada).get(0);

        assertThat(item.getQuantidadeFinal()).isEqualByComparingTo("55");
        assertThat(item.getValorFinal()).isEqualByComparingTo("550.00");
    }

    @Test
    void deveTratarOPlaceholderDeContagemVaziaComoZeroSemQuebrar() {
        // Nenhuma contagem feita: as 3 chegam como o placeholder de máscara vazia.
        InputStream entrada = workbook(List.of(
                linhaProduto("000010", "ITEM Z", 5, 0, null, null, null, 0, 0)));

        InventarioItem item = parser.ler(entrada).get(0);

        assertThat(item.getContagem1()).isEqualByComparingTo("0");
        assertThat(item.getContagem2()).isEqualByComparingTo("0");
        assertThat(item.getContagem3()).isEqualByComparingTo("0");
        assertThat(item.getZerado()).isTrue();
    }

    @Test
    void deveAceitarValoresNegativos() {
        InputStream entrada = workbook(List.of(
                linhaProduto("000011", "ITEM W", 1.75, 200, 98.0, null, null, -102, -178.5)));

        InventarioItem item = parser.ler(entrada).get(0);

        assertThat(item.getDivergencia()).isEqualByComparingTo("-102");
        assertThat(item.getValorDivergencia()).isEqualByComparingTo("-178.50");
    }

    @Test
    void deveIgnorarLinhasSemCodigoDeProduto() {
        InputStream entrada = workbook(List.of(
                linhaProduto("000001", "COPO", 3.39, 101, 104.0, null, null, -3, 10.17),
                linhaProduto("", "linha em branco", 0, 0, null, null, null, 0, 0)));

        assertThat(parser.ler(entrada)).hasSize(1);
    }

    @Test
    void deveIgnorarCabecalhoRepetidoNaPaginacaoDoRelatorio() {
        // O relatório do Protheus é paginado pra impressão e repete a linha de
        // cabeçalho a cada ~38 produtos -- essa "linha" não pode virar um produto
        // fantasma contado como zerado (é assim que ela chega: sem nenhuma célula
        // Number, só texto repetindo os próprios nomes das colunas).
        String linhaCabecalhoRepetido = CABECALHO_DADOS;

        InputStream entrada = workbook(List.of(
                linhaProduto("000001", "COPO", 3.39, 101, 104.0, null, null, -3, 10.17),
                linhaCabecalhoRepetido,
                linhaProduto("000002", "PRATO", 2.35, 240, 241.0, null, null, 1, 2.35)));

        List<InventarioItem> itens = parser.ler(entrada);

        assertThat(itens).extracting(InventarioItem::getCodProduto).containsExactly("000001", "000002");
    }

    @Test
    void deveRecusarArquivoSemATabelaDeProdutos() {
        String xmlSemDados = """
                <?xml version="1.0" encoding="UTF-8" ?>
                <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
                %s
                </Workbook>
                """.formatted(PARAMETROS);

        InputStream entrada = new ByteArrayInputStream(xmlSemDados.getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> parser.ler(entrada))
                .isInstanceOf(RegraDeNegocioException.class)
                .hasMessageContaining("Não encontrei a tabela de produtos");
    }

    @Test
    void deveRecusarQuandoNenhumProdutoTemCodigo() {
        InputStream entrada = workbook(List.of());

        assertThatThrownBy(() -> parser.ler(entrada))
                .isInstanceOf(RegraDeNegocioException.class)
                .hasMessageContaining("Nenhum produto encontrado");
    }

    @Test
    void deveRecusarXmlMalFormado() {
        InputStream entrada = new ByteArrayInputStream(
                "<Workbook><Worksheet>".getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> parser.ler(entrada))
                .isInstanceOf(RegraDeNegocioException.class)
                .hasMessageContaining("Não foi possível ler");
    }
}
