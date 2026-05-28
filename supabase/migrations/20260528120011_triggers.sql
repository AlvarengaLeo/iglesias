-- =====================================================================
-- 11 — Triggers
-- =====================================================================
-- - updated_at triggers en todas las tablas con esa columna
-- - audit triggers en tablas sensibles
-- - on_auth_user_created: vincular invitee aceptado a church_users

-- ========== updated_at triggers ==========
CREATE TRIGGER trg_churches_updated_at
  BEFORE UPDATE ON churches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_church_users_updated_at
  BEFORE UPDATE ON church_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_people_updated_at
  BEFORE UPDATE ON people
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_households_updated_at
  BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_funds_updated_at
  BEFORE UPDATE ON funds
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_donations_updated_at
  BEFORE UPDATE ON donations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_recurring_updated_at
  BEFORE UPDATE ON recurring_donation_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_portal_settings_updated_at
  BEFORE UPDATE ON portal_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_service_times_updated_at
  BEFORE UPDATE ON service_times
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ========== on_auth_user_created ==========
-- Cuando un usuario completa la invitación (sign-up via Supabase Auth invite),
-- automáticamente lo vincula con su church_users row según invitation_token.

CREATE OR REPLACE FUNCTION on_auth_user_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token UUID;
  v_invitation church_invitations%ROWTYPE;
BEGIN
  -- Extract token from user metadata
  v_token := (NEW.raw_user_meta_data ->> 'invitation_token')::UUID;

  -- Allow user creation without invitation only if it's a service-role/admin call
  -- (seed data, dev). In production normal sign-up flow always has a token.
  IF v_token IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find matching active invitation
  SELECT * INTO v_invitation
  FROM church_invitations
  WHERE token = v_token
    AND lower(email::text) = lower(NEW.email)
    AND accepted_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > now();

  IF v_invitation.id IS NULL THEN
    RAISE EXCEPTION 'invitation invalid, expired, already used, or email mismatch';
  END IF;

  -- Create church_users row
  INSERT INTO church_users (church_id, user_id, email_snapshot, role, invited_at, joined_at)
  VALUES (
    v_invitation.church_id,
    NEW.id,
    NEW.email,
    v_invitation.role,
    v_invitation.invited_at,
    now()
  );

  -- Mark invitation as accepted
  UPDATE church_invitations
  SET accepted_at = now(), accepted_by = NEW.id
  WHERE id = v_invitation.id;

  -- Audit log
  INSERT INTO audit_logs (church_id, actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_invitation.church_id, NEW.id, 'church_users.accept', 'invitation', v_invitation.id,
    jsonb_build_object('email', NEW.email, 'role', v_invitation.role)
  );

  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION on_auth_user_created();

COMMENT ON FUNCTION on_auth_user_created IS 'Cuando un usuario nuevo completa Supabase Auth signup, vincula con church_users via invitation_token.';

-- ========== generic audit trigger ==========
-- Captura cambios en tablas sensibles automáticamente.

CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_church_id UUID;
  v_action TEXT;
  v_before JSONB;
  v_after JSONB;
BEGIN
  -- Determine church_id (most tables have it; portal_settings, churches has id=church_id)
  IF TG_TABLE_NAME = 'churches' THEN
    v_church_id := COALESCE(NEW.id, OLD.id);
  ELSE
    v_church_id := COALESCE(NEW.church_id, OLD.church_id);
  END IF;

  v_action := TG_TABLE_NAME || '.' || lower(TG_OP);

  IF TG_OP = 'DELETE' THEN
    v_before := to_jsonb(OLD);
  ELSIF TG_OP = 'INSERT' THEN
    v_after := to_jsonb(NEW);
  ELSE
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
  END IF;

  INSERT INTO audit_logs (church_id, actor_user_id, action, entity_type, entity_id, before_data, after_data)
  VALUES (
    v_church_id,
    auth.uid(),
    v_action,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    v_before,
    v_after
  );

  RETURN COALESCE(NEW, OLD);
END $$;

-- Aplicar audit a tablas críticas:
CREATE TRIGGER trg_audit_churches
  AFTER INSERT OR UPDATE OR DELETE ON churches
  FOR EACH ROW EXECUTE FUNCTION audit_changes();

CREATE TRIGGER trg_audit_church_users
  AFTER INSERT OR UPDATE OR DELETE ON church_users
  FOR EACH ROW EXECUTE FUNCTION audit_changes();

CREATE TRIGGER trg_audit_donations
  AFTER UPDATE OR DELETE ON donations  -- INSERT manejado por rpc_register_donation
  FOR EACH ROW EXECUTE FUNCTION audit_changes();

CREATE TRIGGER trg_audit_portal_settings
  AFTER UPDATE ON portal_settings  -- INSERT manejado en setup; publish maneja su propio log
  FOR EACH ROW EXECUTE FUNCTION audit_changes();

-- ========== Ensure portal_settings exists for every church ==========
CREATE OR REPLACE FUNCTION ensure_portal_settings()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO portal_settings (church_id, draft_data, published_data, publish_status)
  VALUES (NEW.id, '{}'::jsonb, '{}'::jsonb, 'draft')
  ON CONFLICT (church_id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_ensure_portal_settings
  AFTER INSERT ON churches
  FOR EACH ROW EXECUTE FUNCTION ensure_portal_settings();

COMMENT ON FUNCTION ensure_portal_settings IS 'Crea portal_settings row vacía al crear iglesia. Evita NULL checks en frontend.';
