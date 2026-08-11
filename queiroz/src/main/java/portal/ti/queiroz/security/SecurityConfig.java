package portal.ti.queiroz.security;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(handling -> handling
                        .authenticationEntryPoint(this::responderNaoAutenticado)
                        .accessDeniedHandler(this::responderAcessoNegado))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        // Healthcheck da plataforma de deploy (Railway) roda sem token. Só o /health
                        // está exposto (ver management.endpoints.web.exposure.include) e sem detalhes,
                        // então isso não revela configuração interna.
                        .requestMatchers(HttpMethod.GET, "/actuator/health").permitAll()
                        .requestMatchers("/api/usuarios/**").hasRole("ADMIN")
                        // Auditoria do cofre de credenciais: só ADMIN, mesmo que TECNICO tenha
                        // acesso de escrita às credenciais em si. Precisa vir ANTES do matcher
                        // genérico de /api/credenciais/** logo abaixo, senão cairia nele.
                        .requestMatchers(HttpMethod.GET, "/api/credenciais/auditoria").hasRole("ADMIN")
                        .requestMatchers("/api/credenciais/**").hasAnyRole("ADMIN", "TECNICO")
                        // Alterar as metas de acuracidade muda o número apresentado na reunião
                        // mensal, então é só ADMIN. Precisa vir ANTES dos matchers genéricos de
                        // /api/qualidade/** abaixo, senão QUALIDADE conseguiria editar.
                        .requestMatchers(HttpMethod.PUT, "/api/qualidade/configuracao").hasRole("ADMIN")
                        // GET de leitura no módulo Qualidade segue a mesma regra do resto do sistema
                        // (LEITURA também pode ver, ex.: os cards de inventário/recebimento do Dashboard).
                        .requestMatchers(HttpMethod.GET, "/api/qualidade/**").hasAnyRole("ADMIN", "TECNICO", "LEITURA", "QUALIDADE")
                        // Escrita no módulo Qualidade: precisa vir ANTES do matcher genérico de GET,
                        // senão o GET cairia na regra ampla e a escrita cairia em ADMIN/TECNICO,
                        // barrando o papel QUALIDADE.
                        .requestMatchers("/api/qualidade/**").hasAnyRole("ADMIN", "TECNICO", "QUALIDADE")
                        // QUALIDADE entra aqui porque o módulo precisa ler /api/filiais para montar
                        // os selects. A escrita fora de /api/qualidade/** continua negada abaixo.
                        .requestMatchers(HttpMethod.GET, "/api/**").hasAnyRole("ADMIN", "TECNICO", "LEITURA", "QUALIDADE")
                        .requestMatchers("/api/**").hasAnyRole("ADMIN", "TECNICO")
                        .anyRequest().denyAll())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private void responderNaoAutenticado(jakarta.servlet.http.HttpServletRequest request,
                                          HttpServletResponse response,
                                          org.springframework.security.core.AuthenticationException authException) throws java.io.IOException {
        escreverErro(response, HttpServletResponse.SC_UNAUTHORIZED, "Não autenticado",
                "É necessário autenticação para acessar este recurso.", request.getRequestURI());
    }

    private void responderAcessoNegado(jakarta.servlet.http.HttpServletRequest request,
                                        HttpServletResponse response,
                                        org.springframework.security.access.AccessDeniedException accessDeniedException) throws java.io.IOException {
        escreverErro(response, HttpServletResponse.SC_FORBIDDEN, "Acesso negado",
                "Você não tem permissão para acessar este recurso.", request.getRequestURI());
    }

    /**
     * Monta o JSON de erro manualmente (sem depender de nenhum bean Jackson do Spring) porque este
     * handler roda dentro do filter chain do Security, antes do DispatcherServlet/GlobalExceptionHandler.
     * O payload é pequeno e fixo, então não vale a pena arriscar incompatibilidade entre o Jackson 3
     * ("tools.jackson") que o Spring Boot 4.1 usa internamente e o Jackson 2 clássico que outras libs
     * (como o jjwt) ainda trazem transitivamente.
     */
    private void escreverErro(HttpServletResponse response, int status, String erro, String mensagem, String path) throws java.io.IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        String json = "{"
                + "\"timestamp\":\"" + timestamp + "\","
                + "\"status\":" + status + ","
                + "\"erro\":\"" + escaparJson(erro) + "\","
                + "\"mensagem\":\"" + escaparJson(mensagem) + "\","
                + "\"path\":\"" + escaparJson(path) + "\""
                + "}";
        response.getWriter().write(json);
    }

    private String escaparJson(String valor) {
        if (valor == null) return "";
        return valor.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
