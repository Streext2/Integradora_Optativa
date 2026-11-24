import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import { ROLES, useSesion } from '../context/Sesion.jsx';
import { api } from '../api/endpoints.js';
import { reiniciarDemo, usandoDemo } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { EJERCICIOS } from '../lib/ejercicios.js';

const NAV = {
  socio: [
    { to: '/membresia', icon: 'membresia', label: 'Mi membresía' },
    { to: '/registrar', icon: 'registrar', label: 'Registrar entrenamiento' },
    { to: '/evolucion', icon: 'evolucion', label: 'Evolución del ejercicio' },
    { to: '/rutina', icon: 'rutina', label: 'Mi rutina' },
  ],
  recepcion: [
    { to: '/recepcion/socios', icon: 'socios', label: 'Socios y membresías' },
    { to: '/recepcion/accesos', icon: 'acceso', label: 'Control de acceso' },
  ],
  entrenador: [
    { to: '/entrenador/rutinas', icon: 'rutina', label: 'Rutinas de socios' },
  ],
};

const iniciales = (nombre = '') => nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

export default function Layout() {
  const { rol, setRol, idSocio, setIdSocio } = useSesion();
  const navigate = useNavigate();
  const socios = useApi(() => api.socios(), [rol, idSocio]);
  const socio = socios.data?.find((s) => s.id_socio === idSocio);

  // Si el socio de la sesión fue eliminado, se toma el primero disponible.
  useEffect(() => {
    if (socios.data?.length && !socio) setIdSocio(socios.data[0].id_socio);
  }, [socios.data, socio, setIdSocio]);

  const cambiarRol = (nuevo) => {
    setRol(nuevo);
    navigate(ROLES[nuevo].inicio);
  };

  const reiniciar = async () => {
    if (!window.confirm('¿Restablecer los datos de demostración? Se perderán los cambios hechos.')) return;
    await reiniciarDemo();
    window.location.reload();
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <NavLink to={ROLES[rol].inicio} className="wordmark" aria-label="GymTrack, inicio">GYM<span>TRACK</span></NavLink>

        <nav className="nav" aria-label="Principal">
          <p className="nav-label">{ROLES[rol].nombre}</p>
          {NAV[rol].map((n) => (
            <NavLink key={n.to} to={n.to}>
              <Icon name={n.icon} />
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <label className="field">
            <span>Ver como</span>
            <select className="input" value={rol} onChange={(e) => cambiarRol(e.target.value)}>
              {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.nombre}</option>)}
            </select>
          </label>

          {rol === 'socio' && (
            <>
              {socios.data && socios.data.length > 1 && (
                <label className="field">
                  <span>Socio de demostración</span>
                  <select className="input" value={idSocio} onChange={(e) => setIdSocio(Number(e.target.value))}>
                    {socios.data.map((s) => <option key={s.id_socio} value={s.id_socio}>{s.nombre}</option>)}
                  </select>
                </label>
              )}
              <div className="member-card">
                <div className="avatar" aria-hidden="true">{iniciales(socio?.nombre) || '·'}</div>
                <div style={{ minWidth: 0 }}>
                  <strong>{socio?.nombre ?? 'Cargando…'}</strong>
                  <small>Socio · Sucursal {socio?.sucursal ?? '—'}</small>
                </div>
              </div>
            </>
          )}

          {usandoDemo && (
            <div className="demo-note">
              <span>Datos de demostración</span>
              <button type="button" className="link-btn" onClick={reiniciar}>Restablecer</button>
            </div>
          )}
        </div>
      </aside>

      <main className="main" id="contenido">
        <Outlet />
      </main>

      <datalist id="catalogo-ejercicios">
        {EJERCICIOS.map((e) => <option key={e.slug} value={e.nombre} />)}
      </datalist>
    </div>
  );
}
