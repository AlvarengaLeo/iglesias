# MODULE_REQUIREMENTS.md

> Requisitos funcionales por módulo. Para la **arquitectura** ver `ARCHITECTURE.md`. Para el **schema** ver `DATABASE_DESIGN.md`.

Para cada módulo:
1. Objetivo
2. Usuarios
3. Datos que lee / crea / actualiza / elimina
4. Acciones principales
5. Validaciones
6. Estados visuales (loading / empty / error / success)
7. Tablas DB involucradas
8. Relaciones con otros módulos
9. Consultas frecuentes
10. Índices recomendados

---

## 1. INICIO (Dashboard)

### Objetivo
Vista general del estado financiero y de actividad de la iglesia. Resume el mes actual con KPIs y tendencias.

### Usuarios
Todos los roles. Cada uno ve los mismos KPIs (no hay personalización por rol en v1).

### Datos que lee
- KPIs agregados del mes: total donaciones, donantes recurrentes activos, campañas activas, recibos enviados.
- Tendencia mensual últimos 8 meses (de `mv_church_monthly_donations`).
- Distribución por fondo del mes actual.
- Distribución por tipo de donación (diezmo, ofrenda, campaña, misiones) — derivado del fund.
- Actividad reciente (últimos 6 eventos de `audit_logs`).
- Campañas activas con progreso (de `vw_campaign_progress`).
- Acciones pendientes (cálculo dinámico):
  - Stripe conectado? → `churches.stripe_charges_enabled`.
  - EIN llenado? → `churches.ein IS NOT NULL`.
  - Portal publicado? → `portal_settings.publish_status = 'published'`.
  - Recibos pendientes? → `COUNT(*) FROM contribution_receipts WHERE status='generated' AND id NOT IN (SELECT receipt_id FROM receipt_deliveries)`.

### Datos que crea/actualiza/elimina
Ninguno. Es read-only.

### Acciones principales
- "Registrar donación" → navega a Donaciones + abre modal.
- "Agregar persona" → navega a Personas + abre modal.
- "Publicar cambios" → navega a Portal.
- Click en KPI card → navega a módulo correspondiente (opcional en v1).
- "Ver campaña" → navega a Donaciones tab Campañas + drawer abierto.
- Click en acción pendiente → navega al módulo relevante.

### Validaciones
N/A (read-only).

### Estados visuales
- **Loading**: skeleton para cada KPI + cada chart.
- **Empty**: si iglesia recién creada sin donaciones → "Tu primera donación aparecerá aquí" con CTA "Registrar donación".
- **Error**: toast + "No se pudieron cargar los KPIs. Reintentar."

### Tablas DB involucradas
- `donations`, `recurring_donation_profiles`, `campaigns`, `contribution_receipts`, `receipt_deliveries`, `audit_logs`, `funds`, `churches`, `portal_settings`.
- Vista `vw_campaign_progress`.
- Materialized view `mv_church_monthly_donations`.

### Relaciones con otros módulos
Lee desde todos los demás. No escribe.

### Consultas frecuentes
- `rpc_dashboard_kpis(church_id, now())` → un round-trip para todos los KPIs.
- `SELECT * FROM vw_campaign_progress WHERE church_id = $1 AND status = 'active' ORDER BY end_date LIMIT 5`.
- `SELECT * FROM audit_logs WHERE church_id = $1 ORDER BY created_at DESC LIMIT 6`.
- Tendencia: `SELECT year, month, SUM(total_cents) FROM mv_church_monthly_donations WHERE church_id = $1 GROUP BY year, month ORDER BY year DESC, month DESC LIMIT 8`.

### Índices recomendados
Ya cubiertos: `idx_donations_church_date`, `idx_audit_church_created`, `idx_campaigns_church_status`, `idx_mv_monthly_donations_pk`.

---

## 2. PERSONAS

### Objetivo
Gestionar la base de datos de personas: miembros, visitantes, donantes, organizaciones, servidores, líderes, inactivos.

### Usuarios
- **Read**: todos.
- **Create/Update**: admin, pastor, secretary.
- **Notas privadas pastorales**: solo admin + pastor.

### Datos que lee
- Lista de personas filtrada por status + búsqueda.
- Detalle completo de persona: contacto, status, tags, household, donation summary, followups.
- Historial de donaciones por persona (últimas 50).
- Followups históricos.

### Datos que crea
- Persona nueva (individual u organization).
- Tag asignado a persona.
- Followup (call, visit, message, note).
- Household + members.

### Datos que actualiza
- Datos de contacto, status, tags, address.
- Pastoral note resumen.
- next_followup_at.

### Datos que elimina
- Soft delete via `deleted_at`. Hard delete bloqueado por RLS.
- Quitar tag (delete row en `person_tag_assignments`).
- Quitar persona de household.

### Acciones principales
- Buscar persona (debounced 300ms).
- Filtrar por chip de status.
- Click "Agregar persona" → modal.
- Click en fila → drawer.
- Drawer tab "Resumen" → datos de contacto + family + summary.
- Drawer tab "Donaciones" → historial.
- Drawer tab "Seguimiento" → followups + próximas fechas.
- Drawer tab "Notas" → followups privados.
- "Enviar mensaje" → opens email client (mailto:) en v1.
- "Editar persona" → form en lugar (no modal separado para editar).

### Validaciones
- Persona individual: al menos `first_name` o `last_name` requerido.
- Persona organization: `organization_name` requerido.
- Email: formato válido (regex) + único por iglesia (opcional con warning, no enforce).
- Teléfono: formato libre v1.
- Status debe estar en el enum.

### Estados visuales
- **Loading**: tabla con 5 rows skeleton.
- **Empty**: "Tu congregación empieza aquí" + CTA "Agregar primera persona".
- **No results de búsqueda**: "Sin resultados para '{query}'".
- **Drawer cargando**: skeleton de 4 tabs.

### Tablas DB involucradas
`people`, `person_tags`, `person_tag_assignments`, `households`, `household_members`, `person_followups`, `donations` (read-only desde drawer).

### Relaciones con otros módulos
- Donaciones lee de `people` (selector de donante).
- Configuración no toca esta tabla.
- Portal no toca personas.

### Consultas frecuentes
- Listar con filtro: ver §8.1 de DATABASE_DESIGN.
- Buscar: ver §8.2.
- Detalle: SELECT person + tags + household + followups + donation_summary en 4 queries paralelas.

### Índices recomendados
Cubiertos en DATABASE_DESIGN §4: `idx_people_church_status`, `idx_people_name_trgm`, `idx_people_email_lower`, `idx_people_phone`, `idx_people_next_followup`.

---

## 3. DONACIONES

### Objetivo
Registrar y gestionar todas las contribuciones financieras: únicas, mensuales, anuales; fondos; campañas; recibos; reenvíos.

### Usuarios
- **Read**: todos.
- **Register donation**: admin, pastor, treasurer.
- **Edit donation**: admin, treasurer.
- **Create campaign/fund**: admin, treasurer.
- **Resend receipts**: admin, pastor, treasurer, secretary.

### Datos que lee
- Lista de donaciones con joins (donor, fund, campaign).
- Lista de recurring profiles.
- Lista de campaigns.
- Lista de funds.
- Detalle de donación + receipt + deliveries.

### Datos que crea
- Donación (via `rpc_register_donation` → crea donation + opcionalmente receipt + audit_log).
- Campaña.
- Fondo.
- Recurring profile.
- Receipt delivery (resend via `rpc_resend_receipt`).

### Datos que actualiza
- Donación (amount, status, notes — solo treasurer/admin).
- Estado de campaña (draft → active → closed).
- Estado de receipt (sent → resent).
- `is_visible_on_portal` en campaigns.

### Datos que elimina
- Soft delete de donación (con razón obligatoria → audit_log).
- Cancelar recurring profile.
- Archivar campaña.

### Acciones principales
- Click "Registrar donación" → modal con form.
- Click "Crear campaña" → modal.
- Click en row donación → drawer.
- Drawer "Ver recibo" → render preview.
- Drawer "PDF" → genera con `pdfmake` + descarga.
- Drawer "Reenviar" → modal con motivo + email opcional → llama `rpc_resend_receipt` + Edge function `send-receipt-email`.
- Drawer "Ver historial" → expand deliveries.
- Tabs: Todas, Recurrentes, Campañas, Recibos.
- Filtros: fecha (date range), fondo, campaña, método, estado.

### Validaciones
- Amount > 0.
- Donor person_id existe en iglesia.
- Fund existe en iglesia.
- Campaign (si presente) existe en iglesia.
- Frequency consistente con recurring_profile_id (si presente).
- Payment_method debe estar en el enum.
- Donation_date no puede ser en futuro > 1 día.
- Resend: motivo obligatorio.

### Estados visuales
- **Loading**: tabla skeleton + KPIs skeleton.
- **Empty**: "Tus primeras donaciones aparecerán aquí".
- **Filtered empty**: "Sin donaciones con esos filtros".
- **Modal submit pending**: botón "Guardando..." + disabled.
- **Receipt resend success**: toast verde "Recibo reenviado" + recipient.
- **Receipt resend error**: toast rojo + retry option.

### Tablas DB involucradas
`donations`, `recurring_donation_profiles`, `campaigns`, `funds`, `contribution_receipts`, `receipt_deliveries`, `people` (read), `church_receipt_sequences`, `audit_logs`.

### Relaciones con otros módulos
- Lee de Personas (donor selector).
- Alimenta Reportes y Inicio.
- Portal usa campaigns con `is_visible_on_portal`.

### Consultas frecuentes
- Listar donaciones (vista por defecto, mes actual):
  ```sql
  SELECT d.*, p.first_name, p.last_name, p.organization_name,
         f.name as fund_name, c.name as campaign_name
  FROM donations d
  LEFT JOIN people p ON p.id = d.donor_person_id
  LEFT JOIN funds f ON f.id = d.fund_id
  LEFT JOIN campaigns c ON c.id = d.campaign_id
  WHERE d.church_id = $1
    AND d.donation_date >= $2 AND d.donation_date < $3
    AND d.deleted_at IS NULL
  ORDER BY d.donation_date DESC
  LIMIT 100;
  ```
- Recurring activos: `SELECT * FROM vw_active_recurring WHERE church_id = $1`.
- Campaigns con progreso: `SELECT * FROM vw_campaign_progress WHERE church_id = $1 AND status='active'`.
- Drawer detalle: 3 queries (donation + receipt + deliveries).

### Índices recomendados
Cubiertos: `idx_donations_church_date`, `idx_donations_church_status`, `idx_donations_church_fund`, `idx_donations_church_campaign`, `idx_donations_church_method`, `idx_receipts_church_donation`, `idx_deliveries_receipt`.

---

## 4. PORTAL

### Objetivo
Permitir al admin/secretary editar el contenido público de la iglesia (landing page) sin tocar código. Modelo draft/publish para evitar publicar cambios accidentalmente.

### Usuarios
- **Read**: admin, pastor, secretary.
- **Edit draft**: admin, pastor, secretary.
- **Publish**: admin, pastor, secretary.

### Datos que lee
- `portal_settings.draft_data` (lo que se está editando).
- `portal_settings.published_data` (para comparar / discard).
- `portal_settings.publish_status` (badge).
- `service_times` (sección horarios).
- `campaigns WHERE is_visible_on_portal = true` (lista de visibles).
- `funds` (selector de default_fund).
- `churches` (datos de identidad denormalizados).

### Datos que crea
- Service time row.

### Datos que actualiza
- `portal_settings.draft_data` (cualquier cambio en cualquier sección).
- `portal_settings.published_data` (al publicar).
- `service_times` (CRUD).
- `campaigns.is_visible_on_portal` (toggle).
- `churches.primary_color`, `churches.logo_url`, etc. si edita identidad.

### Datos que elimina
- Service time (soft via is_active=false).

### Acciones principales
- Click en sección sidebar (Identidad/Inicio/Horarios/Donaciones/Campañas/Contacto) → cambia editor.
- Editar campos → actualiza `draft_data` localmente + escribe DB on blur/save-debounced.
- Toggle device preview (desktop/mobile).
- "Guardar cambios" → persiste draft + toast "Cambios guardados".
- "Publicar portal" → `rpc_publish_portal()` + toast "Portal publicado".
- "Descartar" → restaura draft = published.
- Upload logo/hero → Supabase Storage + URL en draft.
- Toggle campaña visible → UPDATE campaigns.is_visible_on_portal.

### Validaciones
- Hero title max 120 chars.
- Hero message max 500 chars.
- Color principal: hex válido.
- Logo max 2MB.
- Hero image max 5MB.
- Email contacto: formato válido.
- URL maps: opcional pero si presente debe ser URL válida.

### Estados visuales
- **Loading**: skeleton de sección activa.
- **Unsaved changes**: badge "Cambios sin publicar" + banner top.
- **Saving**: botón "Guardando...".
- **Published**: badge verde "Publicado".
- **Preview vacío**: si nunca se ha publicado, mostrar placeholder.

### Tablas DB involucradas
`portal_settings`, `service_times`, `campaigns`, `funds` (read), `churches` (parcial).

### Relaciones con otros módulos
- Configuración también edita `churches` (datos legales). Hay overlap mínimo: portal edita visual, config edita legal.
- Donaciones controla la lista de campaigns visibles.

### Consultas frecuentes
- `SELECT * FROM portal_settings WHERE church_id = $1`.
- `SELECT * FROM service_times WHERE church_id = $1 AND is_active = true ORDER BY day_of_week, start_time`.
- `SELECT * FROM campaigns WHERE church_id = $1 AND status = 'active' ORDER BY name` (para toggle list).

### Índices recomendados
Cubiertos: `idx_service_times_church`, `idx_campaigns_portal_visible`.

---

## 5. REPORTES

### Objetivo
Vistas analíticas y exportables de la actividad financiera. KPIs filtrables por rango de fecha, fondo, campaña.

### Usuarios
Todos pueden leer. Solo admin/treasurer pueden generar "Estado anual de contribuciones".

### Datos que lee
- Mismo set que Inicio pero con rango filtrable.
- KPIs: total recibido, total neto (after fees), donantes únicos, top campaign.
- Chart data: mensual (línea), por fondo (bar), por método (donut), top campañas (hbar).
- Tabla de "Reportes disponibles" (templates predefinidos).
- Insights cards (texto descriptivo, calculado).

### Datos que crea
- `contribution_receipts` tipo `annual_statement` (al generar estado anual).
- Audit log de export.

### Datos que actualiza
Nada (read-only excepto annual statement generation).

### Acciones principales
- Cambiar rango de fechas → re-query KPIs y charts.
- Cambiar filtro fondo → re-query.
- Cambiar filtro campaña → re-query.
- Click "Exportar Excel" → `xlsx` con datos filtrados + descarga.
- Click "Descargar PDF" → `pdfmake` con KPIs + charts as PNG + descarga.
- Click "Enviar por email" → Edge function `send-report-email` (stub v1).
- Click "Generar estado anual de contribuciones" → modal: año + donante (o todos) → genera receipts type `annual_statement` por donor.
- Click en row "Reporte disponible" → ejecuta el template asociado.

### Validaciones
- Rango de fecha: end_date >= start_date.
- Fondo/campaña debe existir en iglesia.
- Annual statement: año pasado o actual; donante debe tener al menos una donación pagada en ese año.

### Estados visuales
- **Loading**: skeleton KPIs + charts.
- **Empty (filtro vacío)**: "Sin donaciones en ese rango".
- **Exportando**: botón "Generando..." + spinner.
- **Email enviado**: toast "Reporte enviado a {email}".

### Tablas DB involucradas
Mismo set que Inicio + `contribution_receipts` (al generar).

### Relaciones con otros módulos
Lee todo. Crea solo annual receipts.

### Consultas frecuentes
- Mensual filtrado: `SELECT year, month, SUM(total_cents) FROM mv_church_monthly_donations WHERE church_id = $1 AND (year, month) BETWEEN $2 AND $3 GROUP BY year, month`.
- Por fondo en rango: similar.
- Por método: similar.
- Top campañas: `SELECT * FROM vw_campaign_progress WHERE church_id = $1 ORDER BY collected_cents DESC LIMIT 5`.
- Donantes únicos en rango: `SELECT COUNT(DISTINCT donor_person_id) FROM donations WHERE church_id = $1 AND donation_date >= $2 AND donation_date < $3 AND payment_status = 'paid'`.
- Annual statement: agrega donaciones por persona+año, crea receipt summary.

### Índices recomendados
Mismos del módulo Inicio.

---

## 6. CONFIGURACIÓN

### Objetivo
Gestionar ajustes administrativos, legales y de plantilla de la iglesia.

### Usuarios
- **Datos de la iglesia**: admin, pastor.
- **Usuarios y permisos**: solo admin.
- **Stripe / pagos**: admin, treasurer.
- **Recibos (template)**: admin, treasurer.
- **Idioma**: todos (solo afecta UI propia? o iglesia? — v1 a nivel iglesia).
- **Suscripción**: admin (read-only en v1).

### Datos que lee
- `churches` (todos los campos).
- `church_users` (lista de usuarios + roles).
- `church_invitations` (lista de pendientes).
- `funds` (para selector de default fund en recibo template).

### Datos que crea
- `church_invitations` (via Edge function `invite-user`).

### Datos que actualiza
- `churches` (legal_name, public_name, ein, address, contact, pastor_name, treasurer_name, primary_color, logo_url, locale, plan).
- `churches.receipt_*` (template fields).
- `church_users.role` (change role).
- `church_users.is_active` (deactivate access).
- `churches.stripe_account_id` (cuando Stripe se conecte).

### Datos que elimina
- `church_invitations.revoked_at` (revocar invitación pendiente).
- Desactivar usuario (soft via is_active=false).

### Acciones principales
- Form "Datos de la iglesia" → save → updates row.
- Click "Invitar usuario" → modal: email + role → Edge function `invite-user`.
- Click "Cambiar rol" → modal → update.
- Click "Desactivar acceso" → confirm modal → set is_active=false.
- Click "Conectar Stripe" → v1: modal "Próximamente" + guarda intent.
- Form "Recibos de contribución" → save → updates churches fields + preview en vivo.
- Toggle idioma ES/EN → updates locale.
- "Ver facturación" → link a Stripe Customer Portal (cuando esté activo).

### Validaciones
- Legal name requerido.
- EIN: formato XX-XXXXXXX si presente.
- Email: formato válido.
- Phone: libre.
- Invitar usuario: email no duplicado en church_users activos o invitaciones no expiradas.
- Solo 1 admin no puede ser desactivado (debe haber otro admin primero).

### Estados visuales
- **Loading**: form skeleton.
- **Saving**: botón disabled + spinner.
- **Success**: toast "Cambios guardados".
- **Invitar enviado**: toast "Invitación enviada a {email}".
- **Stripe disconnected**: badge gris "No conectado".

### Tablas DB involucradas
`churches`, `church_users`, `church_invitations`, `funds` (read).

### Relaciones con otros módulos
- Cambios en `churches.public_name` se reflejan en Sidebar y Topbar inmediatamente.
- `churches.locale` puede afectar formato de fechas/números en todos los módulos (v2).
- `church_users` cambios afectan permisos en todos los módulos.

### Consultas frecuentes
- `SELECT * FROM churches WHERE id = $1`.
- `SELECT cu.*, au.email FROM church_users cu JOIN auth.users au ON au.id = cu.user_id WHERE cu.church_id = $1 ORDER BY cu.role, cu.joined_at`.
- `SELECT * FROM church_invitations WHERE church_id = $1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now()`.

### Índices recomendados
Cubiertos: `idx_church_users_church_active`, `idx_invitations_email_active`.

---

## 7. Acciones globales transversales

### 7.1 Auditoría automática
Cada acción crítica genera `audit_logs`:
- donation.create, donation.update, donation.delete
- receipt.create, receipt.resend
- portal.publish, portal.save_draft
- church.update
- church_users.invite, .accept, .role_change, .deactivate
- auth.login, auth.logout

### 7.2 Toasts unificados
Sistema existente; expandir patterns:
- Success: tone="success", icon="check"
- Error: tone="error", icon="alert"
- Info: tone="info", icon="info"
- Warning: tone="warning"

### 7.3 Empty states
Cada lista vacía tiene CTA accionable. No "Sin datos" pelado.

### 7.4 Loading states
- Listas: skeleton de 3-5 rows.
- Detail panels: skeleton de campos.
- KPI cards: skeleton específico.

### 7.5 Error handling
- Network error: "Conexión perdida. Reintentar."
- Permission error (403): "No tienes permiso para esta acción."
- Validation error: específico por campo.
- Unknown: "Algo salió mal. Inténtalo de nuevo."

---

## 8. Cross-module data flows

```
Personas ────registra donante────► Donaciones
   │
   └──► Donaciones lee donor info en drawer

Donaciones ────genera────► Recibo ────envía────► Resend (email)
                                │
                                └────► Deliveries history

Donaciones ────agrega a────► Campañas (progress)
                              │
                              └──── Portal toggle visibility

Portal ────reads from────► Campaigns + Funds + Service Times + Churches

Configuración ────modifies────► Churches (visible in Sidebar/Topbar)
        │
        └─── invites────► Church Users + auth.users

Reportes ────read-only del set total───► alimenta exports + annual statements

Inicio ────reads aggregated───► todo
```

---

## 9. Cobertura del demo actual

Verificación: cada elemento del UI mockeado tiene su pareja en módulo + tabla.

| UI element | Módulo | Tabla(s) | Status |
|---|---|---|---|
| Sidebar church name | Layout | `churches` | ✅ |
| Topbar avatar + dropdown | Layout | `church_users` | ✅ |
| Inicio KPI: donaciones mes | Inicio | `donations` | ✅ |
| Inicio KPI: recurrentes | Inicio | `recurring_donation_profiles` | ✅ |
| Inicio LineChart tendencia | Inicio | `mv_church_monthly_donations` | ✅ |
| Inicio campaña progress | Inicio | `vw_campaign_progress` | ✅ |
| Inicio acciones pendientes | Inicio | computed | ✅ |
| Personas tabla | Personas | `people` | ✅ |
| Personas filter chips | Personas | `people.status` | ✅ |
| Drawer tab Donaciones | Personas | `donations` | ✅ |
| Drawer tab Notas | Personas | `person_followups` | ✅ |
| Drawer family | Personas | `households` | ✅ |
| Donaciones tabla | Donaciones | `donations` | ✅ |
| Drawer Stripe ID | Donaciones | `donations.stripe_*` | ✅ |
| Drawer receipt history | Donaciones | `receipt_deliveries` | ✅ |
| Modal Crear campaña | Donaciones | `campaigns` | ✅ |
| Modal Registrar donación | Donaciones | `rpc_register_donation` | ✅ |
| Portal sección Identidad | Portal | `portal_settings.draft_data.identity` + `churches` | ✅ |
| Portal sección Horarios | Portal | `service_times` | ✅ |
| Portal toggle campaña visible | Portal | `campaigns.is_visible_on_portal` | ✅ |
| Portal preview | Portal | `portal_settings.draft_data` | ✅ |
| Reportes KPI total neto | Reportes | computed (sum - sum(fees)) | ✅ |
| Reportes Donut métodos | Reportes | `mv_church_monthly_donations` | ✅ |
| Reportes Top campañas | Reportes | `vw_campaign_progress` | ✅ |
| Reportes tabla disponibles | Reportes | template registry (no table needed in v1) | ✅ |
| Reportes "Estado anual" | Reportes | `contribution_receipts` type `annual_statement` | ✅ |
| Config datos iglesia | Config | `churches` | ✅ |
| Config usuarios | Config | `church_users` + `church_invitations` | ✅ |
| Config Stripe card | Config | `churches.stripe_*` | ✅ |
| Config recibo template + preview | Config | `churches.receipt_*` | ✅ |
| Config idioma | Config | `churches.locale` | ✅ |
| Config suscripción | Config | `churches.plan`, `plan_status` | ✅ |
