import { supabase } from './supabase.js';

const BUCKET = 'church-assets';
// Cap on the ORIGINAL file the user picks. Raster images are downscaled +
// re-encoded client-side (see compressImage) to well under the bucket's limit
// before upload, so a high-resolution photo still works without errors.
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;          // 25 MB original allowed
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;           // church-assets bucket limit
const COMPRESS_TARGET_BYTES = Math.round(1.8 * 1024 * 1024); // aim under the bucket cap
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
const ALLOWED_KINDS = new Set([
  'logo', 'favicon', 'hero', 'signature',
  // FASE 15 — content module images (sermon thumbnails, event/project images, podcast covers)
  'sermon_thumb', 'event_image', 'podcast_cover', 'project_image',
  // FASE 16 — institutional presence (photo gallery)
  'gallery',
]);

// Per-kind optimization target. `alpha:true` keeps transparency (logos/firmas).
const COMPRESS = {
  logo:          { maxDim: 600,  alpha: true },
  favicon:       { maxDim: 256,  alpha: true },
  signature:     { maxDim: 1000, alpha: true },
  hero:          { maxDim: 2400, alpha: false },
  event_image:   { maxDim: 1800, alpha: false },
  project_image: { maxDim: 1800, alpha: false },
  sermon_thumb:  { maxDim: 1600, alpha: false },
  podcast_cover: { maxDim: 1200, alpha: false },
  gallery:       { maxDim: 1800, alpha: false },
};

function extFromMime(mime) {
  switch (mime) {
    case 'image/png':     return 'png';
    case 'image/jpeg':    return 'jpg';
    case 'image/webp':    return 'webp';
    case 'image/svg+xml': return 'svg';
    default:              return 'bin';
  }
}

function validate(file, kind) {
  if (!file) throw new Error('Selecciona un archivo.');
  if (!ALLOWED_KINDS.has(kind)) throw new Error(`kind inválido: ${kind}`);
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error('Formato no soportado. Usa PNG, JPG, WebP o SVG.');
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error(`Archivo demasiado grande (máx ${(MAX_SOURCE_BYTES / 1024 / 1024).toFixed(0)} MB).`);
  }
  // SVG is vector — we don't re-encode it, so it must already fit the bucket limit.
  if (file.type === 'image/svg+xml' && file.size > MAX_UPLOAD_BYTES) {
    throw new Error('El SVG supera 2 MB. Optimízalo (p. ej. con SVGO) e inténtalo de nuevo.');
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

async function loadBitmap(file) {
  // Prefer createImageBitmap (fast, honours EXIF orientation in Chrome/Firefox).
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch { /* fall back to <img> below */ }
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen.')); };
    img.src = url;
  });
}

// Downscale + re-encode a raster image to a web-optimized, bucket-safe size while
// keeping high visual quality. SVGs pass through unchanged. Returns a File.
async function compressImage(file, kind) {
  if (file.type === 'image/svg+xml') return file;

  const cfg = COMPRESS[kind] || { maxDim: 1800, alpha: false };
  let bitmap;
  try {
    bitmap = await loadBitmap(file);
  } catch {
    return file; // unreadable for canvas — let the raw upload try (bucket still guards)
  }
  const srcW = bitmap.width || 0;
  const srcH = bitmap.height || 0;
  if (!srcW || !srcH) { if (bitmap.close) bitmap.close(); return file; }

  const preferred = 'image/webp';                       // best compression, keeps alpha
  const fallback = cfg.alpha ? 'image/png' : 'image/jpeg';

  let maxDim = cfg.maxDim;
  let quality = 0.85;
  let best = null;

  for (let attempt = 0; attempt < 6; attempt++) {
    const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) break;
    if (!cfg.alpha) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); } // flatten for JPEG
    ctx.drawImage(bitmap, 0, 0, w, h);

    let blob = await canvasToBlob(canvas, preferred, quality);
    if (!blob) blob = await canvasToBlob(canvas, fallback, quality); // WebP unsupported
    if (!blob) break;
    best = blob;
    if (blob.size <= COMPRESS_TARGET_BYTES) break;
    // Still too big: drop quality first, then dimensions.
    if (quality > 0.6) quality -= 0.15;
    else maxDim = Math.round(maxDim * 0.8);
  }
  if (bitmap.close) bitmap.close();

  if (!best || best.size > file.size) return file; // no gain → keep original
  const ext = extFromMime(best.type);
  return new File([best], `asset.${ext}`, { type: best.type });
}

// Sube un asset al bucket church-assets bajo {churchId}/{kind}/{timestamp}.{ext}.
// La imagen se optimiza en el cliente (downscale + WebP) antes de subir.
// Retorna { path, publicUrl }.
export async function uploadChurchAsset({ churchId, file, kind }) {
  validate(file, kind);
  if (!churchId) throw new Error('churchId requerido.');

  const optimized = await compressImage(file, kind);
  if (optimized.size > MAX_UPLOAD_BYTES) {
    // Should not happen for raster (compress targets < bucket cap); guard anyway.
    throw new Error('No se pudo optimizar la imagen por debajo de 2 MB. Prueba con otra.');
  }

  const ext = extFromMime(optimized.type);
  const path = `${churchId}/${kind}/${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, optimized, {
      contentType: optimized.type,
      cacheControl: '3600',
      upsert: false,
    });
  if (uploadErr) throw uploadErr;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

// Borra un asset por path. Idempotente — no falla si no existe.
export async function deleteChurchAsset(path) {
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error && !/not found/i.test(error.message)) throw error;
}

// Helper: dado un publicUrl, extrae el storage path (lo que va después de /object/public/{bucket}/).
export function pathFromPublicUrl(url) {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx >= 0 ? url.slice(idx + marker.length) : null;
}

export const STORAGE_CONFIG = {
  bucket: BUCKET,
  maxSizeBytes: MAX_SOURCE_BYTES,
  maxUploadBytes: MAX_UPLOAD_BYTES,
  allowedMime: Array.from(ALLOWED_MIME),
  allowedKinds: Array.from(ALLOWED_KINDS),
};
