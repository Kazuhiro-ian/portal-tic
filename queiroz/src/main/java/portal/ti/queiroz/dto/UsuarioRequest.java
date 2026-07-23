package portal.ti.queiroz.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import portal.ti.queiroz.model.Role;

public record UsuarioRequest(
        @NotBlank(message = "informe o usuário") String username,
        String password,
        @NotBlank(message = "informe o nome completo") String nomeCompleto,
        @NotNull(message = "informe o papel do usuário") Role role,
        Boolean ativo
) {
}
