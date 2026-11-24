// Datos semilla de la API simulada. Reflejan lo que tendrán RDS (Grupo A) y DynamoDB (Grupo B).
// Fechas coherentes con noviembre de 2026.

const s = (repeticiones, peso_kg) => ({ repeticiones, peso_kg });
let n = 0;
const idHex = () => ((++n * 2654435761) >>> 0).toString(16).padStart(8, '0');

/** Item de la tabla Entrenamientos (PK id_socio, SK "ejercicio#fecha_hora"). */
function ent(id_socio, ejercicio, fecha, series, notas = '', hora = '18:30:00') {
  return {
    id_socio: String(id_socio),
    'ejercicio#fecha_hora': `${ejercicio}#${fecha}T${hora}Z`,
    id_entrenamiento: idHex(),
    series: series.map(([r, p]) => s(r, p)),
    notas,
  };
}

function pagosMensuales(id_membresia, fechas, monto, metodos) {
  return fechas.map((fecha_pago, i) => ({ id_membresia, monto, metodo_pago: metodos[i % metodos.length], fecha_pago }));
}

export function crearSeed() {
  n = 0;
  const sucursales = [
    { id_sucursal: 1, nombre: 'Centro', direccion: 'Av. Morelos 120, Col. Centro, Cuernavaca' },
    { id_sucursal: 2, nombre: 'Norte', direccion: 'Blvd. Emiliano Zapata 455, Col. Buenavista, Cuernavaca' },
  ];

  const planes = [
    { id_plan: 1, nombre: 'Mensual', precio: 600, duracion_dias: 30 },
    { id_plan: 2, nombre: 'Trimestral', precio: 1600, duracion_dias: 90 },
    { id_plan: 3, nombre: 'Anual', precio: 5800, duracion_dias: 365 },
  ];

  const socios = [
    { id_socio: 1, nombre: 'Mariana López Ruiz', correo: 'mariana.lopez@correo.mx', telefono: '777 123 4567', fecha_registro: '2026-06-15', id_sucursal: 1 },
    { id_socio: 2, nombre: 'Carlos Hernández Vega', correo: 'carlos.hdz@correo.mx', telefono: '777 234 5678', fecha_registro: '2026-03-02', id_sucursal: 2 },
    { id_socio: 3, nombre: 'Daniela Ortiz Salgado', correo: 'dani.ortiz@correo.mx', telefono: '777 345 6789', fecha_registro: '2026-09-05', id_sucursal: 1 },
    { id_socio: 4, nombre: 'Luis Fernando Ríos', correo: 'luisf.rios@correo.mx', telefono: '777 456 7890', fecha_registro: '2026-08-01', id_sucursal: 2 },
    { id_socio: 5, nombre: 'Sofía Martínez Cruz', correo: 'sofia.mtz@correo.mx', telefono: '777 567 8901', fecha_registro: '2026-01-10', id_sucursal: 1 },
  ];

  // Una membresía por socio (índice único de "activa" por socio).
  const membresias = [
    { id_membresia: 1, id_socio: 1, id_plan: 1, fecha_inicio: '2026-06-15', fecha_fin: '2026-12-15', estatus: 'activa' },
    { id_membresia: 2, id_socio: 2, id_plan: 2, fecha_inicio: '2026-03-02', fecha_fin: '2026-11-22', estatus: 'activa' },
    { id_membresia: 3, id_socio: 3, id_plan: 1, fecha_inicio: '2026-09-05', fecha_fin: '2026-11-04', estatus: 'vencida' },
    { id_membresia: 4, id_socio: 4, id_plan: 1, fecha_inicio: '2026-08-01', fecha_fin: '2026-12-01', estatus: 'activa' },
    { id_membresia: 5, id_socio: 5, id_plan: 3, fecha_inicio: '2026-01-10', fecha_fin: '2027-01-10', estatus: 'activa' },
  ];

  const pagos = [
    ...pagosMensuales(1, ['2026-06-15', '2026-07-15', '2026-08-15', '2026-09-15', '2026-10-15', '2026-11-15'], 600, ['efectivo', 'efectivo', 'efectivo', 'tarjeta', 'tarjeta', 'tarjeta']),
    ...pagosMensuales(2, ['2026-03-02', '2026-05-31', '2026-08-24'], 1600, ['transferencia']),
    ...pagosMensuales(3, ['2026-09-05', '2026-10-05'], 600, ['efectivo']),
    ...pagosMensuales(4, ['2026-08-01', '2026-09-01', '2026-10-01', '2026-11-01'], 600, ['tarjeta', 'efectivo']),
    ...pagosMensuales(5, ['2026-01-10'], 5800, ['transferencia']),
  ]
    .sort((a, b) => a.fecha_pago.localeCompare(b.fecha_pago))
    .map((p, i) => ({ id_pago: i + 1, ...p }));

  const accesos = [
    [1, 1, '2026-11-10T13:05:00Z'], [2, 2, '2026-11-10T14:20:00Z'], [4, 2, '2026-11-11T00:45:00Z'],
    [1, 1, '2026-11-12T13:10:00Z'], [5, 1, '2026-11-12T15:30:00Z'], [2, 2, '2026-11-13T14:00:00Z'],
    [1, 2, '2026-11-14T16:40:00Z'], [4, 2, '2026-11-15T01:10:00Z'], [1, 1, '2026-11-15T23:55:00Z'],
    [5, 1, '2026-11-16T14:15:00Z'], [2, 2, '2026-11-16T14:25:00Z'], [1, 1, '2026-11-17T13:00:00Z'],
  ].map(([id_socio, id_sucursal, fecha_hora], i) => ({ id_acceso: i + 1, id_socio, id_sucursal, fecha_hora }));

  // ---------- DynamoDB ----------
  const entrenadores = [
    { id_entrenador: 'e-01', nombre: 'Ricardo Salas' },
    { id_entrenador: 'e-02', nombre: 'Valeria Núñez' },
  ];

  const rutinas = [
    {
      id_socio: '1', id_rutina: 'r-001', nombre: 'Fuerza tren superior', id_entrenador: 'e-02', fecha_creacion: '2026-11-01',
      dias: [
        { dia: 'Lunes', ejercicios: [
          { ejercicio: 'Press banca', series: 3, repeticiones: 10 },
          { ejercicio: 'Remo con barra', series: 3, repeticiones: 10 },
          { ejercicio: 'Press militar', series: 3, repeticiones: 10 },
        ] },
        { dia: 'Miércoles', ejercicios: [
          { ejercicio: 'Sentadilla', series: 4, repeticiones: 8 },
          { ejercicio: 'Peso muerto', series: 3, repeticiones: 6 },
        ] },
        { dia: 'Viernes', ejercicios: [
          { ejercicio: 'Press banca', series: 4, repeticiones: 6 },
          { ejercicio: 'Dominadas', series: 3, repeticiones: 8 },
          { ejercicio: 'Curl de bíceps', series: 3, repeticiones: 12 },
        ] },
      ],
    },
    {
      id_socio: '2', id_rutina: 'r-001', nombre: 'Pierna y glúteo', id_entrenador: 'e-01', fecha_creacion: '2026-10-20',
      dias: [
        { dia: 'Martes', ejercicios: [
          { ejercicio: 'Sentadilla', series: 5, repeticiones: 5 },
          { ejercicio: 'Hip thrust', series: 4, repeticiones: 10 },
          { ejercicio: 'Zancadas', series: 3, repeticiones: 12 },
        ] },
        { dia: 'Jueves', ejercicios: [
          { ejercicio: 'Prensa de piernas', series: 4, repeticiones: 12 },
          { ejercicio: 'Peso muerto', series: 3, repeticiones: 8 },
        ] },
      ],
    },
    {
      // Estructura distinta: incluye ejercicios por tiempo (duracion_min) en lugar de series.
      id_socio: '4', id_rutina: 'r-001', nombre: 'Acondicionamiento general', id_entrenador: 'e-01', fecha_creacion: '2026-08-05',
      dias: [
        { dia: 'Lunes', ejercicios: [
          { ejercicio: 'Caminadora', duracion_min: 20 },
          { ejercicio: 'Press banca', series: 3, repeticiones: 12 },
          { ejercicio: 'Jalón al pecho', series: 3, repeticiones: 12 },
        ] },
        { dia: 'Jueves', ejercicios: [
          { ejercicio: 'Bicicleta fija', duracion_min: 25 },
          { ejercicio: 'Sentadilla', series: 3, repeticiones: 15 },
        ] },
      ],
    },
  ];

  const entrenamientos = [
    // Socio 1 · Press banca: 40 → 45 → 50 kg (sep, oct, nov)
    ent(1, 'press_banca', '2026-09-15', [[10, 30], [8, 35], [6, 40]], 'Primera semana con barra olímpica'),
    ent(1, 'press_banca', '2026-09-29', [[10, 35], [8, 40], [6, 42.5]]),
    ent(1, 'press_banca', '2026-10-15', [[10, 35], [8, 40], [6, 45]], 'Subí 2.5 kg en el último set'),
    ent(1, 'press_banca', '2026-10-29', [[10, 40], [8, 45], [5, 47.5]]),
    ent(1, 'press_banca', '2026-11-15', [[10, 40], [8, 45], [6, 50]], 'Buen ritmo, último set pesado'),
    // Socio 1 · Sentadilla
    ent(1, 'sentadilla', '2026-09-17', [[10, 50], [8, 55], [8, 60]]),
    ent(1, 'sentadilla', '2026-10-01', [[10, 55], [8, 60], [6, 65]]),
    ent(1, 'sentadilla', '2026-10-17', [[10, 60], [8, 65], [6, 70]], 'Profundidad completa'),
    ent(1, 'sentadilla', '2026-11-03', [[8, 65], [6, 72.5], [5, 75]]),
    ent(1, 'sentadilla', '2026-11-12', [[8, 70], [6, 75], [5, 80]], 'Nuevo récord personal'),
    // Socio 1 · Peso muerto
    ent(1, 'peso_muerto', '2026-09-19', [[8, 70], [6, 80]]),
    ent(1, 'peso_muerto', '2026-10-10', [[8, 80], [6, 90]]),
    ent(1, 'peso_muerto', '2026-11-07', [[8, 85], [5, 100]], 'Agarre mixto en el último set'),
    // Socio 1 · Remo con barra
    ent(1, 'remo_con_barra', '2026-09-15', [[10, 30], [10, 35]]),
    ent(1, 'remo_con_barra', '2026-10-15', [[10, 35], [10, 40]]),
    ent(1, 'remo_con_barra', '2026-11-15', [[10, 40], [8, 45]]),
    // Socio 1 · Press militar
    ent(1, 'press_militar', '2026-10-03', [[10, 20], [8, 25]]),
    ent(1, 'press_militar', '2026-10-24', [[10, 22.5], [8, 27.5]]),
    ent(1, 'press_militar', '2026-11-14', [[10, 25], [8, 30]]),
    // Socio 2
    ent(2, 'sentadilla', '2026-10-21', [[5, 90], [5, 95], [5, 100]]),
    ent(2, 'sentadilla', '2026-11-04', [[5, 95], [5, 100], [4, 105]]),
    ent(2, 'sentadilla', '2026-11-11', [[5, 100], [5, 105], [3, 110]]),
    ent(2, 'hip_thrust', '2026-10-22', [[10, 80], [10, 90]]),
    ent(2, 'hip_thrust', '2026-11-12', [[10, 90], [8, 100]]),
    // Socio 4
    ent(4, 'press_banca', '2026-10-05', [[12, 30], [12, 32.5]]),
    ent(4, 'press_banca', '2026-11-09', [[12, 35], [10, 37.5]]),
  ];

  return { sucursales, planes, socios, membresias, pagos, accesos, entrenadores, rutinas, entrenamientos };
}
