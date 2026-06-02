-- =====================================================================
-- EQUIPOS · 09 — Storage bucket chat-media (PRIVADO, membresía-gated)
-- =====================================================================
-- Adjuntos de chat. A diferencia de church-assets (público), este es PRIVADO:
-- el acceso es por signed URLs y solo miembros del canal pueden leer/escribir.
-- Path convention: {church_id}/chat/{channel_id}/{timestamp}.{ext}
--   foldername[1] = church_id, foldername[2] = 'chat', foldername[3] = channel_id.
-- (Las subidas reales llegan en la Fase F5; el bucket y policies se crean ahora.)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  false,                                          -- PRIVADO
  25 * 1024 * 1024,                               -- 25 MB max por archivo
  ARRAY[
    'image/png','image/jpeg','image/webp','image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- SELECT: solo autenticado, su iglesia, y miembro del canal del path.
DROP POLICY IF EXISTS chat_media_select_member ON storage.objects;
CREATE POLICY chat_media_select_member ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1]::uuid = ANY (user_church_ids())
    AND is_channel_member((storage.foldername(name))[3]::uuid)
  );

-- INSERT: solo autenticado, su iglesia, y miembro del canal.
DROP POLICY IF EXISTS chat_media_insert_member ON storage.objects;
CREATE POLICY chat_media_insert_member ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1]::uuid = ANY (user_church_ids())
    AND is_channel_member((storage.foldername(name))[3]::uuid)
  );

-- UPDATE/DELETE: solo autenticado, su iglesia, y miembro del canal.
DROP POLICY IF EXISTS chat_media_update_member ON storage.objects;
CREATE POLICY chat_media_update_member ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1]::uuid = ANY (user_church_ids())
    AND is_channel_member((storage.foldername(name))[3]::uuid)
  )
  WITH CHECK (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1]::uuid = ANY (user_church_ids())
    AND is_channel_member((storage.foldername(name))[3]::uuid)
  );

DROP POLICY IF EXISTS chat_media_delete_member ON storage.objects;
CREATE POLICY chat_media_delete_member ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1]::uuid = ANY (user_church_ids())
    AND is_channel_member((storage.foldername(name))[3]::uuid)
  );
