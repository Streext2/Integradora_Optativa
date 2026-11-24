import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/endpoints.js';
import { useApi } from '../../hooks/useApi.js';
import { useSesion } from '../../context/Sesion.jsx';
import { useToast } from '../../components/Toast.jsx';
import SeriesEditor, { normalizarSeries, resumenSeries, validarSeries } from '../../components/SeriesEditor.jsx';
import Icon from '../../components/Icon.jsx';
import { Button, EmptyState, ErrorState, Field, PageHead, Skeleton } from '../../components/ui.jsx';
import { nombreEjercicio, slugify } from '../../lib/ejercicios.js';
import { fechaHora } from '../../lib/fechas.js';

const SERIES_INICIALES = [
  { repeticiones: 10, peso_kg: 40 },
  { repeticiones: 8, peso_kg: 45 },
  { repeticiones: 6, peso_kg: 50 },
];

export default function RegistrarEntrenamiento() {
  const { idSocio } = useSesion();
  const toast = useToast();
  const [params] = useSearchParams();
  const [ejercicio, setEjercicio] = useState(params.get('e') ? nombreEjercicio(params.get('e')) : 'Press banca');
  const [series, setSeries] = useState(SERIES_INICIALES);
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [ultimo, setUltimo] = useState(null);
  const recientes = useApi(() => api.entrenamientos(String(idSocio), 6), [idSocio]);

  async function guardar(e) {
    e.preventDefault();
    const slug = slugify(ejercicio);
    if (!slug) return setError('Escribe o elige un ejercicio.');
    const err = validarSeries(series);
    if (err) return setError(err);
    setError(null);
    setGuardando(true);
    try {
      const r = await api.registrarEntrenamiento({
        id_socio: String(idSocio),
        ejercicio: slug,
        series: normalizarSeries(series),
        notas,
      });
      toast('Entrenamiento guardado');
      setUltimo(r);
      setNotas('');
      recientes.reload();
    } catch (ex) {
      setError(ex.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <PageHead eyebrow="Anota tus series al terminar" title="Registrar entrenamiento" />

      <div className="grid grid-main">
        <form className="card stack" onSubmit={guardar} noValidate>
          <Field label="Ejercicio">
            <input
              className="input" list="catalogo-ejercicios" value={ejercicio}
              onChange={(e) => setEjercicio(e.target.value)} placeholder="Ej. Press banca" autoComplete="off" required
            />
          </Field>

          <div>
            <p className="label" style={{ marginBottom: 12 }}>Series</p>
            <SeriesEditor series={series} onChange={setSeries} />
          </div>

          <Field label="Notas (opcional)">
            <textarea className="input" value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={300} placeholder="¿Cómo te sentiste?" />
          </Field>

          {error && <p className="form-error" role="alert">{error}</p>}

          <Button type="submit" size="lg" glow loading={guardando}>
            <Icon name="check" size={20} />Guardar entrenamiento
          </Button>

          {ultimo && (
            <p className="muted" role="status">
              Guardado: {ultimo.nombre_ejercicio} · {resumenSeries(ultimo.series)}.{' '}
              <Link to={`/evolucion?e=${ultimo.ejercicio}`}>Ver evolución →</Link>
            </p>
          )}
        </form>

        <section className="card" aria-labelledby="recientes">
          <h2 className="card-title" id="recientes">Últimos registros</h2>
          {recientes.loading && !recientes.data ? (
            <div className="stack">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={44} />)}</div>
          ) : recientes.error ? (
            <ErrorState error={recientes.error} onRetry={recientes.reload} />
          ) : recientes.data.length === 0 ? (
            <EmptyState icon="pesas" title="Sin registros" text="Aún no tienes entrenamientos. ¡Registra el primero!" />
          ) : (
            <ul className="list">
              {recientes.data.map((r) => (
                <li key={r['ejercicio#fecha_hora']}>
                  <div style={{ minWidth: 0 }}>
                    <Link to={`/evolucion?e=${r.ejercicio}`} style={{ color: 'var(--text)', fontWeight: 600, textDecoration: 'none' }}>
                      {r.nombre_ejercicio}
                    </Link>
                    <small>{fechaHora(r.fecha_hora)} · {r.series.length} series</small>
                  </div>
                  <span className="amount">{r.peso_maximo_kg}<small style={{ display: 'inline', marginLeft: 4 }}>kg</small></span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
