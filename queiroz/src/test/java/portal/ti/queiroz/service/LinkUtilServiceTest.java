package portal.ti.queiroz.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.LinkUtil;
import portal.ti.queiroz.repository.LinkUtilRepository;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LinkUtilServiceTest {

    @Mock
    private LinkUtilRepository repository;

    @InjectMocks
    private LinkUtilService service;

    @Test
    void salvarZeraOIdRecebidoParaNuncaSobrescreverOutroRegistro() {
        when(repository.save(any(LinkUtil.class))).thenAnswer(inv -> inv.getArgument(0));

        LinkUtil comIdForjado = new LinkUtil();
        comIdForjado.setId(999L);
        comIdForjado.setName("Portal RH");
        comIdForjado.setUrl("https://rh.exemplo.com");
        comIdForjado.setCategory("internal");

        service.salvar(comIdForjado);

        ArgumentCaptor<LinkUtil> captor = ArgumentCaptor.forClass(LinkUtil.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getId()).isNull();
    }

    @Test
    void atualizarCopiaTodosOsCamposIncluindoTags() {
        LinkUtil existente = new LinkUtil();
        existente.setId(1L);
        existente.setName("Nome antigo");
        existente.setUrl("https://antigo.exemplo.com");
        existente.setCategory("cloud");
        existente.setTags(List.of("antiga"));

        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any(LinkUtil.class))).thenAnswer(inv -> inv.getArgument(0));

        LinkUtil novosDados = new LinkUtil();
        novosDados.setName("Nome novo");
        novosDados.setUrl("https://novo.exemplo.com");
        novosDados.setCategory("internal");
        novosDados.setTags(List.of("nova1", "nova2"));

        LinkUtil atualizado = service.atualizar(1L, novosDados);

        assertThat(atualizado.getName()).isEqualTo("Nome novo");
        assertThat(atualizado.getUrl()).isEqualTo("https://novo.exemplo.com");
        assertThat(atualizado.getCategory()).isEqualTo("internal");
        assertThat(atualizado.getTags()).containsExactly("nova1", "nova2");
        assertThat(atualizado.getId()).isEqualTo(1L);
    }

    @Test
    void atualizarLinkInexistenteLancaExcecao() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.atualizar(99L, new LinkUtil()))
                .isInstanceOf(RecursoNaoEncontradoException.class);
    }

    @Test
    void deletarLinkInexistenteLancaExcecao() {
        when(repository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> service.deletar(99L))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(repository, never()).deleteById(any());
    }
}
