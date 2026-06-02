# Equipos (Teams) — F8 QA & Security Report

Fecha: 2026-06-01 · Proyecto Supabase remoto: `dcmdcmpqowwntdtkrlfm`

Validación end-to-end del módulo **Equipos** contra la base remota (cada test crea datos, ejecuta como usuario real con su JWT, y limpia).

## 1. Resultados funcionales (todo PASS)

| Fase | Qué se validó e2e | Resultado |
|---|---|---|
| F2 | 16 tablas creadas + RLS habilitado (`relrowsecurity=t`) + RPCs/triggers desplegados | ✅ |
| F3 | Rol `servidor` + `church_users.person_id`; invitación servidor (insert real) ; edge function `invite-user` desplegado | ✅ |
| F4 | `crear culto → asignar persona → confirmar` (RPCs); trigger de auto-membresía crea canal de servicio y enrola al asignado | ✅ |
| F5 | `rpc_send_message` como miembro; lectura con RLS de miembro; `rpc_unread_summary`; `rpc_mark_channel_read` | ✅ |
| F6 | Subida a bucket privado `chat-media` (RLS por membresía) + `rpc_send_message` con `p_attachments` + signed URL | ✅ |
| F7 | Notificación `assignment_created`; borrar mensaje (moderación → tombstone); recordatorios T-24h → `service_reminder`; `mark_all_read` | ✅ |
| Build | `npm run build` verde tras cada fase | ✅ |

**Bloqueo de escritura (correcto):** un `servidor` NO puede crear servicios; un usuario de la iglesia B NO puede crear/asignar en la iglesia A (ambos `42501 forbidden`). Las RPCs `SECURITY DEFINER` validan rol correctamente.

## 2. ✅ RLS verificado correcto (corrección de un falso positivo previo)

> **Aclaración importante:** una versión anterior de este reporte marcó una supuesta "fuga de RLS" en la capa API. **Era un FALSO POSITIVO del arnés de pruebas, no del producto.** El arnés en PowerShell usaba `@(Invoke-RestMethod ...).Count`, y para una respuesta vacía `[]` (= RLS aplicado), `Invoke-RestMethod` devuelve `$null` y **`@($null).Count == 1`** en PowerShell — así que cada respuesta VACÍA se contaba como "1 fila / fuga".

### Re-validación con arnés corregido (cuenta el cuerpo CRUDO; `[]` ⇒ 0) — **13/13 PASS**
Suite ejecutada contra el remoto con usuarios reales (admin de A, admin de B, servidor de A) y limpieza:

| Verificación | Resultado |
|---|---|
| anon → `people` / `donations` / `service_events` / `chat_messages` = **0 filas** | ✅ PASS |
| Usuario autenticado de iglesia A → `people` / `service_events` de iglesia B = **0** (cross-tenant) | ✅ PASS |
| Usuario de iglesia B → `service_events` de iglesia A = **0** | ✅ PASS |
| `servidor` (P1) → NO ve la asignación de P2 (`rpc_get_my_services` = 0) | ✅ PASS |
| `servidor` → NO ve equipos donde no es miembro = **0** | ✅ PASS |
| `servidor` (P1) → SÍ ve su propia asignación (≥1) tras asignarle | ✅ PASS |
| `servidor` NO puede crear servicio (`42501`) | ✅ PASS |
| Usuario de B NO puede crear en iglesia A (`42501`) | ✅ PASS |
| Portal público (anon vía `rpc_public_portal_by_slug`) sigue devolviendo datos | ✅ PASS |

### Evidencia de la capa de datos (siempre fue correcta)
- `relrowsecurity = t` en todas las tablas `service_*`/`chat_*` y existentes.
- Policies restrictivas correctas (`church_id = ANY(user_church_ids())`, etc.); sin policy permisiva para `anon`.
- `anon`/`authenticated` **no** tienen `BYPASSRLS` (solo `service_role`).
- Función `SECURITY INVOKER` como `anon`: `SELECT count(*) FROM people` → **0**; `user_church_ids()` → `[]`.
- Cuerpo crudo de `GET /rest/v1/people` para anon = **`[]`** (cero filas).

**Conclusión:** El aislamiento multi-tenant y el servidor-scope del módulo Equipos están **correctos**. No hay nada que arreglar en policies/migraciones.

> **Lección de testing:** nunca usar `@(Invoke-RestMethod ...).Count` para contar filas en PowerShell — cuenta 1 para `[]`. Usar el cuerpo crudo (`(Invoke-WebRequest ...).Content`, `[]` ⇒ 0) o `@supabase/supabase-js` (`data.length`).

## 3. Otros hallazgos menores (preexistentes, no de Equipos)
- **Hard-delete de `churches` bloqueado** por el trigger `audit_changes` (intenta insertar en `audit_logs` la iglesia ya borrada → FK 23503). Las iglesias se borran con **soft-delete** (`deleted_at`).
- **Lectura DIRECTA anon de `churches` devuelve `[]`** pese a la policy `churches_select_anon` (quirk de la API key nueva en lecturas directas). **No afecta** nada: el portal público usa RPCs `SECURITY DEFINER` (`rpc_public_*`), verificado funcionando para anon.

## 4. Cómo reproducir la re-validación
Crear 3 usuarios temporales (admin A, admin B, servidor A) vía `auth/v1/admin/users` + `church_users`; sign-in para JWT; ejecutar la suite contando el **cuerpo crudo** de cada respuesta (`[]` ⇒ 0); limpiar borrando `service_events` (cascade) y los auth users (cascade `church_users`).

## 5. Estado de criterios de aceptación
1–16 ✅ validados a nivel BD/RPC (incluye 15–16 **RLS cross-tenant/ajenos = PASS** con el arnés corregido). 17–19 (no romper Personas/Donaciones/Portal) ✅ (migraciones aditivas; build verde; portal RPC OK). 20 (`npm run build`) ✅.

## 6. ✅ Click-through en NAVEGADOR (e2e UI real, dev server + chrome-devtools)

Validado con la cuenta real `miguel@casaderestauracion.org` (admin) y una cuenta `servidor` de demo vinculada a la persona "Carlos Méndez".

**Admin (Miguel):**
- Login → Sidebar muestra **Equipos** entre Donaciones y Portal (filtro por rol). ✅
- Módulo con tabs de staff: **Calendario · Cultos · Mis equipos · Chat**. ✅
- **Crear culto** (modal → `rpc_create_service_event`) → aparece en el calendario/lista. ✅
- **Asignar persona** (equipo Alabanza → posición Guitarrista → Carlos Méndez → `rpc_assign_person`) → "Carlos Méndez · Alabanza · Guitarrista · Pendiente". ✅
- **Chat**: lista de canales muestra el canal del servicio (auto-creado); abrir canal, **enviar mensaje** (renderiza + botón Eliminar de moderación) + presencia. ✅

**Servidor (Carlos):**
- Login → **Sidebar reducido a SOLO "Equipos"**; redirige a `#equipos`. ✅
- Tabs reducidos: **Mi servicio · Mi equipo · Chat**. ✅
- **Mi servicio** muestra SOLO su asignación (Servicio de Prueba · Alabanza · Guitarrista · Pendiente) con botones grandes **Confirmar / No puedo asistir / Pedir reemplazo**. ✅
- **Confirmar** (`rpc_respond_assignment`) → estado pasa a **Confirmado**. ✅

Capturas: `docs/equipos-ui-calendario.jpeg`, `equipos-ui-asignacion.jpeg`, `equipos-ui-chat.jpeg`, `equipos-ui-mi-servicio-servidor.jpeg`.

### 🐛 Bug real encontrado y CORREGIDO en el click-through
`src/api/chat.js#listChannels` embebe `person:people(...)` a través de `chat_channel_members.person_id`, pero esa columna se creó **sin FK** ("display; no enforce"). PostgREST rechazaba toda la query (PGRST200 "no relationship") → la lista de canales del chat quedaba **vacía para todos**. **Fix:** migración `20260610120019_equipos_chat_member_person_fk.sql` agrega `FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL`. Tras aplicarla (+ propagación del schema cache de PostgREST), el chat lista canales correctamente.

### Notas menores
- El calendario mostró 21:00 para un inicio de 19:00 por offset de zona horaria entre el navegador headless y `America/New_York` (riesgo de TZ ya documentado; guardar/mostrar siempre vía `churches.timezone`).
- Datos de prueba creados en `casa-de-restauracion`: culto "Servicio de Prueba (QA navegador)" + su asignación/canal, y la cuenta `servidor` de demo. Borrables cuando se desee.

> El módulo Equipos (F2–F8) está validado a nivel BD, RPC, build, RLS (13/13) y ahora **UI end-to-end en navegador**, incluyendo la vista reducida del servidor (la promesa de producto).
