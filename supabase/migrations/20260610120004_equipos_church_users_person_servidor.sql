-- =====================================================================
-- EQUIPOS · 04 — Person↔login link + role 'servidor'
-- =====================================================================
-- Habilita que un servidor (voluntario) tenga login mínimo vinculado a su ficha
-- de persona, para ver "Mi servicio". Cambios ADITIVOS y seguros:
--   - church_users.person_id (nullable, FK people ON DELETE SET NULL)
--   - church_invitations.person_id (para capturar el vínculo al invitar)
--   - rol 'servidor' añadido al CHECK de role en ambas tablas.
-- El CHECK de role es un constraint INLINE SIN NOMBRE: se descubre por pg_constraint
-- (robusto ante auto-naming) y se recrea con nombre incluyendo 'servidor'.

-- ---------- person_id columns ----------
ALTER TABLE church_users
  ADD COLUMN person_id UUID REFERENCES people(id) ON DELETE SET NULL;
CREATE INDEX idx_church_users_person ON church_users (person_id) WHERE person_id IS NOT NULL;
COMMENT ON COLUMN church_users.person_id IS 'Ficha de persona vinculada a este login (servidores). NULL para staff sin ficha.';

ALTER TABLE church_invitations
  ADD COLUMN person_id UUID REFERENCES people(id) ON DELETE SET NULL;
COMMENT ON COLUMN church_invitations.person_id IS 'Persona a vincular al aceptar la invitación (rol servidor).';

-- ---------- recreate role CHECK incluyendo 'servidor' ----------
DO $$
DECLARE c TEXT;
BEGIN
  -- church_users
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'church_users'::regclass AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%role%IN%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE church_users DROP CONSTRAINT %I', c);
  END IF;
  ALTER TABLE church_users ADD CONSTRAINT church_users_role_check
    CHECK (role IN ('admin','pastor','treasurer','secretary','leader','viewer','servidor'));

  -- church_invitations
  c := NULL;
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'church_invitations'::regclass AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%role%IN%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE church_invitations DROP CONSTRAINT %I', c);
  END IF;
  ALTER TABLE church_invitations ADD CONSTRAINT church_invitations_role_check
    CHECK (role IN ('admin','pastor','treasurer','secretary','leader','viewer','servidor'));
END $$;
