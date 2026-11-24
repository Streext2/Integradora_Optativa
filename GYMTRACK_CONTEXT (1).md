# GymTrack — Contexto completo del proyecto integrador

> Documento para Claude Code. Léelo completo antes de escribir código. Es la fuente de verdad del proyecto: qué es, qué debe cumplir, qué servicios de AWS usa, cómo se ve y en qué orden construirlo.

---

## 1. Resumen

**GymTrack** es una plataforma web para digitalizar la gestión de membresías y el seguimiento de rutinas y entrenamientos de un gimnasio con varias sucursales.

- **Institución:** Universidad Tecnológica Emiliano Zapata del Estado de Morelos (UTEZ).
- **Integrantes:** Alan Gadiel Araujo Ocampo, Brayan Osvaldo Beltrán Calderón, Jonathan Gutiérrez Reynoso, Osvaldo Enrique Meza Herrera, Nicholas Adelfo Sotelo Wilken, Jorge Emmanuel Moranchel Nájera.
- **Proyecto #8 del integrador:** "Gimnasio y seguimiento de entrenamiento".
- **Idioma de la UI, del código de dominio y de la documentación:** español (México).

### Problema
Hoy el gimnasio lleva membresías, pagos y rutinas en papel u hojas sueltas. Esto provoca membresías vencidas sin control, filas en recepción para renovar y socios que no pueden ver su progreso. GymTrack centraliza todo en una sola aplicación.

### Operaciones mínimas (prioridad absoluta)
1. **Renovar una membresía.**
2. **Registrar un entrenamiento.**
3. **Ver la evolución de un ejercicio.**

Si hay que recortar alcance, se recorta todo lo demás antes que estas tres.

### Usuarios
| Usuario | Qué hace |
|---|---|
| **Socio** | Consulta su membresía, ve su rutina, registra sus entrenamientos y revisa la evolución de sus ejercicios. |
| **Recepcionista / Administrador** | Da de alta socios, renueva membresías, registra pagos y controla el acceso por sucursal. |
| **Entrenador** | Crea y modifica rutinas personalizadas para sus socios. |

> **Alcance de la v1:** la interfaz que se diseña y construye primero es la del **Socio** (**aplicación web de escritorio**, adaptable a pantallas chicas). Recepción y Entrenador se cubren vía API y, si hay tiempo, con vistas simples.

---

## 2. Requisitos del entregable (rúbrica del integrador)

1. **Arquitectura:** frontend que consume servicios mediante **API Gateway + AWS Lambda**.
2. **Bases de datos:** dos bases en AWS, identificando y justificando si es relacional o no relacional y qué servicio usa.
3. **Operaciones mínimas:** consulta y manipulación de datos (**crear, leer, actualizar y eliminar — CRUD**) **en ambas bases**.
4. **Seguridad mínima:**
   - Credenciales en **AWS Secrets Manager**.
   - **Roles IAM con mínimo privilegio para cada Lambda.**
   - **Usuario de BD con privilegios limitados** (no usar el usuario maestro desde la Lambda).
5. **Entregables:** diagrama de arquitectura, justificación escrita de cada base, **demostración funcional (GET y POST)** y reporte digital.

> Importante: el PRD original lista 6 endpoints (sobre todo GET y POST). La rúbrica exige **CRUD en ambas bases**, así que la sección 6 agrega los endpoints PUT/DELETE necesarios.

---

## 3. Arquitectura

```
Usuarios (Socio · Recepcionista/Admin · Entrenador)
        │
        ▼
1. FRONTEND (React) — Amazon S3 + CloudFront
        │  HTTPS · JSON
        ▼
2. Amazon API Gateway (REST API: rutas y métodos)
        │
        ▼
3. AWS Lambda (funciones de la API, Python o Node)
        │                              │
        │ SQL (psycopg2 / pg)          │ SDK (boto3 / AWS SDK v3)
        ▼                              ▼
Amazon RDS · PostgreSQL         Amazon DynamoDB
GRUPO A · RELACIONAL            GRUPO B · NO RELACIONAL
socios, membresías,             rutinas, entrenamientos
pagos, accesos

AWS Secrets Manager  ──► Lambda lee usuario/contraseña de RDS en ejecución
Rol IAM de la Lambda ──► permisos mínimos a DynamoDB (sin contraseña)
```

### Servicios de AWS usados

| Servicio | Para qué se usa |
|---|---|
| **Amazon S3** | Hospeda los archivos estáticos del frontend (`npm run build`). Bucket privado. |
| **Amazon CloudFront** | CDN y HTTPS delante de S3 (con OAC para que el bucket no sea público). |
| **Amazon API Gateway (REST)** | Expone las rutas HTTPS; enruta a cada Lambda; configura CORS. |
| **AWS Lambda** | Lógica de negocio. Una función por dominio (membresías, accesos, rutinas, entrenamientos). Runtime Python 3.12 o Node 20. |
| **Amazon RDS for PostgreSQL** | Base relacional del Grupo A. Instancia pequeña (`db.t4g.micro` / capa gratuita), **no pública**. |
| **Amazon DynamoDB** | Base no relacional del Grupo B (on-demand). |
| **AWS Secrets Manager** | Guarda usuario y contraseña de RDS. La Lambda lo lee al ejecutarse. |
| **AWS IAM** | Roles de ejecución por Lambda con mínimo privilegio; usuarios/permisos del equipo. |
| **Amazon VPC** | Red donde viven RDS y las Lambdas que le hablan. Subredes privadas, security groups. |
| **VPC Endpoints** (Secrets Manager y DynamoDB) | Para que Lambdas dentro de la VPC lleguen a esos servicios sin NAT Gateway (evita costo). |
| **Amazon CloudWatch** | Logs de Lambda y alarmas. |
| **AWS Budgets** | Alerta de presupuesto para no pasarse de costos. |
| **RDS Proxy** *(opcional)* | Solo si aparecen problemas de límite de conexiones Lambda→RDS. |

> Decisión de costos: evitar NAT Gateway (cuesta de más). Usar VPC endpoints o, para el demo, ubicar solo las Lambdas de RDS dentro de la VPC y las de DynamoDB fuera de ella.

### Regla de red
- RDS **nunca** es público (`PubliclyAccessible = false`).
- Security group de RDS: solo permite el puerto 5432 desde el security group de las Lambdas.
- Las Lambdas que usan DynamoDB no necesitan estar en la VPC.

---

## 4. Bases de datos y justificación

| | Grupo A | Grupo B |
|---|---|---|
| **Servicio AWS** | Amazon RDS (PostgreSQL) | Amazon DynamoDB |
| **Tipo** | Relacional | No relacional (clave-valor / documentos) |
| **Datos** | Socios, membresías, pagos, accesos por sucursal | Rutinas personalizadas y registro de entrenamientos |

**Justificación Grupo A (RDS PostgreSQL).** Los pagos, membresías y socios están muy relacionados y requieren integridad: un pago no puede existir sin una membresía y un socio no puede tener dos membresías activas iguales. Renovar una membresía implica varias operaciones que deben ocurrir juntas (transacción: actualizar membresía + insertar pago), algo en lo que SQL es muy fuerte. Los campos son fijos y hay muchas relaciones.

**Justificación Grupo B (DynamoDB).** Cada socio tiene rutinas y ejercicios con estructura distinta, por lo que un esquema rígido sería incómodo. Se registran muchos entrenamientos por socio y la consulta principal es siempre por socio (y por ejercicio), lo que DynamoDB resuelve de forma rápida y escalable sin joins.

### 4.1 Grupo A — RDS PostgreSQL (esquema)

```sql
CREATE TABLE sucursales (
  id_sucursal SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  direccion   VARCHAR(200)
);

CREATE TABLE socios (
  id_socio       SERIAL PRIMARY KEY,
  nombre         VARCHAR(120) NOT NULL,
  correo         VARCHAR(120) UNIQUE NOT NULL,
  telefono       VARCHAR(20),
  fecha_registro DATE NOT NULL DEFAULT CURRENT_DATE,
  id_sucursal    INT NOT NULL REFERENCES sucursales(id_sucursal)
);

CREATE TABLE planes (
  id_plan       SERIAL PRIMARY KEY,
  nombre        VARCHAR(60) NOT NULL,          -- Mensual, Trimestral, Anual
  precio        NUMERIC(10,2) NOT NULL,
  duracion_dias INT NOT NULL
);

CREATE TABLE membresias (
  id_membresia SERIAL PRIMARY KEY,
  id_socio     INT NOT NULL REFERENCES socios(id_socio),
  id_plan      INT NOT NULL REFERENCES planes(id_plan),
  fecha_inicio DATE NOT NULL,
  fecha_fin    DATE NOT NULL,
  estatus      VARCHAR(20) NOT NULL CHECK (estatus IN ('activa','vencida','cancelada'))
);
-- Un socio no puede tener dos membresías activas a la vez:
CREATE UNIQUE INDEX uq_membresia_activa_por_socio
  ON membresias(id_socio) WHERE estatus = 'activa';

CREATE TABLE pagos (
  id_pago      SERIAL PRIMARY KEY,
  id_membresia INT NOT NULL REFERENCES membresias(id_membresia),
  monto        NUMERIC(10,2) NOT NULL,
  metodo_pago  VARCHAR(30) NOT NULL,           -- efectivo, tarjeta, transferencia
  fecha_pago   DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE accesos (
  id_acceso   SERIAL PRIMARY KEY,
  id_socio    INT NOT NULL REFERENCES socios(id_socio),
  id_sucursal INT NOT NULL REFERENCES sucursales(id_sucursal),
  fecha_hora  TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Relaciones: un socio tiene muchas membresías; una membresía tiene muchos pagos; un socio tiene muchos accesos a distintas sucursales.

**Lógica de renovar (debe ser UNA transacción):**
1. Buscar la membresía y su plan.
2. Calcular nueva `fecha_fin` = (la mayor entre hoy y `fecha_fin` actual) + `duracion_dias`.
3. `UPDATE membresias` → nueva `fecha_fin`, `estatus = 'activa'`.
4. `INSERT INTO pagos` con el monto del plan y el método de pago.
5. `COMMIT`. Si algo falla → `ROLLBACK` (nunca queda un pago sin membresía actualizada ni al revés).

**Datos semilla sugeridos:** 2 sucursales (Centro, Norte), 3 planes (Mensual $600 / 30 días, Trimestral $1,600 / 90, Anual $5,800 / 365), 5 socios, 1 membresía activa por socio (el socio demo: plan Mensual, sucursal Centro, vence 15/11/2026 en el boceto; ajustar a fechas coherentes), y pagos de ejemplo.

### 4.2 Grupo B — DynamoDB (tablas)

| Tabla | Partition Key (PK) | Sort Key (SK) | Atributos |
|---|---|---|---|
| **Rutinas** | `id_socio` | `id_rutina` | `nombre`, `id_entrenador`, `fecha_creacion`, `dias: [ { dia, ejercicios: [ { ejercicio, series, repeticiones } ] } ]` (estructura distinta por socio) |
| **Entrenamientos** | `id_socio` | `ejercicio#fecha_hora` | `id_entrenamiento`, `series: [ { repeticiones, peso_kg } ]`, `notas` |

- Modo de capacidad: **on-demand** (PAY_PER_REQUEST).
- La SK `ejercicio#fecha_hora` permite consultar la evolución de un ejercicio con **una sola Query**: `id_socio = :s AND begins_with(SK, "press_banca#")`.
- Formato de la SK: `slug_del_ejercicio#2026-11-17T18:30:00Z` (slug en minúsculas, sin acentos, con guion bajo; fecha ISO 8601 UTC para que el orden lexicográfico sea cronológico).
- **No usar Scan** en código de aplicación; solo Query/GetItem/PutItem/UpdateItem/DeleteItem.
- Diseñar las llaves a partir de las consultas, no al revés.

**Ejemplo de item en `Entrenamientos`:**
```json
{
  "id_socio": "1",
  "ejercicio#fecha_hora": "press_banca#2026-11-17T18:30:00Z",
  "id_entrenamiento": "a3f9c2e1",
  "series": [
    { "repeticiones": 10, "peso_kg": 40 },
    { "repeticiones": 8,  "peso_kg": 45 },
    { "repeticiones": 6,  "peso_kg": 50 }
  ],
  "notas": "Buen ritmo, último set pesado"
}
```

**Ejemplo de item en `Rutinas`:**
```json
{
  "id_socio": "1",
  "id_rutina": "r-001",
  "nombre": "Fuerza tren superior",
  "id_entrenador": "e-02",
  "fecha_creacion": "2026-11-01",
  "dias": [
    { "dia": "Lunes", "ejercicios": [
      { "ejercicio": "Press banca", "series": 3, "repeticiones": 10 },
      { "ejercicio": "Remo con barra", "series": 3, "repeticiones": 10 }
    ]},
    { "dia": "Miércoles", "ejercicios": [
      { "ejercicio": "Sentadilla", "series": 4, "repeticiones": 8 }
    ]}
  ]
}
```

**Datos semilla sugeridos:** entrenamientos de Press banca en septiembre, octubre y noviembre con pesos máximos 40 → 45 → 50 kg (para que la gráfica de evolución tenga datos reales), más una rutina por socio demo.

---

## 5. Seguridad (obligatoria para la rúbrica)

1. **Credenciales de RDS jamás en el código ni en el repo.** Se guardan en **Secrets Manager** (secreto JSON con `username`, `password`, `host`, `port`, `dbname`). La Lambda lo lee con `GetSecretValue` al iniciar (cachear fuera del handler).
2. **Usuario de BD con privilegios limitados.** No usar el usuario maestro (`postgres`) desde la Lambda. Crear un usuario de aplicación, por ejemplo `gymtrack_app`:
   ```sql
   CREATE USER gymtrack_app WITH PASSWORD '<la guarda Secrets Manager>';
   GRANT CONNECT ON DATABASE gymtrack TO gymtrack_app;
   GRANT USAGE ON SCHEMA public TO gymtrack_app;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gymtrack_app;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gymtrack_app;
   -- Sin DROP, sin CREATE, sin superusuario.
   ```
   El secreto que lee la Lambda debe contener **este usuario**, no el maestro.
3. **DynamoDB sin contraseñas:** la Lambda usa su **rol de ejecución IAM**.
4. **Mínimo privilegio por Lambda** (un rol por función; ejemplos):
   - Lambdas de membresías/accesos: `secretsmanager:GetSecretValue` **solo sobre el ARN del secreto**, permisos de VPC (`AWSLambdaVPCAccessExecutionRole`) y logs.
   - Lambdas de rutinas/entrenamientos: solo `dynamodb:GetItem, PutItem, UpdateItem, DeleteItem, Query` **sobre el ARN de su tabla específica** (nunca `dynamodb:*` ni `Resource: "*"`), más logs.
5. **HTTPS en todo:** CloudFront y API Gateway ya fuerzan TLS. El cliente nunca habla en HTTP.
6. **Nada sensible en el frontend:** el frontend solo conoce la URL del API.
7. **CORS** en API Gateway restringido al dominio de CloudFront.
8. **RDS cifrado** (encryption at rest) y no público.
9. (Si hay tiempo) autenticación con **Amazon Cognito** para identificar al socio; en el demo puede usarse un `id_socio` fijo.

Nunca commitear: `.env`, llaves de AWS, contraseñas. Incluir `.gitignore` con `.env*`, `node_modules/`, `build/`, `*.pem`, `.aws/`.

---

## 6. API (endpoints)

Todas las rutas bajo HTTPS vía API Gateway. Respuestas JSON. Errores con forma `{ "error": "mensaje en español" }` y código HTTP correcto.

### Endpoints base del PRD
| Método | Ruta | Base | Operación |
|---|---|---|---|
| GET | `/socios/{id}/membresia` | RDS | Consultar estado y vencimiento de la membresía (incluye plan, sucursal y últimos pagos). |
| POST | `/membresias/{id}/renovar` | RDS | **Renovar membresía** y registrar el pago (transacción). |
| POST | `/accesos` | RDS | Registrar la entrada a una sucursal. |
| GET | `/socios/{id}/rutina` | DynamoDB | Obtener la rutina personalizada del socio. |
| POST | `/entrenamientos` | DynamoDB | **Registrar un entrenamiento** (ejercicio, series, repeticiones, peso). |
| GET | `/socios/{id}/ejercicios/{ejercicio}/evolucion` | DynamoDB | **Ver la evolución de un ejercicio** (historial de peso y repeticiones). |

### Endpoints adicionales para completar CRUD en ambas bases
| Método | Ruta | Base | Operación |
|---|---|---|---|
| POST | `/socios` | RDS | **C**rear socio (alta). |
| GET | `/socios/{id}` | RDS | **R**eer datos del socio. |
| PUT | `/socios/{id}` | RDS | **U**pdate datos del socio (teléfono, correo, sucursal). |
| DELETE | `/socios/{id}` | RDS | **D**elete (baja lógica preferida: marcar membresía `cancelada`; borrado físico solo si no tiene pagos). |
| PUT | `/rutinas/{id_socio}/{id_rutina}` | DynamoDB | **U**pdate rutina (entrenador). |
| POST | `/rutinas` | DynamoDB | **C**rear rutina. |
| PUT | `/entrenamientos/{id_socio}/{ejercicio}/{fecha_hora}` | DynamoDB | **U**pdate entrenamiento (corregir series/notas). |
| DELETE | `/entrenamientos/{id_socio}/{ejercicio}/{fecha_hora}` | DynamoDB | **D**elete entrenamiento. |
| DELETE | `/rutinas/{id_socio}/{id_rutina}` | DynamoDB | **D**elete rutina. |

### Contratos clave

**GET `/socios/{id}/membresia` → 200**
```json
{
  "id_membresia": 12,
  "plan": "Mensual",
  "sucursal": "Centro",
  "fecha_inicio": "2026-10-15",
  "fecha_fin": "2026-11-15",
  "estatus": "activa",
  "dias_restantes": 28,
  "ultimos_pagos": [
    { "fecha_pago": "2026-10-15", "monto": 600.00, "metodo_pago": "tarjeta" },
    { "fecha_pago": "2026-09-15", "monto": 600.00, "metodo_pago": "tarjeta" },
    { "fecha_pago": "2026-08-15", "monto": 600.00, "metodo_pago": "efectivo" }
  ]
}
```

**POST `/membresias/{id}/renovar`** — body `{ "id_plan": 1, "metodo_pago": "tarjeta" }` → 201 con la membresía actualizada y el pago creado.

**POST `/entrenamientos`**
```json
{
  "id_socio": "1",
  "ejercicio": "press_banca",
  "series": [
    { "repeticiones": 10, "peso_kg": 40 },
    { "repeticiones": 8,  "peso_kg": 45 },
    { "repeticiones": 6,  "peso_kg": 50 }
  ],
  "notas": ""
}
```
→ 201. El backend genera `fecha_hora` (UTC) y `id_entrenamiento`, y construye la SK `ejercicio#fecha_hora`.

**GET `/socios/{id}/ejercicios/{ejercicio}/evolucion` → 200**
```json
{
  "ejercicio": "Press banca",
  "puntos": [
    { "fecha": "2026-09-15", "peso_maximo_kg": 40 },
    { "fecha": "2026-10-15", "peso_maximo_kg": 45 },
    { "fecha": "2026-11-15", "peso_maximo_kg": 50 }
  ],
  "mejor_marca": { "peso_kg": 50, "repeticiones": 6 },
  "progreso_kg": 10
}
```
Se calcula con una sola `Query` (`begins_with`) y se agrega en la Lambda (peso máximo por sesión, mejor marca, diferencia primer/último punto).

---

## 7. Aplicación web: pantallas (escritorio, adaptable)

Usuario principal: **Socio**. Es una **aplicación web** (no una app móvil). Layout de escritorio: **barra lateral izquierda** (~248px) con el wordmark, 4 enlaces (*Mi membresía · Registrar entrenamiento · Evolución del ejercicio · Mi rutina*) y una tarjeta del socio al fondo ("Socio · Sucursal Centro"); a la derecha el contenido (padding 40px 48px) con título grande en mayúsculas y tarjetas en cuadrícula/flex. En pantallas angostas la barra lateral pasa arriba y las tarjetas se apilan (flex-wrap, sin anchos fijos). Diseños de referencia: lienzo "GymTrack · Socio (web)" a 1360px de ancho.

### Pantalla 1 — Mi membresía
- Tarjeta principal: **Plan: Mensual**, **Sucursal: Centro**, **Vence: 15/11/2026**, etiqueta **Activa** (verde neón; si vence en ≤7 días ámbar "Por vencer"; si venció, rojo "Vencida").
- Botón primario ancho: **Renovar membresía** → `POST /membresias/{id}/renovar` (con selector de plan y método de pago en una hoja inferior / bottom sheet y confirmación con el monto).
- Lista **Últimos pagos**: `15/10/2026 — $600`, `15/09/2026 — $600`, `15/08/2026 — $600`.
- Fuente de datos: `GET /socios/{id}/membresia`.

### Pantalla 2 — Registrar entrenamiento
- Campo **Ejercicio** (selector/autocompletado; ej. "Press banca").
- Tabla editable: **Serie · Reps · Peso (kg)** con filas `1 · 10 · 40`, `2 · 8 · 45`, `3 · 6 · 50`.
- Botón secundario **+ Agregar serie**.
- Botón primario **Guardar entrenamiento** → `POST /entrenamientos`. Al éxito: toast "Entrenamiento guardado".

### Pantalla 3 — Evolución del ejercicio
- Título **Press banca · peso máximo (kg)**.
- Gráfica de línea con puntos en verde neón: Sep 40 → Oct 45 → Nov 50 (ejes y rejilla sutiles).
- Tarjetas de resumen: **Mejor marca: 50 kg × 6** y **Progreso: +10 kg**.
- Selector de ejercicio arriba. Fuente: `GET /socios/{id}/ejercicios/{ejercicio}/evolucion`.

### Pantalla 4 (opcional) — Mi rutina
- Lista de días (Lunes, Miércoles…) con sus ejercicios, series y repeticiones asignadas por el entrenador. Fuente: `GET /socios/{id}/rutina`.

### Estados que debe manejar toda pantalla
Cargando (skeleton), vacío ("Aún no tienes entrenamientos de este ejercicio"), error de red (reintentar) y éxito.

---

## 8. Sistema de diseño (deportivo · minimalista · negro + verde neón)

Estilo: oscuro, limpio, mucho espacio negativo, tipografía grande y condensada para números, un solo color de acento. Debe sentirse como app de gimnasio, no como panel administrativo.

### Tokens
```css
:root {
  --bg:          #0A0A0A;   /* fondo principal (negro casi puro) */
  --surface:     #141414;   /* tarjetas */
  --surface-2:   #1C1C1C;   /* inputs, filas */
  --border:      #262626;   /* bordes y divisores */
  --text:        #F5F5F5;
  --text-muted:  #8A8A8A;
  --neon:        #39FF14;   /* acento principal: verde neón */
  --neon-dim:    rgba(57,255,20,.14);  /* fondos tintados del acento */
  --neon-glow:   0 0 24px rgba(57,255,20,.35);
  --warn:        #FFB020;   /* por vencer */
  --danger:      #FF4D4D;   /* vencida / error */
  --radius:      16px;
  --radius-sm:   10px;
}
```
- **Texto sobre verde neón siempre negro (`#0A0A0A`)**; nunca blanco (contraste insuficiente).
- Tipografía: títulos y cifras en **Barlow Condensed** o **Oswald** (700, mayúsculas en títulos de sección); cuerpo en **Inter**. Cifras con `font-variant-numeric: tabular-nums`.
- Botón primario: fondo `--neon`, texto negro, `--radius`, altura 52px, brillo sutil (`--neon-glow`) solo en el botón principal de cada pantalla.
- Botón secundario: transparente, borde 1px `--neon`, texto `--neon`.
- Tarjetas: `--surface`, borde `--border`, sin sombras pesadas.
- Etiqueta "Activa": pastilla con fondo `--neon-dim`, texto `--neon`, punto verde.
- Gráfica: línea 2.5px `--neon`, puntos rellenos, rejilla `--border`, etiquetas `--text-muted`. Se puede hacer con Recharts o SVG propio.
- Barra lateral: enlace activo con fondo `--neon-dim` y texto `--neon`; los demás en `--text-muted`; alto mínimo 48px; íconos de trazo de 22px.
- Anchos: diseñar a 1360px de escritorio; layout fluido (flex-wrap/grid con `minmax(0,1fr)`), contenido sin límite rígido y que se apile en pantallas angostas.
- Accesibilidad: áreas táctiles ≥ 44px, foco visible (anillo `--neon`), `aria-label` en íconos.
- Logo/wordmark: **GYM**TRACK con "TRACK" en `--neon`.

---

## 9. Stack del frontend y estructura sugerida

- **React** (Vite recomendado) + React Router + Recharts (o SVG propio). CSS con variables (arriba) o Tailwind configurado con esos tokens.
- Variable de entorno `VITE_API_URL` (URL base del API Gateway). No hay secretos en el frontend.

```
gymtrack/
├─ GYMTRACK_CONTEXT.md
├─ frontend/
│  ├─ src/
│  │  ├─ api/            # cliente fetch por endpoint
│  │  ├─ components/     # TabBar, Card, Button, SerieRow, LineChart...
│  │  ├─ pages/          # Membresia, RegistrarEntrenamiento, Evolucion, Rutina
│  │  └─ styles/tokens.css
│  └─ package.json
├─ backend/
│  ├─ membresias/        # Lambda (RDS)  → GET membresía, POST renovar, accesos, CRUD socios
│  ├─ entrenamientos/    # Lambda (DynamoDB) → POST/PUT/DELETE entrenamientos, GET evolución
│  ├─ rutinas/           # Lambda (DynamoDB) → CRUD rutinas, GET rutina
│  └─ shared/            # db.py/db.js (secreto + conexión), respuestas, validaciones
├─ db/
│  ├─ schema.sql
│  ├─ seed.sql
│  └─ dynamodb_seed.json
├─ infra/                # (opcional) SAM/CloudFormation/Terraform o guía de consola
└─ docs/                 # justificación, diagrama, reporte
```

Comandos: `npm start` / `npm run dev` (local), `npm run build` (estáticos para S3), `aws s3 sync build/ s3://<bucket>`, `aws lambda update-function-code ...`.

Reglas de código de backend:
- Conexión a RDS fuera del handler y reutilizada (por el límite de conexiones).
- Consultas **parametrizadas** siempre (nada de concatenar SQL).
- Validar entradas y devolver 400/404/409/500 con mensaje claro.
- Headers CORS en toda respuesta.

---

## 10. Plan de construcción (5 pasos de la v1)

1. **Entorno y nube.** Repo, cuenta AWS con permisos IAM por integrante, Secrets Manager, buckets S3, VPC. *Prueba:* todos se autentican en AWS y clonan el repo.
2. **Bases de datos y datos iniciales.** Tablas RDS (`sucursales, socios, planes, membresias, pagos, accesos`) y DynamoDB (`Rutinas`, `Entrenamientos`) con datos de prueba; crear usuario `gymtrack_app`. *Prueba:* consultas SQL en RDS y Query/Scan básico en consola de DynamoDB.
3. **API de Membresías (Grupo A).** Lambdas + API Gateway: `GET /socios/{id}/membresia`, `POST /membresias/{id}/renovar` (+ accesos y CRUD de socios). *Prueba:* Postman y verificación del pago en RDS.
4. **API de Entrenamientos (Grupo B).** `POST /entrenamientos`, `GET .../evolucion`, `GET /rutina` (+ PUT/DELETE). *Prueba:* publicar un entrenamiento y verificar en DynamoDB que la SK `ejercicio#fecha_hora` quedó correcta.
5. **Frontend y conexión.** React con las 3 vistas (+ rutina opcional) desplegado en S3 + CloudFront. *Prueba:* desde el navegador renovar una membresía, registrar series y ver la gráfica avanzar.

### Orden recomendado para el demo y los riesgos
- Primero un endpoint de punta a punta (p. ej. `GET /socios/{id}/membresia`), luego avanzar.
- Riesgos: experiencia con AWS (empezar simple), Lambda↔RDS (VPC, Secrets Manager, RDS Proxy si hace falta), diseño de llaves de DynamoDB (definir consultas primero), costos (capa gratuita, instancia pequeña, AWS Budgets), datos personales (HTTPS, roles, BD no pública), tiempo (priorizar las 3 operaciones mínimas).

---

## 11. Definición de terminado (checklist de entrega)

- [ ] Diagrama de arquitectura (sección 3) exportado como imagen/PDF.
- [ ] Justificación escrita de cada base (sección 4) en el reporte.
- [ ] CRUD funcional en **RDS** (socios/membresías/pagos) y en **DynamoDB** (rutinas/entrenamientos).
- [ ] Demo con **GET y POST** reales desde el frontend.
- [ ] Secretos solo en Secrets Manager; usuario de BD limitado (`gymtrack_app`).
- [ ] Un rol IAM por Lambda con mínimo privilegio sobre recursos específicos (sin `*`).
- [ ] RDS no público; todo por HTTPS.
- [ ] Las 3 operaciones mínimas funcionan de punta a punta: renovar membresía, registrar entrenamiento, ver evolución.
- [ ] Reporte digital con capturas, endpoints, esquema de cada base, decisiones de seguridad y problemas encontrados.

---

## 12. Instrucciones para Claude Code

1. Lee este archivo completo. No inventes servicios fuera de los listados sin avisar.
2. Empieza por el paso 1 y avanza en orden; confirma cada prueba antes de pasar al siguiente.
3. Genera: `db/schema.sql`, `db/seed.sql`, `db/dynamodb_seed.json`, el código de las Lambdas, el frontend React con los tokens de la sección 8, y `docs/` con el reporte.
4. Para infraestructura, prefiere AWS SAM o CloudFormation si el equipo lo permite; si no, entrega una guía paso a paso de consola con los permisos IAM exactos (políticas JSON).
5. Nunca escribas credenciales reales; usa placeholders (`<ARN_DEL_SECRETO>`, `<BUCKET>`, `<API_URL>`).
6. Todos los textos visibles al usuario en español, usando los textos reales de la sección 7.
7. Cuando algo sea ambiguo, pregunta al equipo antes de decidir.
