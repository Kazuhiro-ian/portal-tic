package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.dto.UsuarioRequest;
import portal.ti.queiroz.dto.UsuarioResponse;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.Usuario;
import portal.ti.queiroz.repository.UsuarioRepository;

import java.util.List;

@Service
public class UsuarioService {

    @Autowired
    private UsuarioRepository repository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public List<UsuarioResponse> listarTodos() {
        return repository.findAll().stream().map(UsuarioResponse::fromEntity).toList();
    }

    public UsuarioResponse criar(UsuarioRequest req) {
        if (repository.existsByUsername(req.username())) {
            throw new RegraDeNegocioException("Já existe um usuário com este nome de usuário.");
        }
        if (req.password() == null || req.password().isBlank()) {
            throw new RegraDeNegocioException("Senha é obrigatória ao criar um usuário.");
        }

        Usuario usuario = new Usuario();
        usuario.setUsername(req.username());
        usuario.setPasswordHash(passwordEncoder.encode(req.password()));
        usuario.setNomeCompleto(req.nomeCompleto());
        usuario.setRole(req.role());
        usuario.setAtivo(req.ativo() == null || req.ativo());

        return UsuarioResponse.fromEntity(repository.save(usuario));
    }

    public UsuarioResponse atualizar(Long id, UsuarioRequest req) {
        Usuario usuario = repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado: " + id));

        boolean precisaRevogarTokens = false;

        if (!usuario.getUsername().equals(req.username()) && repository.existsByUsername(req.username())) {
            throw new RegraDeNegocioException("Já existe um usuário com este nome de usuário.");
        }
        usuario.setUsername(req.username());
        usuario.setNomeCompleto(req.nomeCompleto());

        if (req.password() != null && !req.password().isBlank()) {
            usuario.setPasswordHash(passwordEncoder.encode(req.password()));
            precisaRevogarTokens = true;
        }
        if (req.role() != null && req.role() != usuario.getRole()) {
            usuario.setRole(req.role());
            precisaRevogarTokens = true;
        }
        if (req.ativo() != null && !req.ativo().equals(usuario.getAtivo())) {
            usuario.setAtivo(req.ativo());
            precisaRevogarTokens = true;
        }

        if (precisaRevogarTokens) {
            usuario.setTokenVersion(usuario.getTokenVersion() + 1);
        }

        return UsuarioResponse.fromEntity(repository.save(usuario));
    }

    /**
     * Não remove o registro do usuário (preserva histórico) — apenas desativa e revoga tokens ativos.
     */
    public void desativar(Long id) {
        Usuario usuario = repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado: " + id));
        usuario.setAtivo(false);
        usuario.setTokenVersion(usuario.getTokenVersion() + 1);
        repository.save(usuario);
    }
}
