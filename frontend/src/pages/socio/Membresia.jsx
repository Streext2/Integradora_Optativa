import { useState } from 'react';
import { api } from '../../api/endpoints.js';
import { useApi } from '../../hooks/useApi.js';
import { useSesion } from '../../context/Sesion.jsx';
import { useToast } from '../../components/Toast.jsx';
import RenovarSheet from '../../components/RenovarSheet.jsx';
import Icon from '../../components/Icon.jsx';
import { Button, EmptyState, ErrorState, PageHead, SkeletonCards, StatusPill, estadoMembresia, nombreMetodo } from '../../components/ui.jsx';
import { dinero, fechaCorta } from '../../lib/fechas.js';

export default function Membresia() {
  const { idSocio } = useSesion();
  const toast = useToast();
  const { data: m, loading, error, reload } = useApi(() => api.membresia(idSocio), [idSocio]);
  const [renovando, setRenovando] = useState(false);

  const estado = estadoMembresia(m);
  const porcentaje = m ? Math.min(100, Math.round((m.dias_restantes / m.duracion_dias) * 100)) : 0;
  const claseBarra = estado.clase === 'ok' ? '' : estado.clase;

  return (
    <>
      <PageHead eyebrow="Tu plan, vigencia y pagos" title="Mi membresía" />

      {loading && !m ? (
        <SkeletonCards />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <div className="grid grid-main">
          <section className="card" aria-labelledby="plan-actual">
            <div className="row-between">
              <span className="label" id="plan-actual">Plan</span>
              <StatusPill membresia={m} />
            </div>
            <p className="hero-plan">{m.plan}</p>

            <dl className="kv">
              <div><dt>Sucursal</dt><dd>{m.sucursal}</dd></div>
              <div><dt>Vence</dt><dd>{fechaCorta(m.fecha_fin)}</dd></div>
              <div>
                <dt>Días restantes</dt>
                <dd style={{ color: estado.clase === 'ok' ? 'var(--neon)' : `var(--${estado.clase === 'muted' ? 'text-muted' : estado.clase})` }}>
                  {m.dias_restantes}
                </dd>
              </div>
            </dl>

            {m.estatus !== 'cancelada' && (
              <div className={`progress ${claseBarra}`} role="progressbar" aria-label="Vigencia restante" aria-valuenow={porcentaje} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${porcentaje}%` }} />
              </div>
            )}

            {estado.clase !== 'ok' && (
              <p className="muted" style={{ marginBottom: 16 }}>
                {m.estatus === 'vencida' && 'Tu membresía venció. Renueva para volver a entrenar en cualquier sucursal.'}
                {m.estatus === 'cancelada' && 'Tu membresía fue cancelada. Puedes reactivarla renovando un plan.'}
                {m.estatus === 'activa' && `Tu membresía vence en ${m.dias_restantes} ${m.dias_restantes === 1 ? 'día' : 'días'}. Renueva para no perder días.`}
              </p>
            )}

            <Button size="lg" glow onClick={() => setRenovando(true)}>
              <Icon name="refresh" size={20} />Renovar membresía
            </Button>
          </section>

          <section className="card" aria-labelledby="pagos">
            <h2 className="card-title" id="pagos">Últimos pagos</h2>
            {m.ultimos_pagos.length === 0 ? (
              <EmptyState title="Sin pagos" text="Aún no hay pagos registrados en esta membresía." />
            ) : (
              <ul className="list">
                {m.ultimos_pagos.map((p) => (
                  <li key={p.id_pago ?? p.fecha_pago}>
                    <div>
                      <span className="num">{fechaCorta(p.fecha_pago)}</span>
                      <small>{nombreMetodo(p.metodo_pago)}</small>
                    </div>
                    <span className="amount">{dinero(p.monto)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {renovando && m && (
        <RenovarSheet
          membresia={m}
          onClose={() => setRenovando(false)}
          onDone={(r) => {
            setRenovando(false);
            toast(`Membresía renovada hasta el ${fechaCorta(r.membresia.fecha_fin)}`);
            reload();
          }}
        />
      )}
    </>
  );
}
