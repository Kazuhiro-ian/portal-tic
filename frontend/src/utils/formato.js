// Formatadores compartilhados de números/moeda usados nas telas de Qualidade/Acuracidade.
// Fica fora dos componentes para não quebrar o fast refresh do Vite (um arquivo de
// componente que também exporta constantes perde o hot reload) — mesmo motivo de utils/qualidade.js.

export const percentual = (valor) =>
  valor == null ? '—' : `${(Number(valor) * 100).toFixed(2).replace('.', ',')}%`;

export const moeda = (valor) =>
  valor == null
    ? '—'
    : Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const inteiro = (valor) => (valor == null ? '—' : Number(valor).toLocaleString('pt-BR'));

// Quantidade em unidades (BigDecimal de até 3 casas no backend, ex: fracionado por caixa/kg).
export const unidade = (valor) =>
  valor == null ? '—' : Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
