package portal.ti.queiroz.dto;

import java.util.List;

// cds/lojas/geral são os agregados prontos, calculados a partir da lista de filiais.
public record RelatorioAcuracidadeResponse(
        int ano,
        int mes,
        int anoAnterior,
        int mesAnterior,
        List<ResumoFilialAcuracidade> filiais,
        ResumoFilialAcuracidade cds,
        ResumoFilialAcuracidade lojas,
        ResumoFilialAcuracidade geral
) {
}
