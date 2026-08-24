// Vocabulário compartilhado do módulo de Qualidade.
// Fica fora dos componentes para não quebrar o fast refresh do Vite (um arquivo de
// componente que também exporta constantes perde o hot reload).

export const grupoLabels = {
  GRUPO_1: 'Grupo 1',
  GRUPO_2: 'Grupo 2',
  CD: 'CD',
  BV: 'BV',
};

const GRUPO_BADGES = {
  GRUPO_1: 'badge-info',
  GRUPO_2: 'badge-warning',
  CD: 'badge-success',
  BV: 'badge-danger',
}

export const grupoBadge = (grupo) => GRUPO_BADGES[grupo] || 'badge-info';

// periodicidadeInventario null (filial ainda não configurada) é tratado como MENSAL,
// mesmo critério do backend (PlanoInventarioService.periodicidadeDe).
export const periodicidadeLabels = {
  MENSAL: 'Mensal',
  SEMANAL: 'Semanal',
  BIMESTRAL: 'Bimestral',
};

const PERIODICIDADE_BADGES = {
  MENSAL: 'badge-info',
  SEMANAL: 'badge-warning',
  BIMESTRAL: 'badge-success',
};

export const periodicidadeBadge = (periodicidade) => PERIODICIDADE_BADGES[periodicidade || 'MENSAL'];

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
  PERIODICIDADE_SEMANAL: { label: 'Semanal', badge: 'badge-info' },
};

export const STATUS_INVENTARIO = {
  PLANEJADO: { label: 'Planejado', badge: 'badge-info' },
  REALIZADO: { label: 'Realizado', badge: 'badge-success' },
  CANCELADO: { label: 'Cancelado', badge: 'badge-danger' },
};

export const TIPOS_DIA_EQUIPE = {
  DSR: {
    label: 'DSR',
    badge: 'badge-info',
    celula: 'bg-blue-500/15 border-blue-500/40 text-blue-200',
  },
  FOLGA: {
    label: 'Folga',
    badge: 'badge-success',
    celula: 'bg-primary-500/15 border-primary-500/40 text-primary-200',
  },
  REUNIAO: {
    label: 'Reunião',
    badge: 'badge-warning',
    celula: 'bg-amber-500/15 border-amber-500/40 text-amber-200',
  },
  FERIADO: {
    label: 'Feriado',
    badge: 'badge-danger',
    celula: 'bg-red-500/15 border-red-500/40 text-red-200',
  },
};
