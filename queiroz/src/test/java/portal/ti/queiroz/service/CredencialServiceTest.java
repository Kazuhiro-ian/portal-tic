package portal.ti.queiroz.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.Credencial;
import portal.ti.queiroz.model.TipoAcaoCredencial;
import portal.ti.queiroz.repository.CredencialRepository;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CredencialServiceTest {

    @Mock
    private CredencialRepository repository;

    @Mock
    private CredencialAcessoLogService logService;

    @InjectMocks
    private CredencialService service;

    @Test
    void atualizarComSenhaEmBrancoPreservaASenhaAtual() {
        Credencial existente = new Credencial();
        existente.setId(1L);
        existente.setName("Switch Core");
        existente.setUsername("admin");
        existente.setPassword("senhaAntiga123");

        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any(Credencial.class))).thenAnswer(inv -> inv.getArgument(0));

        Credencial atualizacao = new Credencial();
        atualizacao.setName("Switch Core - Andar 2");
        atualizacao.setUsername("admin");
        atualizacao.setPassword(""); // em branco: não deve sobrescrever

        Credencial resultado = service.atualizar(1L, atualizacao);

        assertThat(resultado.getPassword()).isEqualTo("senhaAntiga123");
        assertThat(resultado.getName()).isEqualTo("Switch Core - Andar 2");
    }

    @Test
    void revelarSenhaRegistraLogEDevolveASenha() {
        Credencial credencial = new Credencial();
        credencial.setId(2L);
        credencial.setName("Servidor de Backup");
        credencial.setPassword("segredo456");

        when(repository.findById(2L)).thenReturn(Optional.of(credencial));

        String senha = service.revelarSenha(2L, TipoAcaoCredencial.COPIAR);

        assertThat(senha).isEqualTo("segredo456");
        verify(logService).registrar(2L, "Servidor de Backup", TipoAcaoCredencial.COPIAR);
    }

    @Test
    void revelarSenhaDeIdInexistenteLancaExcecao() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.revelarSenha(99L, TipoAcaoCredencial.VISUALIZAR))
                .isInstanceOf(RecursoNaoEncontradoException.class);
    }
}
