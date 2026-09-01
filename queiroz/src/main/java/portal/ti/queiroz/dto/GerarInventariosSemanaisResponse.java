package portal.ti.queiroz.dto;

import java.util.List;

public record GerarInventariosSemanaisResponse(int criados, int ignorados, List<String> avisos) {
    
}
