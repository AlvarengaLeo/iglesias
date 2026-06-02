-- =====================================================================
-- EQUIPOS · 08 — Triggers (auto-membership, leader guard, seed, accept link)
-- =====================================================================

-- ---------- auto-membresía: equipo ----------
CREATE OR REPLACE FUNCTION _trg_sync_team_membership()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM _sync_team_channel(OLD.church_id, OLD.team_id);
    RETURN OLD;
  END IF;
  PERFORM _sync_team_channel(NEW.church_id, NEW.team_id);
  IF TG_OP = 'UPDATE' AND OLD.team_id <> NEW.team_id THEN
    PERFORM _sync_team_channel(OLD.church_id, OLD.team_id);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_team_member_sync
  AFTER INSERT OR UPDATE OR DELETE ON service_team_members
  FOR EACH ROW EXECUTE FUNCTION _trg_sync_team_membership();

-- ---------- auto-membresía: servicio ----------
CREATE OR REPLACE FUNCTION _trg_sync_assignment_membership()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM _sync_service_channel(OLD.church_id, OLD.service_event_id);
    RETURN OLD;
  END IF;
  PERFORM _sync_service_channel(NEW.church_id, NEW.service_event_id);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_assignment_sync
  AFTER INSERT OR UPDATE OR DELETE ON service_assignments
  FOR EACH ROW EXECUTE FUNCTION _trg_sync_assignment_membership();

-- ---------- guard: solo managers asignan líderes de equipo ----------
CREATE OR REPLACE FUNCTION _trg_block_leader_self_promotion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_promo BOOLEAN := false;
BEGIN
  IF NEW.team_role = 'leader' THEN
    IF TG_OP = 'INSERT' THEN
      v_promo := true;
    ELSIF COALESCE(OLD.team_role, '') <> 'leader' THEN
      v_promo := true;
    END IF;
    IF v_promo AND auth.uid() IS NOT NULL
       AND COALESCE(user_role_in_church(NEW.church_id), '') NOT IN ('admin','pastor','secretary') THEN
      RAISE EXCEPTION 'only managers can assign team leaders' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_block_leader_self_promotion
  BEFORE INSERT OR UPDATE ON service_team_members
  FOR EACH ROW EXECUTE FUNCTION _trg_block_leader_self_promotion();

-- ---------- seed catálogo al crear iglesia (best-effort) ----------
CREATE OR REPLACE FUNCTION _trg_seed_serving_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM rpc_seed_serving_defaults(NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'seed serving defaults failed for church %: %', NEW.id, SQLERRM;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_seed_serving_defaults
  AFTER INSERT ON churches
  FOR EACH ROW EXECUTE FUNCTION _trg_seed_serving_defaults();

-- ---------- redefinir on_auth_user_created: fijar person_id + enrolar canales ----------
CREATE OR REPLACE FUNCTION on_auth_user_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_token UUID;
  v_invitation church_invitations%ROWTYPE;
BEGIN
  v_token := (NEW.raw_user_meta_data ->> 'invitation_token')::UUID;
  IF v_token IS NULL THEN
    RETURN NEW;
  END IF;

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

  INSERT INTO church_users (church_id, user_id, email_snapshot, role, person_id, invited_at, joined_at)
  VALUES (
    v_invitation.church_id, NEW.id, NEW.email, v_invitation.role,
    v_invitation.person_id, v_invitation.invited_at, now()
  );

  UPDATE church_invitations
  SET accepted_at = now(), accepted_by = NEW.id
  WHERE id = v_invitation.id;

  INSERT INTO audit_logs (church_id, actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_invitation.church_id, NEW.id, 'church_users.accept', 'invitation', v_invitation.id,
    jsonb_build_object('email', NEW.email, 'role', v_invitation.role, 'person_id', v_invitation.person_id)
  );

  -- Si la invitación vincula una persona (rol servidor), enrolar en sus canales.
  IF v_invitation.person_id IS NOT NULL THEN
    PERFORM _enroll_login_into_channels(v_invitation.church_id, v_invitation.person_id);
  END IF;

  RETURN NEW;
END $$;
