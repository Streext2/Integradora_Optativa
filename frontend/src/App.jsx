import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { ROLES, SesionProvider, useSesion } from './context/Sesion.jsx';
import Membresia from './pages/socio/Membresia.jsx';
import RegistrarEntrenamiento from './pages/socio/RegistrarEntrenamiento.jsx';
import Evolucion from './pages/socio/Evolucion.jsx';
import Rutina from './pages/socio/Rutina.jsx';
import Socios from './pages/recepcion/Socios.jsx';
import Accesos from './pages/recepcion/Accesos.jsx';
import Rutinas from './pages/entrenador/Rutinas.jsx';

function Inicio() {
  const { rol } = useSesion();
  return <Navigate to={ROLES[rol].inicio} replace />;
}

// HashRouter: funciona en S3 + CloudFront sin reglas de reescritura.
export default function App() {
  return (
    <HashRouter>
      <SesionProvider>
        <ToastProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Inicio />} />
              <Route path="membresia" element={<Membresia />} />
              <Route path="registrar" element={<RegistrarEntrenamiento />} />
              <Route path="evolucion" element={<Evolucion />} />
              <Route path="rutina" element={<Rutina />} />
              <Route path="recepcion/socios" element={<Socios />} />
              <Route path="recepcion/accesos" element={<Accesos />} />
              <Route path="entrenador/rutinas" element={<Rutinas />} />
              <Route path="*" element={<Inicio />} />
            </Route>
          </Routes>
        </ToastProvider>
      </SesionProvider>
    </HashRouter>
  );
}
