// Vocabulário compartilhado do módulo de Qualidade.
// Fica fora dos componentes para não quebrar o fast refresh do Vite (um arquivo de
// componente que também exporta constantes perde o hot reload).

export const grupoLabels = {
  GRUPO_1: 'Grupo 1',
  GRUPO_2: 'Grupo 2',
};

export const grupoBadge = (grupo) => (grupo === 'GRUPO_1' ? 'badge-info' : 'badge-warning');

export const TIPOS_DIA = {
  GRUPO_1: {
    label: 'Grupo 1',
    badge: 'badge-info',
    celula: 'bg-blue-500/15 border-blue-500/40 text-blue-200',
  },
  GRUPO_2: {
    label: 'Grupo 2',
    badge: 'badge-warning',
    celula: 'bg-amber-500/15 border-amber-500/40 text-amber-200',
  },
  SEM_PEDIDOS: {
    label: 'Sem pedidos',
    badge: 'badge-success',
    celula: 'bg-primary-500/15 border-primary-500/40 text-primary-200',
  },
};

export const MOTIVOS = {
  MANTIDO: { label: 'Mantido', badge: 'badge-success' },
  DESLOCADO: { label: 'Deslocado', badge: 'badge-warning' },
  SEM_HISTORICO: { label: 'Sem histórico', badge: 'badge-info' },
  AJUSTADO_MES_CURTO: { label: 'Ajustado (mês curto)', badge: 'badge-warning' },
  JA_REALIZADO: { label: 'Já realizado', badge: 'badge-success' },
  SEM_DIA_VALIDO: { label: 'Sem dia válido', badge: 'badge-danger' },
  SEM_GRUPO: { label: 'Sem grupo', badge: 'badge-danger' },
};

export const STATUS_INVENTARIO = {
  PLANEJADO: { label: 'Planejado', badge: 'badge-info' },
  REALIZADO: { label: 'Realizado', badge: 'badge-success' },
  CANCELADO: { label: 'Cancelado', badge: 'badge-danger' },
};
