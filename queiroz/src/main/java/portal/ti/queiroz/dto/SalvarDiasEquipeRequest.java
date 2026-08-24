package portal.ti.queiroz.dto;

import portal.ti.queiroz.model.TipoDiaEquipe;

import java.time.LocalDate;
import java.util.List;

/** Vários dias do calendário da equipe marcados de uma vez ("pintados" na tela, salvos juntos). */
public record SalvarDiasEquipeRequest(List<ItemDiaEquipe> itens) {

    /** tipo null remove a marcação daquele dia (equivalente a "voltar ao vazio"). */
    public record ItemDiaEquipe(LocalDate data, TipoDiaEquipe tipo) {
    }
}
