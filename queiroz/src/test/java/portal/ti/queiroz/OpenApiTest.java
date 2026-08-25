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
 * A documentação da API é liberada sem login de propósito (SecurityConfig) -- só descreve a
 * forma dos endpoints, nenhum dado. Este teste existe para pegar se alguém apertar as regras
 * de novo e acabar bloqueando a doc; o segundo caso confirma que isso não afrouxou nada além
 * dela (o resto da API continua exigindo token).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OpenApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void especificacaoOpenApiRespondeSemAutenticacao() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("Portal TIC — API"));
    }

    @Test
    void endpointDeNegocioContinuaExigindoAutenticacao() throws Exception {
        mockMvc.perform(get("/api/ativos"))
                .andExpect(status().isUnauthorized());
    }
}
