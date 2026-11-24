import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
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
    { to: '/evolucion', icon: 'evolucion', label: 'Evolución' },
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

const PERFIL = {
  recepcion: { nombre: 'Recepción', detalle: 'Personal · Sucursal Centro', iniciales: 'RC' },
  entrenador: { nombre: 'Entrenador', detalle: 'Staff · Multisucursal', iniciales: 'EN' },
};

const iniciales = (nombre = '') => nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

const hoyLargo = () => {
  const t = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export default function Layout() {
  const { rol, setRol, idSocio, setIdSocio } = useSesion();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const socios = useApi(() => api.socios(), [rol, idSocio]);
  const socio = socios.data?.find((s) => s.id_socio === idSocio);

  // Si el socio de la sesión fue eliminado, se toma el primero disponible.
  useEffect(() => {
    if (socios.data?.length && !socio) setIdSocio(socios.data[0].id_socio);
  }, [socios.data, socio, setIdSocio]);

  // Al cambiar de pantalla se vuelve al inicio de la página.
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  // Si se abre directo la URL de otro rol (p. ej. un enlace a /recepcion/socios), se ajusta el rol.
  useEffect(() => {
    const dueno = Object.keys(NAV).find((r) => NAV[r].some((n) => pathname.startsWith(n.to)));
    if (dueno && dueno !== rol) setRol(dueno);
  }, [pathname, rol, setRol]);

  const cambiarRol = (nuevo) => {
    setRol(nuevo);
    navigate(ROLES[nuevo].inicio);
  };

  const reiniciar = async () => {
    if (!window.confirm('¿Restablecer los datos de demostración? Se perderán los cambios hechos.')) return;
    await reiniciarDemo();
    window.location.reload();
  };

  const perfil = rol === 'socio'
    ? { nombre: socio?.nombre ?? 'Cargando…', detalle: `Socio · Sucursal ${socio?.sucursal ?? '—'}`, iniciales: iniciales(socio?.nombre) || '·' }
    : PERFIL[rol];
  const seccion = NAV[rol].find((n) => pathname.startsWith(n.to))?.label;

  return (
    <div className="app">
      <aside className="sidebar">
        <NavLink to={ROLES[rol].inicio} className="wordmark" aria-label="GymTrack, inicio">
          <span className="wordmark-mark" aria-hidden="true"><Icon name="pesas" size={18} /></span>
          GYM<span>TRACK</span>
        </NavLink>

        <nav className="nav" aria-label="Principal">
          <p className="nav-label">{ROLES[rol].nombre}</p>
          {NAV[rol].map((n) => (
            <NavLink key={n.to} to={n.to}>
              <Icon name={n.icon} />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="member-card">
            <div className="avatar" aria-hidden="true">{perfil.iniciales}</div>
            <div className="member-info">
              <strong>{perfil.nombre}</strong>
              <small>{perfil.detalle}</small>
            </div>
          </div>
          {usandoDemo && (
            <div className="demo-note">
              <span className="demo-dot" aria-hidden="true" />
              <span>Modo demostración</span>
              <button type="button" className="link-btn" onClick={reiniciar}>Restablecer</button>
            </div>
          )}
        </div>
      </aside>

      <div className="shell">
        <header className="topbar">
          <div className="crumbs">
            <span className="crumb-role">{ROLES[rol].nombre}</span>
            {seccion && <><Icon name="flecha" size={14} /><span className="crumb-page">{seccion}</span></>}
            <span className="crumb-date">{hoyLargo()}</span>
          </div>

          <div className="topbar-tools">
            {rol === 'socio' && socios.data && socios.data.length > 1 && (
              <label className="topbar-select">
                <span className="sr-only">Socio de demostración</span>
                <select className="input input-sm" value={idSocio} onChange={(e) => setIdSocio(Number(e.target.value))}>
                  {socios.data.map((s) => <option key={s.id_socio} value={s.id_socio}>{s.nombre}</option>)}
                </select>
              </label>
            )}
            <div className="role-switch" role="group" aria-label="Ver como">
              {Object.entries(ROLES).map(([k, r]) => (
                <button key={k} type="button" aria-pressed={rol === k} onClick={() => cambiarRol(k)}>{r.nombre}</button>
              ))}
            </div>
          </div>
        </header>

        <main className="main" id="contenido">
          <Outlet />
        </main>
      </div>

      <datalist id="catalogo-ejercicios">
        {EJERCICIOS.map((e) => <option key={e.slug} value={e.nombre} />)}
      </datalist>
    </div>
  );
}
