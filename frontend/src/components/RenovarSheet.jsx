import { useState } from 'react';
import Modal from './Modal.jsx';
import { Button, Field, METODOS_PAGO, Segmented, Skeleton } from './ui.jsx';
import { api } from '../api/endpoints.js';
import { useApi } from '../hooks/useApi.js';
import { dinero, fechaCorta, hoyISO, mayorFecha, sumarDias } from '../lib/fechas.js';

/**
 * Hoja para renovar una membresía: selector de plan + método de pago y confirmación con el monto.
 * `membresia` necesita: id_membresia, id_plan, fecha_fin, estatus.
 */
export default function RenovarSheet({ membresia, nombreSocio, onClose, onDone }) {
  const planes = useApi(() => api.planes(), []);
  const [idPlan, setIdPlan] = useState(membresia.id_plan);
  const [metodo, setMetodo] = useState('tarjeta');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const plan = planes.data?.find((p) => p.id_plan === idPlan);
  const base = membresia.estatus === 'cancelada' ? hoyISO() : mayorFecha(hoyISO(), membresia.fecha_fin);
  const nuevaFin = plan ? sumarDias(base, plan.duracion_dias) : null;

  async function confirmar() {
    setEnviando(true);
    setError(null);
    try {
      const r = await api.renovar(membresia.id_membresia, { id_plan: idPlan, metodo_pago: metodo });
      onDone(r);
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  }

  return (
    <Modal
      title="Renovar membresía"
      subtitle={nombreSocio ? `Socio: ${nombreSocio}` : 'Elige tu plan y método de pago'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirmar} loading={enviando} disabled={!plan} glow>
            {plan ? `Pagar ${dinero(plan.precio)} y renovar` : 'Renovar'}
          </Button>
        </>
      }
    >
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="label" style={{ marginBottom: 10 }}>Plan</legend>
        {planes.loading ? (
          <div className="opts">{[0, 1, 2].map((i) => <Skeleton key={i} h={96} r={10} />)}</div>
        ) : planes.error ? (
          <p className="form-error">{planes.error.message}</p>
        ) : (
          <div className="opts">
            {planes.data.map((p) => (
              <label key={p.id_plan} className={`opt ${p.id_plan === idPlan ? 'sel' : ''}`}>
                <input type="radio" name="plan" value={p.id_plan} checked={p.id_plan === idPlan} onChange={() => setIdPlan(p.id_plan)} />
                <strong>{p.nombre}</strong>
                <span className="price">{dinero(p.precio)}</span>
                <small>{p.duracion_dias} días</small>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <Field label="Método de pago">
        <Segmented value={metodo} onChange={setMetodo} options={METODOS_PAGO} label="Método de pago" />
      </Field>

      {plan && (
        <div className="summary" aria-live="polite">
          <div><span className="muted">Vencimiento actual</span><span className="num">{fechaCorta(membresia.fecha_fin)}</span></div>
          <div><span className="muted">Nuevo vencimiento</span><strong className="num">{fechaCorta(nuevaFin)}</strong></div>
          <div className="total"><span>Total</span><span className="num" style={{ color: 'var(--neon)' }}>{dinero(plan.precio)}</span></div>
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </Modal>
  );
}
