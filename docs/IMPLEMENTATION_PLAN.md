# IMPLEMENTATION_PLAN.md

> Roadmap operativo del CRM "Sistema de Iglesia". Define **cuándo** se construye **qué**, con criterios de aceptación claros. Para el **por qué** ver `ARCHITECTURE.md`. Para el **cómo correrlo** ver `SUPABASE_SETUP.md`.

---

## 1. Resumen ejecutivo

| Aspecto | Decisión |
|---|---|
| Stack frontend | React 18 + Vite |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Multi-tenant | Una sola DB, `church_id` en cada tabla, RLS estricto |
| Auth | Invite-only (admin invita, no hay sign-up público) |
| Stripe | Scaffolded (columnas, edge stubs) — no activo en v1 |
| Email | Resend via Edge Function |
| PDF | `pdfmake` client-side |
| Excel | `xlsx` (SheetJS) client-side |
| Routing | Hash-based (`#inicio`, etc.) en v1 |
| Tipos | JS plano en v1, evaluar TS en v2 |

---

## 2. Fases

### Fase 0 — Bootstrap Vite ✅
- `package.json`, `vite.config.js`, `.gitignore`, `.env.example`.
- `npm install` (Vite + React).
- Verificar que la app actual sigue montando.
- **AC**: `npm run dev` levanta dashboard exactamente igual que con http-server.

### Fase 1 — Documentación ✅
- Crear `docs/IMPLEMENTATION_PLAN.md`, `ARCHITECTURE.md`, `DATABASE_DESIGN.md`, `MODULE_REQUIREMENTS.md`, `SUPABASE_SETUP.md`.
- **AC**: cualquier dev nuevo entiende el sistema sin sesión live.

### Fase 2 — Schema y migraciones Supabase
- `supabase init` + `link --project-ref dcmdcmpqowwntdtkrlfm`.
- 11 archivos numerados en `supabase/migrations/`:
  1. `_01_extensions.sql` — `pg_trgm`, `citext`, `pgcrypto`.
  2. `_02_core_tables.sql` — `churches`, `church_users`, `church_invitations`.
  3. `_03_people.sql` — `people`, `person_tags`, `person_tag_assignments`, `households`, `household_members`, `person_followups`.
  4. `_04_finance.sql` — `funds`, `campaigns`, `donations`, `recurring_donation_profiles`, `contribution_receipts`, `receipt_deliveries`, `church_receipt_sequences`.
  5. `_05_portal.sql` — `portal_settings`, `service_times`.
  6. `_06_audit.sql` — `audit_logs`.
  7. `_07_indexes.sql` — todos los indexes.
  8. `_08_functions.sql` — `user_church_ids()`, `set_updated_at()`, `rpc_*` functions.
  9. `_09_views.sql` — `vw_campaign_progress`, `vw_active_recurring`, `mv_church_monthly_donations`.
  10. `_10_rls.sql` — policies por tabla + matriz de roles.
  11. `_11_triggers.sql` — audit triggers + `on_auth_user_created`.
- `supabase db push`.
- **AC**: schema desplegado, RLS activado, query sin auth devuelve vacío.

### Fase 3 — Seed data
- `supabase/seed.sql` con:
  - 1 iglesia: Iglesia Casa de Restauración Inc.
  - 3 usuarios auth (Pastor Miguel admin, María López treasurer, Ana Rivera secretary).
  - 4 fondos (General, Misiones, Construcción, Ayuda Comunitaria).
  - 3 campañas activas con metas.
  - 12 personas (incluida ABC Construction LLC).
  - 25 donaciones (mix de frequency/method/status, una de $10K de ABC).
  - 15 recibos (1 reenviado por "Solicitud del contador", 1 con historial).
  - 1 portal_settings con draft = published.
  - 4 service_times.
- Aplicar con `supabase db reset` (drops + migrations + seed).
- **AC**: dashboard query con Pastor Miguel devuelve datos consistentes.

### Fase 4 — Auth wiring
- `npm install @supabase/supabase-js pdfmake xlsx date-fns @vitejs/plugin-react`.
- Reestructurar a `src/` (mover archivos precompilados, agregar JSX nuevo).
- Crear `src/lib/supabase.js`, `src/hooks/useAuth.js`, `useChurch.js`, `useRole.js`.
- Páginas auth: `Login.jsx`, `AcceptInvite.jsx`, `ResetPassword.jsx`.
- App raíz con auth guard.
- Topbar dinámico (avatar real, logout funcional).
- Sidebar lee nombre de iglesia desde `useChurch()`.
- **AC**: Pastor Miguel hace login, ve dashboard, logout funciona. RLS bloquea acceso anónimo.

### Fase 5 — Módulo Personas
- `src/api/people.js`, `tags.js`, `households.js`, `followups.js`.
- Reemplazar `const PEOPLE = [...]` con `useEffect + listPeople(churchId)`.
- Filtros + search (debounced 300ms).
- "Agregar persona" modal → `createPerson()` + toast.
- Drawer profile → 4 tabs cargadas desde API.
- **AC**: Crear, ver, filtrar, buscar funciona. La nueva persona aparece sin refresh.

### Fase 6 — Módulo Donaciones
- `src/api/donations.js`, `funds.js`, `campaigns.js`, `recurring.js`, `receipts.js`, `deliveries.js`.
- "Registrar donación" → `rpc_register_donation()` (transacción atómica).
- "Crear campaña" → `createCampaign()`.
- Drawer detalle → receipt + deliveries.
- "Reenviar recibo" → `rpc_resend_receipt(receipt_id, reason)` → opcional Edge function send-receipt-email.
- 4 sub-tabs y 5 filtros.
- **AC**: Registrar donación genera receipt con número correlativo. Reenviar recibo NO crea nueva donación.

### Fase 7 — Módulo Portal
- `src/api/portal.js`, `src/api/storage.js`.
- Cada sección lee de `portal_settings.draft_data` JSON.
- Cambios actualizan draft + flag `unsavedChanges`.
- "Guardar" persiste draft. "Publicar" → `rpc_publish_portal()`. "Descartar" revierte draft a published.
- Logo/hero upload → Storage bucket `church-assets/{church_id}/`.
- Service times editables.
- Toggle visibilidad de campañas.
- **AC**: editar/guardar/publicar/descartar funcionan. Estado persiste tras reload.

### Fase 8 — Módulo Reportes
- `src/api/reports.js` llama RPCs y views.
- KPIs alimentadas por `rpc_dashboard_kpis(church_id, range)`.
- 4 charts (line/bar/donut/hbar) con datos filtrados.
- 3 filtros (rango, fondo, campaña).
- "Exportar Excel" → `xlsx` client-side.
- "Descargar PDF" → `pdfmake` con charts as PNG (canvas).
- "Enviar email" → Edge function (stub v1).
- Tabla "Reportes disponibles" con 6 templates.
- Estado anual de contribuciones → `contribution_receipts` tipo `annual_statement`.
- **AC**: cambiar rango actualiza KPIs y charts. Excel descarga con datos reales.

### Fase 9 — Módulo Configuración
- `src/api/churches.js`, `users.js`.
- 6 secciones bound a tablas reales.
- "Invitar usuario" → Edge function `invite-user`.
- Stripe → mostrar status + botón "Conectar" (stub).
- Preview de recibo en vivo.
- **AC**: editar datos refleja en sidebar/topbar. Invitar usuario envía email Resend.

### Fase 10 — Módulo Inicio (Dashboard)
- `src/api/dashboard.js` → `rpc_dashboard_kpis()` + `vw_campaign_progress`.
- KPIs + 4 charts + actividad reciente (últimas 6 entradas de audit_logs).
- Campañas activas desde view.
- Acciones pendientes dinámicas (Stripe?, EIN?, portal publicado?, recibos pendientes?).
- Saludo dinámico con `church.public_name`.
- **AC**: datos del dashboard cuadran con Reportes en mismo filtro.

### Fase 11 — Polish
- Validaciones client + server.
- Loading skeletons.
- Empty states con CTA.
- Disabled states en async + spinner en botones.
- Error handling consistente (toast + log).
- `prefers-reduced-motion` respetado.
- **AC**: UX consistente sin estados raros.

### Fase 12 — QA cross-tenant + manual
- Crear 2da iglesia "Iglesia Test" + 1 usuario.
- Verificar aislamiento RLS por tabla.
- E2E: invite → accept → register → resend → publish → report.
- Mobile testing (375px).
- Smoke test Resend.
- Receipt numbering concurrente (script).
- **AC**: RLS impide cross-tenant. Flow completo < 5 min sin errores.

---

## 3. Criterios de aceptación globales (al cierre de Fase 12)

| # | Criterio |
|---|---|
| 1 | `npm install && npm run dev` levanta app en `http://localhost:5173` |
| 2 | Login con `miguel@casaderestauracion.org` funciona |
| 3 | Dashboard KPIs reales: $8,450 mes, 48 recurrentes, 3 campañas, 126 recibos |
| 4 | Personas: 12 filas. Filtro "Miembros" → 3. Search "María" → encuentra. |
| 5 | Drawer perfil: tabs Resumen/Donaciones/Seguimiento/Notas con data real |
| 6 | "Agregar persona" → tabla se actualiza sin refresh + toast |
| 7 | Donaciones: 25 filas. Filtro "Pendiente" → solo pendientes. |
| 8 | "Registrar donación" → receipt nuevo con número `2026-000026` |
| 9 | "Reenviar recibo" con motivo → toast + receipt_deliveries row + Resend logs |
| 10 | Portal: editar hero → guardar → reload persiste. Publicar cambia badge. |
| 11 | Reportes: cambiar rango → KPIs recalculan. Excel descarga con datos reales. |
| 12 | Configuración: editar EIN → guardar → reflected en sidebar |
| 13 | Invitar usuario → email llega → link funciona → user en church_users |
| 14 | Logout → login con usuario de otra iglesia → NO ve datos cross-tenant |
| 15 | Estado anual de contribuciones → PDF agregado por donante 2026 |

---

## 4. Riesgos y mitigaciones (tabla rápida)

| Riesgo | Impacto | Mitigación |
|---|---|---|
| RLS mal configurado | Filtra cross-tenant | Helper `user_church_ids()` + tests Fase 12 |
| Receipt numbering race | Duplicados | `rpc_assign_receipt_number()` con lock |
| Money en float | Errores de redondeo | `BIGINT` cents siempre |
| Spanish chars en PDF | ñ/tildes rotos | `pdfmake` (no jsPDF) |
| Resend API key expuesta | Spam/abuso | Solo en Edge Function |
| Stripe webhook sin firma | Eventos falsos | Validar `Stripe-Signature` incluso en stub |
| Hardcoded data en código | Hard to refactor | Hook `useChurch()` centraliza |

---

## 5. Convenciones de commit (cuando agreguemos git)

```
feat(personas): wire add-person modal to API
fix(donations): receipt numbering race condition
refactor(api): extract supabase client
chore(deps): bump pdfmake to 0.2.10
docs(architecture): clarify RLS pattern
```

---

## 6. Estado actual

- **Fases completas**: 0 (bootstrap), 1 (docs).
- **Próximo paso**: Fase 2 (schema). Requiere:
  - Password de Postgres (`SUPABASE_DB_PASSWORD`).
  - Confirmación de proyecto Supabase vacío.
  - Confirmación de cuenta Resend o stub.
