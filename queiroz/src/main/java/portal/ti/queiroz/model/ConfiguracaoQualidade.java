package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Entity
@Table(name = "configuracao_qualidade")
// Parâmetros do relatório de acuracidade. Tabela com uma única linha (id fixo),
// editável por ADMIN para ajustar metas sem alterar código.
public class ConfiguracaoQualidade {

    public static final Long ID_UNICO = 1L;

    @Id
    private Long id;

    // Meta de acuracidade de produtos (0.75 = 75%).
    @Column(name = "meta_acuracidade", precision = 9, scale = 6, nullable = false)
    private BigDecimal metaAcuracidade;

    // Meta de ajuste em R$ (0.02 = 2%); quanto menor, melhor.
    @Column(name = "meta_inacuracia", precision = 9, scale = 6, nullable = false)
    private BigDecimal metaInacuracia;

    // Acima deste total de produtos no inventário, itens zerados deixam de contar como acurados.
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
