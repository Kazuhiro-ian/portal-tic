package portal.ti.queiroz.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.StatusTarefaPlantao;
import portal.ti.queiroz.model.TarefaPlantao;
import portal.ti.queiroz.repository.TarefaPlantaoRepository;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TarefaPlantaoServiceTest {

    @Mock
    private TarefaPlantaoRepository repository;

    @InjectMocks
    private TarefaPlantaoService service;

    @Test
    void salvarZeraOIdRecebidoParaNuncaSobrescreverOutroRegistro() {
        when(repository.save(any(TarefaPlantao.class))).thenAnswer(inv -> inv.getArgument(0));

        TarefaPlantao comIdForjado = new TarefaPlantao();
        comIdForjado.setId(999L);
        comIdForjado.setData(LocalDate.of(2026, 8, 25));
        comIdForjado.setDescricao("Trocar toner da HP12");

        service.salvar(comIdForjado);

        ArgumentCaptor<TarefaPlantao> captor = ArgumentCaptor.forClass(TarefaPlantao.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getId()).isNull();
    }

    @Test
    void salvarSemStatusComecaComoPendente() {
        when(repository.save(any(TarefaPlantao.class))).thenAnswer(inv -> inv.getArgument(0));

        TarefaPlantao tarefa = new TarefaPlantao();
        tarefa.setData(LocalDate.of(2026, 8, 25));
        tarefa.setDescricao("Verificar rede da loja 5");

        TarefaPlantao salva = service.salvar(tarefa);

        assertThat(salva.getStatus()).isEqualTo(StatusTarefaPlantao.PENDENTE);
    }

    @Test
    void atualizarStatusTrocaOStatusDaTarefaExistente() {
        TarefaPlantao existente = new TarefaPlantao();
        existente.setId(1L);
        existente.setData(LocalDate.of(2026, 8, 25));
        existente.setDescricao("Trocar toner da HP12");
        existente.setStatus(StatusTarefaPlantao.PENDENTE);

        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any(TarefaPlantao.class))).thenAnswer(inv -> inv.getArgument(0));

        TarefaPlantao atualizada = service.atualizarStatus(1L, StatusTarefaPlantao.CONCLUIDO);

        assertThat(atualizada.getStatus()).isEqualTo(StatusTarefaPlantao.CONCLUIDO);
    }

    @Test
    void atualizarStatusDeTarefaInexistenteLancaExcecao() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.atualizarStatus(99L, StatusTarefaPlantao.CONCLUIDO))
                .isInstanceOf(RecursoNaoEncontradoException.class);
    }

    @Test
    void deletarTarefaInexistenteLancaExcecao() {
        when(repository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> service.deletar(99L))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(repository, never()).deleteById(any());
    }
}
