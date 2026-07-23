package portal.ti.queiroz.dto;

public record LoginResponse(
        String token,
        String username,
        String nomeCompleto,
        String role
) {
}
