package portal.ti.queiroz.dto;

/**
 * Por que o gerador escolheu aquela data. Serve para a UI destacar o que exige atenção.
 */
public enum MotivoProposta {
    /** Repetiu o mesmo dia do mês anterior, sem conflito. */
    MANTIDO,
    /** O dia de origem batia com recebimento do grupo; foi empurrado para o dia válido mais próximo. */
    DESLOCADO,
    /** A filial não tinha inventário no mês anterior; a data foi semeada distribuindo a carga. */
    SEM_HISTORICO,
    /** O dia-do-mês desejado não existe no mês alvo (ex.: 31 em um mês de 30 dias). */
    AJUSTADO_MES_CURTO,
    /** Inventário já executado no mês alvo — o gerador não toca. */
    JA_REALIZADO,
    /** Nenhum dia do mês serve para o grupo da filial. */
    SEM_DIA_VALIDO,
    /** A filial não tem grupo de recebimento definido. */
    SEM_GRUPO,
    /** Periodicidade semanal (ex: CD 00) -- fora do fluxo automático, agendada sábado a sábado. */
    PERIODICIDADE_SEMANAL
}
