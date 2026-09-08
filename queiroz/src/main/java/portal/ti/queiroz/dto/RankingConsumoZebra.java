package portal.ti.queiroz.dto;

/** Uma linha do ranking de filiais que mais consumiram em um período. */
public record RankingConsumoZebra(Long filialId, Integer numeroFilial, String nomeFilial,
                                   int totalEtiquetas, int totalRibbons) {
}
