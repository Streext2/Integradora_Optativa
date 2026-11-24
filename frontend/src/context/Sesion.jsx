import { createContext, useContext, useState } from 'react';

// Sesión de demostración: sin Cognito todavía, el rol y el socio se eligen en la barra lateral.
const SesionCtx = createContext(null);
const CLAVE = 'gymtrack_sesion';

export const ROLES = {
  socio: { nombre: 'Socio', inicio: '/membresia' },
  recepcion: { nombre: 'Recepción', inicio: '/recepcion/socios' },
  entrenador: { nombre: 'Entrenador', inicio: '/entrenador/rutinas' },
};

function leer() {
  try {
    const s = JSON.parse(localStorage.getItem(CLAVE));
    if (s && ROLES[s.rol] && Number.isInteger(s.idSocio)) return s;
  } catch { /* nada */ }
  return { rol: 'socio', idSocio: 1 };
}

export function SesionProvider({ children }) {
  const [sesion, setSesion] = useState(leer);
  const actualizar = (cambios) =>
    setSesion((s) => {
      const nueva = { ...s, ...cambios };
      try { localStorage.setItem(CLAVE, JSON.stringify(nueva)); } catch { /* nada */ }
      return nueva;
    });

  return (
    <SesionCtx.Provider value={{ ...sesion, setRol: (rol) => actualizar({ rol }), setIdSocio: (idSocio) => actualizar({ idSocio }) }}>
      {children}
    </SesionCtx.Provider>
  );
}

export const useSesion = () => useContext(SesionCtx);
