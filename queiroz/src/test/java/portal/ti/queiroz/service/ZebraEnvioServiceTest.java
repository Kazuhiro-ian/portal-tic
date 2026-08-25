package portal.ti.queiroz.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.EstoqueItem;
import portal.ti.queiroz.model.ZebraEnvio;
import portal.ti.queiroz.repository.EstoqueItemRepository;
import portal.ti.queiroz.repository.ZebraEnvioRepository;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ZebraEnvioServiceTest {

    @Mock
    private ZebraEnvioRepository repository;

    @Mock
    private EstoqueItemRepository itemRepository;

    @InjectMocks
    private ZebraEnvioService service;

    private EstoqueItem item(long id, String categoriaZebra, String nome, int quantidade) {
        EstoqueItem i = new EstoqueItem();
        i.setId(id);
        i.setCategoriaZebra(categoriaZebra);
        i.setName(nome);
        i.setCategory("consumables");
        i.setQuantity(quantidade);
        i.setMinQuantity(0);
        i.setLocation("Almoxarifado");
        return i;
    }

    private ZebraEnvio envio(long filialId, int etiquetas, int ribbons, String tipo) {
        ZebraEnvio e = new ZebraEnvio();
        e.setFilialId(filialId);
        e.setQtdEtiquetas(etiquetas);
        e.setQtdRibbons(ribbons);
        e.setDataEnvio(LocalDate.now());
        e.setTipoEnvio(tipo);
        return e;
    }

    @Test
    void baixaEDistribuiEntreVariosItensDaMesmaCategoriaESalvaOEnvio() {
        EstoqueItem etiquetaA = item(1L, "ETIQUETA", "Etiqueta 40x60", 5);
        EstoqueItem etiquetaB = item(2L, "ETIQUETA", "Etiqueta 60x40", 10);
        EstoqueItem ribbon = item(3L, "RIBBON", "Ribbon cera", 20);

        when(itemRepository.findByCategoriaZebraOrCategoriaZebraIsNull("ETIQUETA"))
                .thenReturn(List.of(etiquetaA, etiquetaB));
        when(itemRepository.findByCategoriaZebraOrCategoriaZebraIsNull("RIBBON"))
                .thenReturn(List.of(ribbon));
        when(itemRepository.saveAndFlush(any(EstoqueItem.class))).thenAnswer(inv -> inv.getArgument(0));
        when(repository.save(any(ZebraEnvio.class))).thenAnswer(inv -> inv.getArgument(0));

        // Pede 8 etiquetas: esgota o item A (5) e tira mais 3 do item B, sem tocar em ribbon.
        ZebraEnvio pedido = envio(10L, 8, 4, "REGULAR");

        ZebraEnvio salvo = service.salvar(pedido);

        assertThat(etiquetaA.getQuantity()).isEqualTo(0);
        assertThat(etiquetaB.getQuantity()).isEqualTo(7);
        assertThat(ribbon.getQuantity()).isEqualTo(16);
        assertThat(salvo.getFilialId()).isEqualTo(10L);
        verify(repository).save(pedido);
    }

    @Test
    void estoqueInsuficienteLancaExcecaoENaoPersisteNada() {
        EstoqueItem etiqueta = item(1L, "ETIQUETA", "Etiqueta 40x60", 3);
        when(itemRepository.findByCategoriaZebraOrCategoriaZebraIsNull("ETIQUETA")).thenReturn(List.of(etiqueta));

        ZebraEnvio pedido = envio(10L, 5, 0, "REGULAR");

        assertThatThrownBy(() -> service.salvar(pedido))
                .isInstanceOf(RegraDeNegocioException.class)
                .hasMessageContaining("Estoque insuficiente");

        assertThat(etiqueta.getQuantity()).isEqualTo(3);
        verify(itemRepository, never()).saveAndFlush(any());
        verify(repository, never()).save(any());
    }

    @Test
    void envioExtraSemMotivoLancaExcecao() {
        ZebraEnvio pedido = envio(10L, 5, 0, "EXTRA");

        assertThatThrownBy(() -> service.salvar(pedido))
                .isInstanceOf(RegraDeNegocioException.class)
                .hasMessageContaining("motivo");

        verifyNoInteractions(itemRepository, repository);
    }

    @Test
    void semQuantidadeNenhumaLancaExcecao() {
        ZebraEnvio pedido = envio(10L, 0, 0, "REGULAR");

        assertThatThrownBy(() -> service.salvar(pedido))
                .isInstanceOf(RegraDeNegocioException.class);

        verifyNoInteractions(itemRepository, repository);
    }

    @Test
    void semCategoriaZebraCaiNoFallbackPorNome() {
        EstoqueItem semCategoria = item(1L, null, "Rolo de Etiqueta Térmica", 10);
        when(itemRepository.findByCategoriaZebraOrCategoriaZebraIsNull("ETIQUETA")).thenReturn(List.of(semCategoria));
        when(itemRepository.saveAndFlush(any(EstoqueItem.class))).thenAnswer(inv -> inv.getArgument(0));
        when(repository.save(any(ZebraEnvio.class))).thenAnswer(inv -> inv.getArgument(0));

        ZebraEnvio pedido = envio(10L, 4, 0, "REGULAR");
        service.salvar(pedido);

        assertThat(semCategoria.getQuantity()).isEqualTo(6);
    }

    @Test
    void zeraOIdRecebidoParaNuncaSobrescreverOutroRegistro() {
        EstoqueItem etiqueta = item(1L, "ETIQUETA", "Etiqueta 40x60", 10);
        when(itemRepository.findByCategoriaZebraOrCategoriaZebraIsNull("ETIQUETA")).thenReturn(List.of(etiqueta));
        when(itemRepository.saveAndFlush(any(EstoqueItem.class))).thenAnswer(inv -> inv.getArgument(0));
        when(repository.save(any(ZebraEnvio.class))).thenAnswer(inv -> inv.getArgument(0));

        ZebraEnvio pedido = envio(10L, 2, 0, "REGULAR");
        pedido.setId(999L);

        service.salvar(pedido);

        assertThat(pedido.getId()).isNull();
    }
}
