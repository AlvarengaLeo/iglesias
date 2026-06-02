Actúa como Senior Full Stack Engineer, Product Architect y Payment-Ready Systems Architect del proyecto Sistema de Iglesia.

Vamos a desarrollar estratégicamente el FLUJO COMPLETO DE DONACIÓN, que es el corazón del proyecto.

IMPORTANTE:
De momento NO vamos a conectar Stripe.
NO vamos a procesar pagos reales.
NO vamos a usar Stripe Checkout todavía.
NO vamos a activar webhooks reales de Stripe.
NO vamos a pedir claves reales de Stripe.
NO vamos a simular donaciones pagadas como si Stripe ya hubiera confirmado el pago.

Pero SÍ quiero dejar todo el sistema preparado para que, cuando se tengan las URLs y keys de Stripe, la conexión sea sencilla, segura y sin rediseñar el flujo.

La idea es construir primero el motor funcional de donaciones:
- donación desde portal público
- donación a campañas
- selección de fondo
- donación única, mensual o anual
- donante persona o empresa
- registro de intención de donación
- estados claros
- conexión con CRM
- preparación para pago externo futuro
- preparación para recibos
- preparación para email
- preparación para Stripe
- reportes y dashboard listos para reflejar donaciones reales cuando sean confirmadas

==================================================
CONTEXTO ACTUAL DEL SISTEMA
==================================================

El proyecto ya tiene:

- Supabase como backend.
- Auth funcional.
- RLS multi-tenant.
- Portal público funcional por slug.
- `rpc_public_portal_by_slug`.
- Módulo Donaciones funcional desde el admin.
- `rpc_register_donation` para registrar donaciones internas.
- `rpc_resend_receipt` para reenviar recibos sin duplicar donaciones.
- Tablas:
  - donations
  - funds
  - campaigns
  - recurring_donation_profiles
  - contribution_receipts
  - receipt_deliveries
  - people
  - churches
  - portal_settings
- Campañas visibles en portal.
- Upload de logo e imágenes funcionando.
- Dashboard y reportes conectados a datos reales.
- Storage público `church-assets`.
- Edge Function `invite-user`.

Pendientes relacionados al flujo de donación:
- Stripe no conectado.
- No existe flujo público completo de donación.
- No existe create-checkout real.
- No existe webhook Stripe real.
- No existe email real de recibos.
- PDF oficial server-side todavía no está cerrado.
- Estado anual de contribuciones no está conectado al botón.
- Las donaciones públicas todavía no tienen flujo estratégico completo.

==================================================
OBJETIVO GENERAL
==================================================

Implementar el flujo público de donación SIN procesar pagos reales todavía, pero dejando todo preparado para conectar Stripe después.

El donante debe poder entrar al portal público de la iglesia y:

1. Donar al Fondo General.
2. Donar a una campaña visible.
3. Elegir donación única.
4. Elegir donación mensual.
5. Elegir donación anual.
6. Donar como persona.
7. Donar como empresa.
8. Completar sus datos.
9. Ver un resumen antes de continuar.
10. Crear una intención de donación en estado pendiente.
11. Ver mensaje claro de que la iglesia todavía no tiene pagos online activos, si Stripe no está conectado.
12. Si el proveedor de pago está configurado en el futuro, redirigir al checkout sin cambiar el flujo.

Este flujo debe ser simple, claro, mobile-first y con lenguaje de iglesia.

No usar:
- invoice
- factura
- compra
- producto
- customer checkout como lenguaje visible

Usar:
- donación
- contribución
- fondo
- campaña
- comprobante
- recibo de contribución
- generosidad
- aporte

==================================================
REGLAS IMPORTANTES
==================================================

NO crear una donation pagada desde el frontend público.
NO marcar una donación como paid sin confirmación de proveedor de pago.
NO crear recibo fiscal definitivo para una intención pendiente.
NO duplicar donaciones.
NO duplicar recibos.
NO crear nueva donación al reenviar recibo.
NO exponer service_role en frontend.
NO exponer claves secretas.
NO hardcodear Stripe keys.
NO romper el flujo manual de donaciones del admin.
NO romper `rpc_register_donation`.
NO romper `rpc_resend_receipt`.
NO modificar migraciones antiguas.
NO hacer cambios destructivos.
NO rediseñar el sistema completo.
NO agregar módulos nuevos al CRM.

La idea es separar claramente:

- Intención de donación pública pendiente.
- Donación confirmada/pagada.
- Recibo generado.
- Reenvío de recibo.
- Reportes.

==================================================
FASE 14.0 — AUDITORÍA DEL FLUJO ACTUAL
==================================================

Antes de implementar, analiza el estado actual.

Revisa:

1. Portal público:
   - src/public/PublicPortal.jsx
   - src/public/public-portal.css
   - src/api/portal.js

2. Donaciones:
   - src/screens/Donaciones.jsx
   - src/api/donations.js
   - src/api/funds.js
   - src/api/campaigns.js
   - src/api/receipts.js
   - src/api/deliveries.js

3. Reportes y dashboard:
   - src/screens/Reportes.jsx
   - src/screens/Inicio.jsx
   - src/api/reports.js
   - src/api/dashboard.js

4. Base de datos:
   - donations
   - funds
   - campaigns
   - recurring_donation_profiles
   - contribution_receipts
   - receipt_deliveries
   - people
   - churches
   - portal_settings
   - service_times

5. RPCs:
   - rpc_register_donation
   - rpc_resend_receipt
   - rpc_public_portal_by_slug
   - rpc_dashboard_kpis
   - cualquier RPC relacionada

Entrega diagnóstico con:

- Qué ya existe.
- Qué se puede reutilizar.
- Qué no se debe tocar.
- Qué tablas faltan.
- Qué flujo público falta.
- Qué debe quedar como preparación para Stripe.
- Qué riesgos existen.
- Qué archivos propones tocar.

No implementes nada hasta entregar esta auditoría.

==================================================
FASE 14.1 — DISEÑO ESTRATÉGICO DEL FLUJO DE DONACIÓN
==================================================

Diseña el flujo público de donación como experiencia principal del producto.

Flujo general:

Portal público
→ botón “Donar ahora”
→ formulario de donación
→ selección de monto
→ selección de frecuencia
→ selección de fondo/campaña
→ datos del donante
→ resumen
→ crear intención de donación
→ si pagos online no están activos, mostrar mensaje controlado
→ si proveedor de pago está activo en el futuro, redirigir a checkout

Estados:

- draft
- pending_payment
- payment_provider_pending
- paid
- failed
- canceled
- expired

Regla:
En esta fase, las intenciones públicas deben quedar como `pending_payment` o equivalente, nunca como `paid`.

Diseñar UX para:

1. Donar al fondo general.
2. Donar a una campaña.
3. Donar como persona.
4. Donar como empresa.
5. Donación única.
6. Donación mensual.
7. Donación anual.
8. Iglesia sin pagos online activos.
9. Iglesia con pagos online preparados pero no configurados.
10. Futuro redireccionamiento a Stripe.

==================================================
FASE 14.2 — MODELO DE DATOS PARA DONATION INTENTS
==================================================

Evalúa crear una tabla nueva, sin modificar migraciones antiguas.

Tabla recomendada:

donation_intents

Propósito:
Guardar una intención pública de donación antes de confirmación de pago.

Campos sugeridos:

- id uuid primary key
- church_id uuid not null
- fund_id uuid nullable
- campaign_id uuid nullable
- donor_person_id uuid nullable
- donor_type text not null
  valores: individual, business, anonymous
- donor_first_name text nullable
- donor_last_name text nullable
- donor_business_name text nullable
- donor_contact_name text nullable
- donor_email text not null
- donor_phone text nullable
- amount_cents bigint not null
- currency char(3) default 'USD'
- frequency text not null
  valores: one_time, monthly, annual
- note text nullable
- source text default 'public_portal'
- status text not null
  valores: pending_payment, payment_provider_pending, completed, canceled, expired, failed
- payment_provider text nullable
  valores futuros: stripe
- provider_checkout_session_id text nullable
- provider_payment_intent_id text nullable
- provider_subscription_id text nullable
- provider_customer_id text nullable
- provider_redirect_url text nullable
- metadata jsonb nullable
- created_at timestamptz
- updated_at timestamptz
- completed_at timestamptz nullable
- expires_at timestamptz nullable

Índices:
- church_id
- church_id + created_at
- church_id + status
- church_id + campaign_id
- church_id + fund_id
- lower(donor_email)
- provider_checkout_session_id unique nullable
- provider_payment_intent_id unique nullable

RLS:
- Admins de iglesia pueden leer sus donation_intents.
- Público no puede listar donation_intents.
- La creación pública debe hacerse por RPC o Edge Function, no por insert directo abierto.
- Edge Function futura puede actualizar estado con service role.
- Anon solo puede crear intención mediante una RPC segura si decides usar RPC.

También evaluar:

donation_payment_events o payment_provider_events

Pero si de momento no conectamos Stripe, solo dejar la estructura preparada y documentada.

==================================================
FASE 14.3 — RPC O EDGE FUNCTION PARA CREAR INTENCIÓN
==================================================

Como no vamos a conectar Stripe todavía, crear una forma segura de registrar una intención pública.

Opción recomendada:
Crear RPC pública segura:

rpc_create_public_donation_intent(...)

Debe:
- recibir church_slug
- validar que la iglesia existe
- validar que el portal está publicado
- validar monto
- validar fondo
- validar campaña
- validar email
- validar frecuencia
- validar tipo de donante
- crear donation_intents en status pending_payment
- devolver:
  - donation_intent_id
  - status
  - message
  - payment_available boolean
  - next_action

Si la iglesia no tiene pagos online activos:
- payment_available = false
- next_action = "offline_followup"
- message:
  “Tu intención de donación fue registrada. La iglesia podrá contactarte para completar el proceso.”

Si en el futuro Stripe está activo:
- payment_available = true
- next_action = "redirect_to_provider"
- provider_ready = true

NO crear donation pagada.
NO crear receipt final.
NO sumar a reportes como donación recibida.
NO afectar campaign collected amount todavía.

Validaciones importantes:

Si campaign_id viene:
- debe pertenecer a la iglesia
- debe estar active
- debe ser visible en portal
- debe tener church portal published

Si fund_id viene:
- debe pertenecer a la iglesia
- debe estar active

Si no viene fund_id pero viene campaign_id:
- usar campaign.fund_id si existe.

Si no viene ninguno:
- usar default fund de la iglesia.

==================================================
FASE 14.4 — PAYMENT PROVIDER ABSTRACTION
==================================================

Dejar lista la arquitectura para conectar Stripe después.

Crear estructura, pero sin conectar Stripe real:

src/api/publicDonations.js
src/lib/paymentProviders.js o similar
supabase/functions/create-donation-checkout, si decides crear stub local

El objetivo es que más adelante conectar Stripe sea sencillo.

Crear interfaz conceptual:

createDonationCheckout(intent)

Debe tener:

- provider: "stripe"
- enabled: false por ahora
- requiredEnv:
  - STRIPE_SECRET_KEY
  - STRIPE_WEBHOOK_SECRET
  - APP_PUBLIC_URL
  - SUPABASE_SERVICE_ROLE_KEY
- future edge function:
  - create-donation-checkout
  - stripe-webhook

No implementar llamada real a Stripe.

Si el usuario intenta pagar online y no hay provider activo:
mostrar mensaje claro:
“Las donaciones en línea aún no están activas para esta iglesia.”

Pero guardar la intención para seguimiento.

Documentar exactamente dónde se conectará Stripe después:
- qué env vars
- qué Edge Functions
- qué columnas
- qué eventos webhook
- qué tabla actualizará
- qué RPC se debe llamar al confirmar pago

==================================================
FASE 14.5 — UI PÚBLICA DE DONACIÓN
==================================================

Modificar el portal público.

Archivos esperados:
- src/public/PublicPortal.jsx
- src/public/public-portal.css
- src/api/publicDonations.js si aplica

Implementar:

1. Botón “Donar ahora”
- Abre modal o sección de donación.

2. Botón en cada campaña visible:
- “Donar a esta campaña”
- Abre el formulario con campaign_id preseleccionado.
- Muestra el nombre de la campaña en el resumen.

3. Formulario público de donación:

Paso 1: Monto
- $5
- $10
- $25
- $50
- $100
- Otro monto

Paso 2: Frecuencia
- Una vez
- Mensual
- Anual

Paso 3: Destino
- Fondo General
- Fondos visibles si aplica
- Campaña seleccionada si viene desde botón de campaña

Paso 4: Tipo de donante
- Persona
- Empresa

Paso 5: Datos
Persona:
- Nombre
- Apellido
- Email
- Teléfono opcional

Empresa:
- Nombre legal de la empresa
- Nombre de contacto
- Email
- Teléfono opcional

Paso 6: Nota opcional
- Mensaje para la iglesia

Paso 7: Resumen
Mostrar:
- monto
- frecuencia
- destino
- tipo de donante
- email donde recibirá comprobante
- aviso:
  “El comprobante se emitirá cuando la donación sea confirmada.”

Botón:
- Si pagos online no activos:
  “Registrar intención de donación”
- Si pagos online activos en futuro:
  “Continuar al pago”

Estados:
- loading
- success
- error
- invalid form

Éxito sin Stripe:
Mensaje:
“Gracias por tu generosidad. Tu intención de donación fue registrada. La iglesia podrá darle seguimiento para completar el proceso.”

No decir:
“Donación pagada”
“Recibo generado”
“Pago confirmado”

==================================================
FASE 14.6 — ADMIN CRM: VISIBILIDAD DE INTENCIONES
==================================================

Como el corazón del sistema son las donaciones, el admin debe poder ver también intenciones pendientes.

Modificar módulo Donaciones sin romper lo existente.

Agregar una sección o tab:

- Intenciones

O incluir filtro:
- Fuente: Manual / Portal público / Intenciones pendientes

Mostrar donation_intents:

Columnas:
- Donante
- Tipo
- Monto
- Frecuencia
- Fondo/Campaña
- Email
- Fecha
- Estado
- Acciones

Acciones:
- Ver detalle
- Marcar como contactado
- Cancelar intención
- Convertir a donación manual confirmada, SOLO si la iglesia recibió el pago por otro método
- Ir a registrar donación con datos precargados

Regla crítica:
Convertir intención en donation pagada requiere confirmación manual explícita y método de pago:
- efectivo
- cheque
- ACH externo
- otro

No convertir automáticamente.

Si se convierte:
- usar `rpc_register_donation` o flujo existente
- crear donation
- crear receipt
- enlazar donation_intent con donation_id si agregas columna
- marcar intent completed

Si no agregas conversión en esta fase, al menos listar y ver detalle.

==================================================
FASE 14.7 — CAMPAIGNS DONATION FLOW SIN STRIPE
==================================================

Cerrar flujo estratégico de campañas.

En portal público:

Campañas visibles deben mostrar:
- nombre
- descripción
- meta
- recaudado
- progreso
- botón “Donar a esta campaña”

Al hacer clic:
- Formulario abre con campaña preseleccionada.
- Usuario puede elegir monto y frecuencia.
- Intent queda asociado a campaign_id.
- Intent queda asociado al fund_id de la campaña si aplica.
- Campaign progress NO cambia hasta que haya donation confirmed.
- El admin puede ver intenciones por campaña.

En admin:
- Donaciones > Campañas debe mostrar:
  - recaudado confirmado
  - intenciones pendientes
  - número de interesados/donantes pendientes
  - progreso confirmado
  - no mezclar pending intent con collected amount

Esto es importante:
La campaña puede mostrar interés pendiente, pero el progreso real debe basarse en donations paid/confirmed.

==================================================
FASE 14.8 — PREPARACIÓN PARA RECIBOS
==================================================

Como todavía no hay pago real público, no generar recibo final al crear intención.

Pero dejar preparado:

Cuando una intención pase a donation confirmada:
- usar flujo actual de receipt
- generar contribution_receipt
- permitir PDF
- permitir reenvío
- registrar delivery

Si la intención sigue pending_payment:
- no receipt
- no delivery
- no annual statement
- no reportes como donation received

Mostrar en UI:
“Recibo pendiente hasta confirmar la donación.”

Para una empresa que dona $10,000:
- crear intent como business
- monto 1000000 cents
- email del contacto
- campaign/fund
- status pending_payment
- cuando se confirme manualmente o en futuro Stripe:
  - donation paid
  - receipt generated
  - PDF/email flow

==================================================
FASE 14.9 — DOCUMENTACIÓN DONATION FLOW
==================================================

Crear documento:

docs/DONATION_FLOW.md

Debe incluir:

1. Filosofía del flujo.
2. Diferencia entre donation_intent y donation.
3. Por qué no se genera receipt hasta confirmar pago.
4. Flujo de donación al Fondo General.
5. Flujo de donación a campaña.
6. Flujo empresa dona $10,000.
7. Flujo recurrente mensual/anual.
8. Estados.
9. Tablas involucradas.
10. RPC involucradas.
11. Cómo se conectará Stripe en el futuro.
12. Qué variables se necesitarán.
13. Qué Edge Functions se activarán después.
14. Cómo evitar duplicados.
15. Cómo se reflejan reportes.
16. Qué queda pendiente.

Actualizar también:
- docs/ARCHITECTURE.md
- docs/SUPABASE_SETUP.md
- docs/FINAL_QA_REPORT.md si aplica

==================================================
CRITERIOS DE ACEPTACIÓN
==================================================

El flujo sin Stripe queda aprobado si:

1. Portal público tiene formulario de donación funcional.
2. Donar ahora abre formulario.
3. Donar a campaña abre formulario con campaña preseleccionada.
4. Se puede registrar intención de donación.
5. Se puede elegir una vez, mensual, anual.
6. Se puede donar como persona.
7. Se puede donar como empresa.
8. Intent se guarda en Supabase.
9. Intent no se registra como donation paid.
10. Intent no genera receipt todavía.
11. Campaign progress no aumenta con intent pendiente.
12. Admin puede ver intención pendiente.
13. Admin puede identificar fondo/campaña/frecuencia/donante.
14. Sistema queda preparado para Stripe.
15. No hay secrets.
16. No hay Stripe real todavía.
17. `npm run build` pasa.
18. Documentación actualizada.

==================================================
REPORTE FINAL
==================================================

Después de implementar, entrega:

1. Subfases ejecutadas.
2. Archivos creados.
3. Archivos modificados.
4. Migraciones nuevas.
5. RPCs nuevas.
6. Tablas nuevas.
7. Cambios en Portal público.
8. Cambios en Donaciones admin.
9. Qué quedó listo para Stripe.
10. Qué NO se implementó de Stripe.
11. Pruebas realizadas.
12. Resultado de `npm run build`.
13. Riesgos.
14. Pendientes.
15. Recomendación siguiente.

Antes de implementar código, comienza con FASE 14.0, 14.1 y 14.2:
- auditoría
- diseño del flujo
- modelo de datos propuesto
- lista exacta de archivos a tocar
- migración propuesta

No implementes todavía hasta que yo apruebe.