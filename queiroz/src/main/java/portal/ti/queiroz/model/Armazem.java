package portal.ti.queiroz.model;

/**
 * Armazém de estoque de uma filial com estoque dividido (algumas lojas estão migrando
 * para esse modelo no Protheus: 01 = o que está na loja, 03 = o que está no estoque).
 */
public enum Armazem {
    ARMAZEM_01,
    ARMAZEM_03;

    public String rotulo() {
        return this == ARMAZEM_01 ? "Loja" : "Estoque";
    }
}
