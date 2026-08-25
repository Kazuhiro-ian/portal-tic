package portal.ti.queiroz.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import portal.ti.queiroz.dto.UsuarioRequest;
import portal.ti.queiroz.dto.UsuarioResponse;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.Role;
import portal.ti.queiroz.model.Usuario;
import portal.ti.queiroz.repository.UsuarioRepository;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * UsuarioService é quem decide quando revogar sessões já abertas (trocar senha, papel ou
 * desativar) -- um bug aqui deixaria um usuário desligado ou rebaixado continuar autenticado
 * até o token expirar sozinho, então cada gatilho de revogação tem teste próprio.
 */
@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

    @Mock
    private UsuarioRepository repository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UsuarioService service;

    private Usuario usuarioExistente() {
        Usuario u = new Usuario();
        u.setId(1L);
        u.setUsername("tecnico1");
        u.setPasswordHash("hash-antigo");
        u.setNomeCompleto("Fulano da Silva");
        u.setRole(Role.TECNICO);
        u.setAtivo(true);
        u.setTokenVersion(3);
        return u;
    }

    @Test
    void criarCodificaASenhaEComecaComTokenVersionZero() {
        when(repository.existsByUsername("novo.user")).thenReturn(false);
        when(passwordEncoder.encode("senha123")).thenReturn("hash-codificado");
        when(repository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        UsuarioRequest req = new UsuarioRequest("novo.user", "senha123", "Novo Usuário", Role.LEITURA, null);
        UsuarioResponse resposta = service.criar(req);

        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getPasswordHash()).isEqualTo("hash-codificado");
        assertThat(captor.getValue().getAtivo()).isTrue(); // default quando "ativo" vem null
        assertThat(resposta.username()).isEqualTo("novo.user");
    }

    @Test
    void criarComUsernameJaExistenteLancaExcecao() {
        when(repository.existsByUsername("tecnico1")).thenReturn(true);

        UsuarioRequest req = new UsuarioRequest("tecnico1", "senha123", "Outro Nome", Role.TECNICO, null);

        assertThatThrownBy(() -> service.criar(req))
                .isInstanceOf(RegraDeNegocioException.class)
                .hasMessageContaining("Já existe");

        verify(repository, never()).save(any());
    }

    @Test
    void criarSemSenhaLancaExcecao() {
        when(repository.existsByUsername(anyString())).thenReturn(false);

        UsuarioRequest req = new UsuarioRequest("novo.user", "", "Novo Usuário", Role.LEITURA, null);

        assertThatThrownBy(() -> service.criar(req))
                .isInstanceOf(RegraDeNegocioException.class)
                .hasMessageContaining("Senha é obrigatória");

        verify(repository, never()).save(any());
    }

    @Test
    void atualizarSoUsernameOuNomeNaoRevogaTokens() {
        Usuario existente = usuarioExistente();
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        UsuarioRequest req = new UsuarioRequest("tecnico1", null, "Fulano da Silva Neto", Role.TECNICO, true);
        service.atualizar(1L, req);

        assertThat(existente.getTokenVersion()).isEqualTo(3); // não mudou
        verify(passwordEncoder, never()).encode(any());
    }

    @Test
    void atualizarTrocandoSenhaRevogaTokens() {
        Usuario existente = usuarioExistente();
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(passwordEncoder.encode("novaSenha")).thenReturn("hash-novo");
        when(repository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        UsuarioRequest req = new UsuarioRequest("tecnico1", "novaSenha", "Fulano da Silva", Role.TECNICO, true);
        service.atualizar(1L, req);

        assertThat(existente.getPasswordHash()).isEqualTo("hash-novo");
        assertThat(existente.getTokenVersion()).isEqualTo(4); // 3 -> 4
    }

    @Test
    void atualizarTrocandoPapelRevogaTokens() {
        Usuario existente = usuarioExistente();
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        UsuarioRequest req = new UsuarioRequest("tecnico1", null, "Fulano da Silva", Role.ADMIN, true);
        service.atualizar(1L, req);

        assertThat(existente.getRole()).isEqualTo(Role.ADMIN);
        assertThat(existente.getTokenVersion()).isEqualTo(4);
    }

    @Test
    void atualizarDesativandoRevogaTokens() {
        Usuario existente = usuarioExistente();
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        UsuarioRequest req = new UsuarioRequest("tecnico1", null, "Fulano da Silva", Role.TECNICO, false);
        service.atualizar(1L, req);

        assertThat(existente.getAtivo()).isFalse();
        assertThat(existente.getTokenVersion()).isEqualTo(4);
    }

    @Test
    void atualizarParaUsernameDeOutroUsuarioLancaExcecao() {
        Usuario existente = usuarioExistente();
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.existsByUsername("ja.usado")).thenReturn(true);

        UsuarioRequest req = new UsuarioRequest("ja.usado", null, "Fulano da Silva", Role.TECNICO, true);

        assertThatThrownBy(() -> service.atualizar(1L, req))
                .isInstanceOf(RegraDeNegocioException.class);

        verify(repository, never()).save(any());
    }

    @Test
    void atualizarUsuarioInexistenteLancaExcecao() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        UsuarioRequest req = new UsuarioRequest("qualquer", null, "Qualquer", Role.LEITURA, true);

        assertThatThrownBy(() -> service.atualizar(99L, req))
                .isInstanceOf(RecursoNaoEncontradoException.class);
    }

    @Test
    void desativarZeraAtivoERevogaTokens() {
        Usuario existente = usuarioExistente();
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        service.desativar(1L);

        assertThat(existente.getAtivo()).isFalse();
        assertThat(existente.getTokenVersion()).isEqualTo(4);
    }

    @Test
    void desativarUsuarioInexistenteLancaExcecao() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.desativar(99L))
                .isInstanceOf(RecursoNaoEncontradoException.class);
    }
}
