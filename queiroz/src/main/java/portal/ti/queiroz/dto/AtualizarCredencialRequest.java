package portal.ti.queiroz.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * password fica sem @NotBlank de propósito: em branco significa "manter a senha atual"
 * (a listagem nunca traz a senha, então o formulário de edição não teria como pré-carregá-la).
 * Ver {@link portal.ti.queiroz.service.CredencialService#atualizar}.
 */
public record AtualizarCredencialRequest(
        @NotBlank(message = "informe o nome") String name,
        @NotBlank(message = "informe o usuário") String username,
        String password,
        String notes
) {
}
