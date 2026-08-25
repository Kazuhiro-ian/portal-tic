package portal.ti.queiroz.repository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import portal.ti.queiroz.model.InventarioItem;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Types;
import java.util.List;

/**
 * Implementação de {@link InventarioItemRepositoryCustom}, automaticamente combinada pelo Spring
 * Data com {@link InventarioItemRepository} por seguir a convenção de nome "Impl".
 *
 * Grava os itens do relatório do Protheus via JDBC puro em vez de {@code itemRepository.saveAll()}.
 * Um relatório de CD chega a ~10 mil linhas, e salvar item por item pelo Hibernate (uma
 * INSERT ... RETURNING id por linha, síncrona) é o gargalo do import inteiro — o id gerado de
 * cada {@link InventarioItem} não é reaproveitado em nenhum lugar depois de salvo
 * ({@link portal.ti.queiroz.service.AcuracidadeService#importar}), então dá pra pular o
 * mapeamento do JPA aqui com segurança e mandar tudo em lotes de {@value #TAMANHO_LOTE}.
 *
 * ATENÇÃO: se um campo novo for adicionado a {@link InventarioItem}, ele também precisa entrar
 * na lista de colunas abaixo — este insert não passa pelo mapeamento automático do Hibernate.
 */
@Repository
public class InventarioItemRepositoryImpl implements InventarioItemRepositoryCustom {

    private static final int TAMANHO_LOTE = 500;

    private static final String SQL_INSERT = """
            INSERT INTO inventario_itens (
                inventario_id, armazem, cod_produto, descricao, valor_unitario, unidade,
                local_armazenamento, familia, fabricante, quantidade_sistema, contagem1,
                contagem2, contagem3, divergencia, valor_divergencia, cod_barras, observacao,
                valor_inicial, quantidade_final, valor_final, zerado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void salvarEmLote(List<InventarioItem> itens) {
        if (itens.isEmpty()) return;

        jdbcTemplate.batchUpdate(SQL_INSERT, itens, TAMANHO_LOTE, (PreparedStatement ps, InventarioItem item) -> {
            ps.setLong(1, item.getInventarioId());
            ps.setString(2, item.getArmazem() != null ? item.getArmazem().name() : null);
            ps.setString(3, item.getCodProduto());
            ps.setString(4, item.getDescricao());
            setBigDecimal(ps, 5, item.getValorUnitario());
            ps.setString(6, item.getUnidade());
            ps.setString(7, item.getLocalArmazenamento());
            ps.setString(8, item.getFamilia());
            ps.setString(9, item.getFabricante());
            setBigDecimal(ps, 10, item.getQuantidadeSistema());
            setBigDecimal(ps, 11, item.getContagem1());
            setBigDecimal(ps, 12, item.getContagem2());
            setBigDecimal(ps, 13, item.getContagem3());
            setBigDecimal(ps, 14, item.getDivergencia());
            setBigDecimal(ps, 15, item.getValorDivergencia());
            ps.setString(16, item.getCodBarras());
            ps.setString(17, item.getObservacao());
            setBigDecimal(ps, 18, item.getValorInicial());
            setBigDecimal(ps, 19, item.getQuantidadeFinal());
            setBigDecimal(ps, 20, item.getValorFinal());
            ps.setBoolean(21, Boolean.TRUE.equals(item.getZerado()));
        });
    }

    private void setBigDecimal(PreparedStatement ps, int index, BigDecimal valor) throws SQLException {
        if (valor == null) {
            ps.setNull(index, Types.NUMERIC);
        } else {
            ps.setBigDecimal(index, valor);
        }
    }
}
