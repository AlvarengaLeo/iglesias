-- =====================================================================
-- 07 — Indexes
-- =====================================================================
-- Cubre los queries críticos identificados en DATABASE_DESIGN.md §8.

-- ========== church_users ==========
CREATE INDEX idx_church_users_user
  ON church_users (user_id)
  WHERE is_active = true;

CREATE INDEX idx_church_users_church_active
  ON church_users (church_id, is_active);

-- ========== invitations ==========
CREATE INDEX idx_invitations_email_active
  ON church_invitations (email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE INDEX idx_invitations_token
  ON church_invitations (token);

-- ========== people ==========
CREATE INDEX idx_people_church_status
  ON people (church_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_people_church_last_activity
  ON people (church_id, last_activity_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_people_email_lower
  ON people (church_id, lower(email::text))
  WHERE email IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_people_phone
  ON people (church_id, phone)
  WHERE phone IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_people_next_followup
  ON people (church_id, next_followup_at)
  WHERE next_followup_at IS NOT NULL AND deleted_at IS NULL;

-- Trigram index para búsqueda por nombre
CREATE INDEX idx_people_name_trgm
  ON people USING gin (
    (coalesce(first_name,'') || ' ' || coalesce(last_name,'') || ' ' || coalesce(organization_name,'')) gin_trgm_ops
  )
  WHERE deleted_at IS NULL;

-- ========== donations ==========
CREATE INDEX idx_donations_church_date
  ON donations (church_id, donation_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_donations_church_status_date
  ON donations (church_id, payment_status, donation_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_donations_church_fund_date
  ON donations (church_id, fund_id, donation_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_donations_church_campaign_date
  ON donations (church_id, campaign_id, donation_date DESC)
  WHERE campaign_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_donations_church_method_date
  ON donations (church_id, payment_method, donation_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_donations_church_frequency
  ON donations (church_id, frequency)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_donations_donor
  ON donations (donor_person_id, donation_date DESC)
  WHERE donor_person_id IS NOT NULL;

CREATE INDEX idx_donations_recurring
  ON donations (recurring_profile_id)
  WHERE recurring_profile_id IS NOT NULL;

CREATE INDEX idx_donations_stripe_pi
  ON donations (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- ========== campaigns ==========
CREATE INDEX idx_campaigns_church_status_date
  ON campaigns (church_id, status, start_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_campaigns_portal_visible
  ON campaigns (church_id)
  WHERE is_visible_on_portal = true AND status = 'active' AND deleted_at IS NULL;

-- ========== funds ==========
CREATE INDEX idx_funds_church_active
  ON funds (church_id, sort_order)
  WHERE is_active = true AND deleted_at IS NULL;

-- Solo una fila default por iglesia
CREATE UNIQUE INDEX idx_funds_church_default_unique
  ON funds (church_id)
  WHERE is_default = true AND deleted_at IS NULL;

-- ========== recurring_donation_profiles ==========
CREATE INDEX idx_recurring_church_status
  ON recurring_donation_profiles (church_id, status);

CREATE INDEX idx_recurring_next_charge
  ON recurring_donation_profiles (next_charge_date)
  WHERE status = 'active';

-- ========== contribution_receipts ==========
CREATE INDEX idx_receipts_church_number
  ON contribution_receipts (church_id, receipt_number);

CREATE INDEX idx_receipts_church_donation
  ON contribution_receipts (church_id, donation_id)
  WHERE donation_id IS NOT NULL;

CREATE INDEX idx_receipts_church_person_created
  ON contribution_receipts (church_id, person_id, created_at DESC);

CREATE INDEX idx_receipts_church_status
  ON contribution_receipts (church_id, status, created_at DESC);

-- ========== receipt_deliveries ==========
CREATE INDEX idx_deliveries_receipt
  ON receipt_deliveries (receipt_id, sent_at DESC);

CREATE INDEX idx_deliveries_church
  ON receipt_deliveries (church_id, sent_at DESC);

-- ========== followups ==========
CREATE INDEX idx_followups_church_person_date
  ON person_followups (church_id, person_id, occurred_at DESC);

CREATE INDEX idx_followups_next_action
  ON person_followups (church_id, next_action_at)
  WHERE next_action_at IS NOT NULL;

-- ========== households ==========
CREATE INDEX idx_households_church
  ON households (church_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_household_members_person
  ON household_members (person_id);

-- ========== tags ==========
CREATE INDEX idx_person_tag_assignments_tag
  ON person_tag_assignments (tag_id);

-- ========== service_times ==========
CREATE INDEX idx_service_times_church
  ON service_times (church_id, day_of_week, start_time)
  WHERE is_active = true;

-- ========== audit_logs ==========
CREATE INDEX idx_audit_church_created
  ON audit_logs (church_id, created_at DESC);

CREATE INDEX idx_audit_entity
  ON audit_logs (entity_type, entity_id, created_at DESC);

CREATE INDEX idx_audit_actor
  ON audit_logs (actor_user_id, created_at DESC);
