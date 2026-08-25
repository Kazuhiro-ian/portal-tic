package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.dto.CredencialResponse;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.Credencial;
import portal.ti.queiroz.model.TipoAcaoCredencial;
import portal.ti.queiroz.repository.CredencialRepository;

import java.util.List;

// CRUD do cofre de credenciais; toda operação sensível é auditada via CredencialAcessoLogService.
@Service
public class CredencialService {

    @Autowired
    private CredencialRepository repository;

    @Autowired
    private CredencialAcessoLogService logService;

    public List<CredencialResponse> listarTodas() {
        return repository.findAll().stream().map(CredencialResponse::fromEntity).toList();
    }

    public CredencialResponse salvar(Credencial credencial) {
        // Zera o id recebido no corpo: sem isso, um POST com um id existente no JSON
        // vira UPDATE silencioso daquele registro em vez de criar um novo (o Spring
        // Data decide insert/update pelo id vir nulo ou não).
        credencial.setId(null);
        Credencial salva = repository.save(credencial);
        logService.registrar(salva.getId(), salva.getName(), TipoAcaoCredencial.CRIAR);
        return CredencialResponse.fromEntity(salva);
    }

    public CredencialResponse atualizar(Long id, Credencial credencialAtualizada) {
        Credencial c = repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Credencial não encontrada: " + id));

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
        return CredencialResponse.fromEntity(salva);
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
        // Este endpoint é sempre uma leitura: só aceitamos VISUALIZAR ou COPIAR do chamador,
        // nunca um valor arbitrário (ex.: CRIAR/EDITAR/EXCLUIR) que corromperia a trilha de
        // auditoria do cofre — a única garantia real de que ela reflete o que aconteceu.
        TipoAcaoCredencial acaoRegistrada = acao == TipoAcaoCredencial.COPIAR
                ? TipoAcaoCredencial.COPIAR
                : TipoAcaoCredencial.VISUALIZAR;
        logService.registrar(id, credencial.getName(), acaoRegistrada);
        return credencial.getPassword();
    }
}
