package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.dto.TesteConexaoResponse;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.model.Impressora;
import portal.ti.queiroz.repository.ImpressoraRepository;

import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.UnknownHostException;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ImpressoraService {

    // Portas mais comuns em que uma impressora de rede responde, tentadas nesta ordem
    // quando o ICMP falha (firewalls de impressora costumam bloquear ping por padrão).
    private static final int[] PORTAS_TESTE = {9100, 631, 80};
    private static final int TIMEOUT_ICMP_MS = 1000;
    private static final int TIMEOUT_TCP_MS = 700;

    @Autowired
    private ImpressoraRepository repository;

    public List<Impressora> listarTodas() {
        return repository.findAll();
    }

    public Impressora salvar(Impressora impressora) {
        return repository.save(impressora);
    }

    public Impressora atualizar(Long id, Impressora impressoraAtualizada) {
        Optional<Impressora> impressoraExistente = repository.findById(id);

        if (impressoraExistente.isPresent()) {
            Impressora impressora = impressoraExistente.get();
            impressora.setIp(impressoraAtualizada.getIp());
            impressora.setLocation(impressoraAtualizada.getLocation());
            impressora.setBrand(impressoraAtualizada.getBrand());
            impressora.setModel(impressoraAtualizada.getModel());
            impressora.setSerialNumber(impressoraAtualizada.getSerialNumber());
            impressora.setStatus(impressoraAtualizada.getStatus());
            impressora.setLastMaintenance(impressoraAtualizada.getLastMaintenance());

            return repository.save(impressora);
        }
        throw new RecursoNaoEncontradoException("Impressora não encontrada com o ID: " + id);
    }

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Impressora não encontrada com o ID: " + id);
        }
        repository.deleteById(id);
    }

    /**
     * Testa a conectividade real com o IP cadastrado da impressora e persiste o status
     * encontrado. Tenta ICMP primeiro; como muitas impressoras bloqueiam ping no firewall,
     * cai para uma conexão TCP nas portas mais comuns antes de declarar offline.
     */
    public TesteConexaoResponse testarConexao(Long id) {
        Impressora impressora = repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Impressora não encontrada com o ID: " + id));

        long inicio = System.currentTimeMillis();
        ResultadoTeste resultado = testarIp(impressora.getIp());
        long tempoMs = System.currentTimeMillis() - inicio;

        impressora.setStatus(resultado.online() ? "Online" : "Offline");
        repository.save(impressora);

        return new TesteConexaoResponse(impressora.getId(), impressora.getStatus(), tempoMs, resultado.detalhe());
    }

    private ResultadoTeste testarIp(String ip) {
        InetAddress endereco;
        try {
            endereco = InetAddress.getByName(ip);
        } catch (UnknownHostException e) {
            return new ResultadoTeste(false, "IP inválido ou não resolvível.");
        }

        try {
            if (endereco.isReachable(TIMEOUT_ICMP_MS)) {
                return new ResultadoTeste(true, "Respondeu ao ping (ICMP).");
            }
        } catch (IOException ignorado) {
            // segue para o fallback de portas TCP
        }

        for (int porta : PORTAS_TESTE) {
            if (testarPortaTcp(endereco, porta)) {
                return new ResultadoTeste(true, "Sem resposta ao ping, mas a porta " + porta + " respondeu.");
            }
        }

        String portas = Arrays.stream(PORTAS_TESTE).mapToObj(String::valueOf).collect(Collectors.joining(", "));
        return new ResultadoTeste(false, "Sem resposta no ping nem nas portas " + portas + ".");
    }

    private boolean testarPortaTcp(InetAddress endereco, int porta) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(endereco, porta), TIMEOUT_TCP_MS);
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    private record ResultadoTeste(boolean online, String detalhe) {
    }
}
