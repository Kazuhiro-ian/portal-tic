package portal.ti.queiroz.model;

/**
 * Distingue Centro de Distribuição de Loja.
 *
 * Existe separado de {@link GrupoRecebimento} de propósito: aquele enum responde
 * "em que dias esta filial recebe material", enquanto este responde "que tipo de
 * operação ela é". Hoje os dois quase coincidem (GrupoRecebimento.CD), mas o
 * relatório de acuracidade agrupa por CD/Loja e BV (Boa Vista) tem um CD e uma
 * loja no mesmo grupo de recebimento — reaproveitar o outro enum juntaria os dois.
 */
public enum TipoFilial {
    CD,
    LOJA
}
