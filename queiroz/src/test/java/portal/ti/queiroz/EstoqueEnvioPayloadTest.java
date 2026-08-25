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
 * Envia ao backend exatamente o JSON que os formulários do módulo de Estoque montam hoje
 * (StockDashboard.jsx e StockDispatch.jsx), campo por campo.
 *
 * Existe porque a leva de validação declarativa (@Valid/@NotBlank) foi adicionada sem
 * conferir contra o payload real de cada tela -- em Ativos isso quebrou o cadastro de
 * Desktop, e só apareceu quando um usuário tentou salvar. Um teste que fala a mesma língua
 * do formulário pega esse tipo de divergência antes de chegar na tela.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EstoqueEnvioPayloadTest {

    @Autowired
    private MockMvc mockMvc;

    /** Igual ao emptyForm de StockDashboard.jsx, com os opcionais em branco como a tela envia. */
    private static final String ITEM_NOVO = """
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
        MvcResult resultado = mockMvc.perform(post("/api/estoque/itens").with(user("tecnico").roles("TECNICO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ITEM_NOVO))
                .andReturn();

        assertThat(resultado.getResponse().getStatus())
                .as("corpo da resposta: %s", resultado.getResponse().getContentAsString())
                .isEqualTo(200);
    }

    @Test
    void movimentoPeloAjusteRapidoEAceito() throws Exception {
        // Cria o item primeiro para ter um id válido para movimentar.
        MvcResult criado = mockMvc.perform(post("/api/estoque/itens").with(user("tecnico").roles("TECNICO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ITEM_NOVO))
                .andReturn();
        String corpo = criado.getResponse().getContentAsString();
        String id = corpo.replaceAll(".*\"id\"\\s*:\\s*(\\d+).*", "$1");

        // Igual ao adjustQuantity (steppers +/-) de StockDashboard.jsx.
        String movimento = """
                {
                  "itemId": "%s",
                  "itemName": "Cabo de Rede Cat6 5m",
                  "type": "IN",
                  "quantity": 1,
                  "destination": "Ajuste rápido (+)"
                }
                """.formatted(id);

        MvcResult resultado = mockMvc.perform(post("/api/estoque/movimentos").with(user("tecnico").roles("TECNICO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(movimento))
                .andReturn();

        assertThat(resultado.getResponse().getStatus())
                .as("corpo da resposta: %s", resultado.getResponse().getContentAsString())
                .isEqualTo(200);
    }

    @Test
    void saidaPeloFormularioDeDespachoEAceita() throws Exception {
        MvcResult criado = mockMvc.perform(post("/api/estoque/itens").with(user("tecnico").roles("TECNICO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ITEM_NOVO))
                .andReturn();
        String corpo = criado.getResponse().getContentAsString();
        String id = corpo.replaceAll(".*\"id\"\\s*:\\s*(\\d+).*", "$1");

        // Igual ao handleSubmit de StockDispatch.jsx: sem "date" (o backend preenche) e
        // com "notes" nulo quando o campo fica vazio.
        String movimento = """
                {
                  "itemId": "%s",
                  "itemName": "Cabo de Rede Cat6 5m",
                  "type": "IN",
                  "quantity": 3,
                  "destination": "Loja 12",
                  "notes": null
                }
                """.formatted(id);

        MvcResult resultado = mockMvc.perform(post("/api/estoque/movimentos").with(user("tecnico").roles("TECNICO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(movimento))
                .andReturn();

        assertThat(resultado.getResponse().getStatus())
                .as("corpo da resposta: %s", resultado.getResponse().getContentAsString())
                .isEqualTo(200);
    }
}
