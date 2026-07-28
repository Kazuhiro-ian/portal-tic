package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.model.CredencialAcessoLog;
import portal.ti.queiroz.model.TipoAcaoCredencial;
import portal.ti.queiroz.repository.CredencialAcessoLogRepository;

import java.util.List;

@Service
public class CredencialAcessoLogService {

    @Autowired
    private CredencialAcessoLogRepository repository;

    public void registrar(Long credencialId, String credencialNome, TipoAcaoCredencial acao) {
        CredencialAcessoLog log = new CredencialAcessoLog();
        log.setCredencialId(credencialId);
        log.setCredencialNome(credencialNome);
        log.setUsuario(SecurityContextHolder.getContext().getAuthentication().getName());
        log.setAcao(acao);
        repository.save(log);
    }

    public List<CredencialAcessoLog> listarTodos() {
        return repository.findAll().stream()
                .sorted((a, b) -> b.getDataHora().compareTo(a.getDataHora()))
                .toList();
    }
}
