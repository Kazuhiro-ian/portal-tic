package portal.ti.queiroz.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.Filiais;
import portal.ti.queiroz.model.GrupoRecebimento;
import portal.ti.queiroz.model.TipoFilial;
import portal.ti.queiroz.repository.FiliaisRepository;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Regressão: atualizar() copia os campos um a um pra entidade gerenciada em vez
 * de salvar o objeto recebido direto -- todo campo novo em Filiais precisa ser
 * adicionado aqui também, senão o PUT retorna sucesso mas não persiste nada.
 */
@ExtendWith(MockitoExtension.class)
class FiliaisServicesTest {

    @Mock
    private FiliaisRepository repository;

    @InjectMocks
    private FiliaisServices service;

    private Filiais filialExistente() {
        Filiais filial = new Filiais();
        filial.setId(1L);
        filial.setNumeroFilial(12);
        filial.setNome("Centro");
        filial.setCnpj("00.000.000/0001-00");
        filial.setEndereco("Rua Um, 100");
        filial.setGrupoRecebimento(GrupoRecebimento.GRUPO_1);
        filial.setTipoFilial(null);
        return filial;
    }

    @Test
    void deveAtualizarOTipoFilialAoEditar() {
        Filiais existente = filialExistente();
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any(Filiais.class))).thenAnswer(chamada -> chamada.getArgument(0));

        Filiais dadosNovos = new Filiais();
        dadosNovos.setNumeroFilial(12);
        dadosNovos.setNome("Centro");
        dadosNovos.setCnpj("00.000.000/0001-00");
        dadosNovos.setEndereco("Rua Um, 100");
        dadosNovos.setGrupoRecebimento(GrupoRecebimento.GRUPO_1);
        dadosNovos.setTipoFilial(TipoFilial.CD);

        Filiais atualizada = service.atualizar(1L, dadosNovos);

        assertThat(atualizada.getTipoFilial()).isEqualTo(TipoFilial.CD);
    }

    @Test
    void deveVoltarTipoFilialParaNuloQuandoDesmarcado() {
        Filiais existente = filialExistente();
        existente.setTipoFilial(TipoFilial.LOJA);
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any(Filiais.class))).thenAnswer(chamada -> chamada.getArgument(0));

        Filiais dadosNovos = new Filiais();
        dadosNovos.setNumeroFilial(12);
        dadosNovos.setNome("Centro");
        dadosNovos.setCnpj("00.000.000/0001-00");
        dadosNovos.setEndereco("Rua Um, 100");
        dadosNovos.setGrupoRecebimento(GrupoRecebimento.GRUPO_1);
        dadosNovos.setTipoFilial(null);

        Filiais atualizada = service.atualizar(1L, dadosNovos);

        assertThat(atualizada.getTipoFilial()).isNull();
    }

    @Test
    void devePersistirEstoqueDivididoAoEditarUmaLoja() {
        Filiais existente = filialExistente();
        existente.setTipoFilial(TipoFilial.LOJA);
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any(Filiais.class))).thenAnswer(chamada -> chamada.getArgument(0));

        Filiais dadosNovos = new Filiais();
        dadosNovos.setNumeroFilial(12);
        dadosNovos.setNome("Centro");
        dadosNovos.setCnpj("00.000.000/0001-00");
        dadosNovos.setEndereco("Rua Um, 100");
        dadosNovos.setGrupoRecebimento(GrupoRecebimento.GRUPO_1);
        dadosNovos.setTipoFilial(TipoFilial.LOJA);
        dadosNovos.setEstoqueDividido(true);

        Filiais atualizada = service.atualizar(1L, dadosNovos);

        assertThat(atualizada.getEstoqueDividido()).isTrue();
    }

    @Test
    void naoDevePermitirEstoqueDivididoParaFilialQueNaoELoja() {
        Filiais existente = filialExistente();
        existente.setTipoFilial(TipoFilial.CD);
        when(repository.findById(1L)).thenReturn(Optional.of(existente));

        Filiais dadosNovos = new Filiais();
        dadosNovos.setNumeroFilial(12);
        dadosNovos.setNome("Centro");
        dadosNovos.setCnpj("00.000.000/0001-00");
        dadosNovos.setEndereco("Rua Um, 100");
        dadosNovos.setGrupoRecebimento(GrupoRecebimento.GRUPO_1);
        dadosNovos.setTipoFilial(TipoFilial.CD);
        dadosNovos.setEstoqueDividido(true);

        assertThatThrownBy(() -> service.atualizar(1L, dadosNovos))
                .isInstanceOf(RegraDeNegocioException.class)
                .hasMessageContaining("Loja");
    }
}
