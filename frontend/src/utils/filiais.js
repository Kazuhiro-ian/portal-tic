// Helpers de filial compartilhados. Fica fora dos componentes por convenção do projeto
// (mesmo motivo de utils/formato.js e utils/datas.js): não quebra o fast refresh do Vite.

/**
 * Número da filial com fallback defensivo por nome de campo. Só é necessário em telas
 * (como Insumos Zebra) que comparam filiais vindas de fontes diferentes; a maioria do
 * app já recebe `numeroFilial` direto do DTO de Filiais e não precisa disso.
 */
export function getBranchNumber(filial) {
  if (!filial) return null;
  return filial.numeroFilial !== undefined && filial.numeroFilial !== null
    ? filial.numeroFilial
    : (filial.numero_loja ?? filial.branchNumber ?? filial.number ?? filial.numero ?? filial.id);
}

/** Rótulo padronizado "Loja X - Nome" a partir do número da filial. */
export function branchLabel(branches, branchNum) {
  if (branchNum === undefined || branchNum === null || branchNum === '') return '-';
  const filial = branches.find((b) => getBranchNumber(b)?.toString() === branchNum.toString());
  if (!filial) return `Filial ${branchNum}`;

  const num = getBranchNumber(filial);
  return `Loja ${num} - ${filial.name || filial.nome || ''}`;
}
