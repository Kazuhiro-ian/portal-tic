package portal.ti.queiroz.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.EstoqueItem;
import portal.ti.queiroz.repository.EstoqueItemRepository;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EstoqueItemServiceTest {

    @Mock
    private EstoqueItemRepository repository;

    @InjectMocks
    private EstoqueItemService service;

    @Test
    void salvarZeraOIdRecebidoParaNuncaSobrescreverOutroRegistro() {
        when(repository.save(any(EstoqueItem.class))).thenAnswer(inv -> inv.getArgument(0));

        EstoqueItem comIdForjado = new EstoqueItem();
        comIdForjado.setId(999L);
        comIdForjado.setName("Mouse USB");
        comIdForjado.setCategory("peripherals");
        comIdForjado.setQuantity(10);
        comIdForjado.setMinQuantity(2);
        comIdForjado.setLocation("Almoxarifado");

        service.salvar(comIdForjado);

        ArgumentCaptor<EstoqueItem> captor = ArgumentCaptor.forClass(EstoqueItem.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getId()).isNull();
    }

    @Test
    void atualizarCopiaTodosOsCamposParaAEntidadeGerenciada() {
        EstoqueItem existente = new EstoqueItem();
        existente.setId(1L);
        existente.setName("Nome antigo");
        existente.setCategory("categoria antiga");
        existente.setSubcategory("sub antiga");
        existente.setQuantity(5);
        existente.setMinQuantity(1);
        existente.setLocation("Local antigo");
        existente.setSerialNumber("SN-ANTIGO");
        existente.setResponsavel("Responsável antigo");

        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any(EstoqueItem.class))).thenAnswer(inv -> inv.getArgument(0));

        EstoqueItem novosDados = new EstoqueItem();
        novosDados.setName("Nome novo");
        novosDados.setCategory("categoria nova");
        novosDados.setSubcategory("sub nova");
        novosDados.setQuantity(20);
        novosDados.setMinQuantity(3);
        novosDados.setLocation("Local novo");
        novosDados.setSerialNumber("SN-NOVO");
        novosDados.setResponsavel("Responsável novo");

        EstoqueItem atualizado = service.atualizar(1L, novosDados);

        assertThat(atualizado.getName()).isEqualTo("Nome novo");
        assertThat(atualizado.getCategory()).isEqualTo("categoria nova");
        assertThat(atualizado.getSubcategory()).isEqualTo("sub nova");
        assertThat(atualizado.getQuantity()).isEqualTo(20);
        assertThat(atualizado.getMinQuantity()).isEqualTo(3);
        assertThat(atualizado.getLocation()).isEqualTo("Local novo");
        assertThat(atualizado.getSerialNumber()).isEqualTo("SN-NOVO");
        assertThat(atualizado.getResponsavel()).isEqualTo("Responsável novo");
        assertThat(atualizado.getId()).isEqualTo(1L);
    }

    @Test
    void atualizarItemInexistenteLancaExcecao() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.atualizar(99L, new EstoqueItem()))
                .isInstanceOf(RecursoNaoEncontradoException.class);
    }

    @Test
    void deletarItemInexistenteLancaExcecao() {
        when(repository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> service.deletar(99L))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(repository, never()).deleteById(any());
    }
}
