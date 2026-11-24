import { useCallback, useEffect, useRef, useState } from 'react';

/** Carga datos de la API y expone { data, loading, error, reload }. */
export function useApi(fetcher, deps) {
  const [estado, setEstado] = useState({ data: null, loading: true, error: null });
  const [intento, setIntento] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let vigente = true;
    setEstado((e) => ({ ...e, loading: true, error: null }));
    fetcherRef.current()
      .then((data) => vigente && setEstado({ data, loading: false, error: null }))
      .catch((error) => vigente && setEstado({ data: null, loading: false, error }));
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, intento]);

  const reload = useCallback(() => setIntento((n) => n + 1), []);
  return { ...estado, reload };
}
