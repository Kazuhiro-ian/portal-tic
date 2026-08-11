package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Parâmetros do relatório de acuracidade — o equivalente à aba "params" da planilha.
 *
 * A tabela guarda uma única linha (id = 1), criada com os valores padrão no primeiro
 * acesso. É editável por ADMIN para que mudar a meta não exija alterar código e
 * republicar a aplicação.
 */
@Data
@Entity
@Table(name = "configuracao_qualidade")
public class ConfiguracaoQualidade {

    /** Linha única. */
    public static final Long ID_UNICO = 1L;

    @Id
    private Long id;

    /** Meta de acuracidade de produtos (0.75 = 75%). */
    @Column(name = "meta_acuracidade", precision = 9, scale = 6, nullable = false)
    private BigDecimal metaAcuracidade;

    /** Meta de ajuste em R$ (0.02 = 2%). Quanto menor, melhor. */
    @Column(name = "meta_inacuracia", precision = 9, scale = 6, nullable = false)
    private BigDecimal metaInacuracia;

    /**
     * Acima deste número de produtos no inventário, os itens zerados deixam de
     * contar como acurados. Espelha o "Não considera zerados a partir de X
     * produtos" da planilha, que usava 3000.
     */
    @Column(name = "limite_zerados", nullable = false)
    private Integer limiteZerados;

    public static ConfiguracaoQualidade padrao() {
        ConfiguracaoQualidade c = new ConfiguracaoQualidade();
        c.setId(ID_UNICO);
        c.setMetaAcuracidade(new BigDecimal("0.75"));
        c.setMetaInacuracia(new BigDecimal("0.02"));
        c.setLimiteZerados(3000);
        return c;
    }
}
