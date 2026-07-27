package portal.ti.queiroz.model;

/**
 * O que acontece em um dia do calendário: qual grupo recebe material nele.
 * Definido mês a mês, por dia da semana, e expandido para datas concretas
 * na tabela dias_recebimento.
 */
public enum TipoDiaRecebimento {
    GRUPO_1,
    GRUPO_2,
    SEM_PEDIDOS
}
