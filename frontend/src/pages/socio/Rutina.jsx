import { Link } from 'react-router-dom';
import { api } from '../../api/endpoints.js';
import { useApi } from '../../hooks/useApi.js';
import { useSesion } from '../../context/Sesion.jsx';
import { EmptyState, ErrorState, PageHead, SkeletonCards } from '../../components/ui.jsx';
import { slugify } from '../../lib/ejercicios.js';
import { fechaCorta } from '../../lib/fechas.js';

export function DiasRutina({ dias, enlazar }) {
  return (
    <div className="days">
      {dias.map((d, i) => (
        <div className="day" key={`${d.dia}-${i}`}>
          <h3>{d.dia}</h3>
          <ul>
            {d.ejercicios.map((e, j) => (
              <li key={j}>
                {enlazar ? (
                  <Link className="ex" to={`/registrar?e=${slugify(e.ejercicio)}`} title={`Registrar ${e.ejercicio}`}>{e.ejercicio}</Link>
                ) : (
                  <span>{e.ejercicio}</span>
                )}
                <span className="sets">
                  {e.series != null ? `${e.series} × ${e.repeticiones}` : e.duracion_min != null ? `${e.duracion_min} min` : '—'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function Rutina() {
  const { idSocio } = useSesion();
  const { data, loading, error, reload } = useApi(() => api.rutinas(String(idSocio)), [idSocio]);

  return (
    <>
      <PageHead eyebrow="Asignada por tu entrenador" title="Mi rutina" />
      {loading && !data ? (
        <SkeletonCards n={1} h={320} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data.rutinas.length === 0 ? (
        <div className="card">
          <EmptyState icon="rutina" title="Sin rutina asignada" text="Tu entrenador aún no te asigna una rutina. Pregunta en recepción por tu valoración." />
        </div>
      ) : (
        <div className="stack">
          {data.rutinas.map((r) => (
            <section className="card" key={r.id_rutina} aria-labelledby={`rutina-${r.id_rutina}`}>
              <div className="row-between" style={{ marginBottom: 20 }}>
                <div>
                  <h2 className="card-title" id={`rutina-${r.id_rutina}`} style={{ marginBottom: 4 }}>{r.nombre}</h2>
                  <p className="muted">Entrenador: {r.entrenador} · Desde {fechaCorta(r.fecha_creacion)}</p>
                </div>
                <span className="tag">{r.dias.length} {r.dias.length === 1 ? 'día' : 'días'} por semana</span>
              </div>
              <DiasRutina dias={r.dias} enlazar />
              <p className="muted mt-16" style={{ fontSize: 13 }}>Toca un ejercicio para registrarlo.</p>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
