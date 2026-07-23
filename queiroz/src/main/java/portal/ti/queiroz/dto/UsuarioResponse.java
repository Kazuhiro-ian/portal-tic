package portal.ti.queiroz.dto;

import portal.ti.queiroz.model.Role;
import portal.ti.queiroz.model.Usuario;

import java.time.LocalDateTime;

public record UsuarioResponse(
        Long id,
        String username,
        String nomeCompleto,
        Role role,
        Boolean ativo,
        LocalDateTime createdAt
) {
    public static UsuarioResponse fromEntity(Usuario u) {
        return new UsuarioResponse(u.getId(), u.getUsername(), u.getNomeCompleto(), u.getRole(), u.getAtivo(), u.getCreatedAt());
    }
}
