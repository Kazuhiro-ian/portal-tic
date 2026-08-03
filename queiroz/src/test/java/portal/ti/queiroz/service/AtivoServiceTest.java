package portal.ti.queiroz.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.repository.AtivoRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class AtivoServiceTest {

    @Mock
    private AtivoRepository repository;

    @InjectMocks
    private AtivoService service;

    @Test
    void comPingDesabilitadoRecusaOTesteSemTocarNoCadastroDoAtivo() {
        ReflectionTestUtils.setField(service, "pingHabilitado", false);

        assertThatThrownBy(() -> service.testarConexao(1L))
                .isInstanceOf(RegraDeNegocioException.class)
                .hasMessageContaining("desabilitado");

        // O ponto principal: com o ping desligado o ativo nem é carregado, então não há como
        // o teste gravar "Offline" num equipamento que na verdade está no ar.
        verifyNoInteractions(repository);
    }

    @Test
    void exponhaOEstadoDoPingParaOFrontendDecidirSeMostraOBotao() {
        ReflectionTestUtils.setField(service, "pingHabilitado", false);
        assertThat(service.isPingHabilitado()).isFalse();

        ReflectionTestUtils.setField(service, "pingHabilitado", true);
        assertThat(service.isPingHabilitado()).isTrue();
    }
}
