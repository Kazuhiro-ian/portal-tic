package portal.ti.queiroz.repository;

import portal.ti.queiroz.model.InventarioItem;

import java.util.List;

public interface InventarioItemRepositoryCustom {

    /** Grava os itens em lote via JDBC puro — ver {@link InventarioItemRepositoryImpl} para o porquê. */
    void salvarEmLote(List<InventarioItem> itens);
}
