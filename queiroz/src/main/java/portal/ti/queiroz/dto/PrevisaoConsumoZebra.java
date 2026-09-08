package portal.ti.queiroz.dto;

/** Previsão de compra do próximo mês por filial -- média móvel dos últimos meses ENVIADO. */
public record PrevisaoConsumoZebra(Long filialId, Integer numeroFilial, String nomeFilial,
                                    double etiquetasPrevistas, double ribbonsPrevistas) {
}
