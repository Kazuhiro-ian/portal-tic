package portal.ti.queiroz.service;

import org.springframework.stereotype.Component;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.InventarioItem;

import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Lê o relatório de conferência de inventário exportado pelo Protheus.
 *
 * O Protheus exporta nesse formato **XML antigo do Excel** (SpreadsheetML 2003 —
 * o mesmo que o Word/Excel geram com "Salvar como > XML Planilha 2003"), não o
 * `.xlsx` (OOXML/zip) atual. As duas coisas parecem arquivo de Excel mas são
 * formatos totalmente diferentes por dentro; por isso este parser lê o XML
 * diretamente (StAX) em vez de usar uma biblioteca de planilha.
 *
 * O arquivo real trazido pelo setor tem duas abas: "Parametros" (metadados do
 * relatório — data de emissão, filtros usados) e uma aba de dados cujo nome
 * muda conforme a versão do relatório (ex: "01-03 - Relatório de Conferênc...").
 * Em vez de depender do nome da aba, o parser procura a primeira linha que tem
 * uma célula "Cod Produto" — essa é a linha de cabeçalho da tabela de dados.
 *
 * IMPORTANTE: o export do Protheus não tem coluna de Filial. O relatório é
 * gerado de dentro do ambiente daquela filial, então quem sabe a filial é quem
 * está fazendo a importação — o mesmo processo manual de hoje ("informar filial
 * nas colunas referentes" no README da planilha antiga). Este parser não tenta
 * adivinhar a filial do conteúdo do arquivo.
 */
@Component
public class RelatorioProtheusParser {

    private static final String NS = "urn:schemas-microsoft-com:office:spreadsheet";

    private static final String COL_COD_PRODUTO = "cod produto";
    private static final String COL_DESCRICAO = "descricao";
    private static final String COL_VALOR_UNITARIO = "vlrunit";
    private static final String COL_UNIDADE = "unidade";
    private static final String COL_LOCAL = "local";
    private static final String COL_FAMILIA = "familia";
    private static final String COL_FABRICANTE = "fabricante";
    private static final String COL_ESTOQUE = "estoque";
    private static final String COL_CONTAGEM_1 = "1 contagem";
    private static final String COL_CONTAGEM_2 = "2 contagem";
    private static final String COL_CONTAGEM_3 = "3 contagem";
    private static final String COL_DIVERGENCIA = "divergencia";
    private static final String COL_VALOR_DIVERGENCIA = "vlrdiverg";
    private static final String COL_OBS = "obs";
    private static final String COL_COD_BARRAS = "cod barras";

    private static final List<String> COLUNAS_OBRIGATORIAS = List.of(
            COL_COD_PRODUTO, COL_VALOR_UNITARIO, COL_ESTOQUE, COL_CONTAGEM_1,
            COL_DIVERGENCIA, COL_VALOR_DIVERGENCIA);

    private record Celula(String texto, boolean numerica) {
    }

    public List<InventarioItem> ler(InputStream entrada) {
        List<InventarioItem> itens = new ArrayList<>();
        Map<String, Integer> colunas = null;

        XMLInputFactory factory = criarFactorySegura();

        try {
            XMLStreamReader reader = factory.createXMLStreamReader(entrada);
            try {
                Map<Integer, Celula> linhaAtual = null;
                int indiceCelulaAtual = 0;
                String tipoCelulaAtual = null;
                StringBuilder textoCelulaAtual = null;
                boolean tabelaEncontrada = false;

                while (reader.hasNext()) {
                    int evento = reader.next();

                    if (evento == XMLStreamConstants.START_ELEMENT) {
                        switch (reader.getLocalName()) {
                            case "Row" -> {
                                linhaAtual = new LinkedHashMap<>();
                                indiceCelulaAtual = 0;
                            }
                            case "Cell" -> {
                                String indiceAttr = reader.getAttributeValue(NS, "Index");
                                indiceCelulaAtual = indiceAttr != null
                                        ? Integer.parseInt(indiceAttr)
                                        : indiceCelulaAtual + 1;
                            }
                            case "Data" -> {
                                tipoCelulaAtual = reader.getAttributeValue(NS, "Type");
                                textoCelulaAtual = new StringBuilder();
                            }
                            default -> { /* elemento sem tratamento especial (Workbook, Table, Styles...) */ }
                        }
                    } else if ((evento == XMLStreamConstants.CHARACTERS || evento == XMLStreamConstants.CDATA)
                            && textoCelulaAtual != null) {
                        textoCelulaAtual.append(reader.getText());
                    } else if (evento == XMLStreamConstants.END_ELEMENT) {
                        switch (reader.getLocalName()) {
                            case "Data" -> {
                                if (linhaAtual != null) {
                                    String texto = textoCelulaAtual == null ? "" : textoCelulaAtual.toString();
                                    linhaAtual.put(indiceCelulaAtual, new Celula(texto, "Number".equals(tipoCelulaAtual)));
                                }
                                textoCelulaAtual = null;
                                tipoCelulaAtual = null;
                            }
                            case "Row" -> {
                                if (linhaAtual != null && !linhaAtual.isEmpty()) {
                                    if (colunas == null) {
                                        colunas = tentarMapearCabecalho(linhaAtual);
                                    } else {
                                        InventarioItem item = montarItem(linhaAtual, colunas);
                                        if (item != null) itens.add(item);
                                    }
                                }
                                linhaAtual = null;
                            }
                            case "Worksheet" -> {
                                // Assume uma única tabela de dados no arquivo: assim que ela é
                                // fechada, para de ler (evita interpretar outra aba por engano).
                                if (colunas != null) {
                                    tabelaEncontrada = true;
                                }
                            }
                            default -> { /* nada a fazer */ }
                        }

                        if (tabelaEncontrada) break;
                    }
                }
            } finally {
                reader.close();
            }
        } catch (XMLStreamException e) {
            throw new RegraDeNegocioException(
                    "Não foi possível ler o arquivo enviado. Envie o relatório de conferência exportado do Protheus, sem editar.");
        }

        if (colunas == null) {
            throw new RegraDeNegocioException(
                    "Não encontrei a tabela de produtos no arquivo (faltam as colunas obrigatórias: "
                            + String.join(", ", COLUNAS_OBRIGATORIAS)
                            + "). Confira se é o relatório de conferência de inventário do Protheus.");
        }
        if (itens.isEmpty()) {
            throw new RegraDeNegocioException(
                    "Nenhum produto encontrado no arquivo. Confira se o relatório foi gerado com produtos selecionados.");
        }

        return itens;
    }

    /** Bloqueia DTD/entidades externas: o arquivo vem de upload de usuário, não é conteúdo confiável. */
    private XMLInputFactory criarFactorySegura() {
        XMLInputFactory factory = XMLInputFactory.newFactory();
        factory.setProperty(XMLInputFactory.SUPPORT_DTD, false);
        factory.setProperty(XMLInputFactory.IS_SUPPORTING_EXTERNAL_ENTITIES, false);
        return factory;
    }

    /**
     * Uma linha é o cabeçalho da tabela de dados quando tem todas as colunas
     * obrigatórias. As linhas da aba "Parametros" (data/hora, respostas de
     * pergunta) nunca batem com isso, então são simplesmente ignoradas.
     */
    private Map<String, Integer> tentarMapearCabecalho(Map<Integer, Celula> linha) {
        Map<String, Integer> porNome = new LinkedHashMap<>();
        for (Map.Entry<Integer, Celula> entrada : linha.entrySet()) {
            String nome = normalizar(entrada.getValue().texto());
            if (!nome.isEmpty()) {
                porNome.putIfAbsent(nome, entrada.getKey());
            }
        }

        boolean temTodasObrigatorias = COLUNAS_OBRIGATORIAS.stream().allMatch(porNome::containsKey);
        return temTodasObrigatorias ? porNome : null;
    }

    private InventarioItem montarItem(Map<Integer, Celula> linha, Map<String, Integer> colunas) {
        String codProduto = texto(linha, colunas.get(COL_COD_PRODUTO));
        // Linha sem código de produto é rodapé/linha em branco.
        if (codProduto == null || codProduto.isBlank()) return null;

        // O relatório do Protheus é paginado para impressão e repete a linha de
        // cabeçalho a cada ~38 produtos (ex: linha 44, 82, 120...). Sem esse filtro,
        // cada repetição vira um "produto" fantasma contado como zerado, inflando o
        // total e o número de zerados (mas não os valores em R$, que ficam a zero
        // pra essas linhas de qualquer forma).
        if (normalizar(codProduto).equals(COL_COD_PRODUTO)) return null;

        InventarioItem item = new InventarioItem();
        item.setCodProduto(codProduto);
        item.setDescricao(limitar(texto(linha, colunas.get(COL_DESCRICAO)), 300));
        item.setUnidade(limitar(texto(linha, colunas.get(COL_UNIDADE)), 255));
        item.setLocalArmazenamento(limitar(texto(linha, colunas.get(COL_LOCAL)), 255));
        item.setFamilia(limitar(texto(linha, colunas.get(COL_FAMILIA)), 255));
        item.setFabricante(limitar(texto(linha, colunas.get(COL_FABRICANTE)), 255));
        item.setCodBarras(limitar(texto(linha, colunas.get(COL_COD_BARRAS)), 255));
        item.setObservacao(limitar(texto(linha, colunas.get(COL_OBS)), 300));

        BigDecimal valorUnitario = numero(linha, colunas.get(COL_VALOR_UNITARIO));
        BigDecimal quantidade = numero(linha, colunas.get(COL_ESTOQUE));
        BigDecimal c1 = numero(linha, colunas.get(COL_CONTAGEM_1));
        BigDecimal c2 = numero(linha, colunas.get(COL_CONTAGEM_2));
        BigDecimal c3 = numero(linha, colunas.get(COL_CONTAGEM_3));
        BigDecimal divergencia = numero(linha, colunas.get(COL_DIVERGENCIA));
        BigDecimal valorDivergencia = numero(linha, colunas.get(COL_VALOR_DIVERGENCIA));

        item.setValorUnitario(valorUnitario);
        item.setQuantidadeSistema(quantidade);
        item.setContagem1(c1);
        item.setContagem2(c2);
        item.setContagem3(c3);
        item.setDivergencia(divergencia);
        item.setValorDivergencia(valorDivergencia.setScale(2, RoundingMode.HALF_UP));

        BigDecimal quantidadeFinal = ultimaContagem(c1, c2, c3);
        item.setQuantidadeFinal(quantidadeFinal);
        item.setValorInicial(quantidade.multiply(valorUnitario).setScale(2, RoundingMode.HALF_UP));
        item.setValorFinal(quantidadeFinal.multiply(valorUnitario).setScale(2, RoundingMode.HALF_UP));
        item.setZerado(ehZero(quantidade) && ehZero(c1) && ehZero(c2) && ehZero(c3) && ehZero(divergencia));

        return item;
    }

    /**
     * A quantidade final é a última contagem preenchida: a 3ª se houver, senão a
     * 2ª, senão a 1ª — mesmo critério da planilha que o setor usava antes.
     */
    private BigDecimal ultimaContagem(BigDecimal c1, BigDecimal c2, BigDecimal c3) {
        if (c3.signum() > 0) return c3;
        if (c2.signum() > 0) return c2;
        return c1;
    }

    private boolean ehZero(BigDecimal valor) {
        return valor.signum() == 0;
    }

    /**
     * Deixa o cabeçalho comparável: sem acento, minúsculo, sem pontuação e com
     * espaços colapsados. Assim "1ª Contagem" vira "1 contagem" e "Vlr.Unit"
     * vira "vlrunit" — o "ª" (indicador ordinal) e o "." não sobrevivem ao
     * filtro, então nem precisam ser tratados à parte.
     */
    private String normalizar(String valor) {
        if (valor == null) return "";
        String semAcento = Normalizer.normalize(valor, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return semAcento.toLowerCase()
                .replaceAll("[^a-z0-9 ]", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String texto(Map<Integer, Celula> linha, Integer indice) {
        if (indice == null) return null;
        Celula celula = linha.get(indice);
        if (celula == null) return null;
        String valor = celula.texto().trim();
        return valor.isEmpty() ? null : valor;
    }

    /**
     * Só células com Type="Number" viram número. As de contagem não preenchida
     * chegam como texto (ex: ",   ,   ,   ." — a máscara vazia do relatório do
     * Protheus), e tratar qualquer coisa que não seja Number como zero cobre
     * esse caso sem precisar reconhecer o padrão exato da máscara.
     */
    private BigDecimal numero(Map<Integer, Celula> linha, Integer indice) {
        if (indice == null) return BigDecimal.ZERO;
        Celula celula = linha.get(indice);
        if (celula == null || !celula.numerica()) return BigDecimal.ZERO;
        try {
            return new BigDecimal(celula.texto().trim());
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }

    private String limitar(String valor, int max) {
        if (valor == null) return null;
        return valor.length() <= max ? valor : valor.substring(0, max);
    }
}
