// Vocabulário compartilhado do módulo de Insumos Zebra.
// Fica fora dos componentes para não quebrar o fast refresh do Vite (mesmo motivo de
// utils/qualidade.js).

export const STATUS_ZEBRA_ENVIO = {
  PREVISTO: { label: 'Previsto', badge: 'badge-info' },
  ENVIADO: { label: 'Enviado', badge: 'badge-success' },
  CANCELADO: { label: 'Cancelado', badge: 'badge-danger' },
};
