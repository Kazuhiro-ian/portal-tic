package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.EstoqueItem;
import portal.ti.queiroz.model.ZebraEnvio;
import portal.ti.queiroz.repository.EstoqueItemRepository;
import portal.ti.queiroz.repository.ZebraEnvioRepository;

import java.util.List;

@Service
public class ZebraEnvioService {

    @Autowired
    private ZebraEnvioRepository repository;

    @Autowired
    private EstoqueItemRepository itemRepository;

    public List<ZebraEnvio> listarTodos() {
        return repository.findByOrderByDataEnvioDesc();
    }

    /**
     * Registra o envio E dá baixa no estoque de etiquetas/ribbons na MESMA transação.
     * Antes, o frontend fazia isso em vários passos soltos (um PUT por item de estoque
     * atingido, depois um POST separado pro envio): se qualquer chamada falhasse no meio,
     * parte do estoque já tinha sido decrementada sem o envio ficar registrado, e dois
     * despachos simultâneos podiam perder a baixa um do outro (cada PUT calculava a nova
     * quantidade a partir do que tinha acabado de ler, sem travar a linha). Mesma exceção
     * deliberada à convenção do projeto já usada em EstoqueMovimentoService.registrar.
     */
    @Transactional
    public ZebraEnvio salvar(ZebraEnvio envio) {
        if (envio.getFilialId() == null) {
            throw new RegraDeNegocioException("Selecione a filial de destino.");
        }
        int qtdEtiquetas = envio.getQtdEtiquetas() != null ? envio.getQtdEtiquetas() : 0;
        int qtdRibbons = envio.getQtdRibbons() != null ? envio.getQtdRibbons() : 0;
        if (qtdEtiquetas <= 0 && qtdRibbons <= 0) {
            throw new RegraDeNegocioException("Informe ao menos uma quantidade maior que zero.");
        }
        if ("EXTRA".equalsIgnoreCase(envio.getTipoEnvio()) && (envio.getMotivoExtra() == null || envio.getMotivoExtra().trim().isEmpty())) {
            throw new RegraDeNegocioException("O motivo é obrigatório para envios extras.");
        }

        List<EstoqueItem> todosOsItens = itemRepository.findAll();
        baixarEstoque(todosOsItens, "ETIQUETA", "etiqueta", qtdEtiquetas, "etiquetas", "rolos");
        baixarEstoque(todosOsItens, "RIBBON", "ribbon", qtdRibbons, "ribbons", "unidades");

        // Zera o id recebido no corpo: sem isso, um POST com um id existente no JSON
        // vira UPDATE silencioso daquele registro em vez de criar um novo.
        envio.setId(null);
        return repository.save(envio);
    }

    /**
     * Dá baixa espalhando a quantidade necessária pelos itens de estoque da categoria
     * (campo categoriaZebra) ou, na ausência dela, pelo nome do item -- mesma regra de
     * fallback que o frontend usava, preservada aqui pra não exigir recategorizar o
     * estoque já cadastrado.
     */
    private void baixarEstoque(List<EstoqueItem> todosOsItens, String categoria, String palavraChave,
                                int quantidadeNecessaria, String rotuloPlural, String unidade) {
        if (quantidadeNecessaria <= 0) return;

        List<EstoqueItem> itensDoTipo = todosOsItens.stream()
                .filter(i -> categoria.equals(i.getCategoriaZebra())
                        || (i.getCategoriaZebra() == null && i.getName().toLowerCase().contains(palavraChave)))
                .toList();

        int disponivel = itensDoTipo.stream().mapToInt(EstoqueItem::getQuantity).sum();
        if (quantidadeNecessaria > disponivel) {
            throw new RegraDeNegocioException(
                    "Estoque insuficiente de " + rotuloPlural + ". Disponível: " + disponivel + " " + unidade + ".");
        }

        int restante = quantidadeNecessaria;
        for (EstoqueItem item : itensDoTipo) {
            if (restante <= 0) break;
            int deduzir = Math.min(item.getQuantity(), restante);
            item.setQuantity(item.getQuantity() - deduzir);
            restante -= deduzir;
            itemRepository.save(item);
        }
    }

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Envio não encontrado: " + id);
        }
        repository.deleteById(id);
    }
}
