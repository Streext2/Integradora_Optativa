// Almacenamiento de la API simulada: localStorage del navegador (o memoria si no está disponible).
import { crearSeed } from './seed.js';

const CLAVE = 'gymtrack_demo_v1';
let memoria = null;

const clonar = (x) => JSON.parse(JSON.stringify(x));

/** Devuelve una copia de trabajo de la base: los cambios solo persisten al llamar guardar(). */
export function cargar() {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (raw) return JSON.parse(raw);
  } catch { /* sin localStorage: se usa memoria */ }
  if (!memoria) guardar(crearSeed());
  return clonar(memoria);
}

export function guardar(db) {
  memoria = clonar(db);
  try {
    localStorage.setItem(CLAVE, JSON.stringify(db));
  } catch { /* se queda en memoria */ }
}

export function reiniciar() {
  memoria = null;
  try {
    localStorage.removeItem(CLAVE);
  } catch { /* nada */ }
}
