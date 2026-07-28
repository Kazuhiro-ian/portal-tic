package portal.ti.queiroz.dto;

import portal.ti.queiroz.model.Credencial;

/**
 * Versão da credencial para listagem -- sem a senha. Revelar a senha é um endpoint
 * separado (GET /api/credenciais/{id}/revelar), que sempre registra o acesso.
 */
public record CredencialResponse(Long id, String name, String username, String notes) {
    public static CredencialResponse fromEntity(Credencial c) {
        return new CredencialResponse(c.getId(), c.getName(), c.getUsername(), c.getNotes());
    }
}
