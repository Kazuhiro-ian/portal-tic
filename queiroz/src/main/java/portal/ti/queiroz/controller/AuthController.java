package portal.ti.queiroz.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import portal.ti.queiroz.dto.LoginRequest;
import portal.ti.queiroz.dto.LoginResponse;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.Usuario;
import portal.ti.queiroz.repository.UsuarioRepository;
import portal.ti.queiroz.security.JwtService;
import portal.ti.queiroz.security.LoginRateLimiter;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private LoginRateLimiter rateLimiter;

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest req) {
        rateLimiter.verificarBloqueio(req.username());

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.username(), req.password()));
        } catch (BadCredentialsException e) {
            rateLimiter.registrarFalha(req.username());
            throw e;
        }
        rateLimiter.registrarSucesso(req.username());

        Usuario usuario = usuarioRepository.findByUsername(req.username())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));

        String token = jwtService.gerarToken(usuario.getUsername(), usuario.getRole().name(), usuario.getTokenVersion());

        return new LoginResponse(token, usuario.getUsername(), usuario.getNomeCompleto(), usuario.getRole().name());
    }
}
