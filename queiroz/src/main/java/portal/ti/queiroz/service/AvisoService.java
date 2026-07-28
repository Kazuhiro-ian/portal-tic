package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.Aviso;
import portal.ti.queiroz.model.Usuario;
import portal.ti.queiroz.repository.AvisoRepository;
import portal.ti.queiroz.repository.UsuarioRepository;

import java.util.List;

@Service
public class AvisoService {

    @Autowired
    private AvisoRepository repository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    public List<Aviso> listarTodos() {
        return repository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .toList();
    }

    public Aviso salvar(Aviso aviso, String username) {
        Usuario usuario = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário autenticado não encontrado: " + username));
        aviso.setAutor(usuario.getNomeCompleto());
        return repository.save(aviso);
    }

    public Aviso atualizar(Long id, Aviso avisoAtualizado) {
        Aviso existente = repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Aviso não encontrado: " + id));
        existente.setMensagem(avisoAtualizado.getMensagem());
        existente.setPrioridade(avisoAtualizado.getPrioridade());
        // autor não é reeditável -- continua sendo quem criou o aviso originalmente
        return repository.save(existente);
    }

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Aviso não encontrado: " + id);
        }
        repository.deleteById(id);
    }
}
