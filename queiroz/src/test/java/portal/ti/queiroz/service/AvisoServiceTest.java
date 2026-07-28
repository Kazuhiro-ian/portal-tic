package portal.ti.queiroz.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.Aviso;
import portal.ti.queiroz.repository.AvisoRepository;
import portal.ti.queiroz.repository.UsuarioRepository;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AvisoServiceTest {

    @Mock
    private AvisoRepository repository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private AvisoService service;

    @Test
    void salvarComUsuarioInexistenteLancaExcecaoEmVezDeNpe() {
        when(usuarioRepository.findByUsername("fantasma")).thenReturn(Optional.empty());

        Aviso aviso = new Aviso();
        aviso.setMensagem("Teste");

        assertThatThrownBy(() -> service.salvar(aviso, "fantasma"))
                .isInstanceOf(RecursoNaoEncontradoException.class);
    }
}
