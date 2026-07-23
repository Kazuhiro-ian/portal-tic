package portal.ti.queiroz.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "informe o usuário") String username,
        @NotBlank(message = "informe a senha") String password
) {
}
