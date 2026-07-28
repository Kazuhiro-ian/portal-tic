package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.dto.CredencialResponse;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.Credencial;
import portal.ti.queiroz.model.TipoAcaoCredencial;
import portal.ti.queiroz.repository.CredencialRepository;

import java.util.List;
import java.util.Optional;

@Service
public class CredencialService {

    @Autowired
    private CredencialRepository repository;

    @Autowired
    private CredencialAcessoLogService logService;

    public List<CredencialResponse> listarTodas() {
        return repository.findAll().stream().map(CredencialResponse::fromEntity).toList();
    }

    public Credencial salvar(Credencial credencial) {
        Credencial salva = repository.save(credencial);
        logService.registrar(salva.getId(), salva.getName(), TipoAcaoCredencial.CRIAR);
        return salva;
    }

    public Credencial atualizar(Long id, Credencial credencialAtualizada) {
        Optional<Credencial> existente = repository.findById(id);
        if (existente.isPresent()) {
            Credencial c = existente.get();
            c.setName(credencialAtualizada.getName());
            c.setUsername(credencialAtualizada.getUsername());
            // Só sobrescreve a senha se vier preenchida -- a listagem não traz mais a
            // senha atual, então o formulário de edição não pode pré-carregá-la; se
            // salvássemos sempre, um PUT de "só mudei o nome" apagaria a senha existente.
            if (credencialAtualizada.getPassword() != null && !credencialAtualizada.getPassword().isBlank()) {
                c.setPassword(credencialAtualizada.getPassword());
            }
            c.setNotes(credencialAtualizada.getNotes());
            Credencial salva = repository.save(c);
            logService.registrar(salva.getId(), salva.getName(), TipoAcaoCredencial.EDITAR);
            return salva;
        }
        throw new RecursoNaoEncontradoException("Credencial não encontrada: " + id);
    }

    public void deletar(Long id) {
        Credencial credencial = repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Credencial não encontrada: " + id));
        repository.deleteById(id);
        logService.registrar(id, credencial.getName(), TipoAcaoCredencial.EXCLUIR);
    }

    public String revelarSenha(Long id, TipoAcaoCredencial acao) {
        Credencial credencial = repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Credencial não encontrada: " + id));
        logService.registrar(id, credencial.getName(), acao != null ? acao : TipoAcaoCredencial.VISUALIZAR);
        return credencial.getPassword();
    }
}
