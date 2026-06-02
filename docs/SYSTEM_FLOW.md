# SYSTEM_FLOW.md — Diagramas de proceso del Sistema de Iglesia

> Diagramas en formato Mermaid (renderizable en GitHub, GitLab, Notion, VS Code) y duplicados en ASCII para que cualquier visor los muestre.
>
> Cobertura:
> 1. Mapa general del sistema (actores + capas)
> 2. Pipeline de donación end-to-end (intent → donation → receipt)
> 3. Máquina de estados del `donation_intent`
> 4. Secuencia: visitante anónimo dona en el portal
> 5. Secuencia: admin convierte intent en donación
> 6. Secuencia: invitación de usuario
> 7. Wire de Stripe futuro (sin cambiar el flujo)

---

## 1. Mapa general del sistema

### Mermaid

```mermaid
graph TB
  subgraph Actores
    V[Visitante anónimo]
    D[Donante]
    A[Admin / Pastor]
    T[Tesorero / Secretaria]
  end

  subgraph Frontend
    PP[Portal público<br/>portal.html?slug=...]
    CRM[CRM admin<br/>index.html]
  end

  subgraph Supabase
    AUTH[Auth + JWT<br/>+ SMTP nativo]
    DB[(PostgreSQL<br/>+ RLS por church_id)]
    ST[(Storage<br/>church-assets)]
    EF[Edge Functions<br/>invite-user]
  end

  FS[Stripe<br/>Futuro]:::future

  V -->|sin login| PP
  D -->|sin login| PP
  A -->|login| CRM
  T -->|login| CRM

  PP -->|rpc_public_portal_by_slug<br/>rpc_create_public_donation_intent| DB
  PP -->|leer img| ST
  CRM -->|JWT| AUTH
  CRM -->|queries + RPCs| DB
  CRM -->|upload logo/hero| ST
  CRM -->|invocar invite-user| EF
  EF -->|service_role| AUTH
  EF -->|service_role| DB
  AUTH -.->|email invite| D

  FS -.->|checkout.session.completed| EF

  classDef future fill:#f5f5f5,stroke:#999,stroke-dasharray: 5 5,color:#888
```

### ASCII

```
┌─────────────────────────────────────────────────────────────────────┐
│  ACTORES                                                            │
│  ───────                                                            │
│  [Visitante anon]   [Donante]   [Admin/Pastor]   [Tesorero/Sec.]    │
│        │                │              │                │           │
│        │ sin login       │ sin login    │ login          │ login     │
└────────┼────────────────┼──────────────┼────────────────┼───────────┘
         │                │              │                │
         ▼                ▼              ▼                ▼
   ┌─────────────────────────┐  ┌──────────────────────────────┐
   │  Portal público         │  │  CRM admin                   │
   │  /portal.html?slug=...  │  │  /index.html                 │
   └────────┬────────────────┘  └────────┬─────────────────────┘
            │                            │
            │ rpc_public_portal_by_slug  │ JWT + RLS
            │ rpc_create_public_         │ + RPCs autenticadas
            │   donation_intent          │
            ▼                            ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  SUPABASE                                                   │
   │  ──────                                                     │
   │  ┌──────────┐  ┌────────────────────┐  ┌─────────────────┐  │
   │  │ Auth     │  │ PostgreSQL         │  │ Storage         │  │
   │  │ + SMTP   │  │ + RLS por          │  │ church-assets   │  │
   │  │  nativo  │  │   church_id        │  │ (público)       │  │
   │  └────┬─────┘  └────────────────────┘  └─────────────────┘  │
   │       │                                                     │
   │  ┌────▼──────────────────┐                                  │
   │  │ Edge Functions        │                                  │
   │  │ invite-user           │                                  │
   │  └────┬──────────────────┘                                  │
   └───────┼─────────────────────────────────────────────────────┘
           │                              ┌───────────────────┐
           ▼ email invite                 │ Stripe (FUTURO)   │
       [Donante]                          │ webhook conectará │
                                          │ a Edge Function   │
                                          └───────────────────┘
```

---

## 2. Pipeline de donación end-to-end

El corazón del sistema. Muestra cómo una intención del público se transforma en donación confirmada con recibo fiscal, y cómo cada paso alimenta los reportes.

### Mermaid

```mermaid
flowchart TD
  Start([Visitante en portal público])
  Click{Click 'Donar ahora'<br/>o 'Apoyar campaña'}
  Form[Llena formulario:<br/>monto, frecuencia, destino,<br/>tipo donante, datos]
  RPC1[rpc_create_public_donation_intent<br/>SECURITY DEFINER · anon]
  Validate{Validaciones:<br/>honeypot, rate limit,<br/>email, monto, fondo}
  Reject[Error con código<br/>específico ES]
  Insert[(INSERT donation_intents<br/>status='pending_payment')]
  Thanks[Pantalla de gracias<br/>Referencia DN-XXXXXXXX]

  AdminView[Admin abre tab<br/>'Intenciones']
  AdminAction{Admin decide}
  Cancel[(UPDATE status='canceled')]
  Convert[Click 'Registrar'<br/>RegisterDonationModal pre-llenado]
  AdminFill[Admin elige método<br/>de pago + persona]
  RPC2[rpc_register_donation]
  Donation[(INSERT donations<br/>payment_status='paid')]
  Receipt[(INSERT contribution_receipts<br/>receipt_number='2026-NNNNNN'<br/>atómico)]
  RPC3[rpc_link_intent_to_donation]
  IntentDone[(UPDATE intent<br/>status='completed'<br/>donation_id=NEW)]
  Audit[(INSERT audit_logs<br/>action='intent.complete')]

  CampProgress[vw_campaign_progress<br/>recalcula]
  Dash[rpc_dashboard_kpis<br/>actualiza KPIs]
  Reports[rpc_monthly_donations_series<br/>actualiza reportes]

  Start --> Click
  Click --> Form
  Form --> RPC1
  RPC1 --> Validate
  Validate -->|falla| Reject
  Validate -->|OK| Insert
  Insert --> Thanks
  Insert -.->|datos disponibles para admin| AdminView

  AdminView --> AdminAction
  AdminAction -->|cancelar| Cancel
  AdminAction -->|convertir| Convert
  Convert --> AdminFill
  AdminFill --> RPC2
  RPC2 --> Donation
  Donation --> Receipt
  RPC2 --> RPC3
  RPC3 --> IntentDone
  RPC3 --> Audit

  Donation --> CampProgress
  Donation --> Dash
  Donation --> Reports

  style Insert fill:#fff3cd,stroke:#856404
  style Donation fill:#d4edda,stroke:#155724
  style Receipt fill:#d4edda,stroke:#155724
  style IntentDone fill:#d4edda,stroke:#155724
  style Reject fill:#f8d7da,stroke:#721c24
  style Cancel fill:#e2e3e5,stroke:#383d41
```

### ASCII

```
                    ┌──────────────────────────────┐
                    │  Visitante en portal público │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │  Click "Donar ahora" o       │
                    │  "Apoyar esta campaña"       │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │  Form: monto · frecuencia ·  │
                    │  destino · tipo donante ·    │
                    │  datos                       │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
              ┌─────────────────────────────────────────┐
              │  rpc_create_public_donation_intent       │
              │  (SECURITY DEFINER · anon)               │
              └────────────────┬─────────────────────────┘
                               │
            ┌──────────────────┴───────────────────┐
            │  Validaciones:                       │
            │   • honeypot                         │
            │   • rate limit (5/email/h)           │
            │   • email/monto/fondo/campaña        │
            └────────┬──────────────────────┬──────┘
                     │ falla                │ OK
                     ▼                      ▼
            ┌────────────────┐    ┌────────────────────────┐
            │ Error con      │    │ INSERT donation_intents│
            │ código ES      │    │ status='pending_payment'│  ◄── (PIPELINE INICIA)
            └────────────────┘    └───────────┬────────────┘
                                              │
                                              ▼
                                  ┌─────────────────────┐
                                  │ Pantalla de gracias │
                                  │ Ref: DN-XXXXXXXX    │
                                  └─────────────────────┘

═══════════════════════════════════════════════════════════════════════
   ADMIN abre tab "Intenciones" → decide qué hacer
═══════════════════════════════════════════════════════════════════════

                    ┌─────────────────────────────┐
                    │  Admin decide               │
                    └────┬────────────────────┬───┘
                         │                    │
                  cancelar                 convertir
                         │                    │
                         ▼                    ▼
              ┌──────────────────┐   ┌──────────────────────────┐
              │ UPDATE status=   │   │ RegisterDonationModal    │
              │ 'canceled'       │   │ pre-llenado:             │
              └──────────────────┘   │ • monto del intent       │
                                     │ • fondo del intent       │
                                     │ • campaña del intent     │
                                     │ • frecuencia             │
                                     │ • email en donor search  │
                                     └────────────┬─────────────┘
                                                  │
                                                  ▼
                                     ┌──────────────────────────┐
                                     │ Admin selecciona persona │
                                     │ y método de pago         │
                                     │ (efectivo/cheque/etc.)   │
                                     └────────────┬─────────────┘
                                                  │
                                                  ▼
                                     ┌──────────────────────────┐
                                     │ rpc_register_donation    │
                                     └────────────┬─────────────┘
                                                  │
                              ┌───────────────────┼───────────────────┐
                              ▼                   ▼                   ▼
                  ┌────────────────────┐ ┌─────────────────┐ ┌─────────────────┐
                  │ INSERT donations   │ │ rpc_assign_     │ │ INSERT          │
                  │ payment_status=    │ │ receipt_number  │ │ contribution_   │
                  │ 'paid'             │ │ atómico         │ │ receipts        │
                  └─────────┬──────────┘ └────────┬────────┘ │ '2026-NNNNNN'   │
                            │                    │          └────────┬────────┘
                            │                    └──────────────────►│
                            ▼                                        ▼
                  ┌───────────────────┐               ┌──────────────────────┐
                  │ rpc_link_intent_  │               │  INSERT audit_logs   │
                  │ to_donation       │               │  'intent.complete'   │
                  └─────────┬─────────┘               └──────────────────────┘
                            │
                            ▼
                  ┌───────────────────────────┐
                  │ UPDATE donation_intents   │
                  │ status='completed'        │
                  │ donation_id=NEW           │
                  │ completed_at=now()        │
                  └─────────┬─────────────────┘
                            │
              ┌─────────────┼──────────────┐
              ▼             ▼              ▼
   ┌───────────────┐ ┌──────────────┐ ┌──────────────────┐
   │ vw_campaign_  │ │ rpc_         │ │ rpc_monthly_     │
   │ progress      │ │ dashboard_   │ │ donations_       │
   │ (live recalc) │ │ kpis         │ │ series           │
   └───────────────┘ └──────────────┘ └──────────────────┘
                          (Reportes y Dashboard actualizados)
```

---

## 3. Máquina de estados del `donation_intent`

### Mermaid

```mermaid
stateDiagram-v2
  [*] --> pending_payment: rpc_create_public_<br/>donation_intent
  pending_payment --> completed: admin convierte<br/>+ link_intent_to_donation
  pending_payment --> canceled: admin cancela
  pending_payment --> expired: 90 días sin actividad<br/>(sweeper futuro)
  pending_payment --> payment_provider_pending: Stripe redirect<br/>(futuro)
  payment_provider_pending --> completed: webhook OK
  payment_provider_pending --> failed: webhook rechaza
  payment_provider_pending --> canceled: usuario cancela en Stripe
  completed --> [*]
  canceled --> [*]
  expired --> [*]
  failed --> [*]
```

### ASCII

```
            ┌─────────────────────┐
            │ rpc_create_public_  │
            │ donation_intent     │
            └──────────┬──────────┘
                       ▼
            ┌─────────────────────┐
            │  pending_payment    │
            └──┬──────┬──────┬─┬──┘
               │      │      │ │
   admin       │      │      │ └── 90 días sin actividad
   convierte   │      │      │     (sweeper futuro)
               │      │      │              │
               │      │      │              ▼
               │      │      │     ┌──────────┐
               │      │      │     │ expired  │
               │      │      │     └──────────┘
               │      │      │
   admin       │      │      └── Stripe redirect (futuro)
   cancela     │      │                  │
               │      │                  ▼
               │      │     ┌──────────────────────────┐
               │      │     │ payment_provider_pending │
               │      │     └─────┬────────┬───────────┘
               │      │           │        │
               │      │   webhook │        │ webhook rechaza
               │      │   OK      │        │
               │      │           ▼        ▼
               │      │   ┌──────────┐ ┌────────┐
               │      │   │completed │ │ failed │
               │      │   └──────────┘ └────────┘
               │      │
               │      ▼
               │   ┌──────────┐
               │   │ canceled │
               │   └──────────┘
               │
               ▼
        rpc_link_intent_to_donation
               │
               ▼
        ┌──────────────┐
        │  completed   │   ← donation_id set
        │              │     + audit log
        └──────────────┘
```

---

## 4. Secuencia: visitante dona en el portal

### Mermaid

```mermaid
sequenceDiagram
  autonumber
  actor V as Visitante
  participant B as Browser
  participant P as Portal Vite<br/>(portal.html)
  participant SB as Supabase
  participant DB as PostgreSQL

  V->>B: Abre /portal.html?slug=casa-de-restauracion
  B->>P: Carga bundle
  P->>SB: rpc_public_portal_by_slug(slug)
  SB->>DB: Verifica publish_status='published'
  DB-->>SB: church + portal + campaigns + service_times + funds
  SB-->>P: JSONB
  P->>B: Renderiza portal con logo, campañas, etc.

  V->>B: Click 'Donar ahora'
  B->>P: openDonation()
  P->>V: Modal con form

  V->>B: Llena form ($50/mensual/Misiones/María)
  V->>B: Click 'Registrar intención de donación'
  B->>P: handleSubmit()
  P->>SB: rpc_create_public_donation_intent(...)

  SB->>DB: Verifica honeypot vacío
  SB->>DB: Verifica iglesia publicada
  SB->>DB: Verifica amount, freq, email, donor_type
  SB->>DB: Verifica campaign/fund activos
  SB->>DB: Verifica rate limit (< 5/email/hora)
  SB->>DB: INSERT donation_intents (pending_payment)
  DB-->>SB: intent_id
  SB-->>P: {donation_intent_id, payment_available:false, message}

  P->>B: setView('thanks')
  B->>V: Pantalla de gracias con referencia DN-XXXXXXXX
```

### ASCII

```
 Visitante       Browser         Portal Vite       Supabase         PostgreSQL
 ─────────       ───────         ───────────       ────────         ──────────
     │              │                  │              │                 │
     │  Abre URL    │                  │              │                 │
     ├─────────────►│                  │              │                 │
     │              │  Carga bundle    │              │                 │
     │              ├─────────────────►│              │                 │
     │              │                  │ rpc_public_  │                 │
     │              │                  │  portal_by_  │                 │
     │              │                  │  slug        │                 │
     │              │                  ├─────────────►│                 │
     │              │                  │              │ check published │
     │              │                  │              ├────────────────►│
     │              │                  │              │  church + data  │
     │              │                  │              │◄────────────────┤
     │              │                  │  JSONB       │                 │
     │              │                  │◄─────────────┤                 │
     │              │  Renderiza       │              │                 │
     │              │◄─────────────────┤              │                 │
     │              │                  │              │                 │
     │ Click Donar  │                  │              │                 │
     ├─────────────►│ openDonation()   │              │                 │
     │              ├─────────────────►│              │                 │
     │  Modal       │                  │              │                 │
     │◄──────────────────────────────────                              │
     │              │                  │              │                 │
     │ Llena + submit                  │              │                 │
     ├─────────────►│                  │              │                 │
     │              │ handleSubmit     │              │                 │
     │              ├─────────────────►│              │                 │
     │              │                  │ rpc_create_  │                 │
     │              │                  │  public_     │                 │
     │              │                  │  donation_   │                 │
     │              │                  │  intent      │                 │
     │              │                  ├─────────────►│                 │
     │              │                  │              │ honeypot?       │
     │              │                  │              │ rate limit?     │
     │              │                  │              │ email regex?    │
     │              │                  │              │ amount sanity?  │
     │              │                  │              │ campaign válida?│
     │              │                  │              │ INSERT intent   │
     │              │                  │              ├────────────────►│
     │              │                  │              │  intent_id      │
     │              │                  │              │◄────────────────┤
     │              │                  │  payload     │                 │
     │              │                  │◄─────────────┤                 │
     │              │  thanks view     │              │                 │
     │              │◄─────────────────┤              │                 │
     │ Gracias +    │                  │              │                 │
     │ DN-XXXXXXXX  │                  │              │                 │
     │◄─────────────┤                  │              │                 │
```

---

## 5. Secuencia: admin convierte intent a donation

### Mermaid

```mermaid
sequenceDiagram
  autonumber
  actor A as Admin
  participant CRM
  participant SB as Supabase
  participant DB as PostgreSQL

  A->>CRM: Login + va a Donaciones
  CRM->>SB: listIntents(churchId)
  SB->>DB: SELECT donation_intents<br/>(RLS: church_id ∈ user_church_ids())
  DB-->>SB: rows
  SB-->>CRM: intents[]
  CRM->>A: Renderiza tab 'Intenciones' con badge de pendientes

  A->>CRM: Click '→ Registrar' en una fila
  CRM->>CRM: setConvertingIntent(intent)<br/>setShowRegisterModal(true)
  CRM->>A: RegisterDonationModal pre-llenado<br/>(monto, fondo, campaña, freq, email, notas)

  A->>CRM: Selecciona/crea persona<br/>+ método pago = 'cash'<br/>+ submit
  CRM->>SB: rpc_register_donation(...)
  SB->>DB: Verifica role del caller
  SB->>DB: INSERT donations (paid)
  SB->>DB: rpc_assign_receipt_number()<br/>(atómico via UPDATE RETURNING)
  SB->>DB: INSERT contribution_receipts<br/>receipt_number='2026-NNNNNN'
  SB->>DB: INSERT audit_logs 'donation.create'
  DB-->>SB: {donation_id, receipt_id, receipt_number}
  SB-->>CRM: result

  CRM->>SB: rpc_link_intent_to_donation(intent_id, donation_id)
  SB->>DB: Verifica caller en misma iglesia
  SB->>DB: UPDATE donation_intents<br/>status='completed'<br/>donation_id=NEW<br/>completed_at=now()
  SB->>DB: INSERT audit_logs 'intent.complete'
  DB-->>SB: ok
  SB-->>CRM: ok

  CRM->>SB: refetchAll()
  SB-->>CRM: donations, intents, KPIs, campaigns actualizados
  CRM->>A: Toast 'Intención convertida en donación'<br/>+ recibo 2026-NNNNNN
```

---

## 6. Secuencia: invitación de usuario

### Mermaid

```mermaid
sequenceDiagram
  autonumber
  actor A as Admin
  participant CRM
  participant EF as Edge Function<br/>invite-user
  participant SUPA as Supabase Auth
  participant DB as PostgreSQL
  actor I as Invitee

  A->>CRM: Configuración → Invitar usuario<br/>(email + rol)
  CRM->>EF: POST /functions/v1/invite-user<br/>Authorization: Bearer {JWT}
  EF->>SUPA: getUser(jwt) — verifica caller
  SUPA-->>EF: user OK
  EF->>DB: rpc('user_role_in_church', caller, church_id)<br/>debe ser 'admin'
  DB-->>EF: 'admin'
  EF->>DB: INSERT church_invitations<br/>(token UUID, expires +7d)
  EF->>SUPA: auth.admin.inviteUserByEmail<br/>(email, data={invitation_token, church_id, role})
  SUPA-->>I: Email con link a /#accept-invite?token=XXX
  EF-->>CRM: {invitation_id, expires_at}
  CRM-->>A: Toast 'Invitación enviada'

  I->>SUPA: Click link → set password
  SUPA->>DB: INSERT auth.users (con metadata)
  Note over DB: TRIGGER on_auth_user_created
  DB->>DB: Lee invitation_token de metadata
  DB->>DB: Busca church_invitations matching
  DB->>DB: INSERT church_users<br/>(church_id, user_id, role)
  DB->>DB: UPDATE invitation SET accepted_at
  DB->>DB: INSERT audit_logs 'church_users.accept'
  I->>CRM: Login automático
  CRM->>I: Dashboard de su iglesia
```

---

## 7. Cómo Stripe se enchufa después (sin redesign)

### Mermaid

```mermaid
flowchart LR
  subgraph FaseActual[Fase 14 - HOY]
    direction TB
    A1[Visitante] -->|llena form| A2[rpc_create_public_<br/>donation_intent]
    A2 --> A3[intent pending_payment]
    A3 --> A4[Admin convierte<br/>manualmente]
    A4 --> A5[donation paid + receipt]
  end

  subgraph FaseFutura[Cuando se wire Stripe]
    direction TB
    B1[Visitante] -->|llena form| B2[rpc_create_public_<br/>donation_intent]
    B2 --> B3[intent pending_payment]
    B3 -->|payment_available=true| B4[Edge Function<br/>create-donation-checkout]
    B4 -->|Stripe Session creada| B5[intent payment_<br/>provider_pending]
    B4 -->|redirect_url| B6[Stripe Checkout]
    B6 -->|usuario paga| B7[Stripe webhook]
    B7 --> B8[Edge Function<br/>stripe-webhook]
    B8 -->|checkout.session.completed| B9[rpc_register_donation]
    B9 --> B10[rpc_link_intent_to_donation]
    B10 --> B11[donation paid + receipt + intent completed]
  end

  style A2 fill:#d4edda
  style A3 fill:#fff3cd
  style A4 fill:#d4edda
  style B2 fill:#d4edda
  style B3 fill:#fff3cd
  style B4 fill:#cce5ff
  style B5 fill:#fff3cd
  style B8 fill:#cce5ff
  style B9 fill:#d4edda
  style B10 fill:#d4edda
```

**Lo crítico**: la tabla `donation_intents`, las RPCs `rpc_register_donation` y `rpc_link_intent_to_donation` **no cambian**. Solo se agregan 2 Edge Functions y se activa el flag `payment_available`. **El frontend se redirige a Stripe en lugar de mostrar la pantalla de gracias offline** — el resto del sistema sigue igual.

---

## 8. Cómo usar estos diagramas

**Para el cliente (demo)**: mostrar en orden los diagramas 4 → 2 → 3 → 7. Es la narrativa "visitante → admin → reportes → futuro Stripe".

**Para onboarding técnico**: 1 → 5 → 6 → 3. Cubre arquitectura, flujos clave y máquina de estados.

**Para auditoría / seguridad**: 1 + 5 destacan el modelo multi-tenant y la cadena de audit_logs.

**Cómo renderizar**:
- GitHub / GitLab: pega el mermaid en un README — se renderiza nativo.
- Notion: bloque "Mermaid" o usa la versión ASCII.
- VS Code: extensión "Markdown Preview Mermaid Support".
- Web rápido: https://mermaid.live → pega el bloque y exporta PNG/SVG.

---

*Diagramas alineados al estado del sistema al cierre de Fase 14 (2026-05-30).*
