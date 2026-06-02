# DONATION_FLOW.md — Flujo público de donación

> Documenta cómo funciona el motor de donaciones desde el portal público,
> la separación entre intent y donation confirmada, y cómo se enchufará
> Stripe en una fase futura sin redesign.
>
> **Estado actual (Fase 14)**: 100% funcional sin pagos online. Los visitantes
> registran *intenciones*; el admin las convierte a donaciones reales cuando
> recibe el pago por otro método (efectivo, cheque, ACH externo).

---

## 1. Filosofía

El flujo de donación está modelado como el mismo patrón que usa Stripe internamente:

```
PaymentIntent (intención)  →  Charge (cobro)  →  Receipt (comprobante fiscal)
```

En este sistema:

```
donation_intent  →  donation  →  contribution_receipt
   (pública)        (admin)        (IRS-compliant)
```

Cada uno vive en su propia tabla, con su propio lifecycle y sus propias reglas RLS. Esa separación es la clave para que:

- Anon (visitante público) pueda registrar interés sin tocar las tablas financieras.
- Los reportes nunca incluyan dinero que no se recibió.
- Los recibos fiscales solo existan para donaciones realmente confirmadas.
- Conectar Stripe después no requiera redesign — basta wirear un webhook que llame `rpc_register_donation` + `rpc_link_intent_to_donation`.

---

## 2. Diferencia entre `donation_intent` y `donation`

| Aspecto | `donation_intent` | `donations` |
|---|---|---|
| Quién la crea | Visitante anónimo del portal | Admin/pastor/tesorero/secretaria |
| Cómo se crea | RPC pública `rpc_create_public_donation_intent` | RPC autenticada `rpc_register_donation` |
| Implica dinero recibido | **No** | **Sí** |
| Genera receipt fiscal | **No** | Sí (vía `rpc_register_donation`) |
| Aparece en reportes / KPIs | **No** | Sí (`WHERE payment_status='paid'`) |
| Afecta progreso de campaña | **No** | Sí (`vw_campaign_progress`) |
| Vive en tabla | `donation_intents` | `donations` |
| Estados | pending_payment / payment_provider_pending / completed / canceled / expired / failed | pending / paid / failed / refunded / disputed |
| Eliminación | Inmutable (cancel only) | Soft-delete |

Cuando una `donation_intent` se materializa, queda enlazada por FK: `donation_intents.donation_id → donations.id`. El intent pasa a `status='completed'`.

---

## 3. Flujo por escenario

### 3.1. Donar al Fondo General

```
[Visitante] →  /portal.html?slug=casa-de-restauracion
            ↓ click "Donar ahora"
            ↓ formulario:
              - Monto: $50
              - Frecuencia: Una vez
              - Destino: Fondo general
              - Persona: María Pérez · maria@email.com
              - submit
            ↓
[anon RPC] rpc_create_public_donation_intent(...)
            ↓ valida + inserta donation_intents
            ↓ retorna intent_id + status='pending_payment'
            ↓
[Visitante] ve pantalla de gracias con referencia DN-XXXXXXXX
            ↓
[Admin]    Donaciones → tab "Intenciones" → ve la nueva fila
            ↓ recibe el pago por método externo
            ↓ click "→ Registrar" → modal pre-llenado → confirma
            ↓
[admin RPC] rpc_register_donation(...) crea donation + recibo
[admin RPC] rpc_link_intent_to_donation(intent_id, donation_id)
            → intent.status='completed', intent.donation_id=...
            ↓
Reportes y dashboard reflejan la donación. Receipt PDF descargable.
```

### 3.2. Donar a una campaña visible

Idéntico al 3.1 pero el visitante hace click en **"Apoyar esta campaña"** dentro de la sección Campañas del portal. El modal abre con `campaign_id` preseleccionado. El intent se asocia a la campaña; al convertirse, la donation también lleva el `campaign_id` y `vw_campaign_progress` actualiza.

**Crítico**: el progreso de la campaña NO se mueve mientras el intent está pendiente. Solo cuenta donaciones `payment_status='paid'`.

### 3.3. Empresa dona $10,000

```
- Visitante elige "Empresa" en el toggle de donante.
- Llena: ABC Construction LLC + contacto John Smith + email contact@abc.com
- Monto: $10,000 / Una vez / Fondo de Construcción
- submit → intent pending_payment

Admin recibe el cheque, lo deposita, va a Intenciones → Registrar:
- El modal pre-llena monto, fondo y email (donor search)
- Admin busca o crea la persona "ABC Construction LLC" en people (organización)
- Método de pago: Cheque, número: 1234
- submit → donation $10,000 paid + recibo fiscal con EIN
```

### 3.4. Donación recurrente (mensual / anual)

```
- Visitante elige frecuencia "Mensual" → intent.frequency='monthly'
- pending_payment como cualquier otro intent

Conversión (sin Stripe): el admin trata cada cobro recibido como una donation
con frequency='monthly'. NO se crea automáticamente un recurring_donation_profile
en esta fase.

Conversión (con Stripe futuro): la Edge Function create-donation-checkout crea
una Stripe Subscription. Cada invoice.paid del webhook llama rpc_register_donation
+ opcionalmente crea/actualiza recurring_donation_profiles (fase 15).
```

---

## 4. Estados del lifecycle

```
                  ┌────────────────────────┐
                  │     intent creado      │
                  │  status: pending_payment│
                  └─────────┬──────────────┘
                            │
                ┌───────────┼────────────────┐
                ▼           ▼                ▼
        admin convierte   admin cancela    expira (90d)
                │           │                │
                ▼           ▼                ▼
            completed    canceled         expired
        (donation_id)
```

Con Stripe (futuro):
```
pending_payment → payment_provider_pending → completed
                  (Stripe Checkout abierto)   (webhook OK)
                          ↓
                       failed (webhook rechaza)
```

---

## 5. Tablas y RPCs involucradas

### Tablas

- **`donation_intents`** (NUEVO — Fase 14) — intent pública.
- **`donations`** (existente, intacta) — donación real.
- **`contribution_receipts`** (existente, intacta) — solo se crea con `rpc_register_donation`.
- **`campaigns`** (existente) — `vw_campaign_progress` solo cuenta donations paid.
- **`funds`** (existente) — fondo objetivo.
- **`people`** (existente) — admin selecciona o crea persona al convertir intent.

### RPCs

| RPC | Quién la llama | Hace |
|---|---|---|
| `rpc_create_public_donation_intent` | Anon (público) | Valida, inserta intent. SECURITY DEFINER. |
| `rpc_link_intent_to_donation` | Auth (admin) | Marca intent.status='completed', set donation_id. |
| `rpc_update_intent_status` | Auth (admin) | Marca contactado / cancela. |
| `rpc_register_donation` | Auth (admin) | (existente, intacta) Crea donation + receipt. |
| `rpc_public_portal_by_slug` | Anon | (extendida en Fase 14) Devuelve además `funds[]` y `payment_available`. |

---

## 6. Reglas críticas

- **NO** se crea una `donation` desde el frontend público.
- **NO** se marca un intent como `paid` sin confirmación humana o de Stripe.
- **NO** se genera receipt fiscal para un intent pendiente.
- **NO** se duplican donations ni receipts.
- **NO** se afecta progreso de campaña ni KPIs hasta que haya donation paid.
- Reenvío de recibo (`rpc_resend_receipt`) sigue insertando solo `receipt_deliveries`. NUNCA crea nueva donation ni nuevo receipt.

---

## 7. Anti-abuso (público)

La RPC pública `rpc_create_public_donation_intent` implementa:

1. **Honeypot** — input invisible llamado `website` en el form. Si llega con valor, la RPC retorna ok sin insertar (silently drop). Confunde al bot.
2. **Rate limit** — máximo 5 intents por email por hora por iglesia.
3. **Amount sanity** — entre $1.00 y $1,000,000.
4. **Email regex** básico.
5. **Solo iglesias con portal publicado** pueden recibir intents.
6. **Campaign/fund pertenecen a la iglesia y están activos**.

Futuro: Cloudflare Turnstile si los bots evolucionan más allá del honeypot.

---

## 8. Cómo conectar Stripe en el futuro (4 pasos)

Cuando se quiera activar pagos online:

### Paso 1 — Env vars
```bash
# Edge runtime (Supabase secrets)
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Frontend (.env.local)
VITE_APP_URL=https://app.tu-dominio.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Paso 2 — Edge Functions

Crear dos funciones nuevas en `supabase/functions/`:

**`create-donation-checkout/index.ts`**
- Recibe `{ donation_intent_id }` del frontend.
- Valida JWT del caller anon (firma del intent_id puede usarse como nonce).
- Lee `donation_intents` (con service_role).
- Crea Stripe Checkout Session:
  - `mode: 'payment'` si `frequency='one_time'`
  - `mode: 'subscription'` con price recurring si `frequency='monthly'|'annual'`
  - `success_url`: `${VITE_APP_URL}/portal.html?slug=X&donation=success&ref=DN-XXX`
  - `cancel_url`:  `${VITE_APP_URL}/portal.html?slug=X&donation=canceled`
  - `metadata: { donation_intent_id }`
- Updatea `donation_intents`:
  - `provider='stripe'`
  - `provider_checkout_session_id=cs_xxx`
  - `provider_redirect_url=session.url`
  - `status='payment_provider_pending'`
- Retorna `{ redirect_url }`.

**`stripe-webhook/index.ts`**
- Verifica firma con `STRIPE_WEBHOOK_SECRET`.
- En `checkout.session.completed`:
  - Lee el intent por `provider_checkout_session_id`.
  - Llama `rpc_register_donation(...)` con los datos del intent + Stripe IDs.
  - Llama `rpc_link_intent_to_donation(intent_id, new_donation_id)`.
- En `invoice.paid` (subscriptions): repite por cada cobro recurrente.
- En `checkout.session.expired` o `failed`: actualiza `status='failed'` o `'expired'`.

### Paso 3 — Habilitar `payment_available`

En `supabase/migrations/20260601120003_rpc_public_portal_extend.sql` (o nueva migración), cambiar:
```sql
v_payment_available := false;
```
por:
```sql
SELECT (stripe_charges_enabled = true AND stripe_account_id IS NOT NULL)
INTO v_payment_available
FROM churches WHERE id = v_church_id;
```

### Paso 4 — Frontend

En `src/lib/paymentProvider.js`:
```js
import { supabase } from './supabase.js';

export function isPaymentAvailable(portalData) {
  return !!portalData?.payment_available;
}

export async function createCheckout({ donationIntentId }) {
  const { data, error } = await supabase.functions.invoke('create-donation-checkout', {
    body: { donation_intent_id: donationIntentId },
  });
  if (error) throw error;
  return data;  // { redirect_url }
}
```

En `DonationForm.jsx`, después de `createPublicDonationIntent`:
```js
const result = await createPublicDonationIntent(payload);
if (result.payment_available) {
  const { redirect_url } = await createCheckout({ donationIntentId: result.donation_intent_id });
  window.location.href = redirect_url;
} else {
  onSuccess(result);
}
```

Texto del CTA cambia automáticamente cuando `payment_available=true`:
- "Continuar al pago →" en lugar de "Registrar intención de donación".

**No se requiere cambiar nada más**. Las tablas, RPCs y UI de admin siguen igual.

---

## 9. Cómo evitar duplicados

- `rpc_create_public_donation_intent` aplica rate limit por (email, church, hora).
- `rpc_link_intent_to_donation` es idempotente: si el intent ya está `completed` con otra donation_id, lanza error `intent_already_linked_to_other_donation`.
- `rpc_register_donation` (existente) no es idempotente por sí mismo — la garantía de no duplicación en pagos Stripe vendrá de:
  - Webhook idempotency: Stripe firma cada evento con `stripe-signature` y manda `stripe-event-id` único. La Edge Function debe rechazar eventos ya procesados (tabla `stripe_webhook_events` con `event_id UNIQUE` — fase 15).
- `provider_checkout_session_id` y `provider_payment_intent_id` son UNIQUE WHERE NOT NULL → dos intents no pueden compartir la misma sesión Stripe.

---

## 10. Cómo se reflejan en reportes

| Métrica | Incluye intents pendientes | Incluye donations paid |
|---|---|---|
| Dashboard "Total mes" | ❌ | ✅ |
| Dashboard "Recurrentes activos" | ❌ | ✅ (donations recurrentes) |
| Dashboard "Recibos del mes" | ❌ | ✅ |
| Reportes — KPIs | ❌ | ✅ |
| Reportes — line chart mensual | ❌ | ✅ |
| Reportes — by_fund / by_method | ❌ | ✅ |
| Campañas — progreso | ❌ | ✅ |
| Tab "Intenciones" (admin) | ✅ | ❌ |

Para ver "interés pendiente" por campaña (informativo, separado del progreso real), puede usarse `getPendingIntentsByCampaign(churchId)` desde `src/api/donationIntents.js` — no incluido en el dashboard por defecto, pero disponible.

---

## 11. Pendientes (fuera de Fase 14)

- Conexión real de Stripe (Paso 1-4 de §8).
- Email automático al donor confirmando intent (requiere Resend/SendGrid — Fase 15).
- Generación server-side de PDF de recibo + bucket privado.
- Sweeper de intents expirados via pg_cron (`expires_at < now() AND status='pending_payment'` → `expired`).
- Captcha (Cloudflare Turnstile) si el bot traffic crece.
- Conversión automática de intent recurrente a `recurring_donation_profiles`.
- Re-asociar persona en `people` automáticamente cuando se convierte intent (hoy el admin debe seleccionar/crear).
- Botón "Estado anual de contribuciones" en Reportes.

---

## 12. Lenguaje (¡importante!)

NUNCA usar en UI pública:
- "compra", "comprar", "carrito", "checkout", "factura", "invoice", "cliente", "customer", "producto"

SIEMPRE usar:
- "donación", "aporte", "contribución"
- "campaña", "fondo"
- "comprobante", "recibo de contribución"
- "generosidad", "intención"

Este lenguaje es deliberado: una iglesia no vende productos, recibe contribuciones.
