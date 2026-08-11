package portal.ti.queiroz.dto;

import java.util.List;

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
