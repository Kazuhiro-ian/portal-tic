package portal.ti.queiroz.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.Artigo;
import portal.ti.queiroz.repository.ArtigoRepository;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ArtigoServiceTest {

    @Mock
    private ArtigoRepository repository;

    @InjectMocks
    private ArtigoService service;

    @Test
    void salvarZeraOIdRecebidoParaNuncaSobrescreverOutroRegistro() {
        when(repository.save(any(Artigo.class))).thenAnswer(inv -> inv.getArgument(0));

        Artigo comIdForjado = new Artigo();
        comIdForjado.setId(999L);
        comIdForjado.setTitle("Como resetar a impressora");
        comIdForjado.setCategory("hardware");
        comIdForjado.setContent("Passo a passo...");
        comIdForjado.setAuthor("Fulano");

        service.salvar(comIdForjado);

        ArgumentCaptor<Artigo> captor = ArgumentCaptor.forClass(Artigo.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getId()).isNull();
    }

    @Test
    void atualizarCopiaTodosOsCamposParaAEntidadeGerenciada() {
        Artigo existente = new Artigo();
        existente.setId(1L);
        existente.setTitle("Título antigo");
        existente.setCategory("networks");
        existente.setSummary("Resumo antigo");
        existente.setContent("Conteúdo antigo");
        existente.setAuthor("Autor antigo");

        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any(Artigo.class))).thenAnswer(inv -> inv.getArgument(0));

        Artigo novosDados = new Artigo();
        novosDados.setTitle("Título novo");
        novosDados.setCategory("systems");
        novosDados.setSummary("Resumo novo");
        novosDados.setContent("Conteúdo novo");
        novosDados.setAuthor("Autor novo");

        Artigo atualizado = service.atualizar(1L, novosDados);

        assertThat(atualizado.getTitle()).isEqualTo("Título novo");
        assertThat(atualizado.getCategory()).isEqualTo("systems");
        assertThat(atualizado.getSummary()).isEqualTo("Resumo novo");
        assertThat(atualizado.getContent()).isEqualTo("Conteúdo novo");
        assertThat(atualizado.getAuthor()).isEqualTo("Autor novo");
        assertThat(atualizado.getId()).isEqualTo(1L); // não trocou de linha
    }

    @Test
    void atualizarArtigoInexistenteLancaExcecao() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.atualizar(99L, new Artigo()))
                .isInstanceOf(RecursoNaoEncontradoException.class);
    }

    @Test
    void deletarArtigoInexistenteLancaExcecao() {
        when(repository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> service.deletar(99L))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(repository, never()).deleteById(any());
    }
}
