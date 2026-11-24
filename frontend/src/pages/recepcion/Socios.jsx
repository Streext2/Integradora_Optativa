import { useMemo, useState } from 'react';
import { api } from '../../api/endpoints.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../components/Toast.jsx';
import Modal, { ConfirmModal } from '../../components/Modal.jsx';
import RenovarSheet from '../../components/RenovarSheet.jsx';
import Icon from '../../components/Icon.jsx';
import {
  Button, EmptyState, ErrorState, Field, IconButton, METODOS_PAGO, PageHead, Segmented, Skeleton, StatusPill, estadoMembresia,
} from '../../components/ui.jsx';
import { dinero, fechaCorta } from '../../lib/fechas.js';

const normalizar = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function Socios() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi(() => api.socios(), []);
  const [buscar, setBuscar] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [modal, setModal] = useState(null); // { tipo: 'nuevo'|'editar'|'renovar'|'baja', socio }
  const [ocupado, setOcupado] = useState(false);
  const [errorAccion, setErrorAccion] = useState(null);

  const conteo = useMemo(() => {
    const c = { todos: 0, ok: 0, warn: 0, danger: 0, muted: 0 };
    data?.forEach((s) => { c.todos += 1; c[estadoMembresia(s.membresia).clase] += 1; });
    return c;
  }, [data]);

  const lista = useMemo(() => {
    const q = normalizar(buscar.trim());
    return (data ?? []).filter((s) =>
      (filtro === 'todos' || estadoMembresia(s.membresia).clase === filtro) &&
      (!q || normalizar(`${s.nombre} ${s.correo} ${s.telefono}`).includes(q)));
  }, [data, buscar, filtro]);

  const abrir = (tipo, socio) => { setErrorAccion(null); setModal({ tipo, socio }); };
  const cerrar = () => setModal(null);

  async function registrarAcceso(s) {
    try {
      const r = await api.registrarAcceso({ id_socio: s.id_socio, id_sucursal: s.id_sucursal });
      toast(`Acceso registrado: ${r.socio} · ${r.sucursal}`);
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function darDeBaja() {
    setOcupado(true);
    try {
      const r = await api.eliminarSocio(modal.socio.id_socio);
      toast(r.mensaje);
      cerrar();
      reload();
    } catch (e) {
      setErrorAccion(e.message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <PageHead eyebrow="Recepción · altas, renovaciones y bajas" title="Socios">
        <Button glow onClick={() => abrir('nuevo')}><Icon name="plus" size={18} />Nuevo socio</Button>
      </PageHead>

      <div className="grid grid-auto" style={{ marginBottom: 20 }}>
        {[
          ['todos', 'Socios', 'socios'],
          ['ok', 'Activas', 'check'],
          ['warn', 'Por vencer (≤ 7 días)', 'reloj'],
          ['danger', 'Vencidas', 'alerta'],
        ].map(([k, label, icon]) => (
          <div className="card stat" key={k}>
            <div className="stat-icon" style={k === 'warn' ? { background: 'var(--warn-dim)', color: 'var(--warn)' } : k === 'danger' ? { background: 'var(--danger-dim)', color: 'var(--danger)' } : undefined}>
              <Icon name={icon} />
            </div>
            <span className="label">{label}</span>
            <span className="stat-num">{data ? conteo[k] : '–'}</span>
          </div>
        ))}
      </div>

      <section className="card">
        <div className="row-between" style={{ marginBottom: 20 }}>
          <div className="search">
            <Icon name="search" size={18} />
            <input className="input" type="search" placeholder="Buscar por nombre, correo o teléfono" value={buscar} onChange={(e) => setBuscar(e.target.value)} aria-label="Buscar socio" />
          </div>
          <div style={{ minWidth: 0, flex: '0 1 460px' }}>
            <Segmented
              value={filtro} onChange={setFiltro} label="Filtrar por estado"
              options={[{ value: 'todos', label: 'Todos' }, { value: 'ok', label: 'Activas' }, { value: 'warn', label: 'Por vencer' }, { value: 'danger', label: 'Vencidas' }]}
            />
          </div>
        </div>

        {loading && !data ? (
          <div className="stack">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} h={52} />)}</div>
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : lista.length === 0 ? (
          <EmptyState icon="socios" title="Sin resultados" text="No hay socios que coincidan con la búsqueda." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Socio</th><th>Sucursal</th><th>Plan</th><th>Vence</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr>
              </thead>
              <tbody>
                {lista.map((s) => (
                  <tr key={s.id_socio}>
                    <td><strong>{s.nombre}</strong><small>{s.correo} · {s.telefono || 'sin teléfono'}</small></td>
                    <td>{s.sucursal}</td>
                    <td>{s.membresia?.plan ?? '—'}</td>
                    <td className="num">{s.membresia ? fechaCorta(s.membresia.fecha_fin) : '—'}</td>
                    <td><StatusPill membresia={s.membresia} /></td>
                    <td className="actions">
                      <Button variant="secondary" size="sm" onClick={() => abrir('renovar', s)} disabled={!s.membresia}>Renovar</Button>
                      <IconButton icon="acceso" label={`Registrar acceso de ${s.nombre}`} onClick={() => registrarAcceso(s)} />
                      <IconButton icon="edit" label={`Editar a ${s.nombre}`} onClick={() => abrir('editar', s)} />
                      <IconButton icon="trash" danger label={`Dar de baja a ${s.nombre}`} onClick={() => abrir('baja', s)} disabled={s.membresia?.estatus === 'cancelada'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(modal?.tipo === 'nuevo' || modal?.tipo === 'editar') && (
        <SocioForm
          socio={modal.socio}
          onClose={cerrar}
          onDone={(msg) => { cerrar(); toast(msg); reload(); }}
        />
      )}
      {modal?.tipo === 'renovar' && (
        <RenovarSheet
          membresia={modal.socio.membresia}
          nombreSocio={modal.socio.nombre}
          onClose={cerrar}
          onDone={(r) => { cerrar(); toast(`${modal.socio.nombre}: renovada hasta el ${fechaCorta(r.membresia.fecha_fin)} (${dinero(r.pago.monto)})`); reload(); }}
        />
      )}
      {modal?.tipo === 'baja' && (
        <ConfirmModal
          title={`¿Dar de baja a ${modal.socio.nombre}?`}
          text="Si el socio tiene pagos registrados, su membresía se marcará como cancelada y se conserva el historial (baja lógica). Si no tiene pagos, se eliminará definitivamente."
          confirmLabel="Dar de baja" danger loading={ocupado} error={errorAccion}
          onConfirm={darDeBaja} onClose={cerrar}
        />
      )}
    </>
  );
}

function SocioForm({ socio, onClose, onDone }) {
  const nuevo = !socio;
  const sucursales = useApi(() => api.sucursales(), []);
  const planes = useApi(() => api.planes(), []);
  const [f, setF] = useState({
    nombre: socio?.nombre ?? '',
    correo: socio?.correo ?? '',
    telefono: socio?.telefono ?? '',
    id_sucursal: socio?.id_sucursal ?? 1,
    id_plan: 1,
    metodo_pago: 'efectivo',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));
  const plan = planes.data?.find((p) => p.id_plan === Number(f.id_plan));

  async function guardar(e) {
    e.preventDefault();
    if (!f.nombre.trim() || !f.correo.trim()) return setError('Nombre y correo son obligatorios.');
    setEnviando(true);
    setError(null);
    try {
      const datos = { nombre: f.nombre, correo: f.correo, telefono: f.telefono, id_sucursal: Number(f.id_sucursal) };
      if (nuevo) {
        await api.crearSocio({ ...datos, id_plan: Number(f.id_plan), metodo_pago: f.metodo_pago });
        onDone(`Socio ${f.nombre.trim()} dado de alta`);
      } else {
        await api.actualizarSocio(socio.id_socio, datos);
        onDone('Datos del socio actualizados');
      }
    } catch (ex) {
      setError(ex.message);
      setEnviando(false);
    }
  }

  return (
    <Modal
      title={nuevo ? 'Nuevo socio' : 'Editar socio'}
      subtitle={nuevo ? 'Alta con membresía y primer pago' : socio.nombre}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="form-socio" loading={enviando}>
            {nuevo ? `Dar de alta${plan ? ` · ${dinero(plan.precio)}` : ''}` : 'Guardar cambios'}
          </Button>
        </>
      }
    >
      <form id="form-socio" className="stack" onSubmit={guardar} noValidate>
        <Field label="Nombre completo"><input className="input" value={f.nombre} onChange={set('nombre')} required maxLength={120} autoComplete="off" /></Field>
        <div className="form-grid">
          <Field label="Correo"><input className="input" type="email" value={f.correo} onChange={set('correo')} required maxLength={120} autoComplete="off" /></Field>
          <Field label="Teléfono"><input className="input" type="tel" value={f.telefono} onChange={set('telefono')} maxLength={20} autoComplete="off" /></Field>
        </div>
        <Field label="Sucursal">
          <select className="input" value={f.id_sucursal} onChange={set('id_sucursal')}>
            {(sucursales.data ?? []).map((s) => <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>)}
          </select>
        </Field>
        {nuevo && (
          <>
            <Field label="Plan inicial">
              <select className="input" value={f.id_plan} onChange={set('id_plan')}>
                {(planes.data ?? []).map((p) => <option key={p.id_plan} value={p.id_plan}>{p.nombre} · {dinero(p.precio)} · {p.duracion_dias} días</option>)}
              </select>
            </Field>
            <Field label="Método de pago">
              <Segmented value={f.metodo_pago} onChange={set('metodo_pago')} options={METODOS_PAGO} label="Método de pago" />
            </Field>
          </>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
