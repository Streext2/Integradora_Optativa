import { createContext, useCallback, useContext, useState } from 'react';
import Icon from './Icon.jsx';

const ToastCtx = createContext(() => {});

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const mostrar = useCallback((mensaje, tipo = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, mensaje, tipo }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3800);
  }, []);

  return (
    <ToastCtx.Provider value={mostrar}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.tipo}`}>
            <Icon name={t.tipo === 'error' ? 'alerta' : 'check'} size={20} />
            {t.mensaje}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
