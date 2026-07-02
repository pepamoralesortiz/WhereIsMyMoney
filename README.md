# Finance Tracker

PWA personal de finanzas con **contabilidad de partida doble**.
Stack: **Next.js 16 (App Router, TypeScript) + Tailwind v4**, backend en
**Supabase** (Postgres + Auth), desplegable en **Vercel**.

La sesión se maneja por **cookies** vía `@supabase/ssr` (nada de `localStorage`
para datos de negocio) y toda lectura/escritura respeta **RLS**.

## Requisitos

- Node.js 20+ (probado con Node 25)
- Un proyecto de Supabase con el esquema ya aplicado (`01_esquema.sql`)

## Configuración local

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Crea `.env.local` a partir del ejemplo y rellena los valores
   (Supabase → **Project Settings → API**):

   ```bash
   cp .env.example .env.local
   ```

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-o-publishable-key
   ```

   > Usa la **anon key** o la nueva **publishable key** (`sb_publishable_...`).
   > **Nunca** uses la `service_role` key en el cliente.

3. Arranca en desarrollo:

   ```bash
   npm run dev
   ```

   Abre <http://localhost:3000>. Sin sesión te redirige a `/login`.

## Autenticación

- Método: **email + contraseña** (`signInWithPassword` / `signUp`).
- Si en Supabase tienes activada la confirmación de email
  (**Authentication → Sign In / Providers → Email → Confirm email**), tras
  registrarte deberás confirmar el correo antes de iniciar sesión. Para pruebas
  rápidas puedes desactivarla temporalmente.
- Las rutas están protegidas por `proxy.ts` (antes "middleware"): cualquier
  ruta que no sea `/login` o `/auth` redirige a `/login` sin sesión.

## Scripts

| Script          | Descripción                                                |
| --------------- | ---------------------------------------------------------- |
| `npm run dev`   | Desarrollo (Webpack; el service worker está deshabilitado) |
| `npm run build` | Build de producción (Webpack; genera `public/sw.js`)       |
| `npm run start` | Sirve el build de producción                               |
| `npm run lint`  | ESLint                                                      |

> Se usa **Webpack** (`--webpack`) en lugar de Turbopack porque `@serwist/next`
> lo requiere para compilar el service worker.

## PWA

- Manifest generado en `app/manifest.ts` → `/manifest.webmanifest`.
- Íconos en `public/icons/` (placeholder teal; reemplázalos por los tuyos).
- Service worker con `@serwist/next` (fuente en `app/sw.ts`, salida
  `public/sw.js`). **Deshabilitado en desarrollo**; sólo activo en producción.
- Para probar "agregar a pantalla de inicio", corre `npm run build && npm run
  start` (o el deploy de Vercel) y ábrelo en el teléfono.

## Estructura

```
app/
  layout.tsx          # metadata + viewport (theme-color, PWA)
  manifest.ts         # PWA manifest
  sw.ts               # service worker (Serwist)
  page.tsx            # redirige a /dashboard
  login/
    page.tsx          # formulario email + contraseña
    actions.ts        # server actions: login / signup
  dashboard/
    page.tsx          # protegido; lee la vista v_saldos
    actions.ts        # server action: signout
lib/supabase/
  client.ts           # cliente browser
  server.ts           # cliente server (cookies)
  middleware.ts       # helper updateSession (refresco de sesión + guardas)
proxy.ts              # entry del proxy/middleware de Next 16
next.config.ts        # withSerwist
```

## Deploy en Vercel

1. Sube el repo a GitHub e importa el proyecto en Vercel.
2. En **Settings → Environment Variables** añade (Production y Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Framework: **Next.js** (autodetectado). Deploy.
4. En Supabase → **Authentication → URL Configuration**, añade la URL de
   Vercel a **Site URL** y **Redirect URLs**.

## Notas del modelo de datos

- Plan de cuentas unificado (`cuentas`), asientos y `partidas` (partida doble,
  cada asiento suma 0, validado por trigger).
- Informes vía RPC: `balance_general`, `estado_resultados`,
  `presupuesto_vs_real`, `patrimonio_mensual`. Vista de saldos: `v_saldos`.
- El dashboard lee `v_saldos` de forma defensiva (por nombre de columna con
  fallbacks) hasta confirmar los nombres exactos de la vista.
```
