// Helpers de data para o módulo de Qualidade.
//
// NUNCA usar toISOString() aqui: ele converte para UTC e, em UTC-3, joga a data um dia
// para trás — o que contaminaria a grade do calendário, as chaves dos mapas e os payloads
// enviados ao backend.

/** Date -> "YYYY-MM-DD" no fuso local. */
export function toISO(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/** "YYYY-MM-DD" -> Date local (new Date("2026-08-01") seria interpretado como UTC). */
export function fromISO(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

/** "YYYY-MM-DD" -> "DD/MM/YYYY". */
export function formatarBR(iso) {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Primeiro e último dia do mês, em ISO. */
export function limitesDoMes(ano, mes) {
  return {
    inicio: toISO(new Date(ano, mes - 1, 1)),
    fim: toISO(new Date(ano, mes, 0)),
  };
}

/** Quantos dias tem o mês (mes é 1-12). */
export function diasNoMes(ano, mes) {
  return new Date(ano, mes, 0).getDate();
}

/** Nomes dos dias da semana na ordem em que o backend (java.time.DayOfWeek) os espera. */
export const DIAS_SEMANA = [
  { java: 'MONDAY', curto: 'Seg', longo: 'Segunda-feira', indiceJs: 1 },
  { java: 'TUESDAY', curto: 'Ter', longo: 'Terça-feira', indiceJs: 2 },
  { java: 'WEDNESDAY', curto: 'Qua', longo: 'Quarta-feira', indiceJs: 3 },
  { java: 'THURSDAY', curto: 'Qui', longo: 'Quinta-feira', indiceJs: 4 },
  { java: 'FRIDAY', curto: 'Sex', longo: 'Sexta-feira', indiceJs: 5 },
  { java: 'SATURDAY', curto: 'Sáb', longo: 'Sábado', indiceJs: 6 },
  { java: 'SUNDAY', curto: 'Dom', longo: 'Domingo', indiceJs: 0 },
];

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
