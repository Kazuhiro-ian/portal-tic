package portal.ti.queiroz.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import portal.ti.queiroz.model.CredencialAcessoLog;
import portal.ti.queiroz.model.TipoAcaoCredencial;
import portal.ti.queiroz.repository.CredencialAcessoLogRepository;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CredencialAcessoLogServiceTest {

    @Mock
    private CredencialAcessoLogRepository repository;

    @InjectMocks
    private CredencialAcessoLogService service;

    @AfterEach
    void limparAutenticacao() {
        SecurityContextHolder.clearContext();
    }

    private CredencialAcessoLog log(Long id, String dataHoraIso) {
        CredencialAcessoLog l = new CredencialAcessoLog();
        l.setId(id);
        l.setCredencialId(1L);
        l.setCredencialNome("Switch Core");
        l.setUsuario("tecnico1");
        l.setAcao(TipoAcaoCredencial.VISUALIZAR);
        l.setDataHora(LocalDateTime.parse(dataHoraIso));
        return l;
    }

    @Test
    void registrarPegaOUsuarioDoContextoDeSegurancaEmVezDoQueVierPorFora() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("tecnico.logado", null));

        service.registrar(5L, "Roteador Loja 12", TipoAcaoCredencial.COPIAR);

        ArgumentCaptor<CredencialAcessoLog> captor = ArgumentCaptor.forClass(CredencialAcessoLog.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getUsuario()).isEqualTo("tecnico.logado");
        assertThat(captor.getValue().getCredencialId()).isEqualTo(5L);
        assertThat(captor.getValue().getCredencialNome()).isEqualTo("Roteador Loja 12");
        assertThat(captor.getValue().getAcao()).isEqualTo(TipoAcaoCredencial.COPIAR);
    }

    @Test
    void listarTodosOrdenaDoMaisRecenteParaOMaisAntigo() {
        CredencialAcessoLog antigo = log(1L, "2026-08-01T10:00:00");
        CredencialAcessoLog recente = log(2L, "2026-08-20T15:30:00");
        CredencialAcessoLog meio = log(3L, "2026-08-10T09:00:00");

        when(repository.findAll()).thenReturn(List.of(antigo, recente, meio));

        List<CredencialAcessoLog> resultado = service.listarTodos();

        assertThat(resultado).extracting(CredencialAcessoLog::getId).containsExactly(2L, 3L, 1L);
    }
}
