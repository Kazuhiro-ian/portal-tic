package portal.ti.queiroz.dto;

/** Resultado de um teste de conectividade real contra o IP cadastrado da impressora. */
public record TesteConexaoResponse(
        Long impressoraId,
        String status,
        long tempoRespostaMs,
        String detalhe) {
}
