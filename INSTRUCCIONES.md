# Cómo correr GymTrack en tu computadora

Por ahora la aplicación funciona **sin AWS**: trae una API simulada dentro del navegador con datos de demostración
(socios, membresías, pagos, rutinas y entrenamientos). Todo lo que hagas (renovar, registrar, editar, borrar) se guarda
en el navegador.

## Inicio rápido

Si ya tienes Node.js y el repo descargado:

```powershell
cd frontend
npm install     # solo la primera vez
npm run dev     # abre http://localhost:5173
```

Si algo falla, sigue los pasos completos de abajo o revisa la sección 8, **Problemas comunes**.

---

## 1. Requisitos (solo la primera vez)

| Programa | Versión | Cómo verificar |
|---|---|---|
| **Node.js** | 18 o superior (recomendado 20 o 22 LTS; probado también con 24) | `node -v` |
| **npm** | viene con Node | `npm -v` |
| **Git** | cualquiera reciente | `git --version` |

Si no tienes Node, descárgalo de <https://nodejs.org> (botón **LTS**), instálalo con las opciones por defecto y **cierra y
vuelve a abrir** la terminal. Git se descarga de <https://git-scm.com>.

---

## 1.1 Descargar el proyecto (compañeros de equipo)

```powershell
git clone https://github.com/Streext2/Integradora_Optativa.git
cd Integradora_Optativa
```

Para traer los cambios más recientes después: `git pull` (si cambió `package.json`, vuelve a correr `npm install`).

> Recomendado: clónalo **fuera de OneDrive** (por ejemplo, `C:\dev`) para evitar errores al instalar.

---

## 2. Abrir una terminal en la carpeta del frontend

**Opción A: PowerShell o CMD**
```powershell
cd "C:\Users\jorge\OneDrive\Documentos\Integradora_Optativa\frontend"
```

**Opción B: VS Code**
1. `Archivo → Abrir carpeta…` → elige `Integradora_Optativa`.
2. `Terminal → Nueva terminal`.
3. Escribe `cd frontend`.

> Si un compañero clonó el repo en otra ruta, solo entra a la carpeta `frontend` de su copia.

---

## 3. Instalar dependencias (solo la primera vez o si cambia `package.json`)

```powershell
npm install
```

Tarda de 1 a 5 minutos. Se crea la carpeta `node_modules/`, que **no se sube a Git** (ya está en `.gitignore`).

> **OneDrive:** como el proyecto está dentro de OneDrive, la instalación puede ir lenta o fallar con errores tipo
> `EPERM` / `EBUSY`. Si pasa, pausa la sincronización de OneDrive (ícono de la nube → *Pausar sincronización*) y vuelve a
> correr `npm install`. Otra opción es clonar el repo fuera de OneDrive, por ejemplo en `C:\dev\Integradora_Optativa`.

---

## 4. Correr la aplicación

```powershell
npm run dev
```

Verás algo así:

```
  VITE v5.x  ready in 500 ms
  ➜  Local:   http://localhost:5173/
```

El navegador se abre solo. Si no, entra a **<http://localhost:5173>**.

Para **detenerla**: en la terminal presiona `Ctrl + C`.

---

## 5. Cómo usarla (recorrido para el demo)

En la barra superior, los botones **Socio · Recepción · Entrenador** cambian de rol (todavía no hay inicio de sesión).

### Socio (rol por defecto · Mariana López)
1. **Mi membresía** → plan Mensual, sucursal Centro, vence 15/12/2026 → **Renovar membresía** → elige plan y método →
   confirma. Aparece el pago nuevo en *Últimos pagos*.
2. **Registrar entrenamiento** → ejercicio *Press banca* con 3 series → **Guardar entrenamiento** → toast
   "Entrenamiento guardado".
3. **Evolución del ejercicio** → gráfica de Press banca 40 → 50 kg, *Mejor marca* y *Progreso*. Abajo puedes **editar**
   o **eliminar** sesiones.
4. **Mi rutina** → días con ejercicios; al hacer clic en un ejercicio te lleva a registrarlo.

Con el selector de socio de la barra superior cambias de socio de demostración. Hay socios con la membresía **por vencer** (Luis) y **vencida** (Daniela); el estado depende de la fecha de hoy.

### Recepción
- **Socios** → alta (**Nuevo socio**), editar, **Renovar**, registrar acceso y dar de baja. Filtros por estado y buscador.
- **Control de acceso** → registra entradas por sucursal. Si la membresía está vencida, el acceso se **rechaza**
  (prueba con Daniela).

### Entrenador
- **Rutinas** → elige un socio → crea, edita o elimina rutinas (ejercicios por series o cardio por minutos).

### Restablecer los datos
Abajo en la barra lateral: **"Modo demostración · Restablecer"** regresa todo a los datos originales.

---

## 6. Generar la versión para producción (para S3, en la fase AWS)

```powershell
npm run build      # crea la carpeta build/
npm run preview    # (opcional) sirve build/ en http://localhost:4173 para probarla
```

La carpeta `build/` es la que se sube al bucket de S3 (`aws s3 sync build/ s3://<BUCKET>`).

---

## 7. Conectarla al API real (cuando exista)

1. Copia `frontend/.env.example` como `frontend/.env`.
2. Pon la URL del API Gateway:
   ```
   VITE_API_URL=https://<API_ID>.execute-api.us-east-1.amazonaws.com/prod
   ```
3. Vuelve a correr `npm run dev` (o `npm run build`). Con esa variable la app deja de usar los datos simulados.

---

## 8. Problemas comunes

| Síntoma | Solución |
|---|---|
| `'npm' no se reconoce como un comando…` | Node no está instalado o falta reabrir la terminal después de instalarlo. |
| `npm install` falla con `EPERM`, `EBUSY` o se queda trabado | Pausa OneDrive o mueve el proyecto fuera de OneDrive, borra `node_modules` y repite. |
| `npm install` falla con `ECONNRESET`, `ETIMEDOUT` o `npm error network` | Tu red no deja llegar a `registry.npmjs.org` (red escolar, firewall, antivirus o VPN). Cambia de red (por ejemplo, datos del celular), desactiva la VPN o revisa el proxy con `npm config get proxy`. Prueba la conexión abriendo <https://registry.npmjs.org/vite> en el navegador. |
| `Port 5173 is in use` | Ya hay otra instancia corriendo; ciérrala con `Ctrl + C` o Vite usará el siguiente puerto (5174). |
| Scripts deshabilitados en PowerShell (`running scripts is disabled`) | Usa CMD, o ejecuta una vez: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. |
| La página sale en blanco | Abre la consola del navegador (F12) y revisa el error; prueba **Restablecer** datos o borra el localStorage del sitio. |
| Los datos "desaparecieron" | Se guardan por navegador: otro navegador o una ventana de incógnito arrancan con los datos demo. |
