import { useEffect, useState } from 'react';
import { api } from '../../api/endpoints.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../components/Toast.jsx';
import Modal, { ConfirmModal } from '../../components/Modal.jsx';
import Icon from '../../components/Icon.jsx';
import { Button, EmptyState, ErrorState, Field, IconButton, PageHead, SkeletonCards } from '../../components/ui.jsx';
import { DiasRutina } from '../socio/Rutina.jsx';
import { DIAS_SEMANA } from '../../lib/ejercicios.js';
import { fechaCorta } from '../../lib/fechas.js';

export default function Rutinas() {
  const toast = useToast();
  const socios = useApi(() => api.socios(), []);
  const [idSocio, setIdSocio] = useState(null);
  const rutinas = useApi(() => (idSocio ? api.rutinas(String(idSocio)) : Promise.resolve(null)), [idSocio]);
  const [modal, setModal] = useState(null); // { tipo: 'editar'|'nueva'|'borrar', rutina }
  const [ocupado, setOcupado] = useState(false);
  const [errorAccion, setErrorAccion] = useState(null);

  useEffect(() => {
    if (!idSocio && socios.data?.length) setIdSocio(socios.data[0].id_socio);
  }, [socios.data, idSocio]);

  const socio = socios.data?.find((s) => s.id_socio === idSocio);
  const cerrar = () => setModal(null);

  async function borrar() {
    setOcupado(true);
    setErrorAccion(null);
    try {
      await api.eliminarRutina(modal.rutina.id_socio, modal.rutina.id_rutina);
      toast('Rutina eliminada');
      cerrar();
      rutinas.reload();
    } catch (e) {
      setErrorAccion(e.message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <PageHead eyebrow="Entrenador · rutinas personalizadas" title="Rutinas">
        <label className="field" style={{ minWidth: 260 }}>
          <span className="sr-only">Socio</span>
          <select className="input" value={idSocio ?? ''} onChange={(e) => setIdSocio(Number(e.target.value))} aria-label="Socio">
            {(socios.data ?? []).map((s) => <option key={s.id_socio} value={s.id_socio}>{s.nombre}</option>)}
          </select>
        </label>
        <Button glow onClick={() => setModal({ tipo: 'nueva' })} disabled={!idSocio}><Icon name="plus" size={18} />Nueva rutina</Button>
      </PageHead>

      {socios.error ? (
        <ErrorState error={socios.error} onRetry={socios.reload} />
      ) : !rutinas.data || (rutinas.loading && rutinas.data.id_socio !== String(idSocio)) ? (
        rutinas.error ? <ErrorState error={rutinas.error} onRetry={rutinas.reload} /> : <SkeletonCards n={1} h={320} />
      ) : rutinas.data.rutinas.length === 0 ? (
        <div className="card">
          <EmptyState icon="rutina" title="Sin rutinas" text={`${socio?.nombre ?? 'Este socio'} todavía no tiene una rutina asignada.`}>
            <Button onClick={() => setModal({ tipo: 'nueva' })}><Icon name="plus" size={18} />Crear rutina</Button>
          </EmptyState>
        </div>
      ) : (
        <div className="stack">
          {rutinas.data.rutinas.map((r) => (
            <section className="card" key={r.id_rutina}>
              <div className="row-between" style={{ marginBottom: 20 }}>
                <div>
                  <h2 className="card-title" style={{ marginBottom: 4 }}>{r.nombre}</h2>
                  <p className="muted">{r.id_rutina} · {r.entrenador} · creada el {fechaCorta(r.fecha_creacion)}</p>
                </div>
                <div className="row">
                  <Button variant="secondary" size="sm" onClick={() => setModal({ tipo: 'editar', rutina: r })}><Icon name="edit" size={16} />Editar</Button>
                  <IconButton icon="trash" danger label={`Eliminar rutina ${r.nombre}`} onClick={() => { setErrorAccion(null); setModal({ tipo: 'borrar', rutina: r }); }} />
                </div>
              </div>
              <DiasRutina dias={r.dias} />
            </section>
          ))}
        </div>
      )}

      {(modal?.tipo === 'nueva' || modal?.tipo === 'editar') && (
        <RutinaEditor
          idSocio={idSocio}
          nombreSocio={socio?.nombre}
          rutina={modal.rutina}
          onClose={cerrar}
          onDone={(msg) => { cerrar(); toast(msg); rutinas.reload(); }}
        />
      )}
      {modal?.tipo === 'borrar' && (
        <ConfirmModal
          title="¿Eliminar rutina?"
          text={`Se eliminará "${modal.rutina.nombre}" de ${socio?.nombre}. El historial de entrenamientos del socio no se modifica.`}
          confirmLabel="Eliminar" danger loading={ocupado} error={errorAccion}
          onConfirm={borrar} onClose={cerrar}
        />
      )}
    </>
  );
}

const ejercicioVacio = () => ({ ejercicio: '', series: 3, repeticiones: 10 });

function RutinaEditor({ idSocio, nombreSocio, rutina, onClose, onDone }) {
  const entrenadores = useApi(() => api.entrenadores(), []);
  const [nombre, setNombre] = useState(rutina?.nombre ?? '');
  const [idEntrenador, setIdEntrenador] = useState(rutina?.id_entrenador ?? 'e-01');
  const [dias, setDias] = useState(rutina ? structuredClone(rutina.dias) : [{ dia: 'Lunes', ejercicios: [ejercicioVacio()] }]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const setDia = (i, cambios) => setDias((ds) => ds.map((d, j) => (j === i ? { ...d, ...cambios } : d)));
  const setEj = (i, k, cambios) => setDia(i, { ejercicios: dias[i].ejercicios.map((e, j) => (j === k ? { ...e, ...cambios } : e)) });
  const siguienteDia = () => DIAS_SEMANA.find((d) => !dias.some((x) => x.dia === d)) ?? 'Lunes';

  async function guardar() {
    if (!nombre.trim()) return setError('Ponle un nombre a la rutina.');
    for (const d of dias) {
      if (d.ejercicios.some((e) => !e.ejercicio.trim())) return setError(`${d.dia}: escribe el nombre de cada ejercicio.`);
    }
    const payload = {
      nombre,
      id_entrenador: idEntrenador,
      dias: dias.map((d) => ({
        dia: d.dia,
        ejercicios: d.ejercicios.map((e) =>
          e.duracion_min != null && e.series == null
            ? { ...e, duracion_min: Number(e.duracion_min) }
            : { ...e, series: Number(e.series), repeticiones: Number(e.repeticiones) }),
      })),
    };
    setEnviando(true);
    setError(null);
    try {
      if (rutina) {
        await api.actualizarRutina(rutina.id_socio, rutina.id_rutina, payload);
        onDone('Rutina actualizada');
      } else {
        await api.crearRutina({ ...payload, id_socio: String(idSocio) });
        onDone('Rutina creada');
      }
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  }

  return (
    <Modal
      size="lg"
      title={rutina ? 'Editar rutina' : 'Nueva rutina'}
      subtitle={`Para ${nombreSocio ?? 'el socio'}`}
      onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={guardar} loading={enviando}>Guardar rutina</Button></>}
    >
      <div className="form-grid">
        <Field label="Nombre de la rutina">
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} placeholder="Ej. Fuerza tren superior" />
        </Field>
        <Field label="Entrenador">
          <select className="input" value={idEntrenador} onChange={(e) => setIdEntrenador(e.target.value)}>
            {(entrenadores.data ?? []).map((e) => <option key={e.id_entrenador} value={e.id_entrenador}>{e.nombre}</option>)}
          </select>
        </Field>
      </div>

      {dias.map((d, i) => (
        <div className="editor-day" key={i}>
          <div className="row-between">
            <select className="input" style={{ maxWidth: 200 }} value={d.dia} onChange={(e) => setDia(i, { dia: e.target.value })} aria-label="Día">
              {DIAS_SEMANA.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <IconButton icon="trash" danger label={`Quitar ${d.dia}`} onClick={() => setDias(dias.filter((_, j) => j !== i))} disabled={dias.length === 1} />
          </div>
          <div className="editor-ex editor-ex-head" aria-hidden="true"><span>Ejercicio</span><span>Series</span><span>Reps / min</span><span /></div>
          {d.ejercicios.map((e, k) => {
            const porTiempo = e.duracion_min != null && e.series == null;
            return (
              <div className="editor-ex" key={k}>
                <input className="input" list="catalogo-ejercicios" value={e.ejercicio} onChange={(ev) => setEj(i, k, { ejercicio: ev.target.value })} placeholder="Ejercicio" aria-label="Ejercicio" />
                {porTiempo ? (
                  <>
                    <span className="muted" style={{ textAlign: 'center' }}>—</span>
                    <input className="input num" type="number" min="1" value={e.duracion_min} onChange={(ev) => setEj(i, k, { duracion_min: ev.target.value })} aria-label="Minutos" />
                  </>
                ) : (
                  <>
                    <input className="input num" type="number" min="1" value={e.series} onChange={(ev) => setEj(i, k, { series: ev.target.value })} aria-label="Series" />
                    <input className="input num" type="number" min="1" value={e.repeticiones} onChange={(ev) => setEj(i, k, { repeticiones: ev.target.value })} aria-label="Repeticiones" />
                  </>
                )}
                <IconButton icon="x" label="Quitar ejercicio" onClick={() => setDia(i, { ejercicios: d.ejercicios.filter((_, j) => j !== k) })} disabled={d.ejercicios.length === 1} />
              </div>
            );
          })}
          <div className="row">
            <Button variant="ghost" size="sm" onClick={() => setDia(i, { ejercicios: [...d.ejercicios, ejercicioVacio()] })}><Icon name="plus" size={16} />Ejercicio</Button>
            <Button variant="ghost" size="sm" onClick={() => setDia(i, { ejercicios: [...d.ejercicios, { ejercicio: '', duracion_min: 20 }] })}><Icon name="reloj" size={16} />Cardio por tiempo</Button>
          </div>
        </div>
      ))}

      <Button variant="secondary" onClick={() => setDias([...dias, { dia: siguienteDia(), ejercicios: [ejercicioVacio()] }])} disabled={dias.length >= 7} style={{ alignSelf: 'flex-start' }}>
        <Icon name="plus" size={18} />Agregar día
      </Button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </Modal>
  );
}
