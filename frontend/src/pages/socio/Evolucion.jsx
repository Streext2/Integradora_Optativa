import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/endpoints.js';
import { useApi } from '../../hooks/useApi.js';
import { useSesion } from '../../context/Sesion.jsx';
import { useToast } from '../../components/Toast.jsx';
import LineChart from '../../components/LineChart.jsx';
import Modal, { ConfirmModal } from '../../components/Modal.jsx';
import SeriesEditor, { normalizarSeries, resumenSeries, validarSeries } from '../../components/SeriesEditor.jsx';
import Icon from '../../components/Icon.jsx';
import { Button, EmptyState, ErrorState, Field, IconButton, PageHead, Skeleton } from '../../components/ui.jsx';
import { EJERCICIOS, nombreEjercicio } from '../../lib/ejercicios.js';
import { fechaHora } from '../../lib/fechas.js';

export default function Evolucion() {
  const { idSocio } = useSesion();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const slug = params.get('e') || 'press_banca';
  const { data, loading, error, reload } = useApi(() => api.evolucion(String(idSocio), slug), [idSocio, slug]);
  const [editando, setEditando] = useState(null);
  const [borrando, setBorrando] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [errorAccion, setErrorAccion] = useState(null);

  const opciones = EJERCICIOS.some((e) => e.slug === slug) ? EJERCICIOS : [{ slug, nombre: nombreEjercicio(slug) }, ...EJERCICIOS];
  const cargando = loading && (!data || data.slug !== slug);

  async function eliminar() {
    setOcupado(true);
    setErrorAccion(null);
    try {
      await api.eliminarEntrenamiento(String(idSocio), slug, borrando.fecha_hora);
      toast('Entrenamiento eliminado');
      setBorrando(null);
      reload();
    } catch (e) {
      setErrorAccion(e.message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <PageHead eyebrow="Tu progreso, sesión por sesión" title="Evolución del ejercicio">
        <label className="field" style={{ minWidth: 240 }}>
          <span className="sr-only">Ejercicio</span>
          <select className="input" value={slug} onChange={(e) => setParams({ e: e.target.value })} aria-label="Ejercicio">
            {opciones.map((e) => <option key={e.slug} value={e.slug}>{e.nombre}</option>)}
          </select>
        </label>
      </PageHead>

      {cargando ? (
        <div className="stack" aria-busy="true">
          <div className="card"><Skeleton h={22} w="40%" /><Skeleton h={280} style={{ marginTop: 20 }} /></div>
          <div className="grid grid-auto"><div className="card"><Skeleton h={90} /></div><div className="card"><Skeleton h={90} /></div></div>
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data.puntos.length === 0 ? (
        <div className="card">
          <EmptyState icon="evolucion" title={data.ejercicio} text="Aún no tienes entrenamientos de este ejercicio.">
            <Link className="btn btn-primary" to={`/registrar?e=${slug}`}><Icon name="plus" size={18} />Registrar entrenamiento</Link>
          </EmptyState>
        </div>
      ) : (
        <div className="stack">
          <section className="card" aria-labelledby="titulo-grafica">
            <h2 className="card-title" id="titulo-grafica">{data.ejercicio} · peso máximo (kg)</h2>
            <LineChart puntos={data.puntos} />
          </section>

          <div className="grid grid-auto">
            <div className="card stat">
              <div className="stat-icon"><Icon name="trofeo" /></div>
              <span className="label">Mejor marca</span>
              <span className="stat-num">{data.mejor_marca.peso_kg}<small>kg × {data.mejor_marca.repeticiones}</small></span>
            </div>
            <div className="card stat">
              <div className="stat-icon"><Icon name="evolucion" /></div>
              <span className="label">Progreso</span>
              <span className={`stat-num ${data.progreso_kg > 0 ? 'neon' : data.progreso_kg < 0 ? 'danger' : ''}`}>
                {data.progreso_kg > 0 ? '+' : ''}{data.progreso_kg}<small>kg</small>
              </span>
            </div>
            <div className="card stat">
              <div className="stat-icon"><Icon name="calendario" /></div>
              <span className="label">Sesiones registradas</span>
              <span className="stat-num">{data.sesiones.length}</span>
            </div>
          </div>

          <section className="card" aria-labelledby="sesiones">
            <div className="row-between" style={{ marginBottom: 16 }}>
              <h2 className="card-title" id="sesiones" style={{ margin: 0 }}>Sesiones</h2>
              <Link className="btn btn-secondary btn-sm" to={`/registrar?e=${slug}`}><Icon name="plus" size={16} />Nueva sesión</Link>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Fecha</th><th>Series (reps × kg)</th><th>Máx.</th><th>Notas</th><th><span className="sr-only">Acciones</span></th></tr>
                </thead>
                <tbody>
                  {data.sesiones.map((s) => (
                    <tr key={s.fecha_hora}>
                      <td className="num">{fechaHora(s.fecha_hora)}</td>
                      <td className="num">{resumenSeries(s.series)}</td>
                      <td className="num"><strong>{s.peso_maximo_kg} kg</strong></td>
                      <td className="muted">{s.notas || '—'}</td>
                      <td className="actions">
                        <IconButton icon="edit" label="Editar entrenamiento" onClick={() => setEditando(s)} />
                        <IconButton icon="trash" danger label="Eliminar entrenamiento" onClick={() => { setErrorAccion(null); setBorrando(s); }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {editando && (
        <EditarEntrenamiento
          item={editando}
          onClose={() => setEditando(null)}
          onDone={() => { setEditando(null); toast('Entrenamiento actualizado'); reload(); }}
        />
      )}
      {borrando && (
        <ConfirmModal
          title="¿Eliminar entrenamiento?"
          text={`Se eliminará la sesión del ${fechaHora(borrando.fecha_hora)} (${resumenSeries(borrando.series)}). Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          danger loading={ocupado} error={errorAccion}
          onConfirm={eliminar}
          onClose={() => setBorrando(null)}
        />
      )}
    </>
  );
}

function EditarEntrenamiento({ item, onClose, onDone }) {
  const [series, setSeries] = useState(item.series);
  const [notas, setNotas] = useState(item.notas);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function guardar() {
    const err = validarSeries(series);
    if (err) return setError(err);
    setEnviando(true);
    setError(null);
    try {
      await api.actualizarEntrenamiento(item.id_socio, item.ejercicio, item.fecha_hora, { series: normalizarSeries(series), notas });
      onDone();
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  }

  return (
    <Modal
      title="Editar entrenamiento"
      subtitle={`${item.nombre_ejercicio} · ${fechaHora(item.fecha_hora)}`}
      onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={guardar} loading={enviando}>Guardar cambios</Button></>}
    >
      <SeriesEditor series={series} onChange={setSeries} />
      <Field label="Notas">
        <textarea className="input" value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={300} />
      </Field>
      {error && <p className="form-error" role="alert">{error}</p>}
    </Modal>
  );
}
