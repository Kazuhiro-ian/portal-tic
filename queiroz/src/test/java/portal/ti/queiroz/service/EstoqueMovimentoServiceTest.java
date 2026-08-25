package portal.ti.queiroz.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.EstoqueItem;
import portal.ti.queiroz.model.EstoqueMovimento;
import portal.ti.queiroz.repository.EstoqueItemRepository;
import portal.ti.queiroz.repository.EstoqueMovimentoRepository;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EstoqueMovimentoServiceTest {

    @Mock
    private EstoqueMovimentoRepository repository;

    @Mock
    private EstoqueItemRepository itemRepository;

    @InjectMocks
    private EstoqueMovimentoService service;

    @Test
    void saidaMaiorQueDisponivelLancaExcecaoENaoPersisteNada() {
        EstoqueItem item = new EstoqueItem();
        item.setId(1L);
        item.setName("Mouse USB");
        item.setQuantity(2);

        when(itemRepository.findById(1L)).thenReturn(Optional.of(item));

        EstoqueMovimento movimento = new EstoqueMovimento();
        movimento.setItemId("1");
        movimento.setType("OUT");
        movimento.setQuantity(5);
        movimento.setDestination("Loja 12");

        assertThatThrownBy(() -> service.registrar(movimento))
                .isInstanceOf(RegraDeNegocioException.class);

        verify(itemRepository, never()).save(any());
        verify(repository, never()).save(any());
    }

    @Test
    void entradaIncrementaAQuantidadeESalvaOsDois() {
        EstoqueItem item = new EstoqueItem();
        item.setId(2L);
        item.setName("Teclado");
        item.setQuantity(10);

        when(itemRepository.findById(2L)).thenReturn(Optional.of(item));
        when(itemRepository.saveAndFlush(any(EstoqueItem.class))).thenAnswer(inv -> inv.getArgument(0));
        when(repository.save(any(EstoqueMovimento.class))).thenAnswer(inv -> inv.getArgument(0));

        EstoqueMovimento movimento = new EstoqueMovimento();
        movimento.setItemId("2");
        movimento.setType("IN");
        movimento.setQuantity(5);
        movimento.setDestination("Fornecedor XPTO");

        EstoqueMovimento resultado = service.registrar(movimento);

        assertThat(item.getQuantity()).isEqualTo(15);
        assertThat(resultado.getItemName()).isEqualTo("Teclado");
        verify(itemRepository).saveAndFlush(item);
        verify(repository).save(movimento);
    }

    @Test
    void conflitoDeVersaoNaGravacaoConcorrenteViraErroDeRegraDeNegocio() {
        EstoqueItem item = new EstoqueItem();
        item.setId(3L);
        item.setName("Cabo HDMI");
        item.setQuantity(10);

        when(itemRepository.findById(3L)).thenReturn(Optional.of(item));
        when(itemRepository.saveAndFlush(any(EstoqueItem.class)))
                .thenThrow(new org.springframework.orm.ObjectOptimisticLockingFailureException(EstoqueItem.class, 3L));

        EstoqueMovimento movimento = new EstoqueMovimento();
        movimento.setItemId("3");
        movimento.setType("OUT");
        movimento.setQuantity(2);

        assertThatThrownBy(() -> service.registrar(movimento))
                .isInstanceOf(RegraDeNegocioException.class)
                .hasMessageContaining("ao mesmo tempo");

        verify(repository, never()).save(any());
    }

    @Test
    void itemInexistenteLancaExcecao() {
        when(itemRepository.findById(99L)).thenReturn(Optional.empty());

        EstoqueMovimento movimento = new EstoqueMovimento();
        movimento.setItemId("99");
        movimento.setType("IN");
        movimento.setQuantity(1);

        assertThatThrownBy(() -> service.registrar(movimento))
                .isInstanceOf(RecursoNaoEncontradoException.class);
    }
}
