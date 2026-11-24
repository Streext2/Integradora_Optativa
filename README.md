# GymTrack

Plataforma web para la gestión de membresías y el seguimiento de entrenamientos de un gimnasio con varias sucursales.
Proyecto integrador #8 · UTEZ. El contexto completo está en `GYMTRACK_CONTEXT (1).md`.

## Estado actual

- **Frontend (React + Vite)**: listo y funcional con datos de demostración.
- **API simulada en el navegador** (`frontend/src/api/mock/`): implementa los mismos endpoints y contratos de la sección 6
  (renovación transaccional, SK `ejercicio#fecha_hora`, evolución con `begins_with`, validaciones 400/403/404/409).
  Los datos viven en `localStorage` y se pueden restablecer desde la barra lateral.
- **Pendiente:** Lambdas, RDS, DynamoDB, Secrets Manager, IAM, S3 + CloudFront (fase AWS).

## Correr en local

Guía paso a paso (requisitos, demo y problemas comunes): [`INSTRUCCIONES.md`](INSTRUCCIONES.md).

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # genera build/ para subir a S3
```

Para conectarlo al API real, crea `frontend/.env` con `VITE_API_URL=https://<API_ID>.execute-api.<region>.amazonaws.com/prod`.
Sin esa variable se usa la API simulada.

## Vistas

| Rol | Pantallas |
|---|---|
| **Socio** | Mi membresía (renovar), Registrar entrenamiento, Evolución del ejercicio (gráfica, editar y borrar sesiones), Mi rutina |
| **Recepción** | Socios (alta, edición, baja lógica o física, renovar, registrar acceso), Control de acceso por sucursal |
| **Entrenador** | Rutinas por socio (crear, editar, eliminar; ejercicios por series o por tiempo) |

El rol se cambia en la barra lateral ("Ver como") mientras no exista autenticación con Cognito.

## Endpoints que consume el frontend

Además de los de la sección 6 del contexto, el frontend usa estos de apoyo (todos GET, de solo lectura):
`/socios` (lista para recepción), `/planes`, `/sucursales`, `/entrenadores`, `/accesos?limite=`, `/socios/{id}/entrenamientos?limite=`.
`GET /socios/{id}/rutina` responde `{ id_socio, rutinas: [...] }` porque un socio puede tener varias rutinas (SK `id_rutina`).
