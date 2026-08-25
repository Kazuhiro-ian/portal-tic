package portal.ti.queiroz.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.EquipeInventario;
import portal.ti.queiroz.repository.EquipeInventarioRepository;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EquipeInventarioServiceTest {

    @Mock
    private EquipeInventarioRepository repository;

    @InjectMocks
    private EquipeInventarioService service;

    @Test
    void salvarZeraOIdRecebidoParaNuncaSobrescreverOutroRegistro() {
        when(repository.save(any(EquipeInventario.class))).thenAnswer(inv -> inv.getArgument(0));

        EquipeInventario comIdForjado = new EquipeInventario();
        comIdForjado.setId(999L);
        comIdForjado.setNome("Equipe A");

        service.salvar(comIdForjado);

        ArgumentCaptor<EquipeInventario> captor = ArgumentCaptor.forClass(EquipeInventario.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getId()).isNull();
    }

    @Test
    void atualizarTrocaONomeDaEquipeExistente() {
        EquipeInventario existente = new EquipeInventario();
        existente.setId(1L);
        existente.setNome("Nome antigo");

        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any(EquipeInventario.class))).thenAnswer(inv -> inv.getArgument(0));

        EquipeInventario novosDados = new EquipeInventario();
        novosDados.setNome("Nome novo");

        EquipeInventario atualizada = service.atualizar(1L, novosDados);

        assertThat(atualizada.getNome()).isEqualTo("Nome novo");
        assertThat(atualizada.getId()).isEqualTo(1L);
    }

    @Test
    void atualizarEquipeInexistenteLancaExcecao() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.atualizar(99L, new EquipeInventario()))
                .isInstanceOf(RecursoNaoEncontradoException.class);
    }

    @Test
    void deletarEquipeInexistenteLancaExcecao() {
        when(repository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> service.deletar(99L))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(repository, never()).deleteById(any());
    }
}
