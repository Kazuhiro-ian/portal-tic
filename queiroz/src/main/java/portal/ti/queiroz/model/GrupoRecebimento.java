package portal.ti.queiroz.model;

/**
 * Grupo de recebimento de material ao qual a filial pertence.
 * A divisão é fixa: a loja pertence sempre ao mesmo grupo.
 *
 * Enum separado de {@link TipoDiaRecebimento} de propósito — assim o compilador
 * impede que SEM_PEDIDOS seja atribuído a uma filial.
 */
public enum GrupoRecebimento {
    GRUPO_1,
    GRUPO_2,
    CD,
    BV
}
