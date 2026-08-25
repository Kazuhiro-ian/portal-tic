package portal.ti.queiroz.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import portal.ti.queiroz.model.Armazem;
import portal.ti.queiroz.model.InventarioItem;

import java.math.BigDecimal;
import java.util.List;

public interface InventarioItemRepository extends JpaRepository<InventarioItem, Long>, InventarioItemRepositoryCustom {

    /** Todos os itens do inventário, dos dois armazéns quando a filial for dividida. */
    List<InventarioItem> findByInventarioId(Long inventarioId);

    /** armazem null busca os itens de filial não dividida (Spring Data gera "IS NULL"). */
    List<InventarioItem> findByInventarioIdAndArmazem(Long inventarioId, Armazem armazem);

    /** Mesma busca que {@link #findByInventarioIdAndArmazem}, pra vários inventários de uma vez. */
    List<InventarioItem> findByInventarioIdInAndArmazem(List<Long> inventarioIds, Armazem armazem);

    /** Usado na reimportação: o resultado antigo daquele armazém é descartado antes de gravar o novo. */
    void deleteByInventarioIdAndArmazem(Long inventarioId, Armazem armazem);

    /** Maiores faltas: só divergência negativa, da mais negativa pra menos. */
    List<InventarioItem> findByInventarioIdInAndValorDivergenciaLessThanOrderByValorDivergenciaAsc(
            List<Long> inventarioIds, BigDecimal zero, Pageable pageable);

    /** Maiores sobras: só divergência positiva, da maior pra menor. */
    List<InventarioItem> findByInventarioIdInAndValorDivergenciaGreaterThanOrderByValorDivergenciaDesc(
            List<Long> inventarioIds, BigDecimal zero, Pageable pageable);
}
