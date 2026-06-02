-- =====================================================================
-- FASE 13 · 03 — Storage bucket church-assets + policies
-- =====================================================================
-- Bucket público para logos de iglesia, imágenes del portal y firmas
-- de recibos. Los PDFs de recibos NO van acá — irán a un bucket
-- privado con signed URLs cuando se generen server-side (v2).
--
-- Path convention:
--   {church_id}/logo/{timestamp}.{ext}
--   {church_id}/hero/{timestamp}.{ext}
--   {church_id}/signature/{timestamp}.{ext}
--
-- Policy clave: el primer segmento del path (storage.foldername(name)[1])
-- debe ser un UUID que coincida con una iglesia del caller autenticado.
-- SELECT es público para que <img src="..."> del portal funcione sin auth.

-- ---------- Crear bucket (idempotente) ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'church-assets',
  'church-assets',
  true,
  2 * 1024 * 1024,                              -- 2 MB max por archivo
  ARRAY['image/png','image/jpeg','image/webp','image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------- Policies sobre storage.objects ----------
-- Helper: la primera carpeta del path debe ser un UUID de iglesia del caller.
-- storage.foldername() retorna text[]; el [1] es el primer segmento.

-- SELECT público (necesario para portal anónimo)
DROP POLICY IF EXISTS church_assets_select_public ON storage.objects;
CREATE POLICY church_assets_select_public ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'church-assets');

-- INSERT solo autenticado y solo en su propio church_id
DROP POLICY IF EXISTS church_assets_insert_own ON storage.objects;
CREATE POLICY church_assets_insert_own ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'church-assets'
    AND (storage.foldername(name))[1]::uuid = ANY (user_church_ids())
  );

-- UPDATE solo autenticado y solo sobre su propio church_id
DROP POLICY IF EXISTS church_assets_update_own ON storage.objects;
CREATE POLICY church_assets_update_own ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'church-assets'
    AND (storage.foldername(name))[1]::uuid = ANY (user_church_ids())
  )
  WITH CHECK (
    bucket_id = 'church-assets'
    AND (storage.foldername(name))[1]::uuid = ANY (user_church_ids())
  );

-- DELETE solo autenticado y solo sobre su propio church_id
DROP POLICY IF EXISTS church_assets_delete_own ON storage.objects;
CREATE POLICY church_assets_delete_own ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'church-assets'
    AND (storage.foldername(name))[1]::uuid = ANY (user_church_ids())
  );
