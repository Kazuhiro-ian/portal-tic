package portal.ti.queiroz.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import portal.ti.queiroz.dto.SalvarDiasEquipeRequest;
import portal.ti.queiroz.dto.SalvarDiasEquipeResponse;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.DiaEquipe;
import portal.ti.queiroz.model.TipoDiaEquipe;
import portal.ti.queiroz.repository.DiaEquipeRepository;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DiaEquipeServiceTest {

    @Mock
    private DiaEquipeRepository repository;

    @InjectMocks
    private DiaEquipeService service;

    @Test
    void salvarDiasSemItensLancaExcecao() {
        assertThatThrownBy(() -> service.salvarDias(new SalvarDiasEquipeRequest(List.of())))
                .isInstanceOf(RegraDeNegocioException.class);
        verifyNoInteractions(repository);
    }

    @Test
    void salvarDiasComDataNulaLancaExcecao() {
        var itens = List.of(new SalvarDiasEquipeRequest.ItemDiaEquipe(null, TipoDiaEquipe.DSR));
        assertThatThrownBy(() -> service.salvarDias(new SalvarDiasEquipeRequest(itens)))
                .isInstanceOf(RegraDeNegocioException.class);
    }

    @Test
    void marcaDiaNovoQuandoNaoExisteAindaESoConsultaOIntervaloNecessario() {
        LocalDate dia = LocalDate.of(2026, 8, 25);
        when(repository.findByDataBetween(dia, dia)).thenReturn(List.of());
        when(repository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        var itens = List.of(new SalvarDiasEquipeRequest.ItemDiaEquipe(dia, TipoDiaEquipe.DSR));
        SalvarDiasEquipeResponse resposta = service.salvarDias(new SalvarDiasEquipeRequest(itens));

        assertThat(resposta.marcados()).isEqualTo(1);
        assertThat(resposta.removidos()).isEqualTo(0);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<DiaEquipe>> captor = ArgumentCaptor.forClass(List.class);
        verify(repository).saveAll(captor.capture());
        assertThat(captor.getValue()).hasSize(1);
        assertThat(captor.getValue().get(0).getId()).isNull(); // linha nova, não reaproveitou id
        assertThat(captor.getValue().get(0).getTipo()).isEqualTo(TipoDiaEquipe.DSR);
    }

    @Test
    void atualizaTipoDeUmDiaJaMarcadoReaproveitandoALinhaExistente() {
        LocalDate dia = LocalDate.of(2026, 8, 25);
        DiaEquipe existente = new DiaEquipe();
        existente.setId(7L);
        existente.setData(dia);
        existente.setTipo(TipoDiaEquipe.FOLGA);

        when(repository.findByDataBetween(dia, dia)).thenReturn(List.of(existente));
        when(repository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        var itens = List.of(new SalvarDiasEquipeRequest.ItemDiaEquipe(dia, TipoDiaEquipe.REUNIAO));
        service.salvarDias(new SalvarDiasEquipeRequest(itens));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<DiaEquipe>> captor = ArgumentCaptor.forClass(List.class);
        verify(repository).saveAll(captor.capture());
        assertThat(captor.getValue()).hasSize(1);
        assertThat(captor.getValue().get(0).getId()).isEqualTo(7L); // mesma linha, não duplicou
        assertThat(captor.getValue().get(0).getTipo()).isEqualTo(TipoDiaEquipe.REUNIAO);
    }

    @Test
    void tipoNuloRemoveAMarcacaoExistente() {
        LocalDate dia = LocalDate.of(2026, 8, 25);
        DiaEquipe existente = new DiaEquipe();
        existente.setId(7L);
        existente.setData(dia);
        existente.setTipo(TipoDiaEquipe.FOLGA);

        when(repository.findByDataBetween(dia, dia)).thenReturn(List.of(existente));

        var itens = List.of(new SalvarDiasEquipeRequest.ItemDiaEquipe(dia, null));
        SalvarDiasEquipeResponse resposta = service.salvarDias(new SalvarDiasEquipeRequest(itens));

        assertThat(resposta.marcados()).isEqualTo(0);
        assertThat(resposta.removidos()).isEqualTo(1);
        verify(repository).deleteAll(List.of(existente));
    }

    @Test
    void tipoNuloSemMarcacaoExistenteNaoFazNada() {
        LocalDate dia = LocalDate.of(2026, 8, 25);
        when(repository.findByDataBetween(dia, dia)).thenReturn(List.of());

        var itens = List.of(new SalvarDiasEquipeRequest.ItemDiaEquipe(dia, null));
        SalvarDiasEquipeResponse resposta = service.salvarDias(new SalvarDiasEquipeRequest(itens));

        assertThat(resposta.marcados()).isEqualTo(0);
        assertThat(resposta.removidos()).isEqualTo(0);
    }
}
