package portal.ti.queiroz.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import portal.ti.queiroz.exception.MuitasTentativasException;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limita tentativas de login por usuário, para dificultar um ataque de força bruta contra
 * /api/auth/login (que é permitAll e, sem isto, aceitava tentativas ilimitadas).
 *
 * Contador em memória, não em banco/Redis: a aplicação roda numa única instância (Railway,
 * plano atual). Se um dia passar a rodar em múltiplas instâncias, este contador por instância
 * deixa de ser suficiente e precisa migrar para um armazenamento compartilhado.
 */
@Component
public class LoginRateLimiter {

    private record Tentativas(int falhas, Instant bloqueadoAte) {
    }

    private final ConcurrentHashMap<String, Tentativas> porUsuario = new ConcurrentHashMap<>();

    @Value("${auth.rate-limit.max-tentativas:5}")
    private int maxTentativas;

    @Value("${auth.rate-limit.bloqueio-minutos:15}")
    private int bloqueioMinutos;

    /** Chamar antes de autenticar. Lança se o usuário estiver temporariamente bloqueado. */
    public void verificarBloqueio(String username) {
        Tentativas atual = porUsuario.get(chave(username));
        if (atual == null || atual.bloqueadoAte() == null) return;

        Instant agora = Instant.now();
        if (agora.isBefore(atual.bloqueadoAte())) {
            long minutosRestantes = Math.max(1, Duration.between(agora, atual.bloqueadoAte()).toMinutes() + 1);
            throw new MuitasTentativasException(
                    "Muitas tentativas de login. Tente novamente em " + minutosRestantes + " minuto(s).");
        }
    }

    /** Chamar quando a autenticação falhar. Bloqueia o usuário ao atingir o limite. */
    public void registrarFalha(String username) {
        porUsuario.compute(chave(username), (chave, atual) -> {
            int falhas = (atual == null ? 0 : atual.falhas()) + 1;
            Instant bloqueadoAte = falhas >= maxTentativas
                    ? Instant.now().plus(Duration.ofMinutes(bloqueioMinutos))
                    : null;
            return new Tentativas(falhas, bloqueadoAte);
        });
    }

    /** Chamar quando a autenticação for bem-sucedida, para zerar o contador de falhas. */
    public void registrarSucesso(String username) {
        porUsuario.remove(chave(username));
    }

    private String chave(String username) {
        return username == null ? "" : username.trim().toLowerCase();
    }
}
