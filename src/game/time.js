// El "día de cuidado" empieza a las 05:00 hora local: lo que camines de madrugada cuenta para el día anterior.
export const CARE_CUTOFF_HOUR = 5;

const pad = (n) => String(n).padStart(2, '0');

export function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function careDayKey(now = new Date()) {
  const d = new Date(now);
  if (d.getHours() < CARE_CUTOFF_HOUR) d.setDate(d.getDate() - 1);
  return dateKey(d);
}

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function daysBetween(fromKey, toKey) {
  const ms = parseKey(toKey).getTime() - parseKey(fromKey).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

export function addDays(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function partOfDay(now = new Date()) {
  const h = now.getHours() + now.getMinutes() / 60;
  if (h >= 6 && h < 8.5) return 'dawn';
  if (h >= 8.5 && h < 18.5) return 'day';
  if (h >= 18.5 && h < 21.5) return 'dusk';
  return 'night';
}

export function isBedtime(now = new Date()) {
  const h = now.getHours();
  return h >= 23 || h < 7;
}
