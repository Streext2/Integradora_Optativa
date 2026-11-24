import Icon from './Icon.jsx';

const cx = (...c) => c.filter(Boolean).join(' ');

export function Button({ variant = 'primary', size, glow, loading, className, children, type = 'button', disabled, ...rest }) {
  return (
    <button
      type={type}
      className={cx('btn', `btn-${variant}`, size && `btn-${size}`, glow && 'glow', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function IconButton({ icon, label, danger, className, ...rest }) {
  return (
    <button type="button" className={cx('icon-btn', danger && 'danger', className)} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={20} />
    </button>
  );
}

export function PageHead({ eyebrow, title, children }) {
  return (
    <header className="page-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="title">{title}</h1>
      </div>
      {children && <div className="row">{children}</div>}
    </header>
  );
}

/** Estado visual de una membresía según estatus y días restantes. */
export function estadoMembresia(m) {
  if (!m) return { texto: 'Sin membresía', clase: 'muted' };
  if (m.estatus === 'cancelada') return { texto: 'Cancelada', clase: 'muted' };
  if (m.estatus === 'vencida') return { texto: 'Vencida', clase: 'danger' };
  if (m.dias_restantes <= 7) return { texto: 'Por vencer', clase: 'warn' };
  return { texto: 'Activa', clase: 'ok' };
}

export function StatusPill({ membresia }) {
  const e = estadoMembresia(membresia);
  return <span className={`pill ${e.clase}`}>{e.texto}</span>;
}

export function Skeleton({ h = 20, w = '100%', r, style }) {
  return <div className="sk" style={{ height: h, width: w, borderRadius: r, ...style }} aria-hidden="true" />;
}

export function SkeletonCards({ n = 2, h = 260 }) {
  return (
    <div className="grid grid-auto" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: n }, (_, i) => (
        <div className="card" key={i}>
          <Skeleton h={14} w="30%" />
          <Skeleton h={48} w="60%" style={{ margin: '16px 0 24px' }} />
          <Skeleton h={h - 140} />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="card state error" role="alert">
      <div className="state-icon"><Icon name="alerta" size={28} /></div>
      <h3>{error?.status === 0 ? 'Sin conexión' : 'Algo salió mal'}</h3>
      <p>{error?.message ?? 'No se pudo cargar la información.'}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}><Icon name="refresh" size={18} />Reintentar</Button>
      )}
    </div>
  );
}

export function EmptyState({ icon = 'vacio', title, text, children }) {
  return (
    <div className="state">
      <div className="state-icon"><Icon name={icon} size={28} /></div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Segmented({ value, onChange, options, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const METODOS_PAGO = [
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
];
export const nombreMetodo = (v) => METODOS_PAGO.find((m) => m.value === v)?.label ?? v;
