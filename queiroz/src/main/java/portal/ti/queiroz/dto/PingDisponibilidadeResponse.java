package portal.ti.queiroz.dto;

/**
 * Informa ao frontend se o teste de conexão dos ativos está disponível neste ambiente,
 * para que a interface esconda o botão em vez de oferecer uma ação que sempre falha.
 * O campo {@code motivo} vem preenchido apenas quando o recurso está desabilitado.
 */
public record PingDisponibilidadeResponse(boolean habilitado, String motivo) {
}
