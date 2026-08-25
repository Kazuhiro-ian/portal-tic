package portal.ti.queiroz.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.Colaborador;
import portal.ti.queiroz.repository.ColaboradorRepository;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ColaboradorServiceTest {

    @Mock
    private ColaboradorRepository repository;

    @InjectMocks
    private ColaboradorService service;

    @Test
    void salvarZeraOIdRecebidoParaNuncaSobrescreverOutroRegistro() {
        when(repository.save(any(Colaborador.class))).thenAnswer(inv -> inv.getArgument(0));

        Colaborador comIdForjado = new Colaborador();
        comIdForjado.setId(999L);
        comIdForjado.setName("Fulano");
        comIdForjado.setRole("Técnico");
        comIdForjado.setIsOnCall(false);

        service.salvar(comIdForjado);

        ArgumentCaptor<Colaborador> captor = ArgumentCaptor.forClass(Colaborador.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getId()).isNull();
    }

    @Test
    void atualizarCopiaTodosOsCamposParaAEntidadeGerenciada() {
        Colaborador existente = new Colaborador();
        existente.setId(1L);
        existente.setName("Nome antigo");
        existente.setRole("Cargo antigo");
        existente.setIsOnCall(false);

        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any(Colaborador.class))).thenAnswer(inv -> inv.getArgument(0));

        Colaborador novosDados = new Colaborador();
        novosDados.setName("Nome novo");
        novosDados.setRole("Cargo novo");
        novosDados.setIsOnCall(true);

        Colaborador atualizado = service.atualizar(1L, novosDados);

        assertThat(atualizado.getName()).isEqualTo("Nome novo");
        assertThat(atualizado.getRole()).isEqualTo("Cargo novo");
        assertThat(atualizado.getIsOnCall()).isTrue();
        assertThat(atualizado.getId()).isEqualTo(1L);
    }

    @Test
    void atualizarColaboradorInexistenteLancaExcecao() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.atualizar(99L, new Colaborador()))
                .isInstanceOf(RecursoNaoEncontradoException.class);
    }

    @Test
    void deletarColaboradorInexistenteLancaExcecao() {
        when(repository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> service.deletar(99L))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(repository, never()).deleteById(any());
    }
}
