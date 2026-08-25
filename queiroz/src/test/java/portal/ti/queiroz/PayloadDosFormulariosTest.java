package portal.ti.queiroz;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Envia ao backend exatamente o JSON que cada formulário da SPA monta hoje, campo por campo.
 *
 * Existe porque a leva de validação declarativa (@Valid/@NotBlank) foi adicionada conferindo
 * a entidade, não o formulário -- e formulário e entidade divergem de propósito em vários
 * pontos do sistema:
 *
 *   - Ativos: os campos pedidos mudam por TIPO de ativo (AssetFormPanel.CAMPOS_POR_TIPO);
 *     Desktop não pede marca/modelo.
 *   - Filiais: só número e nome são obrigatórios na tela; CNPJ e endereço sempre puderam
 *     ficar em branco.
 *
 * Nos dois casos a validação nova rejeitava um cadastro que sempre funcionou, e só apareceu
 * quando alguém tentou salvar pela tela. Cada caso aqui é um cadastro que o usuário consegue
 * fazer pela interface e que, portanto, o backend precisa aceitar.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PayloadDosFormulariosTest {

    @Autowired
    private MockMvc mockMvc;

    private MvcResult enviar(String rota, String json) throws Exception {
        return mockMvc.perform(post(rota).with(user("tecnico").roles("TECNICO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andReturn();
    }

    private void esperaAceito(MvcResult resultado) throws Exception {
        assertThat(resultado.getResponse().getStatus())
                .as("corpo da resposta: %s", resultado.getResponse().getContentAsString())
                .isEqualTo(200);
    }

    private String idDe(MvcResult resultado) throws Exception {
        return resultado.getResponse().getContentAsString().replaceAll(".*\"id\"\\s*:\\s*(\\d+).*", "$1");
    }

    // --- Estoque (StockDashboard.jsx / StockDispatch.jsx) ---

    /** Igual ao emptyForm de StockDashboard.jsx, com os opcionais em branco como a tela envia. */
    private static final String ITEM_ESTOQUE = """
            {
              "name": "Cabo de Rede Cat6 5m",
              "category": "peripherals",
              "subcategory": "",
              "quantity": 0,
              "minQuantity": 5,
              "location": "Prateleira A1",
              "serialNumber": "",
              "responsavel": ""
            }
            """;

    @Test
    void cadastroDeItemPeloFormularioDeEstoqueEAceito() throws Exception {
        esperaAceito(enviar("/api/estoque/itens", ITEM_ESTOQUE));
    }

    @Test
    void movimentoPeloAjusteRapidoEAceito() throws Exception {
        String id = idDe(enviar("/api/estoque/itens", ITEM_ESTOQUE));

        // Igual ao adjustQuantity (steppers +/-) de StockDashboard.jsx.
        esperaAceito(enviar("/api/estoque/movimentos", """
                {
                  "itemId": "%s",
                  "itemName": "Cabo de Rede Cat6 5m",
                  "type": "IN",
                  "quantity": 1,
                  "destination": "Ajuste rápido (+)"
                }
                """.formatted(id)));
    }

    @Test
    void saidaPeloFormularioDeDespachoEAceita() throws Exception {
        String id = idDe(enviar("/api/estoque/itens", ITEM_ESTOQUE));

        // Igual ao handleSubmit de StockDispatch.jsx: sem "date" (o backend preenche) e
        // com "notes" nulo quando o campo fica vazio.
        esperaAceito(enviar("/api/estoque/movimentos", """
                {
                  "itemId": "%s",
                  "itemName": "Cabo de Rede Cat6 5m",
                  "type": "IN",
                  "quantity": 3,
                  "destination": "Loja 12",
                  "notes": null
                }
                """.formatted(id)));
    }

    // --- Ativos (AssetFormPanel.jsx, um caso por tipo com recorte próprio) ---

    @Test
    void cadastroDeDesktopEAceitoSemMarcaEModelo() throws Exception {
        // CAMPOS_POR_TIPO.DESKTOP não inclui marca/modelo -- a tela envia os dois em branco.
        esperaAceito(enviar("/api/ativos", """
                {
                  "tipo": "DESKTOP",
                  "marca": "",
                  "modelo": "",
                  "status": "Offline",
                  "etiqueta": "PAT-00123",
                  "ip": "192.168.1.100",
                  "processador": "Intel i5 11ª geração",
                  "memoria": "16GB",
                  "armazenamento": "512GB SSD",
                  "filialId": 1,
                  "setor": "Financeiro",
                  "observacoes": ""
                }
                """));
    }

    @Test
    void cadastroDeCelularEAceitoSemIpNemSetor() throws Exception {
        // CAMPOS_POR_TIPO.CELULAR pede só marca/modelo/macAddress/imei/filial.
        esperaAceito(enviar("/api/ativos", """
                {
                  "tipo": "CELULAR",
                  "marca": "Samsung",
                  "modelo": "A54",
                  "status": "Offline",
                  "macAddress": "00:1A:2B:3C:4D:5E",
                  "imei": "352099001761481",
                  "filialId": 1
                }
                """));
    }

    // --- Filiais (BranchManagement.jsx) ---

    @Test
    void cadastroDeFilialEAceitoSemCnpjNemEndereco() throws Exception {
        // Na tela só "Número da Filial *" e "Nome da Filial *" são obrigatórios; CNPJ e
        // endereço sempre puderam ficar vazios.
        esperaAceito(enviar("/api/filiais", """
                {
                  "numeroFilial": 77,
                  "nome": "Loja Teste",
                  "cnpj": "",
                  "endereco": "",
                  "grupoRecebimento": null,
                  "tipoFilial": null,
                  "estoqueDividido": false,
                  "periodicidadeInventario": null,
                  "referenciaBimestral": null
                }
                """));
    }
}
