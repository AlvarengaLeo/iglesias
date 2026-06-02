# SUPABASE_SETUP.md

> Runbook operativo. Para el **por qué** ver `ARCHITECTURE.md`. Para el **schema** ver `DATABASE_DESIGN.md`.

---

## 1. Proyecto Supabase

| Atributo | Valor |
|---|---|
| Project ref | `dcmdcmpqowwntdtkrlfm` |
| URL | `https://dcmdcmpqowwntdtkrlfm.supabase.co` |
| Publishable key | `sb_publishable_5-FwR0eTfmw6Jw9lGMooNQ_cZjQVQyk` |
| Direct connection | `postgresql://postgres:[YOUR-PASSWORD]@db.dcmdcmpqowwntdtkrlfm.supabase.co:5432/postgres` |

---

## 2. Prerequisitos

- Node.js ≥ 18 (ya instalado en este equipo: v24).
- npm ≥ 9.
- Supabase CLI: `npm install -g supabase` o `scoop install supabase`.
- Cuenta Supabase con acceso al proyecto.
- (Opcional v1, requerido v2) Cuenta Resend con API key.

Verificar:
```bash
node --version       # v24.16+
npm --version        # 11.13+
supabase --version   # 1.x
```

---

## 3. Variables de entorno

### 3.1 Frontend (`.env.local` en la raíz del proyecto)

```bash
# Supabase (públicos, OK en browser)
VITE_SUPABASE_URL=https://dcmdcmpqowwntdtkrlfm.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_5-FwR0eTfmw6Jw9lGMooNQ_cZjQVQyk

# Stripe (Phase 4+; opcional v1)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# App
VITE_APP_URL=http://localhost:5173
```

### 3.2 Server-side (Supabase secrets — Edge Functions)

Configurar via CLI:
```bash
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set RESEND_FROM_EMAIL=recibos@casaderestauracion.org
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

Verificar:
```bash
supabase secrets list
```

### 3.3 Local dev (`.env.local` para `supabase link`)

```bash
SUPABASE_DB_PASSWORD=tu-password-aqui
```

**⚠️ NUNCA commits `.env.local`.** Ya está en `.gitignore`.

---

## 4. Setup inicial (una sola vez)

```bash
# 1. Instalar CLI
npm install -g supabase

# 2. Login
supabase login

# 3. En la raíz del proyecto:
cd C:\Users\leo-e\Desktop\iglesia
supabase init

# 4. Linkear al proyecto
supabase link --project-ref dcmdcmpqowwntdtkrlfm
# (Te pedirá el DB password)
```

Esto crea:
```
supabase/
├── config.toml          # configuración del proyecto local
├── migrations/          # SQL files
├── functions/           # Edge functions
└── seed.sql             # data inicial
```

---

## 5. Migraciones

### 5.1 Crear una nueva migración

```bash
supabase migration new <nombre_descriptivo>
# Ejemplo:
supabase migration new add_donation_notes_field
```

Esto crea `supabase/migrations/{timestamp}_add_donation_notes_field.sql` vacío.

### 5.2 Aplicar migraciones al proyecto remoto

```bash
supabase db push
```

Esto ejecuta cualquier migración que no esté aún aplicada en remoto.

### 5.3 Reset local (drop + re-apply + seed)

```bash
supabase db reset
```

**⚠️ Esto destruye todos los datos locales. Solo en local.**

### 5.4 Ver el estado

```bash
supabase migration list
```

### 5.5 Migraciones de Fase 2 (orden de ejecución)

```
20260528120001_extensions.sql
20260528120002_core_tables.sql
20260528120003_people.sql
20260528120004_finance.sql
20260528120005_portal.sql
20260528120006_audit.sql
20260528120007_indexes.sql
20260528120008_functions.sql
20260528120009_views.sql
20260528120010_rls.sql
20260528120011_triggers.sql
```

Contenido detallado en `DATABASE_DESIGN.md`.

---

## 6. Seed data

### 6.1 Archivo `supabase/seed.sql`

Se aplica automáticamente cuando ejecutas `supabase db reset` (solo en local).

Contenido (resumen — código completo se genera en Fase 3):
```sql
-- 1 iglesia
INSERT INTO churches (id, legal_name, public_name, slug, ein, address, phone, email, ...) VALUES (...);

-- 3 usuarios auth (en producción se hace via Supabase Auth Admin API; en seed local con auth.users INSERT directo)
INSERT INTO auth.users (id, email, encrypted_password, ...) VALUES (...);

-- church_users vínculos
INSERT INTO church_users (church_id, user_id, role) VALUES (...);

-- 4 fondos
INSERT INTO funds (church_id, name, code, ...) VALUES (...);

-- 3 campañas
INSERT INTO campaigns (church_id, name, goal_cents, ...) VALUES (...);

-- 12 personas
INSERT INTO people (church_id, first_name, last_name, status, ...) VALUES (...);

-- 25 donaciones
INSERT INTO donations (church_id, donor_person_id, amount_cents, fund_id, ...) VALUES (...);

-- 15 recibos + 18 deliveries
-- 1 portal_settings
-- 4 service_times
```

### 6.2 Re-seed sin destruir schema (solo data)

```bash
psql $DATABASE_URL -f supabase/seed.sql
```

O via SQL Editor en Supabase Dashboard.

### 6.3 Crear usuarios via Auth Admin API (recomendado para producción)

En `supabase/seed-auth.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

await supabase.auth.admin.createUser({
  email: 'miguel@casaderestauracion.org',
  password: 'temporal-password-change-me',
  email_confirm: true,
  user_metadata: { full_name: 'Miguel Ángel Rodríguez' }
});
```

Ejecutar con `npx tsx supabase/seed-auth.ts`.

---

## 7. Edge Functions

### 7.1 Crear nueva function

```bash
supabase functions new invite-user
```

Crea `supabase/functions/invite-user/index.ts`.

### 7.2 Deploy

```bash
supabase functions deploy invite-user
```

### 7.3 Listar deployadas

```bash
supabase functions list
```

### 7.4 Logs

```bash
supabase functions logs invite-user --tail
```

O via Dashboard → Edge Functions → Logs.

### 7.5 Functions de v1

| Función | Status | Descripción |
|---|---|---|
| `invite-user` | activa | Crea invitación + Auth invite + Resend email |
| `send-receipt-email` | activa | Envía PDF de recibo via Resend |
| `send-report-email` | stub | Placeholder en v1 |
| `stripe-webhook` | stub con signature validation | Recibe eventos Stripe; logs solamente |
| `stripe-create-checkout` | stub | Returns 501 |

### 7.6 Local dev de functions

```bash
supabase functions serve invite-user --env-file .env.local
```

Llamar desde frontend:
```js
const { data, error } = await supabase.functions.invoke('invite-user', {
  body: { email: 'test@example.com', role: 'secretary', church_id: '...' }
});
```

---

## 8. Storage

### 8.1 Crear bucket

Via SQL (en una migración):
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'church-assets',
  'church-assets',
  true,  -- public for logos/hero (read), private for receipts
  10485760,  -- 10MB
  ARRAY['image/png','image/jpeg','image/webp','application/pdf']
);
```

### 8.2 Policies

```sql
-- Upload: any authenticated user in the church
CREATE POLICY "users can upload to their church folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'church-assets'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1]::uuid = ANY (user_church_ids())
);

-- Read public assets (logos, hero images)
CREATE POLICY "public read of logos and hero images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'church-assets'
  AND (name LIKE '%/logo.%' OR name LIKE '%/hero.%')
);

-- Read receipts: only church members
CREATE POLICY "church members read receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'church-assets'
  AND name LIKE '%/receipts/%'
  AND (storage.foldername(name))[1]::uuid = ANY (user_church_ids())
);
```

### 8.3 Subir desde frontend

```js
const { data, error } = await supabase.storage
  .from('church-assets')
  .upload(`${churchId}/logo.png`, file, { upsert: true });
```

### 8.4 URL pública

```js
const { data } = supabase.storage
  .from('church-assets')
  .getPublicUrl(`${churchId}/logo.png`);
// data.publicUrl
```

### 8.5 URL firmada (privada, expira)

```js
const { data, error } = await supabase.storage
  .from('church-assets')
  .createSignedUrl(`${churchId}/receipts/${receiptId}.pdf`, 3600);  // 1h
```

---

## 9. Auth: configuración del proyecto

### 9.1 Disable public signup

Dashboard → Authentication → Providers → Email:
- ☑️ Enable Email provider
- ☐ Enable email signup (DISABLE)
- ☑️ Confirm email
- ☑️ Secure email change

### 9.2 Redirect URLs

Dashboard → Authentication → URL Configuration:
- Site URL: `http://localhost:5173` (dev) o `https://app.casaderestauracion.org` (prod)
- Redirect URLs (allowed):
  - `http://localhost:5173/**`
  - `http://localhost:5173/accept-invite`
  - `http://localhost:5173/reset-password`
  - producción equivalentes

### 9.3 Email templates

Dashboard → Authentication → Email Templates:
- **Invite user**: customize subject "Invitación a Iglesia Casa de Restauración"
- **Reset password**: customize text en español
- **Magic link**: deshabilitado v1
- Configure SMTP custom con Resend (Settings → Auth → SMTP):
  - Host: `smtp.resend.com`
  - Port: `465`
  - User: `resend`
  - Password: `re_...` (API key)
  - Sender: `recibos@casaderestauracion.org`

### 9.4 JWT settings

Dashboard → Authentication → Settings:
- JWT expiry: 3600 (1 hour) — default OK.
- Refresh token rotation: enabled.
- Max sessions per user: 5.

---

## 10. RLS testing

### 10.1 Verificar policies

En SQL Editor del Dashboard:
```sql
-- Simular un usuario específico:
SET LOCAL "request.jwt.claims" TO '{"sub": "user-uuid-here", "role": "authenticated"}';

-- Probar query:
SELECT * FROM donations WHERE church_id = 'church-uuid';
-- Debería devolver solo donaciones de iglesias donde el user_id está en church_users.
```

### 10.2 Script de prueba cross-tenant (Fase 12)

`scripts/test-rls-isolation.sql`:
```sql
-- Login como usuario de iglesia A
SET LOCAL "request.jwt.claims" TO '{"sub": "<user_a_uuid>", "role": "authenticated"}';

-- Debe devolver filas:
SELECT count(*) FROM donations WHERE church_id = '<church_a_uuid>';

-- Debe devolver 0:
SELECT count(*) FROM donations WHERE church_id = '<church_b_uuid>';

-- Repetir para cada tabla tenant-scoped.
```

---

## 11. pg_cron jobs

### 11.1 Habilitar extension (en migración _01_extensions.sql)

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO postgres;
```

### 11.2 Programar refresh de materialized view

```sql
SELECT cron.schedule(
  'refresh-monthly-donations',
  '*/5 * * * *',  -- cada 5 min
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_church_monthly_donations$$
);
```

### 11.3 Listar jobs

```sql
SELECT * FROM cron.job;
```

### 11.4 Unschedule

```sql
SELECT cron.unschedule('refresh-monthly-donations');
```

---

## 12. Backup y restore

### 12.1 Backup de schema

```bash
supabase db dump --schema public > backups/schema-$(date +%Y%m%d).sql
```

### 12.2 Backup de data

```bash
supabase db dump --data-only > backups/data-$(date +%Y%m%d).sql
```

### 12.3 Restore (solo en local)

```bash
psql $DATABASE_URL < backups/schema-20260601.sql
```

Supabase Dashboard también tiene snapshots automáticos diarios en Pro plan.

---

## 13. Deployment frontend

### 13.1 Build de producción

```bash
npm run build
```

Output en `dist/`.

### 13.2 Hosting options

- **Vercel** (recomendado): `vercel --prod`. Auto-detect Vite.
- **Netlify**: drag-drop `dist/`.
- **Cloudflare Pages**: connect repo + build command `npm run build`.
- **Self-hosted**: cualquier nginx/Apache servando `dist/`.

### 13.3 Env vars en producción

Cada plataforma tiene su lugar para env vars:
- Vercel: Project Settings → Environment Variables.
- Netlify: Site settings → Build & deploy → Environment.

Asegurar que `VITE_*` están definidas en producción.

---

## 14. Monitoring

### 14.1 Logs

- **Frontend errors**: Sentry (configurar en Fase 11+) o console.
- **API errors**: Supabase Dashboard → Logs → API.
- **Edge Function errors**: Dashboard → Edge Functions → Logs.
- **DB errors**: Dashboard → Logs → Postgres.

### 14.2 Métricas DB

```sql
-- Slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Table sizes
SELECT relname, pg_size_pretty(pg_relation_size(relid))
FROM pg_stat_user_tables
ORDER BY pg_relation_size(relid) DESC;
```

---

## 15. Comandos cheatsheet

| Acción | Comando |
|---|---|
| Login CLI | `supabase login` |
| Init project | `supabase init` |
| Link to remote | `supabase link --project-ref XXX` |
| New migration | `supabase migration new <name>` |
| Apply migrations | `supabase db push` |
| Reset local DB | `supabase db reset` |
| List migrations | `supabase migration list` |
| New function | `supabase functions new <name>` |
| Deploy function | `supabase functions deploy <name>` |
| Function logs | `supabase functions logs <name> --tail` |
| Serve locally | `supabase functions serve <name>` |
| Set secret | `supabase secrets set KEY=value` |
| List secrets | `supabase secrets list` |
| Status | `supabase status` |
| Stop local | `supabase stop` |

---

## 16. Troubleshooting

### "JWT expired" en frontend
- Refresh token expira (default 30d). Forzar logout y re-login.

### "permission denied for table X"
- RLS policy no permite la operación con el role actual.
- Verificar `user_role_in_church(church_id)`.
- Verificar que `church_users.is_active = true`.

### Migration falla con "syntax error"
- Validar SQL en local antes de push: `psql $LOCAL_DB_URL -f supabase/migrations/XXX.sql`.

### Edge function 500
- Ver logs: `supabase functions logs <name> --tail`.
- Verificar secrets están seteados: `supabase secrets list`.

### `supabase db reset` falla
- Asegurarse que Docker Desktop está corriendo (Supabase local usa Docker).

### Receipt numbering devuelve duplicados
- Verificar que `rpc_assign_receipt_number` usa `INSERT ... ON CONFLICT ... UPDATE`. Es atomic incluso bajo concurrencia.

### Storage upload falla
- Verificar policies de bucket.
- Verificar MIME type permitido.
- Verificar tamaño de archivo.

### pg_cron job no se ejecuta
- Solo en Supabase Pro+ plan.
- Verificar con `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5`.
- En Fase 13 dejamos de depender de pg_cron: `mv_church_monthly_donations` ya no se consulta desde el frontend. Se reemplazó por `rpc_monthly_donations_series` (real-time). La mv queda en la base pero no se refresca automáticamente.

---

## 14. Storage (agregado en Fase 13)

### Bucket `church-assets`

- Aplicado por migración `20260530120003_storage.sql`.
- Visibilidad: **público** (necesario para `<img>` en el portal anónimo).
- Límite por archivo: **2 MB**.
- MIME permitidos: `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`.
- Convención de paths:
  ```
  {church_id}/logo/{timestamp}.{ext}
  {church_id}/hero/{timestamp}.{ext}
  {church_id}/signature/{timestamp}.{ext}
  ```

### Policies

- `SELECT` → público (`true`) — necesario para portal anónimo.
- `INSERT / UPDATE / DELETE` → autenticado **y** primer segmento del path ∈ `user_church_ids()`. Esto garantiza que un usuario solo puede tocar assets de su propia iglesia.

### Verificación rápida

```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
sb.storage.listBuckets().then(({data}) => console.log(data));
"
```

### Bucket privado para recibos (futuro)

Los PDFs de recibos **no** van a `church-assets`. Cuando se generen server-side se subirán a `church-receipts-private` con `public=false`, accedidos vía signed URLs con expiración corta. Fuera del scope de Fase 13.

---

## 15. Edge Functions (agregado en Fase 13)

### Funciones desplegadas

| Function | Descripción | Secrets |
|---|---|---|
| `invite-user` | Invita un nuevo usuario a la iglesia. Valida JWT del caller, exige rol `admin`, inserta `church_invitations` y dispara email via Supabase Auth nativo. | Ninguno — usa `SUPABASE_SERVICE_ROLE_KEY` inyectada automáticamente. |

### Deploy

```bash
npx supabase functions deploy invite-user --no-verify-jwt
```

Usamos `--no-verify-jwt` porque la función valida el JWT manualmente dentro de `_shared/auth.ts` (necesario para distinguir 401 vs 403 con códigos de error claros).

### Cómo probar `invite-user`

#### Via UI
1. Login como `miguel@casaderestauracion.org` (rol admin).
2. Configuración → "Invitar usuario".
3. Llenar email + rol → "Enviar invitación".
4. Confirmar toast "Invitación enviada".
5. Verificar fila en `church_invitations` (con `service_role`).
6. El invitee recibe email de Supabase Auth con link a `/#accept-invite?token=...`.

#### Via curl
```bash
curl -X POST "https://dcmdcmpqowwntdtkrlfm.supabase.co/functions/v1/invite-user" \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "apikey: <PUBLISHABLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nueva-persona@iglesia.org",
    "role": "secretary",
    "church_id": "c1ec1ec1-0000-0000-0000-000000000001"
  }'
```

Códigos esperados:
- `200` → `{ invitation_id, expires_at, email, role }`
- `400` → `invalid_email` | `invalid_role` | `invalid_church_id`
- `401` → `missing_authorization` | `invalid_session`
- `403` → `forbidden` (caller no es admin) | `admin_role_blocked`
- `409` → `invitation_already_pending` | `user_already_exists`
- `500` → `auth_invite_failed` (dominio rechazado, SMTP, etc.)

### Email del invite

Lo envía el SMTP nativo de Supabase Auth (no requiere Resend en esta fase). Si el dominio del destinatario es bloqueado (ej. `example.com`), la función auto-revoca la invitación huérfana antes de devolver el error.

---

## 16. Donation Intents (agregado en Fase 14)

### Tabla `donation_intents`

Creada por `supabase/migrations/20260601120001_donation_intents.sql`. Una fila por intención pública de donación.

**Columnas clave**:
- `church_id`, `fund_id`, `campaign_id` (FK)
- `donor_type` (individual/business/anonymous), datos del donor
- `amount_cents`, `frequency` (one_time/monthly/annual)
- `status` (pending_payment/payment_provider_pending/completed/canceled/expired/failed)
- `donation_id` (FK a donations cuando se convierte)
- `provider_*` (Stripe-ready, null hasta wire)
- `expires_at` (90 días por defecto)

**RLS**:
- SELECT: cualquier miembro activo de la iglesia.
- UPDATE: admin/pastor/treasurer/secretary.
- INSERT directo: BLOQUEADO. Solo via `rpc_create_public_donation_intent` (SECURITY DEFINER).
- DELETE: BLOQUEADO. Use cancel via UPDATE.

### RPCs nuevas

| RPC | Caller | Propósito |
|---|---|---|
| `rpc_create_public_donation_intent(...)` | anon (público) | Crea intent con validación server-side (honeypot, rate limit, email, monto, fondo, campaña). |
| `rpc_link_intent_to_donation(intent_id, donation_id)` | authenticated | Marca intent.status='completed' y enlaza al donation real. |
| `rpc_update_intent_status(intent_id, action, notes)` | authenticated | action='mark_contacted' o 'cancel'. |
| `rpc_public_portal_by_slug` (extendida) | anon | Ahora devuelve además `funds[]` y `payment_available`. |

### Verificación rápida

```bash
# Anon NO puede listar intents
node -e "
const { createClient } = require('@supabase/supabase-js');
const anon = createClient(URL, ANON_KEY);
anon.from('donation_intents').select('*').then(r => console.log('rows:', r.data?.length || 0));
"

# Crear intent pública via RPC
node -e "
const anon = createClient(URL, ANON_KEY);
anon.rpc('rpc_create_public_donation_intent', {
  p_church_slug: 'casa-de-restauracion',
  p_amount_cents: 2500,
  p_frequency: 'one_time',
  p_donor_type: 'individual',
  p_donor_email: 'test@ex.com',
  p_donor_first_name: 'T',
  p_donor_last_name: 'Test',
}).then(r => console.log(r.data));
"
```

### Errores esperados de la RPC pública

| Código (SQLSTATE) | Mensaje |
|---|---|
| P0001 | church_not_found_or_not_published |
| P0002 | invalid_amount |
| P0003 | invalid_frequency |
| P0004 | invalid_donor_type |
| P0005 | invalid_email |
| P0006 | individual_donor_requires_name |
| P0007 | business_donor_requires_name |
| P0008 | campaign_not_available |
| P0009 | fund_not_available |
| P0010 | no_default_fund_for_church |
| P0011 | rate_limited |

### Wirear Stripe en el futuro

Ver `docs/DONATION_FLOW.md` §8 (los 4 pasos completos: env vars, Edge Functions, habilitar `payment_available`, frontend).

---

## Fase 15 — Tablas y RPCs de contenido del portal

Migraciones `20260602120001..06` (additivas — no modifican migraciones previas).

### Tablas nuevas
- `sermons` — title, speaker, series, scripture_reference, sermon_date, description, video_url, audio_url, thumbnail_url, duration_seconds. CHECK: video_url OR audio_url.
- `events` — title, description, starts_at, ends_at (≥ starts_at), location, address (público), image_url, registration_url, category, is_featured.
- `podcast_episodes` — title, description, season, episode_number, spotify_url, apple_url, youtube_url, audio_url, cover_image_url, published_at, duration_seconds. UNIQUE parcial (church_id, season, episode_number).
- `projects` — name, description, category (ministry|project|mission), image_url, link_url, leader_name, is_featured.

Todas con spine `church_id` (ON DELETE RESTRICT), `is_visible_on_portal`, `sort_order`, `created_by`, `deleted_at`, timestamps + trigger `set_updated_at` + `audit_changes`.

### RLS
SELECT: miembros de la iglesia. ALL (INSERT/UPDATE/DELETE): `admin/pastor/secretary`. Sin policy anon — lectura pública solo vía RPCs SECURITY DEFINER. Borrado real = soft (`deleted_at`).

### RPCs públicas (GRANT anon + authenticated, gate publish_status='published')
- `rpc_public_sermons_by_slug(p_slug, p_limit=12, p_offset=0, p_series=NULL)` → `{ total, limit, offset, series[], items[] }`
- `rpc_public_sermon_by_id(p_slug, p_id)` → sermón individual o NULL
- `rpc_public_podcast_by_slug(p_slug, p_limit=12, p_offset=0)` → `{ total, limit, offset, items[] }`
- `rpc_public_events_by_slug(p_slug)` → `{ items[] }` (próximos, starts_at ≥ now())
- `rpc_public_projects_by_slug(p_slug)` → `{ items[] }`
- `rpc_public_portal_by_slug(p_slug)` **extendido** — agrega `latestSermons`, `upcomingEvents`, `featuredProjects`, `latestPodcast`.

### Storage
Sin migración nueva: el `kind` no se valida en la policy DB (solo `bucket_id` + carpeta = church_id). Kinds nuevos (`sermon_thumb`, `event_image`, `podcast_cover`, `project_image`) se agregaron en `src/lib/storage.js` (client-side).

### Aplicar
```
npx supabase db push      # aplica las 6 migraciones nuevas
npx supabase migration list
```
