# ARCHITECTURE.md

> El **por qué** de las decisiones técnicas. Para el **qué** ver `DATABASE_DESIGN.md` y `MODULE_REQUIREMENTS.md`. Para el **cuándo** ver `IMPLEMENTATION_PLAN.md`.

---

## 1. Tipo de sistema

CRM administrativo multi-tenant para iglesias pequeñas y medianas (Hispanic/bilingual en EE.UU.). Una iglesia = un tenant. Usuarios pertenecen a una o más iglesias con un rol específico. NO se accede al CRM como visitante público — para eso existe el "portal público" que es una vista read-only separada.

**Lo que NO es:**
- No es un ERP contable. Donaciones no son invoices.
- No es un sitio web público. El portal es una landing simple alimentada por `portal_settings.published_data`.
- No es un sistema de membresía con login para feligreses. Solo staff administrativo entra.
- No es un procesador de pagos. Stripe es la integración prevista, no el core.

---

## 2. Stack: decisiones y justificaciones

### 2.1 Frontend: React 18 + Vite
**Por qué Vite (no Webpack/CRA):**
- Dev server con HMR sub-segundo (CRA tarda 5-30s en proyectos medianos).
- Sin configuración para JSX + ES modules — funciona out-of-the-box.
- Build de producción con Rollup, tree-shaking eficiente.
- Soporta el "modo híbrido" actual: classic scripts + módulos en paralelo. Útil para migración gradual.

**Por qué React 18.3.1:**
- Ya estaba bundleado en el proyecto desde el demo design. No cambiamos.
- Concurrent features (useTransition, useDeferredValue) útiles para búsquedas debounced.

**Por qué NO TypeScript en v1:**
- El proyecto base es JS plano. Migrar agrega ~2-3 días de fricción inicial.
- En v2 (cuando estabilice el modelo de datos) se puede migrar a TS con `tsc --allowJs` gradual.
- Validación runtime con `zod` cubre lo crítico.

### 2.2 Backend: Supabase
**Por qué Supabase:**
- PostgreSQL real (no Firebase NoSQL) → SQL, JOINs, transactions, índices reales.
- RLS nativo → multi-tenant sin escribir middleware.
- Auth integrado (email/password, OAuth, magic links).
- Storage para logos/PDFs.
- Edge Functions (Deno) para lógica server-side sin gestionar infra.
- Generoso free tier para v1.

**Por qué NO un backend Node/Express custom:**
- Más infra que mantener (deploy, monitoring, secrets).
- Más latencia (frontend → backend → DB vs frontend → DB con RLS).
- Más código que probar.
- Para el alcance del CRM, RLS + RPC functions cubre todos los casos.

**Cuando moveríamos a backend custom:**
- Si necesitamos integraciones síncronas pesadas (procesar webhooks de varios proveedores en cadena).
- Si los Edge Functions de Deno limitan (tiempo de ejecución, librerías).
- Si necesitamos hosting de servicios long-running (cron jobs complejos, queues).

### 2.3 Multi-tenancy: one DB + church_id + RLS
**Modelo:** una sola base de datos PostgreSQL, cada fila tenant-scoped tiene `church_id UUID`. RLS policies filtran por iglesia.

**Por qué NO DB-per-tenant:**
- 100 iglesias = 100 DBs = nightmare de migraciones.
- Backups, monitoring, schema drift = caro.
- Conexiones DB caras (no se pueden compartir entre tenants).

**Por qué NO schema-per-tenant:**
- Mismo problema de migraciones x100.
- pg_dump complejo.
- RLS por church_id es más simple y suficiente.

**El patrón core:**
```sql
CREATE OR REPLACE FUNCTION user_church_ids()
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(array_agg(church_id), '{}')
  FROM church_users
  WHERE user_id = auth.uid() AND is_active = true;
$$;

CREATE POLICY donations_select ON donations FOR SELECT
  USING (church_id = ANY (user_church_ids()));
```

`SECURITY DEFINER` corre como el owner (postgres), evitando recursión RLS. `STABLE` permite cache de resultados por query.

### 2.4 Money: BIGINT cents
**Por qué cents:**
- `BIGINT` es exacto, sin precisión float.
- Operaciones SUM/AVG son nativas y rápidas.
- Compatible con Stripe (que usa cents nativamente).
- Soporta hasta ~$92 quadrillion. Sobrado.

**Por qué NO `NUMERIC(15,2)`:**
- Más lento que BIGINT en aggregations.
- Más verboso en queries.
- Conversión a/desde cents en frontend no es problema.

**Conversiones en frontend (`src/lib/money.js`):**
```js
export const centsToDisplay = (cents) =>
  '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const displayToCents = (s) =>
  Math.round(parseFloat(s.replace(/[^0-9.-]/g, '')) * 100);
```

### 2.5 Tiempo: TIMESTAMPTZ
Siempre con timezone. UTC en DB, conversión en frontend con `date-fns-tz` usando `church.timezone`. Nunca plain `TIMESTAMP` (provoca bugs sutiles con cambios de horario).

### 2.6 Estados: TEXT + CHECK constraint (no ENUMs nativos)
**Por qué CHECK constraint:**
- Agregar/quitar valores no requiere `ALTER TYPE ... ADD VALUE` que tiene problemas en producción (no se puede dentro de una transacción).
- Más portable (otros DBs).
- En PostgreSQL, `CHECK (val IN (...))` con un índice secundario es comparable en performance.

**Ejemplo:**
```sql
payment_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (payment_status IN ('pending','paid','failed','refunded','disputed'))
```

### 2.7 Soft delete con `deleted_at`
**Por qué:**
- Borrar persona destruiría historial de donaciones (FK).
- Auditoría requiere "ver lo borrado".
- Restore es trivial (`UPDATE SET deleted_at = NULL`).

**Implementación:**
- `deleted_at TIMESTAMPTZ` en: people, donations, campaigns, funds, churches.
- Índices con `WHERE deleted_at IS NULL` para que queries activas sean rápidas.
- RLS policies filtran soft-deleted en SELECT por defecto.
- **Inmutable** (no soft delete): audit_logs, receipt_deliveries, contribution_receipts. Estas SON el historial.

### 2.8 Auditoría dual
- **Trigger DB** en operaciones críticas (INSERT/UPDATE/DELETE en donations, receipts, portal_settings, church_users) → escribe a `audit_logs`.
- **App-layer audit call** en operaciones contextuales (ej: "reenvío de recibo con motivo X") porque el trigger no tiene contexto de la razón.
- Resultado: garantía DB-level + contexto user-level.

### 2.9 JSONB selectivo
**Cuándo usar JSONB:**
- `portal_settings.draft_data` y `published_data`: el contenido del portal es estructurado pero su esquema cambia (más secciones futuras). JSON es perfecto.
- `audit_logs.before` / `audit_logs.after`: snapshot del estado, naturalmente jsonb.
- `churches.address`: street/city/state/zip son cohesivos, jsonb es práctico.

**Cuándo NO usar JSONB:**
- Datos que se filtran/agrupan/ordenan frecuentemente → columnas reales.
- Money, dates, foreign keys → siempre columnas tipadas.
- Tags de personas → tabla normalizada (queries por tag son comunes).

### 2.10 Materialized views para dashboard
**Problema:** dashboard hace agregaciones sobre miles de donaciones cada vez que se carga.

**Solución:**
- `mv_church_monthly_donations` pre-agrega `(church_id, year, month, fund_id) → SUM(amount), COUNT(*)`.
- Refresh con `pg_cron` cada 5 minutos: `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_church_monthly_donations;`.
- Vista normal `vw_campaign_progress` para datos que cambian frecuentemente (campaign progress).

**Trade-off:** datos del dashboard pueden ser hasta 5 min stale. Aceptable para KPIs. Reportes filtrados usan queries en vivo.

---

## 3. Modelo de seguridad

### 3.1 Capas

```
┌─────────────────────────────────────────────────┐
│ 1. Network (Supabase HTTPS, CORS configurado)   │
├─────────────────────────────────────────────────┤
│ 2. Auth (Supabase JWT, expiración 1h, refresh) │
├─────────────────────────────────────────────────┤
│ 3. RLS (policies por tabla, user_church_ids())  │
├─────────────────────────────────────────────────┤
│ 4. Role-based (matriz de permisos en policies) │
├─────────────────────────────────────────────────┤
│ 5. App validation (zod schemas en formularios) │
├─────────────────────────────────────────────────┤
│ 6. Audit (triggers + app-layer logs)            │
└─────────────────────────────────────────────────┘
```

### 3.2 Roles y permisos

Roles en `church_users.role` (TEXT con CHECK):
- `admin` — full access. Único que invita usuarios.
- `pastor` — todo excepto gestionar usuarios.
- `treasurer` — finanzas (donaciones, fondos, recibos, Stripe).
- `secretary` — personas, portal, recibos básicos.
- `leader` — read-only general.
- `viewer` — read-only restringido.

Matriz en `DATABASE_DESIGN.md` §6.

### 3.3 Llaves y secrets

| Llave | Dónde vive | Quién la ve |
|---|---|---|
| Publishable key (anon) | Frontend `.env.local` + browser | Cualquiera (es pública) |
| Service role key | Supabase secrets (Edge Functions only) | Solo Edge Functions |
| DB password | `.env.local` (solo para `supabase link`) | Solo dev local |
| JWT secret | Supabase managed | Solo Supabase Auth |
| Stripe secret key | Supabase secrets | Solo Edge Functions |
| Stripe webhook secret | Supabase secrets | Solo Edge Functions |
| Resend API key | Supabase secrets | Solo Edge Functions |

**Regla:** Si la llave puede crear/modificar datos sensibles, vive server-side. Solo `publishable` (anon, RLS-bounded) está en el browser.

### 3.4 Autenticación: invite-only

Sin sign-up público. Disable en Supabase Dashboard → Auth → Providers → Email → "Disable email signup".

**Flujo de invitación:**
1. Admin invita desde Configuración → Usuarios.
2. Edge function `invite-user`:
   - Verifica que caller sea admin (vía JWT + `church_users`).
   - Inserta `church_invitations` row (token, expires_at +7d).
   - Llama `supabase.auth.admin.inviteUserByEmail(email, { data: { invitation_token, church_id } })`.
   - Resend envía email con link `https://app.com/accept-invite?token=...`.
3. Usuario abre link → página `AcceptInvite.jsx` valida token contra `church_invitations`.
4. Usuario fija password → Supabase Auth crea fila en `auth.users`.
5. Trigger DB `on_auth_user_created`:
   - Lee `invitation_token` de `raw_user_meta_data`.
   - Match con `church_invitations`.
   - Inserta `church_users(user_id, church_id, role, is_active=true)`.
   - Marca `church_invitations.accepted_at`.
6. Usuario entra al CRM.

### 3.5 Cross-tenant testing
Fase 12 incluye:
- Crear iglesia B + 1 usuario.
- Cada tabla: query con usuario A no devuelve filas de iglesia B.
- Endpoint de testing en Supabase SQL editor con `set local "request.jwt.claims" to '{...}'`.

---

## 4. Capa de datos: cliente

### 4.1 Single supabase client
```js
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
```

### 4.2 API layer pattern
Cada `src/api/*.js` exporta funciones puras que envuelven supabase queries. Sin caching propio (en v1). React Query/SWR en Fase 11 si hay re-fetch patterns problemáticos.

```js
// src/api/people.js
import { supabase } from '../lib/supabase';

export async function listPeople(churchId, { search, status, limit = 100 } = {}) {
  let q = supabase
    .from('people')
    .select(`
      *,
      tags:person_tag_assignments(tag:person_tags(*))
    `)
    .eq('church_id', churchId)
    .is('deleted_at', null)
    .order('last_activity_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (status && status !== 'all') q = q.eq('status', status);
  if (search) {
    const escaped = search.replace(/[%_]/g, '\\$&');
    q = q.or(`first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,email.ilike.%${escaped}%,phone.ilike.%${escaped}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data;
}
```

### 4.3 Hooks de contexto
- `useAuth()` → `{ session, user, loading }` desde `supabase.auth`.
- `useChurch()` → `{ church, switchChurch }` desde `church_users` join.
- `useRole()` → `{ role, can(action) }` matriz de permisos.
- `useToast()` → wrapper sobre el sistema de toasts existente.

### 4.4 RPC functions
Para operaciones que requieren transacciones atómicas o lógica server-side:
- `rpc_register_donation(church_id, person_id, amount_cents, fund_id, ...)` → crea donation + receipt en transaction.
- `rpc_resend_receipt(receipt_id, reason)` → inserta receipt_deliveries SIN duplicar donation.
- `rpc_publish_portal(church_id)` → copia draft → published.
- `rpc_assign_receipt_number(church_id) → text` → lock-safe sequencing.
- `rpc_dashboard_kpis(church_id, anchor_date) → jsonb` → un round-trip para todos los KPIs.

Llamadas desde frontend:
```js
const { data, error } = await supabase.rpc('rpc_register_donation', {
  p_church_id: churchId,
  p_person_id: personId,
  p_amount_cents: amountCents,
  // ...
});
```

---

## 5. Edge Functions

Ubicadas en `supabase/functions/*/index.ts` (Deno + TypeScript).

### 5.1 invite-user
- Input: `{ email, role, church_id }`.
- Validaciones: caller debe ser admin de `church_id`.
- Acciones: insert `church_invitations`, `auth.admin.inviteUserByEmail()`.
- Output: `{ invitation_id, expires_at }`.

### 5.2 send-receipt-email
- Input: `{ receipt_id, recipient_email?, reason }`.
- Acciones: fetch receipt + church + person; renderiza HTML template; envía via Resend; inserta `receipt_deliveries`.
- Output: `{ delivery_id, status }`.

### 5.3 send-report-email
- Input: `{ report_type, filters, recipients[] }`.
- Acciones: stub v1 que solo loguea + responde 200.

### 5.4 stripe-webhook (stub)
- Input: Stripe event payload con `Stripe-Signature` header.
- Acciones v1: validar signature, log event, responder 200. Procesamiento TODO.

### 5.5 stripe-create-checkout (stub)
- Input: `{ amount_cents, fund_id, donor_email }`.
- Acciones v1: responder 501 Not Implemented.

---

## 6. Storage

Bucket: `church-assets` (public read para logos/hero de iglesias publicadas; private para PDFs).

Estructura:
```
church-assets/
├── {church_id}/
│   ├── logo.png
│   ├── hero.jpg
│   ├── receipts/
│   │   └── {receipt_id}.pdf
│   └── exports/
│       └── {timestamp}.xlsx
```

Policies:
- `INSERT/UPDATE/DELETE` → solo usuarios autenticados con role apropiado en esa church_id.
- `SELECT` público para `logo.png` y `hero.jpg`.
- `SELECT` privado para `receipts/*` (solo donante asociado y staff de la iglesia).

---

## 7. Errores y observabilidad

### 7.1 Errores en frontend
- Toda llamada API en try/catch.
- Error a usuario: toast con tone='error' + mensaje legible (no stack trace).
- Error a console: full stack trace.
- Error crítico (write fallido): insertar en `audit_logs` con `action='error.{type}'`.

### 7.2 Logging server-side
- Edge Functions: `console.log/error` → Supabase Functions Logs dashboard.
- DB: `audit_logs` table.
- Stripe webhook events: logged to `audit_logs` + Stripe Dashboard.

### 7.3 Métricas (futuro v2)
- Supabase Realtime para ver actividad live.
- Posthog o Plausible para analytics frontend.
- Sentry para errores frontend (cuando producción).

---

## 8. Performance

### 8.1 Queries
- Indexes en todas las foreign keys + columnas filtradas frecuentemente.
- Composite indexes empiezan con `church_id`.
- `EXPLAIN ANALYZE` durante Fase 12 sobre queries del dashboard.

### 8.2 Frontend
- Lazy load de screens via React.lazy + Suspense (Fase 11).
- Debounce de search (300ms).
- Pagination de tablas grandes (≥100 rows).
- Skeleton screens durante cargas.

### 8.3 Build
- Code splitting automático por Vite.
- Tree shaking de `xlsx` y `pdfmake` (solo importar lo necesario).
- Brotli compression en producción.

---

## 9. Decisiones que NO tomamos

- **No React Native ni mobile app**: el demo es web responsive. PWA en v2.
- **No GraphQL**: REST/RPC de Supabase es suficiente, menos complejidad.
- **No microservices**: monolito + Edge Functions específicas.
- **No queue system**: Supabase no tiene built-in queues. Si necesitamos, evaluamos pg_cron + tabla `task_queue` en v2.
- **No internationalization en v1**: textos en español. `churches.locale` se guarda pero no se usa hasta v2.
- **No multi-currency en v1**: USD hardcoded. Columna `currency` ya existe en donations.

---

## 10. Migración futura (v2+)

| Disparador | Cambio |
|---|---|
| >10K donaciones/iglesia | Particionar `donations` por `donation_date` (mensual) |
| >50 iglesias | Connection pooling con PgBouncer; evaluar dedicated Supabase plan |
| Email volumen alto | Migrar Resend → SES o dedicated SMTP |
| Latencia Edge Functions | Mover lógica crítica a backend Node propio |
| Multi-idioma | i18n con react-intl + columna `locale` |
| Multi-currency | Currency rates table + conversion helpers |
| Mobile native | React Native compartiendo capa `api/` |
