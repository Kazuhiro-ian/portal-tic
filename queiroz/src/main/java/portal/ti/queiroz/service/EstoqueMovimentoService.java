package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.model.EstoqueMovimento;
import portal.ti.queiroz.repository.EstoqueMovimentoRepository;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class EstoqueMovimentoService {

    @Autowired
    private EstoqueMovimentoRepository repository;

    public List<EstoqueMovimento> listarTodos() {
        // Retorna todos ordenados do mais recente para o mais antigo (opcional, mas recomendado)
        return repository.findAll().stream()
                .sorted((m1, m2) -> m2.getDate().compareTo(m1.getDate()))
                .toList();
    }

    public EstoqueMovimento salvar(EstoqueMovimento movimento) {
        // Garante que a data seja preenchida pelo servidor caso venha vazia
        if (movimento.getDate() == null) {
            movimento.setDate(LocalDateTime.now());
        }
        return repository.save(movimento);
    }
}