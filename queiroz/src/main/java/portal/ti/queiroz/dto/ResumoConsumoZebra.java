package portal.ti.queiroz.dto;

/** Consumo de uma filial em um mês, com a classificação calculada (não vem de planilha). */
public record ResumoConsumoZebra(Long filialId, Integer numeroFilial, String nomeFilial,
                                  int totalEtiquetas, int totalRibbons, String classificacao) {
}
