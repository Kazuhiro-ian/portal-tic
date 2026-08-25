package portal.ti.queiroz.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import portal.ti.queiroz.dto.AtualizarCredencialRequest;
import portal.ti.queiroz.dto.CredencialResponse;
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

        // password em branco: não deve sobrescrever a senha existente
        AtualizarCredencialRequest atualizacao =
                new AtualizarCredencialRequest("Switch Core - Andar 2", "admin", "", null);

        CredencialResponse resultado = service.atualizar(1L, atualizacao);

        // A senha nunca deve vir na resposta -- CredencialResponse nem tem esse campo.
        // Quem checa se ela foi preservada de verdade é o objeto salvo no repositório.
        ArgumentCaptor<Credencial> captor = ArgumentCaptor.forClass(Credencial.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getPassword()).isEqualTo("senhaAntiga123");
        assertThat(resultado.name()).isEqualTo("Switch Core - Andar 2");
    }

    @Test
    void salvarZeraOIdRecebidoParaNuncaSobrescreverOutroRegistro() {
        // Não define id na resposta simulada de propósito: o que este teste verifica é o
        // estado do objeto NO MOMENTO da chamada a save() (via captor), então mutar o id
        // depois, no próprio stub, mascararia o bug que o teste existe para pegar.
        when(repository.save(any(Credencial.class))).thenAnswer(inv -> inv.getArgument(0));

        Credencial comIdForjado = new Credencial();
        comIdForjado.setId(999L); // simula um POST malicioso/com bug tentando sobrescrever o registro 999
        comIdForjado.setName("Nova credencial");
        comIdForjado.setUsername("user");
        comIdForjado.setPassword("senha123");

        service.salvar(comIdForjado);

        ArgumentCaptor<Credencial> captor = ArgumentCaptor.forClass(Credencial.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getId()).isNull();
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
