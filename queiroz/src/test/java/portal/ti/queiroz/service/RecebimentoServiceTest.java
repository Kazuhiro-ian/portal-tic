package portal.ti.queiroz.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import portal.ti.queiroz.dto.ConflitoInventario;
import portal.ti.queiroz.model.DiaRecebimento;
import portal.ti.queiroz.model.Filiais;
import portal.ti.queiroz.model.GrupoRecebimento;
import portal.ti.queiroz.model.Inventario;
import portal.ti.queiroz.model.StatusInventario;
import portal.ti.queiroz.model.TipoDiaRecebimento;
import portal.ti.queiroz.repository.DiaRecebimentoRepository;
import portal.ti.queiroz.repository.FiliaisRepository;
import portal.ti.queiroz.repository.InventarioRepository;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecebimentoServiceTest {

    @Mock
    private DiaRecebimentoRepository repository;

    @Mock
    private InventarioRepository inventarioRepository;

    @Mock
    private FiliaisRepository filiaisRepository;

    @InjectMocks
    private RecebimentoService service;

    @Test
    void naoDeveListarConflitoQuandoInventarioJaTemCienciaConfirmada() {
        LocalDate data = LocalDate.of(2026, 8, 10);
        LocalDate inicio = data.withDayOfMonth(1);
        LocalDate fim = data.withDayOfMonth(data.lengthOfMonth());

        Filiais filial = new Filiais();
        filial.setId(1L);
        filial.setNumeroFilial(12);
        filial.setNome("Centro");
        filial.setGrupoRecebimento(GrupoRecebimento.GRUPO_1);

        DiaRecebimento dia = new DiaRecebimento();
        dia.setData(data);
        dia.setTipo(TipoDiaRecebimento.GRUPO_1);

        Inventario inventario = new Inventario();
        inventario.setId(9L);
        inventario.setFilialId(1L);
        inventario.setData(data);
        inventario.setStatus(StatusInventario.PLANEJADO);
        inventario.setCienteConflitoRecebimento(true);
        inventario.setObservacao("Loja em ruptura, precisa inventariar hoje mesmo.");

        when(repository.findByDataBetween(inicio, fim)).thenReturn(List.of(dia));
        when(filiaisRepository.findAll()).thenReturn(List.of(filial));
        when(inventarioRepository.findByDataBetween(inicio, fim)).thenReturn(List.of(inventario));

        List<ConflitoInventario> conflitos = service.detectarConflitos(inicio, fim);

        assertThat(conflitos).isEmpty();
    }

    @Test
    void deveListarConflitoQuandoInventarioNaoTemCiencia() {
        LocalDate data = LocalDate.of(2026, 8, 10);
        LocalDate inicio = data.withDayOfMonth(1);
        LocalDate fim = data.withDayOfMonth(data.lengthOfMonth());

        Filiais filial = new Filiais();
        filial.setId(1L);
        filial.setNumeroFilial(12);
        filial.setNome("Centro");
        filial.setGrupoRecebimento(GrupoRecebimento.GRUPO_1);

        DiaRecebimento dia = new DiaRecebimento();
        dia.setData(data);
        dia.setTipo(TipoDiaRecebimento.GRUPO_1);

        Inventario inventario = new Inventario();
        inventario.setId(9L);
        inventario.setFilialId(1L);
        inventario.setData(data);
        inventario.setStatus(StatusInventario.PLANEJADO);

        when(repository.findByDataBetween(inicio, fim)).thenReturn(List.of(dia));
        when(filiaisRepository.findAll()).thenReturn(List.of(filial));
        when(inventarioRepository.findByDataBetween(inicio, fim)).thenReturn(List.of(inventario));

        List<ConflitoInventario> conflitos = service.detectarConflitos(inicio, fim);

        assertThat(conflitos).hasSize(1);
    }
}
