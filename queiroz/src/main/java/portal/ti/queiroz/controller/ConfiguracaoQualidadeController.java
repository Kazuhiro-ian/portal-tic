package portal.ti.queiroz.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import portal.ti.queiroz.model.ConfiguracaoQualidade;
import portal.ti.queiroz.service.AcuracidadeService;

/**
 * Metas do relatório de acuracidade.
 *
 * A leitura precisa ficar aberta aos mesmos papéis do módulo (a tela desenha o
 * semáforo comparando com a meta). A escrita é restrita a ADMIN pelo matcher
 * declarado no SecurityConfig.
 */
@RestController
@RequestMapping("/api/qualidade/configuracao")
public class ConfiguracaoQualidadeController {

    @Autowired
    private AcuracidadeService service;

    @GetMapping
    public ConfiguracaoQualidade buscar() {
        return service.configuracaoAtual();
    }

    @PutMapping
    public ConfiguracaoQualidade salvar(@RequestBody ConfiguracaoQualidade configuracao) {
        return service.salvarConfiguracao(configuracao);
    }
}
