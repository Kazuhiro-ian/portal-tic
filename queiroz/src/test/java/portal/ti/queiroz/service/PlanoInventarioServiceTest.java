package portal.ti.queiroz.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import portal.ti.queiroz.dto.MotivoProposta;
import portal.ti.queiroz.dto.PlanoMensalResponse;
import portal.ti.queiroz.dto.PropostaInventario;
import portal.ti.queiroz.dto.SalvarPlanoRequest;
import portal.ti.queiroz.dto.SalvarPlanoResponse;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.*;
import portal.ti.queiroz.repository.DiaEquipeRepository;
import portal.ti.queiroz.repository.DiaRecebimentoRepository;
import portal.ti.queiroz.repository.FiliaisRepository;
import portal.ti.queiroz.repository.InventarioRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * PlanoInventarioService gera a proposta que a Qualidade revisa antes de confirmar o
 * agendamento do mês inteiro -- cobre os motivos mais comuns que a tela precisa mostrar
 * corretamente (SEM_GRUPO, PERIODICIDADE_SEMANAL, JA_REALIZADO, SEM_HISTORICO, MANTIDO,
 * DESLOCADO) e as regras de salvarPlano (upsert por filial/mês, não sobrescreve REALIZADO).
 */
@ExtendWith(MockitoExtension.class)
class PlanoInventarioServiceTest {

    @Mock
    private InventarioRepository inventarioRepository;

    @Mock
    private FiliaisRepository filiaisRepository;

    @Mock
    private DiaRecebimentoRepository diaRecebimentoRepository;

    @Mock
    private DiaEquipeRepository diaEquipeRepository;

    @InjectMocks
    private PlanoInventarioService service;

    private static final int ANO = 2026;
    private static final int MES = 8; // agosto/2026

    private Filiais filial(long id, int numero, GrupoRecebimento grupo) {
        Filiais f = new Filiais();
        f.setId(id);
        f.setNumeroFilial(numero);
        f.setNome("Loja " + numero);
        f.setCnpj("00.000.000/0001-00");
        f.setEndereco("Rua Teste, 1");
        f.setGrupoRecebimento(grupo);
        f.setTipoFilial(TipoFilial.LOJA);
        return f;
    }

    private Inventario inventario(long id, Long filialId, LocalDate data, StatusInventario status, Integer diaPreferencial) {
        Inventario inv = new Inventario();
        inv.setId(id);
        inv.setFilialId(filialId);
        inv.setData(data);
        inv.setStatus(status);
        inv.setDiaPreferencial(diaPreferencial);
        return inv;
    }

    private void semRestricoesDeCalendario() {
        when(diaRecebimentoRepository.findByDataBetween(any(), any())).thenReturn(List.of());
        when(diaEquipeRepository.findByDataBetween(any(), any())).thenReturn(List.of());
    }

    // --- gerarPlanoMensal ---

    @Test
    void filialSemGrupoDeRecebimentoEntraComoSemGrupoEForaDaContagemNormal() {
        Filiais f = filial(1L, 10, null);
        when(filiaisRepository.findAll()).thenReturn(List.of(f));
        when(inventarioRepository.findByDataBetween(any(), any())).thenReturn(List.of());
        semRestricoesDeCalendario();

        PlanoMensalResponse resposta = service.gerarPlanoMensal(ANO, MES);

        assertThat(resposta.itens()).hasSize(1);
        assertThat(resposta.itens().get(0).motivo()).isEqualTo(MotivoProposta.SEM_GRUPO);
        assertThat(resposta.avisos()).anyMatch(a -> a.contains("sem grupo de recebimento"));
    }

    @Test
    void filialSemanalNaoEntraNoFluxoNormalDeUmDiaPorMes() {
        Filiais f = filial(2L, 20, GrupoRecebimento.CD);
        f.setPeriodicidadeInventario(PeriodicidadeInventario.SEMANAL);
        when(filiaisRepository.findAll()).thenReturn(List.of(f));
        when(inventarioRepository.findByDataBetween(any(), any())).thenReturn(List.of());
        semRestricoesDeCalendario();

        PlanoMensalResponse resposta = service.gerarPlanoMensal(ANO, MES);

        assertThat(resposta.itens()).hasSize(1);
        assertThat(resposta.itens().get(0).motivo()).isEqualTo(MotivoProposta.PERIODICIDADE_SEMANAL);
    }

    @Test
    void filialComInventarioJaRealizadoNoMesNaoEReplanejada() {
        Filiais f = filial(3L, 30, GrupoRecebimento.GRUPO_1);
        LocalDate dataRealizada = LocalDate.of(ANO, MES, 12);
        Inventario realizado = inventario(100L, 3L, dataRealizada, StatusInventario.REALIZADO, 12);

        when(filiaisRepository.findAll()).thenReturn(List.of(f));
        when(inventarioRepository.findByDataBetween(any(), any())).thenReturn(List.of(realizado));
        semRestricoesDeCalendario();

        PlanoMensalResponse resposta = service.gerarPlanoMensal(ANO, MES);

        assertThat(resposta.itens()).hasSize(1);
        PropostaInventario proposta = resposta.itens().get(0);
        assertThat(proposta.motivo()).isEqualTo(MotivoProposta.JA_REALIZADO);
        assertThat(proposta.dataAtual()).isEqualTo(dataRealizada);
    }

    @Test
    void filialSemHistoricoNoMesAnteriorRecebeDataDistribuidaAutomaticamente() {
        Filiais f = filial(4L, 40, GrupoRecebimento.GRUPO_2);
        when(filiaisRepository.findAll()).thenReturn(List.of(f));
        when(inventarioRepository.findByDataBetween(any(), any())).thenReturn(List.of());
        semRestricoesDeCalendario();

        PlanoMensalResponse resposta = service.gerarPlanoMensal(ANO, MES);

        assertThat(resposta.itens()).hasSize(1);
        PropostaInventario proposta = resposta.itens().get(0);
        assertThat(proposta.motivo()).isEqualTo(MotivoProposta.SEM_HISTORICO);
        assertThat(proposta.dataSugerida()).isNotNull();
        assertThat(YearMonthDe(proposta.dataSugerida())).isEqualTo(java.time.YearMonth.of(ANO, MES));
    }

    @Test
    void filialComAncoraLivreMantemOMesmoDiaDoMesAnterior() {
        Filiais f = filial(5L, 50, GrupoRecebimento.GRUPO_1);
        // Mês anterior (julho/2026): inventário no dia 15, com diaPreferencial 15.
        Inventario doMesAnterior = inventario(200L, 5L, LocalDate.of(2026, 7, 15), StatusInventario.REALIZADO, 15);

        when(filiaisRepository.findAll()).thenReturn(List.of(f));
        // Primeira chamada (mês alvo) -> vazio; segunda (mês anterior) -> com histórico.
        when(inventarioRepository.findByDataBetween(any(), any()))
                .thenReturn(List.of())
                .thenReturn(List.of(doMesAnterior));
        semRestricoesDeCalendario();

        PlanoMensalResponse resposta = service.gerarPlanoMensal(ANO, MES);

        assertThat(resposta.itens()).hasSize(1);
        PropostaInventario proposta = resposta.itens().get(0);
        assertThat(proposta.motivo()).isEqualTo(MotivoProposta.MANTIDO);
        assertThat(proposta.dataSugerida()).isEqualTo(LocalDate.of(ANO, MES, 15));
        assertThat(proposta.diaPreferencial()).isEqualTo(15); // a âncora, não a data efetiva
    }

    @Test
    void filialComAncoraBloqueadaPorRecebimentoEDeslocada() {
        Filiais f = filial(6L, 60, GrupoRecebimento.GRUPO_1);
        Inventario doMesAnterior = inventario(201L, 6L, LocalDate.of(2026, 7, 10), StatusInventario.REALIZADO, 10);

        DiaRecebimento diaBloqueado = new DiaRecebimento();
        diaBloqueado.setData(LocalDate.of(ANO, MES, 10));
        diaBloqueado.setTipo(TipoDiaRecebimento.GRUPO_1);

        when(filiaisRepository.findAll()).thenReturn(List.of(f));
        when(inventarioRepository.findByDataBetween(any(), any()))
                .thenReturn(List.of())
                .thenReturn(List.of(doMesAnterior));
        when(diaRecebimentoRepository.findByDataBetween(any(), any())).thenReturn(List.of(diaBloqueado));
        when(diaEquipeRepository.findByDataBetween(any(), any())).thenReturn(List.of());

        PlanoMensalResponse resposta = service.gerarPlanoMensal(ANO, MES);

        assertThat(resposta.itens()).hasSize(1);
        PropostaInventario proposta = resposta.itens().get(0);
        assertThat(proposta.motivo()).isEqualTo(MotivoProposta.DESLOCADO);
        assertThat(proposta.dataSugerida()).isNotEqualTo(LocalDate.of(ANO, MES, 10));
        assertThat(proposta.diaPreferencial()).isEqualTo(10); // âncora preservada, não vira a nova data
    }

    @Test
    void filialBimestralForaDoCicloDoMesFicaDeForaDoPlano() {
        Filiais f = filial(7L, 70, GrupoRecebimento.CD);
        f.setPeriodicidadeInventario(PeriodicidadeInventario.BIMESTRAL);
        // Referência = mês alvo + 1 (ímpar): o mês alvo cai no ciclo "não".
        f.setReferenciaBimestral(LocalDate.of(ANO, MES, 1).plusMonths(1));

        when(filiaisRepository.findAll()).thenReturn(List.of(f));
        when(inventarioRepository.findByDataBetween(any(), any())).thenReturn(List.of());
        semRestricoesDeCalendario();

        PlanoMensalResponse resposta = service.gerarPlanoMensal(ANO, MES);

        assertThat(resposta.itens()).isEmpty();
    }

    private java.time.YearMonth YearMonthDe(LocalDate data) {
        return java.time.YearMonth.from(data);
    }

    // --- salvarPlano ---

    @Test
    void salvarPlanoSemItensLancaExcecao() {
        assertThatThrownBy(() -> service.salvarPlano(new SalvarPlanoRequest(ANO, MES, List.of())))
                .isInstanceOf(RegraDeNegocioException.class);
        verify(inventarioRepository, never()).saveAll(any());
    }

    @Test
    void salvarPlanoCriaInventarioPlanejadoParaFilialSemInventarioNoMes() {
        Filiais f = filial(8L, 80, GrupoRecebimento.GRUPO_2);
        when(filiaisRepository.findAll()).thenReturn(List.of(f));
        when(inventarioRepository.findByDataBetween(any(), any())).thenReturn(List.of());
        semRestricoesDeCalendario();
        when(inventarioRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        var item = new SalvarPlanoRequest.ItemPlano(8L, LocalDate.of(ANO, MES, 5), 5, "Fulano", null);
        SalvarPlanoResponse resposta = service.salvarPlano(new SalvarPlanoRequest(ANO, MES, List.of(item)));

        assertThat(resposta.criados()).isEqualTo(1);
        assertThat(resposta.atualizados()).isEqualTo(0);
        assertThat(resposta.ignoradosRealizados()).isEqualTo(0);

        @SuppressWarnings("unchecked")
        var captor = org.mockito.ArgumentCaptor.forClass(List.class);
        verify(inventarioRepository).saveAll(captor.capture());
        Inventario salvo = (Inventario) ((List<?>) captor.getValue()).get(0);
        assertThat(salvo.getStatus()).isEqualTo(StatusInventario.PLANEJADO);
        assertThat(salvo.getResponsavel()).isEqualTo("Fulano");
    }

    @Test
    void salvarPlanoComDataForaDoMesAlvoLancaExcecao() {
        Filiais f = filial(9L, 90, GrupoRecebimento.GRUPO_1);
        when(filiaisRepository.findAll()).thenReturn(List.of(f));
        when(inventarioRepository.findByDataBetween(any(), any())).thenReturn(List.of());
        semRestricoesDeCalendario();

        var item = new SalvarPlanoRequest.ItemPlano(9L, LocalDate.of(ANO, MES + 1, 5), null, null, null);

        assertThatThrownBy(() -> service.salvarPlano(new SalvarPlanoRequest(ANO, MES, List.of(item))))
                .isInstanceOf(RegraDeNegocioException.class)
                .hasMessageContaining("não pertence a");
    }

    @Test
    void salvarPlanoIgnoraInventarioJaRealizadoSemAlteraLo() {
        Filiais f = filial(10L, 100, GrupoRecebimento.GRUPO_1);
        LocalDate dataRealizada = LocalDate.of(ANO, MES, 8);
        Inventario realizado = inventario(300L, 10L, dataRealizada, StatusInventario.REALIZADO, 8);

        when(filiaisRepository.findAll()).thenReturn(List.of(f));
        when(inventarioRepository.findByDataBetween(any(), any())).thenReturn(List.of(realizado));
        semRestricoesDeCalendario();
        when(inventarioRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        var item = new SalvarPlanoRequest.ItemPlano(10L, dataRealizada, 8, null, null);
        SalvarPlanoResponse resposta = service.salvarPlano(new SalvarPlanoRequest(ANO, MES, List.of(item)));

        assertThat(resposta.ignoradosRealizados()).isEqualTo(1);
        assertThat(resposta.criados()).isEqualTo(0);
        assertThat(resposta.atualizados()).isEqualTo(0);
    }

    @Test
    void salvarPlanoRecusaDataDeRecebimentoDoGrupoDaFilial() {
        Filiais f = filial(11L, 110, GrupoRecebimento.GRUPO_1);
        DiaRecebimento diaBloqueado = new DiaRecebimento();
        diaBloqueado.setData(LocalDate.of(ANO, MES, 20));
        diaBloqueado.setTipo(TipoDiaRecebimento.GRUPO_1);

        when(filiaisRepository.findAll()).thenReturn(List.of(f));
        when(inventarioRepository.findByDataBetween(any(), any())).thenReturn(List.of());
        when(diaRecebimentoRepository.findByDataBetween(any(), any())).thenReturn(List.of(diaBloqueado));
        when(diaEquipeRepository.findByDataBetween(any(), any())).thenReturn(List.of());

        var item = new SalvarPlanoRequest.ItemPlano(11L, LocalDate.of(ANO, MES, 20), 20, null, null);

        assertThatThrownBy(() -> service.salvarPlano(new SalvarPlanoRequest(ANO, MES, List.of(item))))
                .isInstanceOf(RegraDeNegocioException.class)
                .hasMessageContaining("Calendário da Equipe");
    }
}
