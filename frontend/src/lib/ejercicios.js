/** Slug de ejercicio: minúsculas, sin acentos, con guion bajo. "Curl de bíceps" → "curl_de_biceps" */
export function slugify(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const NOMBRES = [
  'Press banca',
  'Sentadilla',
  'Peso muerto',
  'Remo con barra',
  'Press militar',
  'Dominadas',
  'Curl de bíceps',
  'Extensión de tríceps',
  'Prensa de piernas',
  'Jalón al pecho',
  'Hip thrust',
  'Zancadas',
  'Fondos',
];

export const EJERCICIOS = NOMBRES.map((nombre) => ({ nombre, slug: slugify(nombre) }));

export function nombreEjercicio(slug) {
  const conocido = EJERCICIOS.find((e) => e.slug === slug);
  if (conocido) return conocido.nombre;
  const t = String(slug).replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
