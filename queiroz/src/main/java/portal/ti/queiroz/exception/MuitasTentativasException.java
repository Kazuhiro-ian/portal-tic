package portal.ti.queiroz.exception;

/** Lançada quando um usuário estoura o limite de tentativas de login em pouco tempo. */
public class MuitasTentativasException extends RuntimeException {

    public MuitasTentativasException(String mensagem) {
        super(mensagem);
    }
}
