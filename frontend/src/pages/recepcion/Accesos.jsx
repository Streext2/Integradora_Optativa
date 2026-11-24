import { useEffect, useState } from 'react';
import { api } from '../../api/endpoints.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../components/Toast.jsx';
import Icon from '../../components/Icon.jsx';
import { Button, EmptyState, ErrorState, Field, PageHead, Skeleton, StatusPill } from '../../components/ui.jsx';
import { fechaHora, hoyISO } from '../../lib/fechas.js';

export default function Accesos() {
  const toast = useToast();
  const socios = useApi(() => api.socios(), []);
  const sucursales = useApi(() => api.sucursales(), []);
  const accesos = useApi(() => api.accesos(25), []);
  const [idSocio, setIdSocio] = useState('');
  const [idSucursal, setIdSucursal] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const socio = socios.data?.find((s) => s.id_socio === Number(idSocio));
  useEffect(() => { if (socio) setIdSucursal(socio.id_sucursal); }, [socio]);

  const hoy = hoyISO();
  const accesosHoy = accesos.data?.filter((a) => {
    const d = new Date(a.fecha_hora);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === hoy;
  }).length;

  async function registrar(e) {
    e.preventDefault();
    if (!idSocio) return;
    setEnviando(true);
    setResultado(null);
    try {
      const r = await api.registrarAcceso({ id_socio: Number(idSocio), id_sucursal: Number(idSucursal) });
      setResultado({ ok: true, texto: `Entrada permitida: ${r.socio} · Sucursal ${r.sucursal}` });
      toast('Acceso registrado');
      accesos.reload();
    } catch (ex) {
      setResultado({ ok: false, texto: ex.message });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <PageHead eyebrow="Recepción · entrada por sucursal" title="Control de acceso" />

      <div className="grid grid-main">
        <form className="card stack" onSubmit={registrar}>
          <h2 className="card-title" style={{ margin: 0 }}>Registrar entrada</h2>
          <Field label="Socio">
            <select className="input" value={idSocio} onChange={(e) => { setIdSocio(e.target.value); setResultado(null); }} required>
              <option value="">Selecciona un socio…</option>
              {(socios.data ?? []).map((s) => <option key={s.id_socio} value={s.id_socio}>{s.nombre}</option>)}
            </select>
          </Field>
          {socio && (
            <div className="summary">
              <div><span className="muted">Membresía</span><StatusPill membresia={socio.membresia} /></div>
              <div><span className="muted">Plan</span><span>{socio.membresia?.plan ?? '—'}</span></div>
              <div><span className="muted">Sucursal de registro</span><span>{socio.sucursal}</span></div>
            </div>
          )}
          <Field label="Sucursal de entrada">
            <select className="input" value={idSucursal} onChange={(e) => setIdSucursal(e.target.value)}>
              {(sucursales.data ?? []).map((s) => <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>)}
            </select>
          </Field>
          {resultado && (
            <p className={resultado.ok ? 'pill ok' : 'form-error'} role="alert" style={resultado.ok ? { borderRadius: 10, padding: '10px 14px', whiteSpace: 'normal' } : undefined}>
              {resultado.texto}
            </p>
          )}
          <Button type="submit" size="lg" glow loading={enviando} disabled={!idSocio}>
            <Icon name="acceso" size={20} />Registrar entrada
          </Button>
        </form>

        <section className="card">
          <div className="row-between" style={{ marginBottom: 16 }}>
            <h2 className="card-title" style={{ margin: 0 }}>Accesos recientes</h2>
            {accesos.data && <span className="tag">{accesosHoy} hoy</span>}
          </div>
          {accesos.loading && !accesos.data ? (
            <div className="stack">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={44} />)}</div>
          ) : accesos.error ? (
            <ErrorState error={accesos.error} onRetry={accesos.reload} />
          ) : accesos.data.length === 0 ? (
            <EmptyState icon="acceso" title="Sin accesos" text="Todavía no se registran entradas." />
          ) : (
            <ul className="list">
              {accesos.data.map((a) => (
                <li key={a.id_acceso}>
                  <div><span style={{ fontWeight: 600 }}>{a.socio}</span><small>{fechaHora(a.fecha_hora)}</small></div>
                  <span className="tag">{a.sucursal}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
