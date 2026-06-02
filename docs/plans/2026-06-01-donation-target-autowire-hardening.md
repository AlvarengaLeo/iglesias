# Donation-target auto-wiring — lifecycle hardening (ultraplan)

**Date:** 2026-06-01
**Goal:** When a church creates a Ministry/Project, Active Campaign, or Fund, that donation target must appear on the public portal **already wired** to the functional Stripe Connect flow — donor gives → charge to the church's connected account → recorded against the right fund/campaign with a receipt and correct campaign progress. No new donation *types* (decision: "ninguna dinámica nueva"). Just make the existing fund/campaign/ministry targets bulletproof across their whole lifecycle.

**Method:** 4 expert lenses (stripe-integration / senior-backend / senior-architect / senior-data-engineer) enumerated **62 scenarios** (38 covered, 24 flagged). Each flagged item was re-verified against the authoritative code; false positives were dropped.

---

## What's already guaranteed (no change)

- **Auto-wiring base works.** `rpc_public_portal_by_slug` reads `funds`, `campaigns`, and `projects` **live** (not from `published_data`), so a new Fund/Campaign/Ministry appears on the portal immediately, wired into the destination-agnostic donation modal. A new **campaign is created `active` + `is_visible_on_portal=true` by default** (`CreateCampaignModal`), so it's portal-live in one step.
- **Metadata carry-through is solid.** intent → PaymentIntent/Subscription metadata (`fund_id`, `campaign_id`, `church_id`, `intent_id`) → webhook → `rpc_complete_donation_from_payment`. One-time + recurring both carry the destination.
- **Idempotent, transactional fulfillment** (after the prior hardening: unique PI index, event ledger, receipt created atomically).
- **Intent validation** rejects an inactive/invisible campaign and an inactive fund with friendly errors.
- **No-Stripe fallback**: every destination falls back to the intent-only flow.

## False positives (verified against code — NOT fixing)

| Claim | Reality |
|---|---|
| `vw_campaign_progress` counts soft-deleted donations | It already filters `d.deleted_at IS NULL` (views.sql:36). |
| New campaigns need a visibility toggle + portal publish to appear | `CreateCampaignModal` defaults `status:'active'`, `is_visible:true`; `createCampaign` forces `status:'active'`. Live on creation. |
| Payment-create failure orphans the intent in `payment_provider_pending` | The status update runs **after** the Stripe call succeeds; a failure leaves it `pending_payment` (retryable). |
| Malicious admin forges a Stripe event to cross-attribute funds | Webhooks are verified with the **platform** secret; a church can't forge platform-signed events. (Ownership check still added as cheap defense-in-depth.) |
| Stale client cache donates to an old ministry target | The intent RPC re-validates server-side; safe. |

---

## Confirmed gaps + fixes

### Phase 1 — Fulfillment & intent validation hardening (HIGH)
**Gap:** Neither RPC checks `deleted_at IS NULL`, and `rpc_complete_donation_from_payment` never re-validates the campaign and doesn't check the fund's `church_id`. If a target is **deleted** between intent and webhook (incl. each recurring cycle), the donation records against a dead campaign → vanishes from `vw_campaign_progress` (which excludes deleted campaigns) → silent orphan.

**Fix (new migration):**
- `rpc_complete_donation_from_payment`: before recording, validate the campaign belongs to the church and `deleted_at IS NULL` — if not, **strip `campaign_id`** (record against the fund, which still counts in reports) and write an `audit_logs` note. Validate the fund belongs to the church, `is_active`, `deleted_at IS NULL` — if not, **fall back to the default fund** (then any active fund) + audit note. This also closes the cross-church ownership concern.
- `rpc_create_public_donation_intent`: add `deleted_at IS NULL` to the campaign (lines 94–99) and fund (110–116) checks; if no default fund, fall back to **any active fund** instead of erroring.

### Phase 2 — Ministry "Give" only shows for a *live* target (HIGH, core ask)
**Gap:** `featuredProjects` in `rpc_public_portal_by_slug` exposes `pr.fund_id`/`pr.campaign_id` unconditionally; `MinistryCard.donatable = !!(campaign_id||fund_id)`. A ministry pointing to a hidden/closed/inactive/deleted target still shows "Give" → the donor hits an error.

**Fix:** In the portal RPC's `featuredProjects` (and `rpc_public_projects_by_slug` for the Ministries page), expose `campaign_id` only when that campaign is `is_visible_on_portal AND status='active' AND deleted_at IS NULL`, and `fund_id` only when `is_active AND deleted_at IS NULL`; otherwise null them. The card's `donatable` then turns false automatically — the button only appears when it actually works.

### Phase 3 — Soft-delete safety net for dependents (MEDIUM)
**Gap:** Soft-deleting a campaign/fund leaves `recurring_donation_profiles` and `projects` pointing at it (the FK `ON DELETE SET NULL` only fires on hard delete). A subscription could keep charging a deleted campaign.

**Fix:** Trigger on `campaigns`/`funds` when `deleted_at` is set → null the matching `recurring_donation_profiles.campaign_id`/`fund_id` (fund → default) and `projects.campaign_id`/`fund_id`. Combined with Phase 1, future cycles attribute cleanly to the fund.

### Phase 4 — BI truth: online vs manual (OPTIONAL, defer)
**Gap:** Online (Stripe) and manually-registered card donations are indistinguishable in reports (both `payment_method='card'`).
**Fix:** add `donations.donation_source` (`'manual' | 'stripe_connect'`); set it in both paths; split the "by method" chart. Defer — additive, BI-flavored.

**Explicitly skipped:** campaign `end_date` enforcement (product decision: accept post-close overflow); manual `rpc_register_donation` target re-validation (admin-internal, low risk).

---

## Risks & testing
- All Phase 1–3 changes are additive migrations + one RPC rewrite + a portal-RPC `SELECT` tweak; no frontend contract change.
- Test matrix (test mode): create fund/campaign/ministry → portal shows + donate (one-time + recurring) → recorded against right target + receipt + progress; hide/close/delete a target mid-flight → donation attributes to fund, no orphan; ministry → deleted target → no "Give" button; church with no default fund → donation still lands on an active fund.
- Idempotency + receipts already covered by the prior hardening migration `20260605120021`.

## Deploy
Phases 1–3 ship as new migrations + a portal-RPC update → `npx supabase db push`. No new secrets. (Still gated on the earlier deploy: push `…120020/…120021`, enable Connect, set `STRIPE_CONNECT_WEBHOOK_SECRET`.)
