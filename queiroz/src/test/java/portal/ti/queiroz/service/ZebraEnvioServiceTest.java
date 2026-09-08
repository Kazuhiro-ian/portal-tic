package portal.ti.queiroz.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;
import portal.ti.queiroz.dto.ConfirmarEnvioZebraRequest;
import portal.ti.queiroz.dto.ImportarCronogramaZebraResponse;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.EstoqueItem;
import portal.ti.queiroz.model.Filiais;
import portal.ti.queiroz.model.StatusZebraEnvio;
import portal.ti.queiroz.model.ZebraEnvio;
import portal.ti.queiroz.repository.EstoqueItemRepository;
import portal.ti.queiroz.repository.FiliaisRepository;
import portal.ti.queiroz.repository.ZebraEnvioRepository;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * ZebraEnvioService gerencia o cronograma de envios de etiquetas/ribbons (PREVISTO -> ENVIADO ->
 * CANCELADO) -- cobre que o estoque só é descontado na confirmação (nunca na criação nem no
 * cancelamento), que um envio já confirmado não pode ser confirmado de novo nem excluído, e as
 * regras da importação da planilha (pula linhas que não são dado, resolve filial por
 * numeroFilial, faz upsert sem duplicar, nunca sobrescreve ENVIADO).
 */
@ExtendWith(MockitoExtension.class)
class ZebraEnvioServiceTest {

    @Mock
    private ZebraEnvioRepository repository;

    @Mock
    private EstoqueItemRepository itemRepository;

    @Mock
    private FiliaisRepository filiaisRepository;

    @InjectMocks
    private ZebraEnvioService service;

    private Filiais filial(long id, int numero) {
        Filiais f = new Filiais();
        f.setId(id);
        f.setNumeroFilial(numero);
        f.setNome("Loja " + numero);
        return f;
    }

    private ZebraEnvio envio(Long id, Long filialId, StatusZebraEnvio status, int etiquetas, int ribbons, LocalDate dataPrevista) {
        ZebraEnvio e = new ZebraEnvio();
        e.setId(id);
        e.setFilialId(filialId);
        e.setStatus(status);
        e.setQtdEtiquetas(etiquetas);
        e.setQtdRibbons(ribbons);
        e.setDataPrevista(dataPrevista);
        e.setTipoEnvio("REGULAR");
        return e;
    }

    private EstoqueItem estoqueItem(long id, String categoria, String nome, int quantidade) {
        EstoqueItem item = new EstoqueItem();
        item.setId(id);
        item.setCategoriaZebra(categoria);
        item.setName(nome);
        item.setQuantity(quantidade);
        item.setMinQuantity(0);
        item.setLocation("Estoque");
        return item;
    }

    // --- criarPrevisto ---

    @Test
    void criarPrevistoNaoMexeEmEstoque() {
        ZebraEnvio novo = new ZebraEnvio();
        novo.setFilialId(10L);
        novo.setQtdEtiquetas(3);
        novo.setQtdRibbons(2);
        novo.setDataPrevista(LocalDate.of(2026, 9, 15));
        novo.setTipoEnvio("REGULAR");

        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ZebraEnvio salvo = service.criarPrevisto(novo);

        assertThat(salvo.getStatus()).isEqualTo(StatusZebraEnvio.PREVISTO);
        assertThat(salvo.getDataEnvio()).isNull();
        verifyNoInteractions(itemRepository);
    }

    // --- confirmarEnvio ---

    @Test
    void confirmarEnvioDescontaEstoqueEMudaStatus() {
        ZebraEnvio existente = envio(1L, 10L, StatusZebraEnvio.PREVISTO, 3, 2, LocalDate.of(2026, 9, 15));
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        EstoqueItem etiquetaItem = estoqueItem(100L, "ETIQUETA", "Etiqueta 10x5", 10);
        EstoqueItem ribbonItem = estoqueItem(101L, "RIBBON", "Ribbon Cera", 10);
        when(itemRepository.findByCategoriaZebraOrCategoriaZebraIsNull("ETIQUETA")).thenReturn(List.of(etiquetaItem));
        when(itemRepository.findByCategoriaZebraOrCategoriaZebraIsNull("RIBBON")).thenReturn(List.of(ribbonItem));
        when(itemRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        var request = new ConfirmarEnvioZebraRequest(LocalDate.of(2026, 9, 16), null, null);
        ZebraEnvio confirmado = service.confirmarEnvio(1L, request);

        assertThat(confirmado.getStatus()).isEqualTo(StatusZebraEnvio.ENVIADO);
        assertThat(confirmado.getDataEnvio()).isEqualTo(LocalDate.of(2026, 9, 16));
        assertThat(etiquetaItem.getQuantity()).isEqualTo(7); // 10 - 3
        assertThat(ribbonItem.getQuantity()).isEqualTo(8); // 10 - 2
    }

    @Test
    void confirmarEnvioDeNovoLancaExcecaoENaoMexeEmEstoque() {
        ZebraEnvio jaEnviado = envio(2L, 10L, StatusZebraEnvio.ENVIADO, 3, 2, LocalDate.of(2026, 9, 15));
        when(repository.findById(2L)).thenReturn(Optional.of(jaEnviado));

        var request = new ConfirmarEnvioZebraRequest(LocalDate.of(2026, 9, 16), null, null);

        assertThatThrownBy(() -> service.confirmarEnvio(2L, request))
                .isInstanceOf(RegraDeNegocioException.class);
        verifyNoInteractions(itemRepository);
    }

    // --- cancelar ---

    @Test
    void cancelarNaoMexeEmEstoque() {
        ZebraEnvio previsto = envio(3L, 10L, StatusZebraEnvio.PREVISTO, 3, 2, LocalDate.of(2026, 9, 15));
        when(repository.findById(3L)).thenReturn(Optional.of(previsto));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ZebraEnvio cancelado = service.cancelar(3L);

        assertThat(cancelado.getStatus()).isEqualTo(StatusZebraEnvio.CANCELADO);
        verifyNoInteractions(itemRepository);
    }

    // --- deletar ---

    @Test
    void deletarRecusaEnvioJaEnviado() {
        ZebraEnvio enviado = envio(4L, 10L, StatusZebraEnvio.ENVIADO, 3, 2, LocalDate.of(2026, 9, 15));
        when(repository.findById(4L)).thenReturn(Optional.of(enviado));

        assertThatThrownBy(() -> service.deletar(4L))
                .isInstanceOf(RegraDeNegocioException.class);
        verify(repository, never()).deleteById(any());
    }

    @Test
    void deletarPermiteEnvioPrevisto() {
        ZebraEnvio previsto = envio(5L, 10L, StatusZebraEnvio.PREVISTO, 3, 2, LocalDate.of(2026, 9, 15));
        when(repository.findById(5L)).thenReturn(Optional.of(previsto));

        service.deletar(5L);

        verify(repository).deleteById(5L);
    }

    // --- importarCronograma ---

    private MultipartFile arquivoCsv(String... linhas) throws IOException {
        String conteudo = String.join("\n", linhas);
        MultipartFile arquivo = mock(MultipartFile.class);
        when(arquivo.getInputStream()).thenReturn(new ByteArrayInputStream(conteudo.getBytes(StandardCharsets.UTF_8)));
        return arquivo;
    }

    @Test
    void importarCronogramaCriaPrevistoEIgnoraLinhasQueNaoSaoDado() throws IOException {
        when(filiaisRepository.findAll()).thenReturn(List.of(filial(1L, 14)));
        when(repository.findByDataPrevistaBetweenOrderByDataPrevistaDesc(any(), any())).thenReturn(List.of());
        when(repository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        MultipartFile arquivo = arquivoCsv(
                "CONTROLE E ACOMPANHAMENTO DE ENVIOS - ETIQUETAS E RIBBONS (SETEMBRO 2026),,,,,,,,,",
                "Planilha interativa para acompanhamento quinzenal de insumos para as filiais.,,,,,,,,,",
                ",,,,,,,,,",
                "LOJA,CLASSIFICAÇÃO DE CONSUMO,ENVIO Nº,QTD ETIQUETAS,QTD RIBBONS,DATA PREVISTA,DATA REAL DE ENVIO,CÓD. RASTREIO / TRANSPORTADORA,STATUS DO ENVIO,OBSERVAÇÕES",
                "14,Alto Consumo,1º Envio,7,4,02/09/2026,,,PREVISTO,Remessa interestadual",
                "99,Alto Consumo,1º Envio,3,2,08/09/2026,,,PREVISTO,Filial inexistente",
                "TOTAL CONSOLIDADO,,,10,6,,,,,");

        ImportarCronogramaZebraResponse resposta = service.importarCronograma(arquivo);

        assertThat(resposta.criados()).isEqualTo(1);
        assertThat(resposta.ignorados()).isEqualTo(1);
        assertThat(resposta.avisos()).anyMatch(a -> a.contains("99"));

        @SuppressWarnings("unchecked")
        var captor = org.mockito.ArgumentCaptor.forClass(List.class);
        verify(repository).saveAll(captor.capture());
        List<?> salvos = (List<?>) captor.getValue();
        assertThat(salvos).hasSize(1);
        ZebraEnvio salvo = (ZebraEnvio) salvos.get(0);
        assertThat(salvo.getFilialId()).isEqualTo(14L); // numeroFilial, não o id do banco
        assertThat(salvo.getStatus()).isEqualTo(StatusZebraEnvio.PREVISTO);
        assertThat(salvo.getEnvioNumero()).isEqualTo(1);
        assertThat(salvo.getQtdEtiquetas()).isEqualTo(7);
        assertThat(salvo.getDataPrevista()).isEqualTo(LocalDate.of(2026, 9, 2));
    }

    @Test
    void importarCronogramaAtualizaLinhaPrevistoExistenteSemDuplicar() throws IOException {
        when(filiaisRepository.findAll()).thenReturn(List.of(filial(1L, 14)));

        ZebraEnvio existente = envio(50L, 14L, StatusZebraEnvio.PREVISTO, 5, 3, LocalDate.of(2026, 9, 2));
        existente.setEnvioNumero(1);
        when(repository.findByDataPrevistaBetweenOrderByDataPrevistaDesc(any(), any())).thenReturn(List.of(existente));
        when(repository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        MultipartFile arquivo = arquivoCsv(
                "LOJA,CLASSIFICAÇÃO DE CONSUMO,ENVIO Nº,QTD ETIQUETAS,QTD RIBBONS,DATA PREVISTA,DATA REAL DE ENVIO,CÓD. RASTREIO / TRANSPORTADORA,STATUS DO ENVIO,OBSERVAÇÕES",
                "14,Alto Consumo,1º Envio,7,4,02/09/2026,,,PREVISTO,Atualizado");

        ImportarCronogramaZebraResponse resposta = service.importarCronograma(arquivo);

        assertThat(resposta.criados()).isEqualTo(0);
        assertThat(resposta.atualizados()).isEqualTo(1);

        @SuppressWarnings("unchecked")
        var captor = org.mockito.ArgumentCaptor.forClass(List.class);
        verify(repository).saveAll(captor.capture());
        ZebraEnvio salvo = (ZebraEnvio) ((List<?>) captor.getValue()).get(0);
        assertThat(salvo.getId()).isEqualTo(50L); // reaproveitou a linha, não duplicou
        assertThat(salvo.getQtdEtiquetas()).isEqualTo(7);
    }

    @Test
    void importarCronogramaNuncaSobrescreveEnvioJaConfirmado() throws IOException {
        when(filiaisRepository.findAll()).thenReturn(List.of(filial(1L, 14)));

        ZebraEnvio jaEnviado = envio(60L, 14L, StatusZebraEnvio.ENVIADO, 5, 3, LocalDate.of(2026, 9, 2));
        jaEnviado.setEnvioNumero(1);
        when(repository.findByDataPrevistaBetweenOrderByDataPrevistaDesc(any(), any())).thenReturn(List.of(jaEnviado));
        when(repository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        MultipartFile arquivo = arquivoCsv(
                "LOJA,CLASSIFICAÇÃO DE CONSUMO,ENVIO Nº,QTD ETIQUETAS,QTD RIBBONS,DATA PREVISTA,DATA REAL DE ENVIO,CÓD. RASTREIO / TRANSPORTADORA,STATUS DO ENVIO,OBSERVAÇÕES",
                "14,Alto Consumo,1º Envio,9,9,02/09/2026,,,PREVISTO,Tentativa de sobrescrever");

        ImportarCronogramaZebraResponse resposta = service.importarCronograma(arquivo);

        assertThat(resposta.criados()).isEqualTo(0);
        assertThat(resposta.atualizados()).isEqualTo(0);
        assertThat(resposta.ignorados()).isEqualTo(1);
        verify(repository).saveAll(List.of());
    }
}
