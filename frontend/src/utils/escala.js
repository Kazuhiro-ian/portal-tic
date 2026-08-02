/**
 * Regras compartilhadas da escala de turnos.
 *
 * Fica fora do componente porque o Dashboard e a tela de Escala precisam responder
 * "esse colaborador está trabalhando hoje?" exatamente da mesma forma — antes o Dashboard
 * tinha uma regra própria (baseada num campo workingDays que nem existe mais no backend)
 * e por isso o card de plantão vivia zerado.
 */

export const TURNOS_OPCOES = [
  { label: '07:00 - 16:48 (Abertura)', value: '07:00 - 16:48' },
  { label: '08:00 - 17:48 (Comercial)', value: '08:00 - 17:48' },
  { label: '11:30 - 21:18 (Fechamento)', value: '11:30 - 21:18' },
  { label: 'Plantão Fim de Semana', value: 'Plantão' },
  { label: 'Folga / Descanso', value: 'Folga' },
  { label: 'Férias', value: 'Ferias' },
];

/** Turnos que representam ausência: contam como "de folga", não como escalado. */
export const TURNOS_AUSENCIA = ['Folga', 'Ferias', '-'];

/** Turno em branco/ausente também significa que o colaborador não está escalado. */
export function estaTrabalhando(turno) {
  return !!turno && !TURNOS_AUSENCIA.includes(turno);
}

/** Monta o mapa "colaboradorId_data" -> turno a partir da lista devolvida por /api/escalas. */
export function indexarEscalasPorColaboradorEData(escalas) {
  const mapa = {};
  escalas.forEach((e) => {
    mapa[`${e.colaboradorId}_${e.data}`] = e.turno;
  });
  return mapa;
}
