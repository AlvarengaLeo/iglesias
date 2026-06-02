-- Self-serve / system-generated invitations (e.g. from the Stripe webhook,
-- which runs as service_role with no auth.uid()) have no human inviter.
-- Allow NULL invited_by. Existing flows (invite-user, eb_convert_lead) still
-- pass auth.uid() and are unaffected.
ALTER TABLE church_invitations ALTER COLUMN invited_by DROP NOT NULL;
