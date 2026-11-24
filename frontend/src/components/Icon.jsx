const PATHS = {
  membresia: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  registrar: <path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" />,
  evolucion: <><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  rutina: <><rect x="4" y="4" width="16" height="17" rx="2" /><path d="M8 2v4M16 2v4M4 10h16M8 14h5M8 17h8" /></>,
  socios: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.7 3 2.5 3.5 5.2" /></>,
  acceso: <><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M10 16l4-4-4-4M14 12H3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  check: <path d="M5 12l5 5 9-10" />,
  refresh: <><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v7h-7" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  trofeo: <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v2a3 3 0 0 0 3 3M16 6h4v2a3 3 0 0 1-3 3M12 13v4M8 20h8" />,
  reloj: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  flecha: <path d="M5 12h14M13 6l6 6-6 6" />,
  alerta: <><path d="M12 3l10 18H2z" /><path d="M12 10v4M12 17.5v.5" /></>,
  calendario: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
  pesas: <path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" />,
  vacio: <><circle cx="12" cy="12" r="9" /><path d="M8 15h8M9 9.5h.01M15 9.5h.01" /></>,
};

export default function Icon({ name, size = 22, label, ...rest }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
