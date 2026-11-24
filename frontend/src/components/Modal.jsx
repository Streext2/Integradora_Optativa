import { useEffect, useId, useRef } from 'react';
import { IconButton } from './ui.jsx';

/** Diálogo centrado en escritorio; hoja inferior (bottom sheet) en pantallas chicas. */
export default function Modal({ title, subtitle, onClose, children, footer, size }) {
  const ref = useRef(null);
  const cerrar = useRef(onClose);
  cerrar.current = onClose;
  const tituloId = useId();

  useEffect(() => {
    const previo = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') cerrar.current();
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll('button:not(:disabled), input, select, textarea, a[href]');
        if (!f.length) return;
        const [primero, ultimo] = [f[0], f[f.length - 1]];
        if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const foco = ref.current?.querySelector('[data-autofocus], input, select, textarea, .sheet-foot .btn-primary');
    (foco ?? ref.current)?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previo?.focus?.();
    };
  }, []);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`sheet ${size ?? ''}`} role="dialog" aria-modal="true" aria-labelledby={tituloId} tabIndex={-1}>
        <div className="sheet-head">
          <div>
            <h2 id={tituloId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <IconButton icon="x" label="Cerrar" onClick={onClose} />
        </div>
        {children}
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmModal({ title, text, confirmLabel = 'Confirmar', danger, loading, error, onConfirm, onClose }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={loading} data-autofocus>
            {loading && <span className="spinner" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="muted">{text}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
    </Modal>
  );
}
