package portal.ti.queiroz.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import portal.ti.queiroz.dto.SalvarEscalasRequest;
import portal.ti.queiroz.dto.SalvarEscalasResponse;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.Escala;
import portal.ti.queiroz.repository.EscalaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EscalaServiceTest {

    @Mock
    private EscalaRepository repository;

    @InjectMocks
    private EscalaService service;

    @Test
    void salvarOuAtualizarCriaNovaEscalaQuandoNaoExisteParaOColaboradorNoDia() {
        Escala nova = new Escala();
        nova.setColaboradorId(1L);
        nova.setData(LocalDate.of(2026, 8, 25));
        nova.setTurno("08:00 - 17:48");

        when(repository.findByColaboradorIdAndData(1L, nova.getData())).thenReturn(Optional.empty());
        when(repository.save(any(Escala.class))).thenAnswer(inv -> inv.getArgument(0));

        Escala salva = service.salvarOuAtualizar(nova);

        assertThat(salva.getTurno()).isEqualTo("08:00 - 17:48");
        verify(repository).save(nova);
    }

    @Test
    void salvarOuAtualizarSubstituiOTurnoDaEscalaExistenteEmVezDeCriarOutraLinha() {
        Escala existente = new Escala();
        existente.setId(5L);
        existente.setColaboradorId(1L);
        existente.setData(LocalDate.of(2026, 8, 25));
        existente.setTurno("Folga");

        Escala alteracao = new Escala();
        alteracao.setColaboradorId(1L);
        alteracao.setData(LocalDate.of(2026, 8, 25));
        alteracao.setTurno("Plantão");

        when(repository.findByColaboradorIdAndData(1L, alteracao.getData())).thenReturn(Optional.of(existente));
        when(repository.save(any(Escala.class))).thenAnswer(inv -> inv.getArgument(0));

        Escala salva = service.salvarOuAtualizar(alteracao);

        assertThat(salva.getId()).isEqualTo(5L);
        assertThat(salva.getTurno()).isEqualTo("Plantão");
    }

    @Test
    void salvarVariasSemItensLancaExcecao() {
        assertThatThrownBy(() -> service.salvarVarias(new SalvarEscalasRequest(List.of())))
                .isInstanceOf(RegraDeNegocioException.class);
        verifyNoInteractions(repository);
    }

    @Test
    void salvarVariasAtualizaExistenteECriaNovaNoMesmoLote() {
        LocalDate dia1 = LocalDate.of(2026, 8, 24);
        LocalDate dia2 = LocalDate.of(2026, 8, 25);

        Escala existente = new Escala();
        existente.setId(9L);
        existente.setColaboradorId(1L);
        existente.setData(dia1);
        existente.setTurno("Folga");

        when(repository.findByDataBetween(dia1, dia2)).thenReturn(List.of(existente));
        when(repository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        var request = new SalvarEscalasRequest(List.of(
                new SalvarEscalasRequest.ItemEscala(1L, dia1, "Plantão"),
                new SalvarEscalasRequest.ItemEscala(2L, dia2, "08:00 - 17:48")
        ));

        SalvarEscalasResponse resposta = service.salvarVarias(request);

        assertThat(resposta.salvos()).isEqualTo(2);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Escala>> captor = ArgumentCaptor.forClass(List.class);
        verify(repository).saveAll(captor.capture());
        List<Escala> salvas = captor.getValue();

        assertThat(salvas).anySatisfy(e -> {
            assertThat(e.getId()).isEqualTo(9L); // reaproveitou a linha existente, não criou outra
            assertThat(e.getTurno()).isEqualTo("Plantão");
        });
        assertThat(salvas).anySatisfy(e -> {
            assertThat(e.getId()).isNull(); // colaborador 2 não tinha escala nesse dia: linha nova
            assertThat(e.getColaboradorId()).isEqualTo(2L);
        });
    }
}
