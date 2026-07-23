package portal.ti.queiroz.exception;

import java.time.LocalDateTime;
import java.util.List;

public record ErroResponse(
        LocalDateTime timestamp,
        int status,
        String erro,
        String mensagem,
        String path,
        List<String> detalhes
) {
    public ErroResponse(int status, String erro, String mensagem, String path) {
        this(LocalDateTime.now(), status, erro, mensagem, path, null);
    }

    public ErroResponse(int status, String erro, String mensagem, String path, List<String> detalhes) {
        this(LocalDateTime.now(), status, erro, mensagem, path, detalhes);
    }
}
