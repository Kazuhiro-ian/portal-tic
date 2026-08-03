package portal.ti.queiroz;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * O healthcheck da plataforma de deploy chama sem token nenhum. Se alguém apertar as regras do
 * SecurityConfig e este endpoint voltar a exigir autenticação, a Railway passa a considerar a
 * aplicação fora do ar e derruba o deploy — daí o teste.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HealthcheckTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void healthRespondeSemAutenticacao() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void demaisEndpointsDoActuatorNaoEstaoExpostos() throws Exception {
        // Confirma que só o /health foi liberado: /env vazaria variáveis de ambiente.
        mockMvc.perform(get("/actuator/env"))
                .andExpect(status().is4xxClientError());
    }
}
