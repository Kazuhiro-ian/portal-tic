package portal.ti.queiroz.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtService {

    private static final String CLAIM_ROLE = "role";
    private static final String CLAIM_TOKEN_VERSION = "tokenVersion";

    private final SecretKey chave;
    private final long expiracaoMs;

    public JwtService(@Value("${jwt.secret}") String secret,
                       @Value("${jwt.expiration-ms}") long expiracaoMs) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException(
                    "JWT_SECRET precisa ter pelo menos 32 caracteres (256 bits) para HS256. Tamanho atual: " + bytes.length);
        }
        this.chave = Keys.hmacShaKeyFor(bytes);
        this.expiracaoMs = expiracaoMs;
    }

    public String gerarToken(String username, String role, int tokenVersion) {
        Date agora = new Date();
        Date expiracao = new Date(agora.getTime() + expiracaoMs);

        return Jwts.builder()
                .subject(username)
                .claim(CLAIM_ROLE, role)
                .claim(CLAIM_TOKEN_VERSION, tokenVersion)
                .issuedAt(agora)
                .expiration(expiracao)
                .signWith(chave)
                .compact();
    }

    /**
     * Retorna as claims do token se válido (assinatura e expiração ok), ou {@code null} se inválido/expirado.
     * Nunca lança exceção para o chamador — quem chama decide o que fazer com "sem autenticação".
     */
    public Claims validarEExtrairClaims(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(chave)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    public String extrairUsername(Claims claims) {
        return claims.getSubject();
    }

    public String extrairRole(Claims claims) {
        return claims.get(CLAIM_ROLE, String.class);
    }

    public int extrairTokenVersion(Claims claims) {
        Integer v = claims.get(CLAIM_TOKEN_VERSION, Integer.class);
        return v == null ? -1 : v;
    }
}
