// Cliente HTTP. Con VITE_API_URL habla con API Gateway; sin ella usa la API simulada.
const BASE = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '');

export const usandoDemo = !BASE;

export class ApiError extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

export async function request(metodo, path, body) {
  if (usandoDemo) {
    const { handle } = await import('./mock/server.js');
    const res = await handle(metodo, path, body);
    if (res.status >= 400) throw new ApiError(res.status, res.body.error);
    return res.body;
  }

  let r;
  try {
    r = await fetch(BASE + path, {
      method: metodo,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión.');
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(r.status, data.error || `Error ${r.status}`);
  return data;
}

export async function reiniciarDemo() {
  const { reiniciar } = await import('./mock/db.js');
  reiniciar();
}
