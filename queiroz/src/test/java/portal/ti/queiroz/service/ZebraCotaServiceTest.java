package portal.ti.queiroz.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.ZebraCota;
import portal.ti.queiroz.repository.ZebraCotaRepository;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ZebraCotaServiceTest {

    @Mock
    private ZebraCotaRepository repository;

    @InjectMocks
    private ZebraCotaService service;

    private ZebraCota cota(Long id, Long filialId) {
        ZebraCota c = new ZebraCota();
        c.setId(id);
        c.setFilialId(filialId);
        c.setEtiquetasPadrao(100);
        c.setRibbonsPadrao(2);
        c.setDiaEnvio1(5);
        c.setDiaEnvio2(20);
        return c;
    }

    @Test
    void salvarZeraOIdRecebidoParaNuncaSobrescreverOutroRegistro() {
        when(repository.findByFilialId(10L)).thenReturn(Optional.empty());
        when(repository.save(any(ZebraCota.class))).thenAnswer(inv -> inv.getArgument(0));

        ZebraCota comIdForjado = cota(999L, 10L);

        service.salvar(comIdForjado);

        ArgumentCaptor<ZebraCota> captor = ArgumentCaptor.forClass(ZebraCota.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getId()).isNull();
    }

    @Test
    void salvarComFilialQueJaTemCotaLancaExcecao() {
        when(repository.findByFilialId(10L)).thenReturn(Optional.of(cota(1L, 10L)));

        ZebraCota nova = cota(null, 10L);

        assertThatThrownBy(() -> service.salvar(nova))
                .isInstanceOf(RegraDeNegocioException.class)
                .hasMessageContaining("Já existe uma cota");

        verify(repository, never()).save(any());
    }

    @Test
    void atualizarCopiaTodosOsCamposParaAEntidadeGerenciada() {
        ZebraCota existente = cota(1L, 10L);
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any(ZebraCota.class))).thenAnswer(inv -> inv.getArgument(0));

        ZebraCota novosDados = new ZebraCota();
        novosDados.setEtiquetasPadrao(200);
        novosDados.setRibbonsPadrao(4);
        novosDados.setDiaEnvio1(10);
        novosDados.setDiaEnvio2(25);

        ZebraCota atualizada = service.atualizar(1L, novosDados);

        assertThat(atualizada.getEtiquetasPadrao()).isEqualTo(200);
        assertThat(atualizada.getRibbonsPadrao()).isEqualTo(4);
        assertThat(atualizada.getDiaEnvio1()).isEqualTo(10);
        assertThat(atualizada.getDiaEnvio2()).isEqualTo(25);
        assertThat(atualizada.getFilialId()).isEqualTo(10L); // não mexe na filial ao editar
    }

    @Test
    void atualizarCotaInexistenteLancaExcecao() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.atualizar(99L, new ZebraCota()))
                .isInstanceOf(RecursoNaoEncontradoException.class);
    }

    @Test
    void deletarCotaInexistenteLancaExcecao() {
        when(repository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> service.deletar(99L))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(repository, never()).deleteById(any());
    }
}
