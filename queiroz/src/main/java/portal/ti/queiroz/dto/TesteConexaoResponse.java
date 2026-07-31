package portal.ti.queiroz.dto;

/** Resultado de um teste de conectividade real contra o IP cadastrado do ativo. */
public record TesteConexaoResponse(
        Long ativoId,
        String status,
        long tempoRespostaMs,
        String detalhe) {
}