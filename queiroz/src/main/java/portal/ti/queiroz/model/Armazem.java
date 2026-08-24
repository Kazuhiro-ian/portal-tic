package portal.ti.queiroz.model;

// Armazém de estoque de filiais que operam com estoque dividido: 01 = loja, 03 = estoque.
public enum Armazem {
    ARMAZEM_01,
    ARMAZEM_03;

    public String rotulo() {
        return this == ARMAZEM_01 ? "Loja" : "Estoque";
    }
}
