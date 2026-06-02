-- =====================================================================
-- EQUIPOS · 19 — Fix: FK chat_channel_members.person_id -> people
-- =====================================================================
-- Bug encontrado en QA de navegador: listChannels embebe person:people(...) a
-- través de chat_channel_members.person_id, pero la columna se creó SIN FK, así
-- que PostgREST rechaza toda la query (PGRST200: no relationship) y la lista de
-- canales queda vacía para todos. Agregar el FK habilita el embed.
-- FK simple (no compuesta) porque ON DELETE SET NULL no puede nulear church_id.
ALTER TABLE chat_channel_members
  ADD CONSTRAINT chat_channel_members_person_fk
  FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL;
