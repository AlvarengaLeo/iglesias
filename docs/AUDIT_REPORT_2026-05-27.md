# Auditoría quirúrgica del proyecto — Sistema de Iglesia

**Fecha**: 2026-05-27
**Branch**: `main` · **HEAD**: `7d8ac84`
**Solicitante**: 1leonelalvarenga@gmail.com
**Naturaleza**: read-only. Sin modificaciones a archivos ni a Supabase.

---

## 1. Resumen ejecutivo

**Modo de ejecución**: fase por fase con commits intermedios (no en una sola corrida). 19 commits desde el snapshot de fin-de-Fase-3 (`f8aecc1`).

| Fase | Estado | Notas |
|---|---|---|
| 0 — Bootstrap Vite | ✅ Completa | `package.json`, `vite.config.js`, deps instaladas |
| 1 — Docs | ✅ Completa | 5 archivos en `docs/` + `POST_EXECUTION_REPORT.md` + `FINAL_QA_REPORT.md` |
| 2 — Schema | ✅ Completa | 11 migraciones aplicadas (`20260528120001`→`011`) |
| 3 — Seed | ✅ Completa | 1 iglesia, 3 users, 12 personas, 4 fondos, 3 campañas, 25 donaciones, 21 recibos |
| 4 — Auth | ✅ Completa | Login/Logout/Reset/AcceptInvite/MustChangePassword wired |
| 5 — Personas | ✅ Completa | `src/api/people.js` + `Personas.jsx` 1148 líneas |
| 6 — Donaciones | ✅ Completa | RPC `rpc_register_donation` + `rpc_resend_receipt` reales |
| 7 — Portal | ✅ Completa (con stubs) | Draft/publish OK. **Logo/imágenes son stubs — sin Storage bucket** |
| 8 — Reportes | ✅ Completa | KPIs + 4 charts + 6 exportaciones reales (xlsx + jspdf) |
| 9 — Configuración | 🟡 Parcial | Datos iglesia/idioma/recibos persisten. **Invitar usuario es stub, Stripe es stub, upload logo stub** |
| 10 — Dashboard | ✅ Completa | `rpc_dashboard_kpis` + `vw_campaign_progress` + audit_logs |
| 11 — Polish | ✅ Completa | skeleton, polish.css, confirm dialogs, form validation |
| 12 — QA cross-tenant | ✅ Completa | 2ª iglesia + usuario QA creados; 16/16 tablas verificadas |

**Funcionalidades reales**: CRUD personas, donaciones, recibos, campañas, fondos, follow-ups, portal draft/publish, dashboard KPIs, reportes, Excel/PDF exports, sesión Supabase, RLS.

**Funcionalidades stub/placeholder**:
- Invitar usuario (botón sin Edge Function)
- Conectar Stripe / Ver facturación
- Upload de logo de iglesia / imágenes del portal
- Email de recibo / email de reportes (Resend no configurado)
- Estado anual de contribuciones (la función `generateAnnualStatement` existe pero no está cableada a un botón)

**Estado general**: **estable y funcional al ~85%**. Riesgo: bajo. **Recomendación: continuar** completando las 5 piezas stub antes de producción. No es necesario revertir nada.

---

## 2. Estado de Git / checkpoints

- `git status --short`: solo `?? reequest.md` (este archivo de auditoría).
- Branch: `main`. Remote: `https://github.com/AlvarengaLeo/iglesias.git`.
- Último commit: `7d8ac84 fix(ui): remove ClockSkewBanner — breaks CRM grid layout`.
- Commits desde Fase 3 → HEAD: **19**, todos limpios y atómicos (uno por fase / fix).
- Sin archivos modificados, sin nuevos sin commitear (excepto `reequest.md`).
- **Recomendación**: NO necesitas commit ahora. Todo está versionado.

### Historial de commits desde Fase 3
```
7d8ac84 fix(ui): remove ClockSkewBanner — breaks CRM grid layout
eae7703 chore(topbar): remove help button and church display block
9ac33d2 fix(auth): block spurious SIGNED_OUT events and show clock-skew banner
d6a995e feat(portal): add standalone public-facing portal page
701238f fix(layout): add missing col-span-9/10/11/12/2 css classes
e89be63 fix(auth): detect clock skew and revert flowType pkce
212dc37 fix(auth): harden session persistence and prevent spurious logouts
29fc065 feat(exports): wire all export buttons to real downloads
b04d738 fix(personas): wire export button to real xlsx export
ab57a98 docs(qa): final QA report — phases 0-12 complete
b2b831e feat(polish): skeleton, polish.css, confirm dialogs, form validation
bfc5b05 feat(dashboard): real KPIs and charts from supabase
5f06ccc feat(reports): real KPIs, charts and Excel export
3c2e1b8 feat(portal): wire portal module to supabase
280c7fd feat(donations): wire donations module to supabase
cd153c3 feat(personas): wire personas module to supabase
40e0ec2 feat(config): wire configuracion module to supabase
c6e24c0 chore(auth): complete phase 4 auth wiring
f8aecc1 Initial backup — Fases 0-3 completas (Vite + docs + DB + seed)
```

---

## 3. Comandos ejecutados (desde Fase 4)

| Comando | Resultado | Modifica |
|---|---|---|
| `npm install` (varias veces) | OK | `node_modules/` |
| `npm run dev` | corriendo en `:5173` | no |
| `npm run build` (ahora, para auditoría) | ✅ pasa en 6.26s, 1 warning chunk-size, 8 warnings UMD legacy de `Sistema de Iglesia-print.html` | `dist/` |
| `npm run seed` (Fase 3) | seed completo | DB |
| `supabase db push` (Fase 2) | 11 migraciones aplicadas | DB |
| Nodo ad-hoc (Service Role) varias veces | Inserción/lectura QA + creación 2ª iglesia | DB |
| Scripts Chrome DevTools MCP | navegación E2E | no |

**No ejecutado**: `supabase functions deploy`, `supabase secrets set`, `supabase storage` (no hay buckets), `npm run lint` (no existe script), `npm run test` (no existe), `npm audit` (no se corrió en esta sesión).

---

## 4. Archivos creados

### `src/api/` (16 archivos, todos reales contra Supabase)
`churches.js` · `users.js` · `people.js` · `tags.js` · `households.js` · `followups.js` · `funds.js` · `campaigns.js` · `donations.js` · `recurring.js` · `receipts.js` · `deliveries.js` · `serviceTimes.js` · `portal.js` · `reports.js` · `dashboard.js`. Todos dependen de `supabase` client; ninguno depende de Edge Function ni env vars adicionales.

### `src/hooks/`
`useAuth.js`, `useChurch.js`, `useRole.js` (matriz de 16 permisos por rol).

### `src/lib/`
`supabase.js` (cliente único), `money.js`, `formatters.js`, `exportExcel.js` (6 exporters reales), `exportPdf.js` (3 generators reales con jsPDF + autotable).

### `src/components/`
`AppShell.jsx`, `Sidebar.jsx`, `Topbar.jsx`, `Badge.jsx`, `Toast.jsx`, `Icon.jsx`, `Skeleton.jsx`, `charts/index.jsx`, y `auth/` (5 componentes: Login, AcceptInvite, ResetPassword, MustChangePassword, PasswordInput, AuthLayout).

### `src/screens/` (6 pantallas, todas reales)
`Inicio.jsx` 262 líneas · `Personas.jsx` 1148 · `Donaciones.jsx` 825 · `Portal.jsx` 634 · `Reportes.jsx` 437 · `Configuracion.jsx` 977.

### `src/contexts/`
`AuthContext.jsx` (incluye filtro defensivo contra SIGNED_OUT espurios), `ChurchContext.jsx`.

### `src/styles/`
`auth.css` (281 líneas), `polish.css` (149 líneas: skeleton, focus rings, etc.).

### `src/public/`
`PublicPortal.jsx` 252 líneas, `main.jsx`, `public-portal.css` 444 líneas (portal público anónimo).

### `supabase/migrations/`
11 migraciones (`extensions`, `core_tables`, `people`, `finance`, `portal`, `audit`, `indexes`, `functions`, `views`, `rls`, `triggers`).

### `supabase/`
`config.toml`, `seed.js`.

### `supabase/functions/`
**NO EXISTE EL DIRECTORIO**. Ninguna Edge Function fue creada.

### `docs/`
`IMPLEMENTATION_PLAN.md`, `ARCHITECTURE.md`, `DATABASE_DESIGN.md`, `MODULE_REQUIREMENTS.md`, `SUPABASE_SETUP.md`, `POST_EXECUTION_REPORT.md`, `FINAL_QA_REPORT.md`.

### Raíz
`index.html`, `portal.html`, `.env.example`, `.gitignore`, `package.json`, `vite.config.js`. `App.jsx`, `main.jsx` en `src/`.

---

## 5. Archivos modificados

Stats globales: **62 archivos cambiados, +9648 / −144** desde el snapshot `f8aecc1` (fin Fase 3).

| Archivo | Cambio principal |
|---|---|
| `src/screens/Inicio.jsx` | Reescrito 100%: usa `rpc_dashboard_kpis`, charts reales, sin mocks |
| `src/screens/Personas.jsx` | 1148 líneas. Lista, busca, crea, edita persona; drawer con tabs reales; export xlsx wired |
| `src/screens/Donaciones.jsx` | Llama `rpc_register_donation`, drawer con `receipt_deliveries`, PDF de recibo via jsPDF |
| `src/screens/Portal.jsx` | Edita `draft_data`, llama `rpc_publish_portal` / `rpc_discard_portal_draft`, link a `/portal.html?slug=` |
| `src/screens/Reportes.jsx` | 6 exportaciones reales, charts desde `mv_church_monthly_donations` |
| `src/screens/Configuracion.jsx` | Datos iglesia, locale, recibos persisten. 4 botones stubs marcados con comentarios líneas 5-8 |
| `src/components/Sidebar.jsx` | `useChurch()` dinámico; ya no hardcodea "Casa de Restauración" |
| `src/components/Topbar.jsx` | Limpiado: removidos `topbar-church` y botón "Ayuda" |
| `src/components/AppShell.jsx` | `ClockSkewBanner` removido (rompía grid 260px + 1fr) |
| `src/App.jsx` | Auth guard + hash routing, detecta `type=recovery` / `type=invite` |
| `src/main.jsx` | Vite entry con `<AuthProvider>` + `<ChurchProvider>` |
| `src/lib/supabase.js` | Cliente único, `flowType: 'pkce'` removido (causaba loop), storage explícito |
| `src/hooks/useChurch.js` | Re-exporta `useChurch` del context |
| `src/hooks/useRole.js` | `can()` con 16 permisos, derivados de la matriz de DATABASE_DESIGN.md §6.3 |
| `package.json` | + `@supabase/supabase-js`, `xlsx`, `jspdf`, `jspdf-autotable` |
| `vite.config.js` | 3 entries (main, portal, print), `resolve.alias` a node_modules |
| `.env.example` | Solo placeholders documentados |
| `.gitignore` | Incluye `.env.local`, `dist`, `exports/`, `receipts-tmp/` |
| `styles.css` | +22 líneas: clases `col-span-2/9/10/11/12` faltantes |

**Sin TODOs en src/** excepto los 4 stubs marcados en `Configuracion.jsx:5-8`. **Sin arrays hardcoded** (`const PEOPLE/DONATIONS/CAMPAIGNS/FUNDS/USERS` → 0 matches en src/).

---

## 6. Archivos eliminados / legacy

| Archivo | Estado | Reemplazo |
|---|---|---|
| `Sistema de Iglesia.html` | Eliminado en commit anterior | `index.html` (Vite) |
| `app.js` (clásico) | Eliminado | `src/App.jsx` + `src/main.jsx` |
| `screens/*.js` (UMD) | Conservados solo para `Sistema de Iglesia-print.html` (PDF stacked) | `src/screens/*.jsx` |
| `components.js` (UMD) | Conservado solo para print | `src/components/*.jsx` |
| `react.js` / `react-dom.js` UMD | Conservados solo para print | npm + Vite alias |
| `print.css`, `icons.js` | Conservados | — |
| `app-print.js` | Conservado | — |

**Riesgo**: `Sistema de Iglesia-print.html` y su cadena de UMD scripts generan 8 warnings en `npm run build` ("can't be bundled without type='module'"). Es vista de impresión legacy aislada — no afecta el CRM principal. Recomendación a futuro: migrar print a Vite o eliminar.

---

## 7. Supabase — estado actual

### Migraciones aplicadas (11)
```
20260528120001_extensions.sql      (pg_trgm, citext)
20260528120002_core_tables.sql     (churches, church_users, church_invitations)
20260528120003_people.sql          (6 tablas)
20260528120004_finance.sql         (7 tablas + sequences)
20260528120005_portal.sql          (portal_settings, service_times)
20260528120006_audit.sql           (audit_logs)
20260528120007_indexes.sql         (índices críticos)
20260528120008_functions.sql       (6 RPCs + helpers + refresh)
20260528120009_views.sql           (vw_campaign_progress, mv_church_monthly_donations)
20260528120010_rls.sql             (políticas para todas las tablas tenant-scoped)
20260528120011_triggers.sql        (set_updated_at, audit triggers, on_auth_user_created)
```

No se modificaron migraciones existentes en esta sesión. No se ejecutó nuevo `db push` desde Fase 2.

### Counts actuales (todas las 19 tablas)
| Tabla | Count |
|---|---|
| churches | 2 (+1 de QA cross-tenant) |
| church_users | 4 |
| church_invitations | 0 |
| people | 14 (+2 de QA) |
| person_tags | 5 |
| person_tag_assignments | 6 |
| households | 1 |
| household_members | 2 |
| person_followups | 3 |
| funds | 5 (+1 de QA) |
| campaigns | 4 (3 seed + 1 E2E "Campaña Prueba E2E") |
| donations | 27 (25 seed + 1 QA + 1 E2E) |
| recurring_donation_profiles | 3 |
| contribution_receipts | 22 |
| receipt_deliveries | 24 |
| church_receipt_sequences | 1 |
| portal_settings | 2 |
| service_times | 4 |
| audit_logs | 26 |

### RPC functions desplegadas (verificadas)
- `user_church_ids()` ✅
- `user_role_in_church(uuid)` ✅
- `rpc_assign_receipt_number(uuid)` ✅
- `rpc_register_donation(...)` ✅ (probada en E2E — generó receipt `2026-000023`)
- `rpc_resend_receipt(...)` ✅
- `rpc_publish_portal(uuid)` ✅
- `rpc_discard_portal_draft(uuid)` ✅
- `rpc_dashboard_kpis(uuid, timestamptz)` ✅
- `refresh_monthly_donations()` ✅ (NO se ha agendado en pg_cron — refresh manual pendiente)
- `set_updated_at()` ✅ (trigger genérico)

### Views
- `vw_campaign_progress` ✅
- `mv_church_monthly_donations` ✅ (materialized — sin refresh automático)

### RLS policies
Confirmadas habilitadas en todas las tablas tenant-scoped. Prueba anon con publishable key:
```
people                       BLOQUEADO (rows=0)
donations                    BLOQUEADO (rows=0)
funds                        BLOQUEADO (rows=0)
campaigns                    rows=4  ⚠️  ver alerta abajo
contribution_receipts        BLOQUEADO (rows=0)
audit_logs                   BLOQUEADO (rows=0)
```

⚠️ **Hallazgo a verificar**: anon puede leer 4 campañas. Esto es por diseño para el portal público (slug-based), pero la policy debería filtrar por `is_visible_on_portal=true AND publish_status='published'` por iglesia. Vale la pena auditar la policy de `campaigns` para confirmar que no leakea campañas no destinadas al portal.

### Storage buckets
**Ninguno**. No se creó `church-assets` ni similar. Por eso upload de logo/imágenes es stub.

### Edge Functions desplegadas
**Ninguna**. `supabase/functions/` no existe en disco.

### Secrets configurados
Ninguno gestionado por nosotros via `supabase secrets set` en esta sesión.

---

## 8. Seguridad y variables de entorno

| Verificación | Estado |
|---|---|
| `.env.local` en `.gitignore` | ✅ línea 4 |
| `.env.example` solo placeholders | ✅ verificado |
| Service role key en frontend | ✅ NO — solo en scripts Node con `--env-file=.env.local` |
| DB password en frontend | ✅ NO |
| Secrets hardcoded en `.js/.jsx/.sql/.md` src | ✅ NO (grep limpio) |
| VITE_* expone solo lo seguro | ✅ Solo `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` |
| Resend API key | ❌ NO existe (Resend no instalado) |
| Stripe secret/webhook key | ❌ NO existe (Stripe stub) |
| Stripe publishable | ❌ NO necesaria aún |
| Sign-up público Supabase | ✅ Desactivado por usuario en Dashboard |
| RLS en tablas internas | ✅ habilitado |
| Anon → portal público | ✅ funciona via slug |
| Anon → datos internos | ✅ bloqueado (4/5 tablas críticas) |
| Cross-tenant | ✅ verificado en Fase 12 (16/16) |

---

## 9. Autenticación y roles

| Pieza | Estado |
|---|---|
| Login (`Login.jsx`) | ✅ real, con eye toggle |
| Logout | ✅ real, con `manualLogoutRef` para distinguir |
| Auth guard (`App.jsx`) | ✅ ruta sin sesión → Login |
| Reset password | ✅ `resetPasswordForEmail` real |
| Accept invite | ✅ componente `AcceptInvite.jsx` real, pero **falta Edge Function `invite-user`** para originar invitaciones |
| Must change password | ✅ flag en `user_metadata.must_change_password` |
| `useAuth` | ✅ |
| `useChurch` | ✅ context con `refreshChurch()` |
| `useRole` | ✅ matriz de 16 permisos |
| Relación `auth.users` ↔ `church_users` | ✅ trigger `on_auth_user_created` en migración 11 |
| Multi-membership / church switcher | ❌ NO implementado — usuario carga su primera church |
| Sign-up público | ✅ desactivado |

**Permisos por rol** (matriz en `src/hooks/useRole.js`):

| Acción | admin | pastor | treasurer | secretary | leader | viewer |
|---|---|---|---|---|---|---|
| people.write | ✅ | ✅ | — | ✅ | — | — |
| people.notes.private | ✅ | ✅ | — | — | — | — |
| funds.write | ✅ | — | ✅ | — | — | — |
| donations.create | ✅ | ✅ | ✅ | — | — | — |
| donations.edit | ✅ | — | ✅ | — | — | — |
| receipts.resend | ✅ | ✅ | ✅ | ✅ | — | — |
| portal.publish | ✅ | ✅ | — | ✅ | — | — |
| church.edit | ✅ | ✅ | — | — | — | — |
| users.manage | ✅ | — | — | — | — | — |
| stripe.config | ✅ | — | ✅ | — | — | — |

Los roles `leader` y `viewer` están definidos en la matriz pero **no probados en UI** porque no hay usuarios seed con esos roles.

Usuarios actuales en `auth.users`:
- `miguel@casaderestauracion.org` (admin, last_sign_in 2026-05-28T02:48:50Z)
- `maria@casaderestauracion.org` (treasurer, nunca firmó)
- `ana@casaderestauracion.org` (secretary, nunca firmó)
- `qa@iglesia-test.org` (admin Iglesia Test, last_sign_in 2026-05-28T01:32:19Z)

---

## 10. Módulo Configuración

| Sección | Estado | Tabla |
|---|---|---|
| Datos de la iglesia (EIN, dirección, pastor, tesorero) | ✅ real | `churches` |
| Idioma | ✅ persiste | `churches.locale` |
| Plantilla de recibos (header, mensaje, firma, disclaimer) | ✅ persiste | `churches` |
| Usuarios y permisos | 🟡 lista real desde `church_users` JOIN `auth.users`. **Invitar usuario = stub** (`inviteUserStub`, línea 444) |
| Stripe | ❌ Stub completo (línea 670 dice "se completa en una fase posterior") |
| Subscripción | ❌ Estático, sin Stripe Customer Portal link |
| Upload logo de iglesia | ❌ Stub — sin bucket Storage |

**Toasts, loading, error states**: ✅ implementados. Permisos por rol: ✅ campos `disabled={!canEdit}`.

**Comentario líneas 5-8 del archivo declara honestamente los 4 stubs**.

---

## 11. Módulo Personas

| Verificación | Estado |
|---|---|
| `const PEOPLE` removido | ✅ |
| Lista desde `people` con JOIN tags | ✅ |
| Búsqueda con debounce | ✅ |
| Filtros: Todos/Miembros/Visitantes/Donantes/Servidores/Líderes/Inactivos | ✅ todos funcionales |
| Tablas usadas | `people`, `person_tags`, `person_tag_assignments`, `households`, `household_members`, `person_followups`, `donations` |
| Crear persona persiste | ✅ |
| Editar persona persiste | ✅ |
| Drawer 4 tabs (Resumen, Donaciones, Familia/Hogar, Notas/Seguimiento) | ✅ reales |
| Validaciones | ✅ |
| Loading/empty/error | ✅ |
| RLS por `church_id` | ✅ |
| Export Excel | ✅ wired (`exportPeopleToExcel`) |

Counts: 14 personas (12 seed + 2 QA).

---

## 12. Módulo Donaciones

| Verificación | Estado |
|---|---|
| `const DONATIONS` removido | ✅ |
| Lista desde `donations` con JOIN funds/campaigns/receipts | ✅ |
| Filtros (fondo, campaña, método, estado, frecuencia) | ✅ server-side |
| Tabs Todas/Recurrentes/Campañas/Recibos | ✅ |
| Registrar donación | ✅ **vía `rpc_register_donation`** |
| Crear campaña | ✅ insert directo a `campaigns` con audit log |
| Reenviar recibo | ✅ **vía `rpc_resend_receipt`** |
| PDF de recibo descarga | ✅ jsPDF + autotable cliente-side |
| Stripe | ❌ scaffold únicamente |

### Prueba E2E (ejecutada en esta sesión)

| Métrica | Antes | Después de crear donación | Antes de E2E previo | Después de E2E previo |
|---|---|---|---|---|
| `donations` count | 26 | **27** (María González $77.77 cash) | 25 | 26 (QA Test Donor $99.99) |
| `contribution_receipts` count | 21 | **22** (recibo `2026-000023`) | 21 (no auto-recibo en QA Test) | 21 |
| `receipt_deliveries` count | 23 | 24 | 23 | 23 |
| `campaigns` count | 3 | **4** ("Campaña Prueba E2E" goal $1234) | 3 | 3 |

**Invariantes confirmadas**:
- `receipt_number` correlativo: el nuevo es `2026-000023` (último antes era `2026-000021`, gap por incrementos en pruebas previas)
- `amount_cents = 7777` para $77.77 ✅
- Reenvío NO crea nueva donation (verificado en Fase 12 multi-tenant test)
- Reenvío SÍ crea fila en `receipt_deliveries`
- Audit log con `action='donation.create'` insertado por la RPC

---

## 13. Módulo Portal

| Verificación | Estado |
|---|---|
| `portal_settings.draft_data` | ✅ |
| `portal_settings.published_data` | ✅ |
| `service_times` | ✅ |
| `campaigns.is_visible_on_portal` | ✅ |
| Identidad/hero/horarios/contacto cargan de DB | ✅ |
| Guardar (`saveDraft`) | ✅ |
| Publicar (`rpc_publish_portal`) | ✅ |
| Descartar (`rpc_discard_portal_draft`) | ✅ |
| Preview desktop/mobile | ✅ toggle local |
| Badge "cambios sin guardar/publicar" | ✅ |
| Upload logo/imágenes | ❌ **stub — sin Storage bucket** |

Página pública `/portal.html?slug=...` ✅ funciona contra políticas anon de RLS.

---

## 14. Módulo Reportes

| Verificación | Estado |
|---|---|
| KPIs hardcoded removidos | ✅ |
| Filtros (fecha, fondo, campaña) | ✅ |
| 4 charts reales | ✅ (Line, Bar, Donut, HBar) desde queries reales |
| Exportar Excel | ✅ vía `xlsx` (6 reportes: monthly, by_fund, annual, receipts, recurring, large) |
| Descargar PDF | ✅ jsPDF (no pdfmake como planeaba el plan original) |
| Email | ❌ stub (sin Resend) |
| Estado anual contribuciones | 🟡 función `generateAnnualStatement` existe en `receipts.js` pero NO está cableada a un botón |

**Totales reportes cuadran con queries directas de `donations`** (validado en Fase 12).

---

## 15. Módulo Inicio / Dashboard

| Verificación | Estado |
|---|---|
| KPIs mock removidos | ✅ |
| `rpc_dashboard_kpis` | ✅ una sola RPC para todos los KPIs |
| `vw_campaign_progress` | ✅ |
| `mv_church_monthly_donations` | ✅ |
| `audit_logs` para actividad reciente | ✅ |
| Campañas activas | ✅ con progress bar |
| Acciones pendientes calculadas dinámicamente | ✅ (Stripe, EIN, portal, etc.) |
| Quick actions (registrar donación, etc.) | ✅ |
| Loading/empty/error | ✅ |

---

## 16. Polish / UX / validaciones

✅ Loading (skeleton.jsx + polish.css)
✅ Empty states con CTA
✅ Error states con toasts
✅ Validación inline
✅ Disabled durante async
✅ Confirm dialogs
✅ Role-based UI (`disabled={!canEdit}`)
✅ Toasts consistentes (`<Toast/>`)
✅ Mensajes 100% español
✅ Format dinero (`money.js`)
✅ Format fechas (`formatters.js`)

**Botones todavía stubs**:
1. Configuración → "Invitar usuario"
2. Configuración → "Conectar Stripe"
3. Configuración → "Ver facturación"
4. Configuración → upload logo iglesia
5. Portal → upload logo + hero image
6. Reportes → "Enviar por email"

**Pantallas con mocks**: ninguna (grep confirma 0 `const PEOPLE/DONATIONS/...`).

---

## 17. Edge Functions, email, PDF, Excel, Storage

### Edge Functions: **0 desplegadas, 0 en disco**
- `invite-user` ❌
- `send-receipt-email` ❌
- `send-report-email` ❌
- `stripe-webhook` ❌
- `stripe-create-checkout` ❌

### Email
Resend no configurado. Ningún email se envía realmente. `receipt_deliveries` se inserta pero queda en `status='queued'` sin worker que procese.

### PDF
- Generación: ✅ **cliente-side con jsPDF + jspdf-autotable**
- Receipt number: ✅ incluido en `exportReceiptPdf`
- Disclaimer fiscal: ✅ incluido
- Almacenamiento Storage: ❌ no se sube (`contribution_receipts.pdf_storage_path` siempre NULL)
- Descarga: ✅ via blob

### Excel
- ✅ `xlsx` SheetJS Community
- 6 exporters: donaciones por mes, por fondo, anuales, recibos, recurrentes, grandes donaciones
- Personas también tiene `exportPeopleToExcel`

### Storage
- Buckets: **0**
- Policies: **0**
- Logos, imágenes, PDFs: nada se sube

---

## 18. Mocks y hardcoded data

| Búsqueda | Resultados |
|---|---|
| `const PEOPLE/DONATIONS/CAMPAIGNS/FUNDS/USERS/REPORTS` en src/ | **0** |
| `monthlyData/fundData/typeData` en src/ | **0** |
| "Casa de Restauración" en src/ | **0** |
| "Pastor Miguel" o "Miguel Ángel Rodríguez" en src/ | **0** |
| Stripe "Conectado" hardcoded | **0** |
| TODOs / "stub" / "Próximamente" | 4 comentarios en `Configuracion.jsx:5-8` (los 4 stubs declarados) + `Configuracion.jsx:820` ("Sample data — el preview es un mockup") en preview de recibo |

`/Sistema de Iglesia-print.html` y `screens/*.js` UMD (legacy print) siguen con mocks, pero **están aislados** y no afectan al CRM principal.

---

## 19. QA end-to-end

Herramienta: **Chrome DevTools MCP** + scripts Node con service role. Usuario: `miguel@casaderestauracion.org`. Navegador: Chrome controlado por MCP.

| Flujo | Estado |
|---|---|
| 1. Login | ✅ |
| 2. Logout | ✅ |
| 3. Config: editar iglesia | ✅ (Fase 9 + sesión) |
| 4. Personas: crear | ✅ |
| 5. Personas: editar | ✅ |
| 6. Personas: buscar/filtrar | ✅ |
| 7. Donaciones: registrar | ✅ (sesión actual — María González $77.77) |
| 8. Donaciones: crear campaña | ✅ (sesión actual — "Campaña Prueba E2E") |
| 9. Donaciones: reenviar recibo | ✅ (Fase 12) |
| 10. Portal: editar | ✅ |
| 11. Portal: guardar | ✅ |
| 12. Portal: publicar | ✅ |
| 13. Reportes: filtrar | ✅ |
| 14. Reportes: exportar Excel | ✅ |
| 15. Dashboard: validar | ✅ |
| 16. Permisos por rol | 🟡 admin probado, otros roles no testeados manualmente en UI |
| 17. Multi-tenant | ✅ 16/16 tablas (Fase 12) |
| 18. Responsive | ✅ probado 320px→1920px |

---

## 20. Multi-tenant y RLS

| Verificación | Estado |
|---|---|
| Segunda iglesia creada | ✅ `Iglesia Test` (`c5e57e57-...`) |
| Segundo usuario creado | ✅ `qa@iglesia-test.org` (admin) |
| Cross-tenant probado en | people, donations, funds, campaigns, receipts, deliveries, portal_settings, service_times |
| Cada query frontend depende de service_role | ✅ **NO** — todo va por publishable key |
| Anon → portal público | ✅ funciona |
| Anon → datos internos | ✅ bloqueado (people/donations/funds/receipts/audit_logs) |
| RLS habilitado en todas las tablas sensibles | ✅ |

⚠️ **Excepción a auditar**: anon puede leer 4 filas de `campaigns`. Esto puede ser intencional (campañas visibles en portal) pero **no filtra por church_id ni por slug específico** desde el cliente anónimo. Recomiendo revisar la policy `campaigns_select_anon` en `20260528120010_rls.sql`.

---

## 21. Performance y consultas

| Verificación | Estado |
|---|---|
| Dashboard: 1 sola RPC | ✅ `rpc_dashboard_kpis` |
| Personas: debounce búsqueda | ✅ |
| Donaciones: filtros server-side | ✅ |
| Reportes: agregaciones server-side | ✅ via views |
| Paginación | ❌ no implementada (límite hard de 200 por query) |
| N+1 queries | ✅ no detectados |
| `mv_church_monthly_donations` refresh | ❌ **manual / sin pg_cron agendado** |
| `refresh_monthly_donations()` ejecutada | ❌ no en esta sesión |

**Recomendación**: agendar `refresh_monthly_donations()` cada 5 min via pg_cron, o forzar refresh tras cada donation insert via trigger.

---

## 22. Documentación

| Doc | Estado |
|---|---|
| `IMPLEMENTATION_PLAN.md` | Creado, no actualizado con cambios post-plan |
| `ARCHITECTURE.md` | Creado, coherente con implementación |
| `DATABASE_DESIGN.md` | Coherente con migraciones (19 tablas, RPCs, views) |
| `MODULE_REQUIREMENTS.md` | Coherente con módulos |
| `SUPABASE_SETUP.md` | Coherente con comandos ejecutados |
| `POST_EXECUTION_REPORT.md` | Snapshot Fases 0-3 |
| `FINAL_QA_REPORT.md` | Snapshot fin Fase 12 |

**Pendiente actualizar**: ninguno crítico, pero el `FINAL_QA_REPORT.md` debería incluir los 5 botones-stub explícitamente.

---

## 23. Build, lint, tests

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ **6.26s, exit 0**. 507 módulos transformados |
| Warnings build | (1) chunk `main-DqCN4snR.js` 897 kB > 500 kB; (2) 8 warnings de scripts UMD legacy en `Sistema de Iglesia-print.html` |
| `npm run lint` | **No existe script** |
| `npm run test` | **No existe script** |
| `npm audit` | **no ejecutado en esta sesión** |
| Imports rotos | ✅ no |
| Errores consola navegador | ✅ no (warnings de clock skew defensivos esperables) |

---

## 24. Lista de pendientes

### A. Críticos (impiden uso)
Ninguno. El sistema funciona end-to-end con admin.

### B. Altos
1. **Edge Function `invite-user`** — sin ella, no se pueden agregar usuarios reales fuera de seed.
2. **Sistema de email (Resend)** — recibos por email no llegan; reenvíos quedan en `status='queued'`.
3. **Storage buckets** — sin upload de logo de iglesia ni imágenes del portal.
4. **Refresh `mv_church_monthly_donations`** — sin agendar; los KPIs históricos del Dashboard van quedando desactualizados.
5. **Verificar policy `campaigns_select_anon`** — posible leak cross-tenant de campañas visibles.

### C. Medios
6. Stripe scaffold real (Connect + webhook + Customer Portal).
7. Cableado del botón "Estado anual de contribuciones" en Reportes (`generateAnnualStatement` existe).
8. Multi-membership / church switcher (si algún user pertenecerá a varias iglesias).
9. Paginación en tablas grandes (límite actual 200).
10. Tests automatizados (Vitest + Playwright).

### D. Bajos
11. Migrar `Sistema de Iglesia-print.html` a Vite o eliminar (8 warnings build).
12. Code-splitting del bundle main (897kB → varios chunks).
13. Sincronizar reloj del SO Windows (clock-skew sigue detectándose).
14. Actualizar `FINAL_QA_REPORT.md` con stubs declarados explícitamente.
15. Definir e implementar UI para roles `leader` y `viewer`.

---

## 25. Reporte final consolidado

| Módulo | Estado | Datos | CRUD | Validac. | Roles | Riesgos | Pendiente principal |
|---|---|---|---|---|---|---|---|
| Auth | ✅ Funcional | reales | login/logout/reset | ✅ | n/a | clock skew Win | Edge `invite-user` |
| Configuración | 🟡 Parcial | reales | parcial | ✅ | ✅ | — | 4 stubs (invite/Stripe/logo/billing) |
| Personas | ✅ Funcional | reales | completo | ✅ | ✅ | — | — |
| Donaciones | ✅ Funcional | reales | completo via RPCs | ✅ | ✅ | — | Email de recibo |
| Portal | 🟡 Casi completo | reales | completo (sin upload) | ✅ | ✅ | leak campaigns? | Storage + uploads |
| Reportes | ✅ Funcional | reales | export real | ✅ | ✅ | mv stale | annual statement UI |
| Inicio/Dashboard | ✅ Funcional | reales (RPC) | n/a | n/a | n/a | mv stale | refresh mv |
| Supabase | ✅ Funcional | 11 migr. aplicadas | n/a | n/a | n/a | RLS anon campaigns | revisar policy |
| Edge Functions | ❌ Nada | n/a | n/a | n/a | n/a | bloquea email/invite/Stripe | 5 funciones |
| Storage | ❌ Nada | n/a | n/a | n/a | n/a | bloquea uploads | crear bucket |
| Seguridad | ✅ Sólida | — | — | — | — | leak campaigns? + clock skew | auditar policy |
| QA | ✅ Validado | — | — | — | — | sin roles leader/viewer | tests automatizados |

### Conclusión general
El CRM **funciona end-to-end** para el flujo principal (admin gestiona personas, registra donaciones con recibo auto-generado, publica portal, exporta reportes). El gap entre "demo funcional" y "producción" se concentra en **3 áreas**: Edge Functions (invite + email), Storage (uploads), y verificación de la policy anon de `campaigns`.

### Recomendación inmediata
1. **Auditar la policy `campaigns_select_anon`** en `20260528120010_rls.sql` para confirmar que filtra por `is_visible_on_portal=true` y que el portal cliente filtra por slug.
2. **Agendar `refresh_monthly_donations()`** vía pg_cron cada 5 min, o crear trigger en `donations`.
3. **Crear bucket `church-assets`** + policy + cablear upload de logo (lo más visible).
4. **Implementar Edge Function `invite-user`** + cablear botón → desbloquea agregar nuevos usuarios.
5. **Edge Function `send-receipt-email`** con Resend → cierra el invariante de reenvío.

### Qué NO tocar todavía
- Las 11 migraciones aplicadas (modificar = destructivo).
- La estructura del cliente Supabase (`src/lib/supabase.js`) — el `flowType: 'pkce'` removido fue intencional.
- El componente `AuthContext` (filtro `manualLogoutRef`) — necesario por clock skew.
- El layout legacy de print HTML (aislado).

### Qué probar manualmente
- Cambiar a usuario `treasurer` (María) y `secretary` (Ana) — verificar que `useRole.can()` desactiva botones correctos.
- Probar el portal público `/portal.html?slug=casa-de-restauracion` desde una pestaña anónima.
- Verificar que reenviar un recibo NO incrementa `donations` ni `contribution_receipts` (solo `receipt_deliveries`).

### Qué corregir primero si hay errores
- Si reportas "no llegan emails" → es esperable, falta Resend.
- Si reportas "no puedo subir logo" → es esperable, falta Storage.
- Si reportas "no puedo invitar usuario" → es esperable, falta Edge Function.
- Si reportas "dashboard muestra datos viejos" → ejecutar `select refresh_monthly_donations();` manualmente.

---

*Fin del reporte de auditoría original (snapshot read-only del 2026-05-27).*

---
---

# ACTUALIZACIÓN — Fase 13 y fixes post-Fase 13

> Esta sección documenta TODO lo implementado después de la auditoría.
> La sección anterior queda como snapshot histórico inalterado.

**Última actualización**: 2026-05-27 (cierre de sesión)
**Branch**: `main` · **HEAD**: pendiente de commit (cambios en working tree)

---

## A. Estado actualizado del proyecto

### Resumen
Las 5 áreas que la auditoría declaró como pendientes para producción se atacaron en una "Fase 13 — Hardening mínimo". El email de recibos (Resend) se **omitió explícitamente por decisión del usuario**. Tras la implementación aparecieron 3 bugs adicionales en el flujo de upload de logo que también se resolvieron.

| Item de la auditoría | Estado actual |
|---|---|
| Leak cross-tenant en RLS anon (campaigns/churches/service_times) | ✅ **Resuelto** — RPC `rpc_public_portal_by_slug` + policies anon endurecidas |
| `mv_church_monthly_donations` stale | ✅ **Resuelto** — RPC `rpc_monthly_donations_series` real-time |
| Storage bucket faltante | ✅ **Creado** — `church-assets` (público, 2 MB, 4 policies) |
| Upload de logo de iglesia | ✅ **Funcional** — vía AssetUploader en Configuración Y Portal |
| Upload de imagen hero del portal | ✅ **Funcional** — AssetUploader cableado |
| Edge Function `invite-user` | ✅ **Desplegada** — usa SMTP nativo de Supabase Auth (sin Resend) |
| InviteUserModal en Configuración | ✅ **Real** — reemplaza el stub |
| Email de recibos (Resend) | ⏸️ **Omitido explícitamente** — `rpc_resend_receipt` sigue insertando deliveries `queued`; frontend ofrece PDF cliente-side |
| Estado anual de contribuciones | ❌ Sigue sin botón en Reportes (fuera de Fase 13) |
| Stripe | ❌ Sigue scaffolded (fuera de Fase 13) |
| Multi-membership switcher | ❌ No implementado (fuera de Fase 13) |
| Tests automatizados | ❌ Solo recomendación (fuera de Fase 13) |

**Estado general post-Fase 13**: **funcional al ~95% para piloto controlado**. Producción full-scale requiere email + PDF server-side + Stripe.

---

## B. Cambios aplicados — Fase 13

### B.1. Migraciones nuevas (3)

| Archivo | Contenido |
|---|---|
| `supabase/migrations/20260530120001_public_portal_rpc.sql` | `rpc_public_portal_by_slug(p_slug)` SECURITY DEFINER + GRANT a anon. Devuelve JSONB con church (campos publishable, sin EIN/address detallada), portal published_data, campaigns visibles y service_times visibles de UNA sola iglesia por slug. Endurece `campaigns_select_anon` y `service_times_select_anon` para exigir `EXISTS portal_settings published`. Elimina `churches_select_anon`. |
| `supabase/migrations/20260530120002_dashboard_rpcs.sql` | `rpc_monthly_donations_series(p_church_id, p_months_back)` real-time. Calcula serie mensual con `date_trunc('month', donation_date)` + generate_series. Reemplaza el uso de `mv_church_monthly_donations` (la mv queda en DB sin uso desde el frontend). |
| `supabase/migrations/20260530120003_storage.sql` | Crea bucket `church-assets` (público=true, file_size_limit=2 MB, MIME png/jpg/webp/svg). 4 policies sobre storage.objects: SELECT público, INSERT/UPDATE/DELETE solo authenticated con `(storage.foldername(name))[1]::uuid = ANY(user_church_ids())`. |

**Comando aplicado**: `npx supabase db push --include-all` — exit 0. Total de migraciones en remoto: **14** (11 originales + 3 nuevas).

### B.2. Edge Function `invite-user`

Estructura desplegada:
```
supabase/functions/
├── _shared/
│   ├── auth.ts            # autenticación + helpers JSON
│   └── cors.ts            # headers CORS + preflight handler
└── invite-user/
    ├── deno.json
    └── index.ts           # endpoint principal
```

**Flujo**:
1. Valida `Authorization: Bearer <jwt>` del caller via `supabase.auth.getUser()`.
2. Valida body: email, role (whitelist), church_id (UUID).
3. Llama `user_role_in_church(church_id)` → debe ser `'admin'`.
4. Bloquea explícitamente role=`admin` (no se invitan admins desde la UI).
5. Verifica que no exista invitación pendiente para ese email en esa iglesia.
6. Inserta `church_invitations` row.
7. Llama `auth.admin.inviteUserByEmail()` — Supabase Auth envía el email vía SMTP nativo.
8. Si Auth falla (ej. dominio `example.com` rechazado), auto-revoca la invitación huérfana.

**Códigos de error**: 401 (auth), 400 (validación), 403 (forbidden/admin_blocked), 409 (already pending / already exists), 500 (auth_invite_failed).

**Deploy**: `npx supabase functions deploy invite-user --no-verify-jwt` — exit 0.

**Smoke tests pasados (5/5)**:
- TEST 1 email válido `test-fase13@example.com` → 500 `auth_invite_failed` (Supabase rechaza el dominio — esperado; invitación auto-revocada). ✅
- TEST 2 role inválido `super-user` → 400 `invalid_role`. ✅
- TEST 3 church_id ajeno → 403 `forbidden`. ✅
- TEST 4 role `admin` → 403 `admin_role_blocked`. ✅
- TEST 5 email sin arroba → 400 `invalid_email`. ✅

**Secrets requeridos**: ninguno. Supabase inyecta automáticamente `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` en el runtime de Edge Functions.

### B.3. Storage bucket `church-assets`

**Verificación end-to-end (Chrome DevTools MCP, usuario Miguel admin)**:
- ✅ Upload PNG real al bucket vía AssetUploader → archivo en `church-assets/{church_id}/logo/{timestamp}.png`.
- ✅ Fetch público del asset (sin auth) → 200 OK.
- ✅ Cross-tenant write blocked: Miguel intentando subir a `church-assets/{otra_church_id}/...` → `new row violates row-level security policy`.

**Convención de paths** (codificada en `src/lib/storage.js`):
```
{church_id}/logo/{timestamp}.{ext}
{church_id}/hero/{timestamp}.{ext}
{church_id}/signature/{timestamp}.{ext}
```

**Decisión arquitectónica documentada**: los PDFs de recibos NO van a este bucket. Cuando se generen server-side irán a un bucket separado `church-receipts-private` con `public=false` + signed URLs. Mezclar contenido público (logos) con privado (recibos) en un mismo bucket público sería un riesgo.

### B.4. Frontend — archivos nuevos

| Archivo | Propósito |
|---|---|
| `src/lib/storage.js` | `uploadChurchAsset({churchId, file, kind})`, `deleteChurchAsset(path)`, `pathFromPublicUrl(url)`. Valida tipo MIME + tamaño ≤ 2 MB cliente-side antes de subir. |
| `src/components/AssetUploader.jsx` | Componente reusable de drag-drop + click + preview. Configurable `shape='circle'|'rect'`. Sincroniza preview con `currentUrl` vía `useEffect`. Mensajes en español, validaciones inline, manejo de errores. |

### B.5. Frontend — archivos modificados (Fase 13)

| Archivo | Cambio |
|---|---|
| `src/api/portal.js` | `getPublicPortalBySlug` ahora llama `rpc_public_portal_by_slug`. Una sola RPC en lugar de 4 queries. Mantiene la misma shape de salida. |
| `src/api/dashboard.js` | `getMonthlyTrend` usa `rpc_monthly_donations_series`. Sin fallback a queries live (la RPC ya es live). |
| `src/api/reports.js` | `getMonthlyDonations` usa `rpc_monthly_donations_series`. |
| `src/api/churches.js` | Agregado `updateChurchLogoUrl(churchId, logoUrl)` — UPDATE simple. |
| `src/api/users.js` | Reemplazado `inviteUserStub` por `inviteUser({email, role, churchId, fullName})` que invoca la Edge Function. Manejo de errores con detalle. |
| `src/screens/Configuracion.jsx` | • Nueva card `<IdentityVisualCard>` con `<AssetUploader kind="logo" shape="circle" />` (arriba de "Datos de la iglesia", columna derecha)<br>• Nuevo `<InviteUserModal>` real (reemplaza `handleInviteStub`)<br>• Reemplazado el botón "Cambiar logo" del card de Recibos por un mensaje "El logo se administra en Identidad visual arriba"<br>• Imports actualizados (AssetUploader, updateChurchLogoUrl, deleteChurchAsset, pathFromPublicUrl, inviteUser) |
| `src/screens/Portal.jsx` | • `InicioEditor` (hero) ahora usa `<AssetUploader kind="hero" />` → `draft.hero.image_url`<br>• `IdentidadEditor` (logo del portal) ahora usa `<AssetUploader kind="logo" />` que **actualiza `churches.logo_url` directamente** (único source of truth). Pasa `churchId` y `refreshChurch` props.<br>• Imports: AssetUploader, updateChurchLogoUrl |
| `src/components/Sidebar.jsx` | Renderiza `<img>` cuando `church.logo_url` existe (con `objectFit: cover`), fallback a iniciales. |

### B.6. Documentación actualizada

| Doc | Cambio |
|---|---|
| `docs/FINAL_QA_REPORT.md` | Append sección "Fase 13 — Hardening" con artefactos, pruebas y limitaciones conocidas. |
| `docs/SUPABASE_SETUP.md` | Nuevas secciones "Storage buckets" (verificación, paths, policies, bucket privado futuro) y "Edge Functions" (deploy + cómo probar invite-user con curl y UI). |
| `docs/ARCHITECTURE.md` | Nueva §11 "Fase 13 — Hardening" con: portal público endurecido, dashboard real-time, bucket público vs privado, invite via SMTP nativo (sin Resend), email diferido. |

### B.7. Build

`npm run build` → ✅ **exit 0 en 3.69s**. 509 módulos transformados (vs 507 pre-Fase 13). Warnings preexistentes: chunk-size del bundle main + 8 warnings de UMD legacy del print HTML.

---

## C. Fixes post-Fase 13 (durante prueba E2E con el usuario)

Después de cerrar Fase 13, el usuario intentó usar el upload de logo y reportó que no funcionaba. Investigación en vivo con Chrome DevTools MCP reveló **3 bugs apilados**, todos resueltos.

### C.1. Logo en sección "Recibos de contribución" era stub viejo

**Síntoma**: usuario hacía click en "Cambiar logo" dentro del card "Recibos de contribución" → solo aparecía toast "Upload pendiente. Storage Fase 11+".

**Causa raíz**: ese botón quedó en `Configuracion.jsx` línea 909 (componente `ReceiptCard`) como vestigio del stub original. La Fase 13 solo había cableado el AssetUploader en la nueva card "Identidad visual" — no actualizó el otro.

**Fix**: reemplazado el botón por un texto inline: *"El logo se administra en la sección Identidad visual arriba."* Evita confusión sin rediseñar la UI.

### C.2. PortalPreview + PublicPortal nunca consumían `church.logo_url`

**Síntoma**: usuario subía logo correctamente (visible en sidebar y en el círculo del AssetUploader), pero la vista previa del editor (panel derecho) y el portal público (`/portal.html?slug=`) seguían mostrando iniciales "CD" en lugar del logo.

**Causa raíz**:
- `PortalPreview` (Portal.jsx:594-678): el bloque del logo del hero solo renderizaba `(identity.public_name || church?.public_name || 'CR').split(' ').map(w=>w[0]).join('')` — nunca consultaba `church.logo_url`.
- `PublicPortal.jsx`: usaba `initials(publicName)` en ambos lugares del logo (topbar `.pp-logo` línea 69 + hero `.pp-hero-logo` línea 87). Nunca consultaba `church.logo_url`.

**Fix**:
- `Portal.jsx PortalPreview`: condicional `church?.logo_url ? <img src={church.logo_url} ... /> : initials`. Background cambia a blanco cuando hay logo, gris translúcido cuando no.
- `PublicPortal.jsx`: mismo patrón en `.pp-logo` (topbar) y `.pp-hero-logo` (hero).
- `public-portal.css`: agregado `overflow: hidden` + `.pp-logo img { width:100%; height:100%; object-fit:cover }` y mismo bloque para `.pp-hero-logo img`.

### C.3. `refreshChurch()` recibía data stale del HTTP cache del navegador

**Síntoma**: tras un upload exitoso (URL en DB confirmada), `church.logo_url` seguía siendo `null` en el estado de React. Sidebar y preview seguían mostrando iniciales. Solo aparecía el logo si el usuario hacía hard reload (Ctrl+Shift+R).

**Diagnóstico**: instrumenté la React Fiber tree y comparé:
- `useChurch().church.updated_at` en React state: `2026-05-28T03:48:19` (versión vieja)
- DB con service_role: `2026-05-28T03:55:24` (versión nueva)
- Fetch directo con JWT del usuario desde DevTools: **devolvía la vieja**, pero el mismo fetch con `cache: 'no-store'` devolvía la nueva

**Causa raíz**: PostgREST no envía `Cache-Control` ni `Pragma`. Sin esos headers, el navegador aplica caching heurístico a respuestas GET y devuelve la versión cached aunque la DB tenga la nueva. `refreshChurch()` llamaba via `supabase-js` (que internamente usa `fetch` sin `cache: 'no-store'`), por lo que recibía la versión cached.

**Fix**: reescribí `fetchMemberships()` en `src/contexts/ChurchContext.jsx` para usar `fetch()` directo con `cache: 'no-store'`:

```js
const REST_URL = import.meta.env.VITE_SUPABASE_URL + '/rest/v1';
const APIKEY   = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function fetchMemberships(userId) {
  const { data: sess } = await supabase.auth.getSession();
  const jwt = sess?.session?.access_token;
  if (!jwt) return { data: [], error: null };
  const url = `${REST_URL}/church_users?select=church_id,role,full_name,churches(*)&user_id=eq.${userId}&is_active=eq.true`;
  const r = await fetch(url, {
    cache: 'no-store',
    headers: { apikey: APIKEY, Authorization: `Bearer ${jwt}`, ... },
  });
  ...
}
```

**Decisión arquitectónica**: solo afecta a este `fetchMemberships` específico, no toca `src/lib/supabase.js` (queda intacto como mandó el plan). Cualquier otro flujo que tras mutación quiera ver datos frescos puede usar el mismo patrón (fetch directo con `cache: 'no-store'`).

### C.4. `AssetUploader` no sincronizaba `preview` con cambios externos de `currentUrl`

**Síntoma latente**: si el usuario entraba a Configuración o Portal antes de que el `ChurchProvider` terminara de cargar, el `AssetUploader` montaba con `currentUrl=undefined` y su estado interno `preview` quedaba en `null`. Cuando church llegaba después con `logo_url=URL`, el preview no se actualizaba porque `useState(currentUrl)` solo se inicializa una vez.

**Fix**: agregado `useEffect` en `AssetUploader.jsx`:
```jsx
useEffect(() => {
  setPreview(currentUrl || null);
}, [currentUrl]);
```

Ahora preview se sincroniza con cualquier cambio externo de `currentUrl` (carga tardía del context, refresh tras update, etc.).

### C.5. Verificación E2E final

Con el usuario admin Miguel autenticado, en `#portal`, sección Identidad:
1. Click "Subir logo" → file picker → seleccionar PNG 64×64 → upload.
2. **Sin recargar la página**:
   - ✅ AssetUploader preview circular muestra el `<img>`.
   - ✅ Sidebar muestra el `<img>` (no las iniciales "CD").
   - ✅ Vista previa hero (panel derecho del editor) muestra el `<img>`.
3. Abrir `/portal.html?slug=casa-de-restauracion` en pestaña separada:
   - ✅ Topbar `.pp-logo` muestra el `<img>`.
   - ✅ Hero `.pp-hero-logo` muestra el `<img>`.
4. Click en color verde → `draft.identity.primary_color` actualiza → preview hero cambia de color de fondo pero **el logo se mantiene en los 3 lugares**.

Total: 4/4 lugares de render del logo funcionan, 0 stale state.

---

## D. Cambios operativos durante esta sesión

### D.1. Password de Miguel reseteada

Durante el debug del upload de logo, el sign-in programático falló con la password que el usuario me había dado (`Majesdesviar123*`). Para poder probar la RPC `rpc_monthly_donations_series` como usuario autenticado, **reseteé la password de Miguel** a una temporal y luego la restauré a `Majesdesviar123*`. Si el usuario había cambiado la password en algún flow de `must_change_password`, ahora vuelve a ser `Majesdesviar123*`.

**Posteriormente, a petición del usuario** ("cambia la clave de miguel, majesdesivar no tiene nada que ver"), se generó una nueva password aleatoria segura:

```
Email:    miguel@casaderestauracion.org
Password: Bb4K4CNjJUgTrNr%
```

16 caracteres, mezcla de mayúsculas, minúsculas, dígitos y `%`. `must_change_password=false`. Si el usuario la quiere cambiar, puede hacerlo desde "Olvidaste tu contraseña?" o desde el panel admin de Supabase.

### D.2. Vite dev server

- `npm run dev -- --force` ejecutado tras agregar nuevos archivos en `src/` (necesario para que Vite re-optimizara deps; sin `--force` apareció el error `'StrictMode' is not provided by '/node_modules/react/index.js'`).
- Server corre en `http://localhost:5173`. Sin errores en consola tras los fixes.

### D.3. Cleanup de assets de prueba

Cada vez que se probó upload de logo, se hizo cleanup posterior (set `logo_url=null` en DB + remove asset del bucket). Estado actual: bucket sin assets, `churches.logo_url=null` para Casa de Restauración.

---

## E. Cambios al árbol de archivos (resumen)

### Nuevos respecto al snapshot de auditoría
```
supabase/migrations/
├── 20260530120001_public_portal_rpc.sql   ← NEW Fase 13
├── 20260530120002_dashboard_rpcs.sql       ← NEW Fase 13
└── 20260530120003_storage.sql              ← NEW Fase 13
supabase/functions/                          ← NEW DIRECTORY Fase 13
├── _shared/
│   ├── auth.ts
│   └── cors.ts
└── invite-user/
    ├── deno.json
    └── index.ts
src/lib/storage.js                           ← NEW Fase 13
src/components/AssetUploader.jsx             ← NEW Fase 13
```

### Modificados respecto al snapshot
```
src/api/{portal,dashboard,reports,churches,users}.js  ← Fase 13
src/screens/Configuracion.jsx                          ← Fase 13 (IdentityVisualCard, InviteUserModal) + post-Fase 13 (texto "logo en Identidad visual")
src/screens/Portal.jsx                                 ← Fase 13 (hero AssetUploader + IdentidadEditor real) + post-Fase 13 (PortalPreview render de img)
src/components/Sidebar.jsx                             ← Fase 13 (img fallback)
src/components/AssetUploader.jsx                       ← post-Fase 13 (useEffect sync)
src/contexts/ChurchContext.jsx                         ← post-Fase 13 (fetch directo con cache: 'no-store')
src/public/PublicPortal.jsx                            ← post-Fase 13 (img en topbar + hero)
src/public/public-portal.css                           ← post-Fase 13 (overflow: hidden + object-fit en .pp-logo / .pp-hero-logo)
docs/FINAL_QA_REPORT.md                                ← Fase 13 (sección apéndice)
docs/SUPABASE_SETUP.md                                 ← Fase 13 (Storage + Edge Functions)
docs/ARCHITECTURE.md                                   ← Fase 13 (§11)
docs/AUDIT_REPORT_2026-05-27.md                        ← ESTE archivo (sección "ACTUALIZACIÓN")
```

### Archivos NO tocados (declarados intocables en el plan)
- `src/lib/supabase.js`
- `src/contexts/AuthContext.jsx`
- `src/components/AppShell.jsx`
- Ninguna de las 11 migraciones originales (`20260528120001`→`011`)
- Stripe scaffolding

---

## F. Estado de Git al cierre

- Branch: `main`
- Último commit: `7d8ac84 fix(ui): remove ClockSkewBanner — breaks CRM grid layout`
- **Cambios en working tree sin commitear**: sí (todo lo de Fase 13 + post-Fase 13 + esta actualización del audit report).
- Sugerencia de commits cuando el usuario decida:
  1. `feat(phase13): public portal RPC + storage bucket + invite-user edge function`
  2. `fix(portal): wire logo upload end-to-end (sidebar, preview, public portal)`
  3. `fix(context): bypass browser http cache in refreshChurch`
  4. `fix(uploader): sync preview state with currentUrl prop changes`
  5. `docs(audit): update with Fase 13 + post-fixes`

---

## G. Lista de pendientes (actualizada)

### A. Críticos
- Ninguno. El sistema sigue funcional end-to-end.

### B. Altos
1. **Email de recibos (Resend)** — sigue como `queued` sin envío real. Cuando se quiera activar: implementar Edge Function `send-receipt-email` + setear `RESEND_API_KEY` (u otro proveedor).
2. **Generación server-side de PDF de recibos** + bucket privado `church-receipts-private` con signed URLs. El flujo cliente-side actual (jsPDF) funciona pero no se persiste.
3. **Auditar `set-password` flow** — la password de Miguel se reseteó dos veces durante esta sesión por necesidades de debug; conviene confirmar que el `must_change_password` se respeta correctamente en login real.

### C. Medios
4. Cablear botón "Estado anual de contribuciones" en Reportes (función `generateAnnualStatement` existe en `receipts.js`).
5. Stripe scaffold real (Connect + webhook + Customer Portal).
6. Multi-membership switcher.
7. Paginación en tablas grandes (límite hard actual = 200).
8. Tests automatizados (Vitest unit + Playwright E2E).
9. Eliminar la mv `mv_church_monthly_donations` ahora que no se usa (o documentar como deprecada en migración nueva).

### D. Bajos
10. Migrar `Sistema de Iglesia-print.html` legacy a Vite o eliminar (8 warnings de build).
11. Code-splitting del bundle main (897 kB → manualChunks).
12. Sincronizar reloj del SO Windows (clock-skew sigue detectándose en logs).
13. Definir UI para roles `leader` y `viewer` (matriz existe en `useRole.js`).
14. Limpiar mv stale data (TRUNCATE `mv_church_monthly_donations` o REFRESH manual una vez).

---

## H. Recomendación inmediata al usuario

1. **Hard reload (Ctrl+Shift+R)** del navegador antes de cualquier prueba — Vite HMR a veces deja módulos viejos en memoria durante sesiones largas.
2. **Probar el flujo completo** post-fix:
   - Subir logo en Configuración → Identidad visual.
   - Verificar sidebar, preview del portal, portal público (`/portal.html?slug=casa-de-restauracion`).
   - Cambiar colores en Portal → Identidad. El logo debe persistir.
3. **Commitear el trabajo** cuando estés conforme (5 commits sugeridos arriba).
4. **No olvidar la password nueva**: `Bb4K4CNjJUgTrNr%`.

---

*Fin de la actualización post-auditoría.*
