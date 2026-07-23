package portal.ti.queiroz.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(RecursoNaoEncontradoException.class)
    public ResponseEntity<ErroResponse> handleNaoEncontrado(RecursoNaoEncontradoException e, HttpServletRequest request) {
        return construir(HttpStatus.NOT_FOUND, "Recurso não encontrado", e.getMessage(), request);
    }

    @ExceptionHandler(RegraDeNegocioException.class)
    public ResponseEntity<ErroResponse> handleRegraDeNegocio(RegraDeNegocioException e, HttpServletRequest request) {
        return construir(HttpStatus.BAD_REQUEST, "Regra de negócio violada", e.getMessage(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErroResponse> handleValidacao(MethodArgumentNotValidException e, HttpServletRequest request) {
        List<String> detalhes = e.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .toList();
        ErroResponse body = new ErroResponse(HttpStatus.BAD_REQUEST.value(), "Dados inválidos",
                "Um ou mais campos são inválidos.", request.getRequestURI(), detalhes);
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErroResponse> handleJsonInvalido(HttpMessageNotReadableException e, HttpServletRequest request) {
        return construir(HttpStatus.BAD_REQUEST, "Requisição inválida", "O corpo da requisição está malformado.", request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErroResponse> handleIntegridade(DataIntegrityViolationException e, HttpServletRequest request) {
        log.warn("Violação de integridade de dados em {}: {}", request.getRequestURI(), e.getMessage());
        return construir(HttpStatus.CONFLICT, "Conflito de dados",
                "A operação viola uma restrição de integridade dos dados (campo obrigatório ausente ou valor duplicado).", request);
    }

    @ExceptionHandler({AccessDeniedException.class})
    public ResponseEntity<ErroResponse> handleAcessoNegado(AccessDeniedException e, HttpServletRequest request) {
        return construir(HttpStatus.FORBIDDEN, "Acesso negado", "Você não tem permissão para executar esta ação.", request);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErroResponse> handleCredenciaisInvalidas(BadCredentialsException e, HttpServletRequest request) {
        return construir(HttpStatus.UNAUTHORIZED, "Credenciais inválidas", "Usuário ou senha incorretos.", request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErroResponse> handleGenerico(Exception e, HttpServletRequest request) {
        log.error("Erro não tratado em {}", request.getRequestURI(), e);
        return construir(HttpStatus.INTERNAL_SERVER_ERROR, "Erro interno",
                "Ocorreu um erro inesperado. Tente novamente ou contate o suporte.", request);
    }

    private ResponseEntity<ErroResponse> construir(HttpStatus status, String erro, String mensagem, HttpServletRequest request) {
        ErroResponse body = new ErroResponse(status.value(), erro, mensagem, request.getRequestURI());
        return ResponseEntity.status(status).body(body);
    }
}
