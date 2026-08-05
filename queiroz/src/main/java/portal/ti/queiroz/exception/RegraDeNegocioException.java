package portal.ti.queiroz.exception;

public class RegraDeNegocioException extends RuntimeException {

    private final String codigo;

    public RegraDeNegocioException(String mensagem) {
        this(mensagem, null);
    }

    /**
     * @param codigo identificador estável para o frontend tratar casos específicos
     *               (ex.: liberar uma confirmação) sem depender do texto da mensagem.
     */
    public RegraDeNegocioException(String mensagem, String codigo) {
        super(mensagem);
        this.codigo = codigo;
    }

    public String getCodigo() {
        return codigo;
    }
}
