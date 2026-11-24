// API simulada: implementa en el navegador los mismos endpoints y contratos que
// API Gateway + Lambda (sección 6 del contexto). Cada petición trabaja sobre una
// copia de la base y solo se guarda si termina sin error (equivale a COMMIT/ROLLBACK).
import { cargar, guardar } from './db.js';
import { slugify, nombreEjercicio } from '../../lib/ejercicios.js';
import { hoyISO, sumarDias, diasEntre, mayorFecha, ahoraUTC } from '../../lib/fechas.js';

const LATENCIA_MS = 300;
const METODOS_PAGO = ['efectivo', 'tarjeta', 'transferencia'];
const SK = 'ejercicio#fecha_hora';

class HttpError extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}
const ok = (body) => ({ status: 200, body });
const creado = (body) => ({ status: 201, body });
const noEncontrado = (que) => { throw new HttpError(404, `${que} no encontrado`); };
const invalido = (msg) => { throw new HttpError(400, msg); };

// ---------- Enrutador ----------
const rutas = [];
function ruta(metodo, patron, fn) {
  const claves = [];
  const re = new RegExp('^' + patron.replace(/:(\w+)/g, (_, k) => { claves.push(k); return '([^/]+)'; }) + '$');
  rutas.push({ metodo, re, claves, fn });
}

export async function handle(metodo, url, body) {
  await new Promise((r) => setTimeout(r, LATENCIA_MS));
  const [path, qs = ''] = url.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs));
  for (const r of rutas) {
    if (r.metodo !== metodo) continue;
    const m = path.match(r.re);
    if (!m) continue;
    const params = Object.fromEntries(r.claves.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    const db = cargar();
    try {
      const res = r.fn({ params, query, body: body ?? {}, db });
      if (metodo !== 'GET') guardar(db); // COMMIT
      return res;
    } catch (e) {
      // ROLLBACK: la copia de trabajo se descarta.
      if (e instanceof HttpError) return { status: e.status, body: { error: e.message } };
      console.error(e);
      return { status: 500, body: { error: 'Error interno del servidor' } };
    }
  }
  return { status: 404, body: { error: 'Ruta no encontrada' } };
}

// ---------- Utilidades de dominio ----------
const sigId = (arr, campo) => arr.reduce((m, x) => Math.max(m, x[campo]), 0) + 1;
const entero = (v, campo) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) invalido(`${campo} inválido`);
  return n;
};
const texto = (v, campo, max = 120) => {
  const t = typeof v === 'string' ? v.trim() : '';
  if (!t) invalido(`El campo ${campo} es obligatorio`);
  if (t.length > max) invalido(`El campo ${campo} excede ${max} caracteres`);
  return t;
};
const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buscarSocio(db, id) {
  return db.socios.find((s) => s.id_socio === id) ?? noEncontrado('Socio');
}
function buscarSucursal(db, id) {
  return db.sucursales.find((s) => s.id_sucursal === id) ?? noEncontrado('Sucursal');
}
function buscarPlan(db, id) {
  return db.planes.find((p) => p.id_plan === id) ?? noEncontrado('Plan');
}
const membresiaDe = (db, id_socio) =>
  db.membresias.filter((m) => m.id_socio === id_socio).sort((a, b) => b.id_membresia - a.id_membresia)[0] ?? null;

function estatusReal(m) {
  if (m.estatus === 'cancelada') return 'cancelada';
  return m.fecha_fin < hoyISO() ? 'vencida' : 'activa';
}

function vistaMembresia(db, m, { pagos = 3 } = {}) {
  const plan = buscarPlan(db, m.id_plan);
  const socio = buscarSocio(db, m.id_socio);
  const sucursal = buscarSucursal(db, socio.id_sucursal);
  return {
    id_membresia: m.id_membresia,
    id_socio: m.id_socio,
    id_plan: plan.id_plan,
    plan: plan.nombre,
    precio: plan.precio,
    duracion_dias: plan.duracion_dias,
    sucursal: sucursal.nombre,
    fecha_inicio: m.fecha_inicio,
    fecha_fin: m.fecha_fin,
    estatus: estatusReal(m),
    dias_restantes: Math.max(0, diasEntre(hoyISO(), m.fecha_fin)),
    ultimos_pagos: db.pagos
      .filter((p) => p.id_membresia === m.id_membresia)
      .sort((a, b) => b.fecha_pago.localeCompare(a.fecha_pago) || b.id_pago - a.id_pago)
      .slice(0, pagos)
      .map(({ id_pago, fecha_pago, monto, metodo_pago }) => ({ id_pago, fecha_pago, monto, metodo_pago })),
  };
}

function vistaSocio(db, s) {
  const m = membresiaDe(db, s.id_socio);
  return {
    ...s,
    sucursal: buscarSucursal(db, s.id_sucursal).nombre,
    membresia: m
      ? { id_membresia: m.id_membresia, id_plan: m.id_plan, plan: buscarPlan(db, m.id_plan).nombre, fecha_fin: m.fecha_fin, estatus: estatusReal(m), dias_restantes: Math.max(0, diasEntre(hoyISO(), m.fecha_fin)) }
      : null,
  };
}

function metodoPago(v) {
  if (!METODOS_PAGO.includes(v)) invalido(`metodo_pago debe ser: ${METODOS_PAGO.join(', ')}`);
  return v;
}

// =====================================================================
// GRUPO A · RDS PostgreSQL (socios, planes, membresías, pagos, accesos)
// =====================================================================
ruta('GET', '/sucursales', ({ db }) => ok(db.sucursales));
ruta('GET', '/planes', ({ db }) => ok(db.planes));

ruta('GET', '/socios', ({ db }) => ok(db.socios.map((s) => vistaSocio(db, s))));

ruta('GET', '/socios/:id', ({ db, params }) => ok(vistaSocio(db, buscarSocio(db, entero(params.id, 'id_socio')))));

ruta('POST', '/socios', ({ db, body }) => {
  const nombre = texto(body.nombre, 'nombre');
  const correo = texto(body.correo, 'correo').toLowerCase();
  if (!CORREO_RE.test(correo)) invalido('El correo no tiene un formato válido');
  if (db.socios.some((s) => s.correo === correo)) throw new HttpError(409, 'Ya existe un socio con ese correo');
  const id_sucursal = buscarSucursal(db, entero(body.id_sucursal, 'id_sucursal')).id_sucursal;
  const plan = buscarPlan(db, entero(body.id_plan, 'id_plan'));
  const metodo_pago = metodoPago(body.metodo_pago);
  const hoy = hoyISO();

  // Transacción: socio + membresía + primer pago.
  const socio = { id_socio: sigId(db.socios, 'id_socio'), nombre, correo, telefono: (body.telefono ?? '').trim(), fecha_registro: hoy, id_sucursal };
  db.socios.push(socio);
  const m = { id_membresia: sigId(db.membresias, 'id_membresia'), id_socio: socio.id_socio, id_plan: plan.id_plan, fecha_inicio: hoy, fecha_fin: sumarDias(hoy, plan.duracion_dias), estatus: 'activa' };
  db.membresias.push(m);
  db.pagos.push({ id_pago: sigId(db.pagos, 'id_pago'), id_membresia: m.id_membresia, monto: plan.precio, metodo_pago, fecha_pago: hoy });
  return creado({ socio: vistaSocio(db, socio), membresia: vistaMembresia(db, m) });
});

ruta('PUT', '/socios/:id', ({ db, params, body }) => {
  const socio = buscarSocio(db, entero(params.id, 'id_socio'));
  if (body.nombre !== undefined) socio.nombre = texto(body.nombre, 'nombre');
  if (body.correo !== undefined) {
    const correo = texto(body.correo, 'correo').toLowerCase();
    if (!CORREO_RE.test(correo)) invalido('El correo no tiene un formato válido');
    if (db.socios.some((s) => s.correo === correo && s.id_socio !== socio.id_socio)) throw new HttpError(409, 'Ya existe un socio con ese correo');
    socio.correo = correo;
  }
  if (body.telefono !== undefined) socio.telefono = String(body.telefono).trim();
  if (body.id_sucursal !== undefined) socio.id_sucursal = buscarSucursal(db, entero(body.id_sucursal, 'id_sucursal')).id_sucursal;
  return ok(vistaSocio(db, socio));
});

ruta('DELETE', '/socios/:id', ({ db, params }) => {
  const socio = buscarSocio(db, entero(params.id, 'id_socio'));
  const ids = db.membresias.filter((m) => m.id_socio === socio.id_socio).map((m) => m.id_membresia);
  const tienePagos = db.pagos.some((p) => ids.includes(p.id_membresia));
  if (tienePagos) {
    // Baja lógica: se conservan pagos e historial.
    db.membresias.forEach((m) => { if (m.id_socio === socio.id_socio) m.estatus = 'cancelada'; });
    return ok({ tipo: 'logica', mensaje: `Baja registrada: la membresía de ${socio.nombre} quedó cancelada` });
  }
  db.membresias = db.membresias.filter((m) => m.id_socio !== socio.id_socio);
  db.accesos = db.accesos.filter((a) => a.id_socio !== socio.id_socio);
  db.socios = db.socios.filter((s) => s.id_socio !== socio.id_socio);
  return ok({ tipo: 'fisica', mensaje: `${socio.nombre} fue eliminado definitivamente` });
});

ruta('GET', '/socios/:id/membresia', ({ db, params }) => {
  const socio = buscarSocio(db, entero(params.id, 'id_socio'));
  const m = membresiaDe(db, socio.id_socio) ?? noEncontrado('Membresía');
  return ok(vistaMembresia(db, m, { pagos: 5 }));
});

ruta('POST', '/membresias/:id/renovar', ({ db, params, body }) => {
  // 1. Buscar la membresía y su plan.
  const id = entero(params.id, 'id_membresia');
  const m = db.membresias.find((x) => x.id_membresia === id) ?? noEncontrado('Membresía');
  const plan = buscarPlan(db, entero(body.id_plan ?? m.id_plan, 'id_plan'));
  const metodo_pago = metodoPago(body.metodo_pago);
  // 2. Nueva fecha_fin = max(hoy, fecha_fin actual) + duración.
  const hoy = hoyISO();
  // (una membresía cancelada reinicia desde hoy)
  const base = m.estatus === 'cancelada' ? hoy : mayorFecha(hoy, m.fecha_fin);
  // 3. UPDATE membresias
  m.fecha_fin = sumarDias(base, plan.duracion_dias);
  m.id_plan = plan.id_plan;
  m.estatus = 'activa';
  // 4. INSERT INTO pagos
  const pago = { id_pago: sigId(db.pagos, 'id_pago'), id_membresia: m.id_membresia, monto: plan.precio, metodo_pago, fecha_pago: hoy };
  db.pagos.push(pago);
  // 5. COMMIT (al salir sin error)
  return creado({ membresia: vistaMembresia(db, m, { pagos: 5 }), pago });
});

ruta('POST', '/accesos', ({ db, body }) => {
  const socio = buscarSocio(db, entero(body.id_socio, 'id_socio'));
  const sucursal = buscarSucursal(db, entero(body.id_sucursal, 'id_sucursal'));
  const m = membresiaDe(db, socio.id_socio);
  if (!m || estatusReal(m) !== 'activa') {
    throw new HttpError(403, `Acceso denegado: la membresía de ${socio.nombre} no está activa`);
  }
  const acceso = { id_acceso: sigId(db.accesos, 'id_acceso'), id_socio: socio.id_socio, id_sucursal: sucursal.id_sucursal, fecha_hora: ahoraUTC() };
  db.accesos.push(acceso);
  return creado({ ...acceso, socio: socio.nombre, sucursal: sucursal.nombre });
});

ruta('GET', '/accesos', ({ db, query }) => {
  const limite = Math.min(Number(query.limite) || 20, 100);
  const lista = db.accesos
    .filter((a) => !query.id_sucursal || a.id_sucursal === Number(query.id_sucursal))
    .sort((a, b) => b.fecha_hora.localeCompare(a.fecha_hora))
    .slice(0, limite)
    .map((a) => ({
      ...a,
      socio: db.socios.find((s) => s.id_socio === a.id_socio)?.nombre ?? 'Socio eliminado',
      sucursal: db.sucursales.find((s) => s.id_sucursal === a.id_sucursal)?.nombre ?? '—',
    }));
  return ok(lista);
});

// =====================================================================
// GRUPO B · DynamoDB (Rutinas, Entrenamientos). Solo Query/Get/Put/Update/Delete.
// =====================================================================
ruta('GET', '/entrenadores', ({ db }) => ok(db.entrenadores));

function validarDias(dias) {
  if (!Array.isArray(dias) || dias.length === 0) invalido('La rutina debe tener al menos un día');
  return dias.map((d, i) => {
    const dia = texto(d.dia, `dia ${i + 1}`, 20);
    if (!Array.isArray(d.ejercicios) || d.ejercicios.length === 0) invalido(`${dia}: agrega al menos un ejercicio`);
    const ejercicios = d.ejercicios.map((e) => {
      const item = { ...e, ejercicio: texto(e.ejercicio, 'ejercicio', 60) };
      if (e.duracion_min != null && e.series == null) {
        item.duracion_min = entero(e.duracion_min, `${item.ejercicio}: duración`);
      } else {
        item.series = entero(e.series, `${item.ejercicio}: series`);
        item.repeticiones = entero(e.repeticiones, `${item.ejercicio}: repeticiones`);
      }
      return item;
    });
    return { dia, ejercicios };
  });
}

const vistaRutina = (db, r) => ({ ...r, entrenador: db.entrenadores.find((e) => e.id_entrenador === r.id_entrenador)?.nombre ?? r.id_entrenador });

// Query: id_socio = :s
ruta('GET', '/socios/:id/rutina', ({ db, params }) => {
  const lista = db.rutinas
    .filter((r) => r.id_socio === params.id)
    .sort((a, b) => b.fecha_creacion.localeCompare(a.fecha_creacion))
    .map((r) => vistaRutina(db, r));
  return ok({ id_socio: params.id, rutinas: lista });
});

ruta('POST', '/rutinas', ({ db, body }) => {
  const id_socio = String(entero(body.id_socio, 'id_socio'));
  const existentes = db.rutinas.filter((r) => r.id_socio === id_socio).map((r) => Number(r.id_rutina.slice(2)) || 0);
  const rutina = {
    id_socio,
    id_rutina: `r-${String(Math.max(0, ...existentes) + 1).padStart(3, '0')}`,
    nombre: texto(body.nombre, 'nombre', 80),
    id_entrenador: texto(body.id_entrenador, 'id_entrenador', 20),
    fecha_creacion: hoyISO(),
    dias: validarDias(body.dias),
  };
  db.rutinas.push(rutina);
  return creado(vistaRutina(db, rutina));
});

const buscarRutina = (db, s, r) => db.rutinas.find((x) => x.id_socio === s && x.id_rutina === r) ?? noEncontrado('Rutina');

ruta('PUT', '/rutinas/:socio/:rutina', ({ db, params, body }) => {
  const r = buscarRutina(db, params.socio, params.rutina);
  if (body.nombre !== undefined) r.nombre = texto(body.nombre, 'nombre', 80);
  if (body.id_entrenador !== undefined) r.id_entrenador = texto(body.id_entrenador, 'id_entrenador', 20);
  if (body.dias !== undefined) r.dias = validarDias(body.dias);
  return ok(vistaRutina(db, r));
});

ruta('DELETE', '/rutinas/:socio/:rutina', ({ db, params }) => {
  buscarRutina(db, params.socio, params.rutina);
  db.rutinas = db.rutinas.filter((x) => !(x.id_socio === params.socio && x.id_rutina === params.rutina));
  return ok({ mensaje: 'Rutina eliminada' });
});

function validarSeries(series) {
  if (!Array.isArray(series) || series.length === 0) invalido('Agrega al menos una serie');
  if (series.length > 20) invalido('Máximo 20 series por entrenamiento');
  return series.map((s, i) => {
    const repeticiones = Number(s.repeticiones);
    const peso_kg = Number(s.peso_kg);
    if (!Number.isInteger(repeticiones) || repeticiones < 1 || repeticiones > 100) invalido(`Serie ${i + 1}: repeticiones debe ser un entero entre 1 y 100`);
    if (!Number.isFinite(peso_kg) || peso_kg < 0 || peso_kg > 500) invalido(`Serie ${i + 1}: el peso debe estar entre 0 y 500 kg`);
    return { repeticiones, peso_kg };
  });
}

function vistaEntrenamiento(it) {
  const [ejercicio, fecha_hora] = it[SK].split('#');
  return {
    id_entrenamiento: it.id_entrenamiento,
    id_socio: it.id_socio,
    ejercicio,
    nombre_ejercicio: nombreEjercicio(ejercicio),
    fecha_hora,
    [SK]: it[SK],
    series: it.series,
    notas: it.notas ?? '',
    peso_maximo_kg: Math.max(...it.series.map((s) => s.peso_kg)),
  };
}

ruta('POST', '/entrenamientos', ({ db, body }) => {
  const id_socio = String(entero(body.id_socio, 'id_socio'));
  const ejercicio = slugify(texto(body.ejercicio, 'ejercicio', 60));
  if (!ejercicio) invalido('Ejercicio inválido');
  const series = validarSeries(body.series);
  let fecha_hora = ahoraUTC();
  // Evita colisión de SK si se registran dos en el mismo segundo.
  while (db.entrenamientos.some((e) => e.id_socio === id_socio && e[SK] === `${ejercicio}#${fecha_hora}`)) {
    fecha_hora = new Date(Date.parse(fecha_hora) + 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
  }
  const item = {
    id_socio,
    [SK]: `${ejercicio}#${fecha_hora}`,
    id_entrenamiento: crypto.randomUUID().slice(0, 8),
    series,
    notas: String(body.notas ?? '').trim().slice(0, 300),
  };
  db.entrenamientos.push(item); // PutItem
  return creado(vistaEntrenamiento(item));
});

const buscarEntrenamiento = (db, s, e, f) =>
  db.entrenamientos.find((x) => x.id_socio === s && x[SK] === `${e}#${f}`) ?? noEncontrado('Entrenamiento');

ruta('PUT', '/entrenamientos/:socio/:ejercicio/:fecha', ({ db, params, body }) => {
  const it = buscarEntrenamiento(db, params.socio, params.ejercicio, params.fecha);
  if (body.series !== undefined) it.series = validarSeries(body.series);
  if (body.notas !== undefined) it.notas = String(body.notas).trim().slice(0, 300);
  return ok(vistaEntrenamiento(it)); // UpdateItem
});

ruta('DELETE', '/entrenamientos/:socio/:ejercicio/:fecha', ({ db, params }) => {
  buscarEntrenamiento(db, params.socio, params.ejercicio, params.fecha);
  db.entrenamientos = db.entrenamientos.filter((x) => !(x.id_socio === params.socio && x[SK] === `${params.ejercicio}#${params.fecha}`));
  return ok({ mensaje: 'Entrenamiento eliminado' }); // DeleteItem
});

// Query: id_socio = :s (últimos registros del socio)
ruta('GET', '/socios/:id/entrenamientos', ({ db, query, params }) => {
  const limite = Math.min(Number(query.limite) || 10, 50);
  const lista = db.entrenamientos
    .filter((e) => e.id_socio === params.id)
    .map(vistaEntrenamiento)
    .sort((a, b) => b.fecha_hora.localeCompare(a.fecha_hora))
    .slice(0, limite);
  return ok(lista);
});

// Query: id_socio = :s AND begins_with(SK, "<ejercicio>#")
ruta('GET', '/socios/:id/ejercicios/:ejercicio/evolucion', ({ db, params }) => {
  const slug = slugify(params.ejercicio);
  const items = db.entrenamientos
    .filter((e) => e.id_socio === params.id && e[SK].startsWith(`${slug}#`))
    .sort((a, b) => a[SK].localeCompare(b[SK]));

  const porDia = new Map();
  let mejor = null;
  for (const it of items) {
    const fecha = it[SK].split('#')[1].slice(0, 10);
    const max = Math.max(...it.series.map((s) => s.peso_kg));
    porDia.set(fecha, Math.max(porDia.get(fecha) ?? 0, max));
    for (const s of it.series) {
      if (!mejor || s.peso_kg > mejor.peso_kg || (s.peso_kg === mejor.peso_kg && s.repeticiones > mejor.repeticiones)) {
        mejor = { peso_kg: s.peso_kg, repeticiones: s.repeticiones };
      }
    }
  }
  const puntos = [...porDia].map(([fecha, peso_maximo_kg]) => ({ fecha, peso_maximo_kg }));
  return ok({
    ejercicio: nombreEjercicio(slug),
    slug,
    puntos,
    mejor_marca: mejor,
    progreso_kg: puntos.length ? +(puntos.at(-1).peso_maximo_kg - puntos[0].peso_maximo_kg).toFixed(2) : 0,
    sesiones: items.map(vistaEntrenamiento).reverse(),
  });
});
