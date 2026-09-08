package portal.ti.queiroz.dto;
import java.util.List;

public record ImportarCronogramaZebraResponse(int criados, int atualizados, int ignorados, List<String> avisos) {
    
}
