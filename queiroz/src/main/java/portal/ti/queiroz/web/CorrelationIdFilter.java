package portal.ti.queiroz.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Gera (ou reaproveita, se o chamador já mandou um) um ID por requisição e o coloca no MDC,
 * pra todo log daquela requisição carregar o mesmo identificador -- ver
 * logging.pattern.level em application.properties. Antes, investigar um erro específico em
 * produção era vasculhar o log inteiro tentando juntar linhas soltas pelo horário.
 *
 * @Order(HIGHEST_PRECEDENCE) pra rodar antes até da cadeia de filtros do Spring Security:
 * assim um 401/403 (ou qualquer log dentro dela) também carrega o ID.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {

    public static final String MDC_KEY = "requestId";
    private static final String HEADER = "X-Request-Id";
    private static final int TAMANHO_MAXIMO = 64;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String requestId = sanitizar(request.getHeader(HEADER));
        if (requestId == null) {
            requestId = UUID.randomUUID().toString();
        }

        MDC.put(MDC_KEY, requestId);
        response.setHeader(HEADER, requestId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_KEY);
        }
    }

    /**
     * Um X-Request-Id vindo do chamador não é confiável: sem limpar, um valor com quebra de
     * linha poderia forjar entradas falsas no log (log injection). Só aceita letras, números
     * e hífen, e limita o tamanho.
     */
    private String sanitizar(String valor) {
        if (valor == null) return null;
        String limpo = valor.replaceAll("[^a-zA-Z0-9-]", "").trim();
        if (limpo.isEmpty()) return null;
        return limpo.length() > TAMANHO_MAXIMO ? limpo.substring(0, TAMANHO_MAXIMO) : limpo;
    }
}
