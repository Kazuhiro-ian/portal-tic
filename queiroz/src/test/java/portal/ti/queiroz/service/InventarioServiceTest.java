package portal.ti.queiroz.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.DiaRecebimento;
import portal.ti.queiroz.model.Filiais;
import portal.ti.queiroz.model.GrupoRecebimento;
import portal.ti.queiroz.model.Inventario;
import portal.ti.queiroz.model.TipoDiaRecebimento;
import portal.ti.queiroz.repository.DiaRecebimentoRepository;
import portal.ti.queiroz.repository.FiliaisRepository;
import portal.ti.queiroz.repository.InventarioRepository;

import java.time.LocalDate;
import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InventarioServiceTest {

    @Mock
    private FiliaisRepository filiaisRepository;

    @Mock
    private InventarioRepository repository;

    @Mock
    private DiaRecebimentoRepository diaRecebimentoRepository;

    @InjectMocks
    private InventarioService service;

    private Filiais filialDoGrupo1() {
        Filiais filial = new Filiais();
        filial.setId(1L);
        filial.setNumeroFilial(12);
        filial.setNome("Centro");
        filial.setGrupoRecebimento(GrupoRecebimento.GRUPO_1);
        return filial;
    }

    private void semOutroInventarioNoMes() {
        when(repository.findByFilialIdAndDataBetween(eq(1L), any(), any()))
                .thenReturn(Collections.emptyList());
    }

    @Test
    void naoDeveSalvarInventarioParaFilialSemGrupo() {
        // Arrange: uma filial sem grupo de recebimento definido
        Filiais filial = new Filiais();
        filial.setId(1L);
        filial.setNumeroFilial(12);
        filial.setNome("Centro");
        filial.setGrupoRecebimento(null);

        when(filiaisRepository.findById(1L)).thenReturn(Optional.of(filial));

        Inventario inventario = new Inventario();
        inventario.setFilialId(1L);
        inventario.setData(LocalDate.of(2026, 8, 10));

        // Act + Assert: tentar salvar deve lançar a exceção certa
        assertThatThrownBy(() -> service.salvar(inventario))
                .isInstanceOf(RegraDeNegocioException.class)
                .hasMessageContaining("não tem grupo de recebimento definido");
    }

    @Test
    void deveAlertarConflitoDeRecebimentoSemBloquearQuandoNaoHaCiencia() {
        Filiais filial = filialDoGrupo1();
        when(filiaisRepository.findById(1L)).thenReturn(Optional.of(filial));
        semOutroInventarioNoMes();

        LocalDate data = LocalDate.of(2026, 8, 10);
        DiaRecebimento dia = new DiaRecebimento();
        dia.setData(data);
        dia.setTipo(TipoDiaRecebimento.GRUPO_1);
        when(diaRecebimentoRepository.findByData(data)).thenReturn(Optional.of(dia));

        Inventario inventario = new Inventario();
        inventario.setFilialId(1L);
        inventario.setData(data);

        RegraDeNegocioException erro = (RegraDeNegocioException) org.junit.jupiter.api.Assertions.assertThrows(
                RegraDeNegocioException.class, () -> service.salvar(inventario));

        assertThat(erro.getCodigo()).isEqualTo("CONFLITO_RECEBIMENTO");
        assertThat(erro.getMessage()).contains("recebe material");
    }

    @Test
    void deveExigirObservacaoMesmoComCienciaDoConflito() {
        Filiais filial = filialDoGrupo1();
        when(filiaisRepository.findById(1L)).thenReturn(Optional.of(filial));
        semOutroInventarioNoMes();

        LocalDate data = LocalDate.of(2026, 8, 10);
        DiaRecebimento dia = new DiaRecebimento();
        dia.setData(data);
        dia.setTipo(TipoDiaRecebimento.GRUPO_1);
        when(diaRecebimentoRepository.findByData(data)).thenReturn(Optional.of(dia));

        Inventario inventario = new Inventario();
        inventario.setFilialId(1L);
        inventario.setData(data);
        inventario.setCienteConflitoRecebimento(true);

        assertThatThrownBy(() -> service.salvar(inventario))
                .isInstanceOf(RegraDeNegocioException.class)
                .hasMessageContaining("observação");
    }

    @Test
    void devePermitirSalvarConflitoComCienciaEObservacao() {
        Filiais filial = filialDoGrupo1();
        when(filiaisRepository.findById(1L)).thenReturn(Optional.of(filial));
        semOutroInventarioNoMes();

        LocalDate data = LocalDate.of(2026, 8, 10);
        DiaRecebimento dia = new DiaRecebimento();
        dia.setData(data);
        dia.setTipo(TipoDiaRecebimento.GRUPO_1);
        when(diaRecebimentoRepository.findByData(data)).thenReturn(Optional.of(dia));

        Inventario inventario = new Inventario();
        inventario.setFilialId(1L);
        inventario.setData(data);
        inventario.setCienteConflitoRecebimento(true);
        inventario.setObservacao("Loja em ruptura, precisa inventariar hoje mesmo.");

        when(repository.save(inventario)).thenReturn(inventario);

        Inventario salvo = service.salvar(inventario);

        assertThat(salvo).isSameAs(inventario);
    }
}