package portal.ti.queiroz.dto;

import jakarta.validation.constraints.NotBlank;
import portal.ti.queiroz.model.Credencial;

public record CriarCredencialRequest(
        @NotBlank(message = "informe o nome") String name,
        @NotBlank(message = "informe o usuário") String username,
        @NotBlank(message = "informe a senha") String password,
        String notes
) {
    public Credencial paraEntidade() {
        Credencial c = new Credencial();
        c.setName(name);
        c.setUsername(username);
        c.setPassword(password);
        c.setNotes(notes);
        return c;
    }
}
