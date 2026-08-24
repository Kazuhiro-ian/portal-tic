package portal.ti.queiroz.model;

// Frequência com que a filial faz inventário. Null em Filiais.periodicidadeInventario é
// tratado como MENSAL em todo lugar que lê o campo (preserva o comportamento das filiais
// já cadastradas sem exigir backfill).
public enum PeriodicidadeInventario {
    MENSAL,
    SEMANAL,
    BIMESTRAL
}
