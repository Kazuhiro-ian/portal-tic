package portal.ti.queiroz;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Sobe o contexto inteiro da aplicação contra o H2 em memória (perfil "test"), pegando erros de
 * configuração de beans, mapeamento JPA e segurança antes do deploy.
 */
@SpringBootTest
@ActiveProfiles("test")
class QueirozApplicationTests {

	@Test
	void contextLoads() {
	}

}
