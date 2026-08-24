package portal.ti.queiroz.dto;

import portal.ti.queiroz.model.TipoDiaRecebimento;

import java.time.LocalDate;
import java.util.List;

/** Vários dias do calendário de recebimento marcados de uma vez ("pintados" na tela, salvos juntos). */
public record SalvarDiasRecebimentoRequest(List<ItemDiaRecebimento> itens) {

    public record ItemDiaRecebimento(LocalDate data, TipoDiaRecebimento tipo) {
    }
}
