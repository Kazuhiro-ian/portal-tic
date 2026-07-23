package portal.ti.queiroz.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import portal.ti.queiroz.model.Role;
import portal.ti.queiroz.model.Usuario;
import portal.ti.queiroz.repository.UsuarioRepository;

import java.security.SecureRandom;

/**
 * Garante que sempre exista pelo menos um usuário ADMIN. Só executa a criação quando a tabela
 * de usuários está vazia (ex: primeiro boot da aplicação em um banco novo).
 */
@Component
public class BootstrapAdminRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(BootstrapAdminRunner.class);
    private static final String CARACTERES_SENHA =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final String usernameBootstrap;
    private final String passwordBootstrap;

    public BootstrapAdminRunner(UsuarioRepository usuarioRepository,
                                 PasswordEncoder passwordEncoder,
                                 @Value("${admin.bootstrap.username:admin}") String usernameBootstrap,
                                 @Value("${admin.bootstrap.password:}") String passwordBootstrap) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.usernameBootstrap = usernameBootstrap;
        this.passwordBootstrap = passwordBootstrap;
    }

    @Override
    public void run(String... args) {
        if (usuarioRepository.count() > 0) {
            return;
        }

        String senha = (passwordBootstrap == null || passwordBootstrap.isBlank())
                ? gerarSenhaAleatoria()
                : passwordBootstrap;

        Usuario admin = new Usuario();
        admin.setUsername(usernameBootstrap);
        admin.setPasswordHash(passwordEncoder.encode(senha));
        admin.setNomeCompleto("Administrador");
        admin.setRole(Role.ADMIN);
        admin.setAtivo(true);
        usuarioRepository.save(admin);

        log.warn("=================================================================");
        log.warn("Nenhum usuário encontrado. Usuário ADMIN inicial criado:");
        log.warn("  username: {}", usernameBootstrap);
        if (passwordBootstrap == null || passwordBootstrap.isBlank()) {
            log.warn("  senha (gerada automaticamente, só aparece aqui UMA VEZ): {}", senha);
            log.warn("  Troque essa senha assim que fizer login pela primeira vez.");
        } else {
            log.warn("  senha: definida via ADMIN_BOOTSTRAP_PASSWORD");
        }
        log.warn("=================================================================");
    }

    private String gerarSenhaAleatoria() {
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(20);
        for (int i = 0; i < 20; i++) {
            sb.append(CARACTERES_SENHA.charAt(random.nextInt(CARACTERES_SENHA.length())));
        }
        return sb.toString();
    }
}
