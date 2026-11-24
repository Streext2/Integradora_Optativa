import { useLayoutEffect, useRef, useState } from 'react';
import { fechaCorta, fechaDiaMes } from '../lib/fechas.js';

function dominio(min, max) {
  const rango = Math.max(max - min, 1);
  const crudo = rango / 4;
  const mag = 10 ** Math.floor(Math.log10(crudo));
  const paso = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= crudo);
  const lo = Math.max(0, Math.floor((min - paso * 0.5) / paso) * paso);
  const hi = Math.ceil((max + paso * 0.5) / paso) * paso;
  return { lo, hi, paso };
}

/** Gráfica de línea en SVG: línea neón 2.5px, puntos rellenos, rejilla sutil. */
export default function LineChart({ puntos, unidad = 'kg', alto = 300 }) {
  const ref = useRef(null);
  const [ancho, setAncho] = useState(720);
  const [activo, setActivo] = useState(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setAncho(Math.max(260, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const m = { t: 24, r: 24, b: 36, l: 44 };
  const iw = ancho - m.l - m.r;
  const ih = alto - m.t - m.b;
  const ts = puntos.map((p) => Date.parse(`${p.fecha}T00:00:00Z`));
  const vs = puntos.map((p) => p.peso_maximo_kg);
  const t0 = Math.min(...ts);
  const t1 = Math.max(...ts);
  const { lo, hi, paso } = dominio(Math.min(...vs), Math.max(...vs));
  const x = (t) => (t1 === t0 ? m.l + iw / 2 : m.l + ((t - t0) / (t1 - t0)) * iw);
  const y = (v) => m.t + ih - ((v - lo) / (hi - lo)) * ih;

  const ticks = [];
  for (let v = lo; v <= hi + 1e-9; v += paso) ticks.push(+v.toFixed(2));

  const pts = puntos.map((p, i) => ({ ...p, px: x(ts[i]), py: y(p.peso_maximo_kg) }));
  const linea = pts.map((p, i) => `${i ? 'L' : 'M'}${p.px},${p.py}`).join(' ');
  const area = pts.length > 1 ? `${linea} L${pts.at(-1).px},${m.t + ih} L${pts[0].px},${m.t + ih} Z` : '';

  // Etiquetas X sin encimarse
  let ultimaX = -Infinity;
  const etiquetasX = pts.filter((p, i) => {
    const ok = p.px - ultimaX >= 58 || i === pts.length - 1;
    if (ok) ultimaX = p.px;
    return ok;
  });

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * ancho;
    let mejor = 0;
    pts.forEach((p, i) => { if (Math.abs(p.px - mx) < Math.abs(pts[mejor].px - mx)) mejor = i; });
    setActivo(mejor);
  };

  const sel = activo != null ? pts[activo] : null;
  const resumen = puntos.map((p) => `${fechaCorta(p.fecha)}: ${p.peso_maximo_kg} ${unidad}`).join('; ');

  return (
    <div className="chart" ref={ref}>
      <svg viewBox={`0 0 ${ancho} ${alto}`} height={alto} role="img" aria-label={`Evolución del peso máximo. ${resumen}`}>
        <defs>
          <linearGradient id="area-neon" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#39FF14" stopOpacity=".22" />
            <stop offset="1" stopColor="#39FF14" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={m.l} x2={ancho - m.r} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeDasharray={v === lo ? undefined : '3 5'} />
            <text x={m.l - 10} y={y(v)} dy="0.35em" textAnchor="end" fill="var(--text-muted)" fontSize="12" style={{ fontVariantNumeric: 'tabular-nums' }}>{v}</text>
          </g>
        ))}
        {etiquetasX.map((p) => (
          <text key={p.fecha} x={p.px} y={alto - 10} textAnchor="middle" fill="var(--text-muted)" fontSize="12">{fechaDiaMes(p.fecha)}</text>
        ))}
        {area && <path d={area} fill="url(#area-neon)" />}
        <path d={linea} fill="none" stroke="var(--neon)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 6px rgba(57,255,20,.45))' }} />
        {sel && <line x1={sel.px} x2={sel.px} y1={m.t} y2={m.t + ih} stroke="var(--border)" />}
        {pts.map((p, i) => (
          <circle key={p.fecha} cx={p.px} cy={p.py} r={i === activo ? 7 : 5} fill="var(--neon)" stroke="var(--bg)" strokeWidth="2" />
        ))}
        {pts.length > 0 && activo == null && (
          <text x={pts.at(-1).px} y={pts.at(-1).py - 14} textAnchor="middle" fill="var(--neon)" fontSize="15" fontWeight="700">
            {pts.at(-1).peso_maximo_kg} {unidad}
          </text>
        )}
        <rect x={m.l - 20} y={0} width={iw + 40} height={alto} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setActivo(null)} />
      </svg>
      {sel && (
        <div className="chart-tip" style={{ left: `${(sel.px / ancho) * 100}%`, top: sel.py }}>
          <strong>{sel.peso_maximo_kg} {unidad}</strong>
          <span className="muted">{fechaCorta(sel.fecha)}</span>
        </div>
      )}
    </div>
  );
}
