import { request } from './client.js';

const enc = encodeURIComponent;

export const api = {
  // Catálogos
  sucursales: () => request('GET', '/sucursales'),
  planes: () => request('GET', '/planes'),
  entrenadores: () => request('GET', '/entrenadores'),

  // Grupo A · RDS
  socios: () => request('GET', '/socios'),
  socio: (id) => request('GET', `/socios/${id}`),
  crearSocio: (datos) => request('POST', '/socios', datos),
  actualizarSocio: (id, datos) => request('PUT', `/socios/${id}`, datos),
  eliminarSocio: (id) => request('DELETE', `/socios/${id}`),
  membresia: (idSocio) => request('GET', `/socios/${idSocio}/membresia`),
  renovar: (idMembresia, datos) => request('POST', `/membresias/${idMembresia}/renovar`, datos),
  registrarAcceso: (datos) => request('POST', '/accesos', datos),
  accesos: (limite = 20) => request('GET', `/accesos?limite=${limite}`),

  // Grupo B · DynamoDB
  rutinas: (idSocio) => request('GET', `/socios/${enc(idSocio)}/rutina`),
  crearRutina: (datos) => request('POST', '/rutinas', datos),
  actualizarRutina: (idSocio, idRutina, datos) => request('PUT', `/rutinas/${enc(idSocio)}/${enc(idRutina)}`, datos),
  eliminarRutina: (idSocio, idRutina) => request('DELETE', `/rutinas/${enc(idSocio)}/${enc(idRutina)}`),
  entrenamientos: (idSocio, limite = 10) => request('GET', `/socios/${enc(idSocio)}/entrenamientos?limite=${limite}`),
  registrarEntrenamiento: (datos) => request('POST', '/entrenamientos', datos),
  actualizarEntrenamiento: (idSocio, ejercicio, fechaHora, datos) =>
    request('PUT', `/entrenamientos/${enc(idSocio)}/${enc(ejercicio)}/${enc(fechaHora)}`, datos),
  eliminarEntrenamiento: (idSocio, ejercicio, fechaHora) =>
    request('DELETE', `/entrenamientos/${enc(idSocio)}/${enc(ejercicio)}/${enc(fechaHora)}`),
  evolucion: (idSocio, ejercicio) => request('GET', `/socios/${enc(idSocio)}/ejercicios/${enc(ejercicio)}/evolucion`),
};
