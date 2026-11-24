// Utilidades de fechas. Las fechas de calendario se manejan como 'YYYY-MM-DD'
// y las marcas de tiempo como ISO 8601 en UTC ('2026-11-17T18:30:00Z').

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const pad = (n) => String(n).padStart(2, '0');
const DIA_MS = 86_400_000;

/** Fecha local de hoy como 'YYYY-MM-DD'. */
export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const aUTC = (iso) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);

export function sumarDias(iso, dias) {
  return new Date(aUTC(iso) + dias * DIA_MS).toISOString().slice(0, 10);
}

/** Días de `desde` a `hasta` (positivo si `hasta` es posterior). */
export function diasEntre(desde, hasta) {
  return Math.round((aUTC(hasta) - aUTC(desde)) / DIA_MS);
}

export const mayorFecha = (a, b) => (a > b ? a : b);

/** Marca de tiempo UTC sin milisegundos: 2026-11-17T18:30:00Z */
export const ahoraUTC = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

/** '2026-11-15' → '15/11/2026' */
export function fechaCorta(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** '2026-11-15' → '15 nov' */
export function fechaDiaMes(iso) {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${Number(d)} ${MESES[Number(m) - 1]}`;
}

/** Marca UTC → '17 nov 2026, 12:30' en hora local. */
export function fechaHora(isoUtc) {
  return new Date(isoUtc).toLocaleString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export const dinero = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(n);
