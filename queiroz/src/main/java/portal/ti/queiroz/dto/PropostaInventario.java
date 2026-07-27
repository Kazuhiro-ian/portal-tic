package portal.ti.queiroz.dto;

import portal.ti.queiroz.model.GrupoRecebimento;

import java.time.LocalDate;

/**
 * Uma linha da proposta de plano mensal — ainda NÃO persistida.
 *
 * É um DTO (e não a entidade, como no resto do projeto) porque carrega dados derivados
 * que não pertencem a Inventario: nome/número da filial, o motivo da escolha e a data
 * atualmente salva, para o usuário comparar antes de confirmar.
 */
public record PropostaInventario(
        Long filialId,
        Integer numeroFilial,
        String nomeFilial,
        GrupoRecebimento grupo,
        LocalDate dataSugerida,
        LocalDate dataAtual,
        Integer diaPreferencial,
        MotivoProposta motivo,
        String descricaoMotivo,
        boolean editavel) {
}
