package portal.ti.queiroz.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.Filiais;
import portal.ti.queiroz.model.Inventario;
import portal.ti.queiroz.repository.FiliaisRepository;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InventarioServiceTest {

    @Mock
    private FiliaisRepository filiaisRepository;

    @InjectMocks
    private InventarioService service;

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
}