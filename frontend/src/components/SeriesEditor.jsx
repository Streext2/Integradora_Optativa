import Icon from './Icon.jsx';
import { Button, IconButton } from './ui.jsx';

export default function SeriesEditor({ series, onChange }) {
  const actualizar = (i, campo, valor) => onChange(series.map((s, j) => (j === i ? { ...s, [campo]: valor } : s)));
  const agregar = () => onChange([...series, { ...(series.at(-1) ?? { repeticiones: 10, peso_kg: 20 }) }]);
  const quitar = (i) => onChange(series.filter((_, j) => j !== i));

  return (
    <div className="series">
      <div className="serie-row serie-head" aria-hidden="true">
        <span>Serie</span><span>Reps</span><span>Peso (kg)</span><span />
      </div>
      {series.map((s, i) => (
        <div className="serie-row" key={i}>
          <span className="serie-num" aria-label={`Serie ${i + 1}`}>{i + 1}</span>
          <input
            className="input num" type="number" inputMode="numeric" min="1" max="100" step="1"
            value={s.repeticiones} onChange={(e) => actualizar(i, 'repeticiones', e.target.value)}
            aria-label={`Repeticiones de la serie ${i + 1}`}
          />
          <input
            className="input num" type="number" inputMode="decimal" min="0" max="500" step="0.5"
            value={s.peso_kg} onChange={(e) => actualizar(i, 'peso_kg', e.target.value)}
            aria-label={`Peso en kilos de la serie ${i + 1}`}
          />
          <IconButton icon="trash" danger label={`Eliminar serie ${i + 1}`} onClick={() => quitar(i)} disabled={series.length === 1} />
        </div>
      ))}
      <Button variant="secondary" onClick={agregar} disabled={series.length >= 20} style={{ alignSelf: 'flex-start' }}>
        <Icon name="plus" size={18} />Agregar serie
      </Button>
    </div>
  );
}

export function validarSeries(series) {
  for (const [i, s] of series.entries()) {
    const r = Number(s.repeticiones);
    const p = Number(s.peso_kg);
    if (s.repeticiones === '' || !Number.isInteger(r) || r < 1 || r > 100) return `Serie ${i + 1}: las repeticiones deben ser un entero entre 1 y 100.`;
    if (s.peso_kg === '' || !Number.isFinite(p) || p < 0 || p > 500) return `Serie ${i + 1}: el peso debe estar entre 0 y 500 kg.`;
  }
  return null;
}

export const normalizarSeries = (series) => series.map((s) => ({ repeticiones: Number(s.repeticiones), peso_kg: Number(s.peso_kg) }));

export const resumenSeries = (series) => series.map((s) => `${s.repeticiones}×${s.peso_kg}`).join(' · ');
