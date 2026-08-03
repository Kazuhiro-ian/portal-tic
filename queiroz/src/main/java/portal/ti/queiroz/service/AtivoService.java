package portal.ti.queiroz.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import portal.ti.queiroz.dto.TesteConexaoResponse;
import portal.ti.queiroz.exception.RecursoNaoEncontradoException;
import portal.ti.queiroz.exception.RegraDeNegocioException;
import portal.ti.queiroz.model.Ativo;
import portal.ti.queiroz.repository.AtivoRepository;

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
public class AtivoService {

    private static final int[] PORTAS_TESTE = {9100, 631, 80};
    private static final int TIMEOUT_ICMP_MS = 1000;
    private static final int TIMEOUT_TCP_MS = 700;

    public static final String MOTIVO_PING_DESABILITADO =
            "O teste de conexão está desabilitado neste ambiente: o servidor da aplicação está " +
            "hospedado fora da rede da empresa e não enxerga os IPs internos dos equipamentos.";

    @Autowired
    private AtivoRepository repository;

    /**
     * Desligado em produção porque o backend roda na nuvem (Railway) e não alcança a rede interna:
     * todo teste falharia e — pior — gravaria "Offline" no cadastro de equipamentos que estão no ar.
     * Fica ligado por padrão para não mudar o comportamento em execução local, dentro da rede.
     */
    @Value("${ativos.ping.enabled:true}")
    private boolean pingHabilitado;

    public boolean isPingHabilitado() {
        return pingHabilitado;
    }

    public List<Ativo> listarTodos() {
        return repository.findAll();
    }

    public Ativo salvar(Ativo ativo) {
        return repository.save(ativo);
    }

    public Ativo atualizar(Long id, Ativo ativoAtualizado) {
        Optional<Ativo> ativoExistente = repository.findById(id);

        if (ativoExistente.isPresent()) {
            Ativo ativo = ativoExistente.get();
            ativo.setTipo(ativoAtualizado.getTipo());
            ativo.setMarca(ativoAtualizado.getMarca());
            ativo.setModelo(ativoAtualizado.getModelo());
            ativo.setStatus(ativoAtualizado.getStatus());
            ativo.setEtiqueta(ativoAtualizado.getEtiqueta());
            ativo.setIp(ativoAtualizado.getIp());
            ativo.setNumeroSerie(ativoAtualizado.getNumeroSerie());
            ativo.setMacAddress(ativoAtualizado.getMacAddress());
            ativo.setImei(ativoAtualizado.getImei());
            ativo.setFilialId(ativoAtualizado.getFilialId());
            ativo.setSetor(ativoAtualizado.getSetor());
            ativo.setResponsavelAtual(ativoAtualizado.getResponsavelAtual());
            ativo.setObservacoes(ativoAtualizado.getObservacoes());
            ativo.setLastMaintenance(ativoAtualizado.getLastMaintenance());
            ativo.setProcessador(ativoAtualizado.getProcessador());
            ativo.setMemoria(ativoAtualizado.getMemoria());
            ativo.setArmazenamento(ativoAtualizado.getArmazenamento());

            return repository.save(ativo);
        }
        throw new RecursoNaoEncontradoException("Ativo não encontrado com o ID: " + id);
    }

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Ativo não encontrado com o ID: " + id);
        }
        repository.deleteById(id);
    }

    public TesteConexaoResponse testarConexao(Long id) {
        if (!pingHabilitado) {
            throw new RegraDeNegocioException(MOTIVO_PING_DESABILITADO);
        }

        Ativo ativo = repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Ativo não encontrado com o ID: " + id));

        if (ativo.getIp() == null || ativo.getIp().isBlank()) {
            throw new RegraDeNegocioException("Cadastre o IP do aparelho antes de testar a conexão.");
        }

        long inicio = System.currentTimeMillis();
        ResultadoTeste resultado = testarIp(ativo.getIp());
        long tempoMs = System.currentTimeMillis() - inicio;

        ativo.setStatus(resultado.online() ? "Online" : "Offline");
        repository.save(ativo);

        return new TesteConexaoResponse(ativo.getId(), ativo.getStatus(), tempoMs, resultado.detalhe());
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