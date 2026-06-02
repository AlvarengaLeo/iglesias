// =====================================================================
// embed.js — Safe external media embed parsing (FASE 15)
// =====================================================================
// Media (sermons video, podcast audio) is embedded from external providers.
// We NEVER inject a raw user-supplied URL into an <iframe src>. Instead we:
//   1. Parse the URL with the native URL constructor.
//   2. Reject any host not in the whitelist and any non-https scheme.
//   3. Extract the resource ID and validate it against a strict regex.
//   4. RECONSTRUCT a canonical embed src from the validated ID.
// This means even a malicious whitelisted-host URL cannot smuggle script —
// the src is rebuilt from a validated ID, never passed through verbatim.
//
// No dependencies. Pure functions. Runs on both public and admin sides.

const YT_HOSTS    = new Set(['www.youtube.com', 'youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be']);
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);
const SPOTIFY_HOSTS = new Set(['open.spotify.com', 'spotify.com', 'www.spotify.com']);
const APPLE_HOSTS = new Set(['podcasts.apple.com', 'embed.podcasts.apple.com']);

const YT_ID_RE     = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID_RE  = /^\d+$/;
const SPOTIFY_ID_RE = /^[A-Za-z0-9]{22}$/;
const SPOTIFY_TYPES = new Set(['episode', 'show', 'track', 'playlist', 'album']);

function safeUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let u;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  return u;
}

// --- YouTube: watch?v=ID | youtu.be/ID | /embed/ID | /shorts/ID ---
function parseYouTube(u) {
  let id = null;
  const host = u.hostname.toLowerCase();
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    id = u.pathname.split('/').filter(Boolean)[0] || null;
  } else {
    if (u.searchParams.has('v')) {
      id = u.searchParams.get('v');
    } else {
      const parts = u.pathname.split('/').filter(Boolean);
      const kind = parts[0];
      if ((kind === 'embed' || kind === 'shorts' || kind === 'v') && parts[1]) {
        id = parts[1];
      }
    }
  }
  if (!id || !YT_ID_RE.test(id)) return null;
  return { provider: 'youtube', kind: 'video', id, embedSrc: `https://www.youtube-nocookie.com/embed/${id}` };
}

// --- Vimeo: vimeo.com/{digits} | player.vimeo.com/video/{digits} ---
function parseVimeo(u) {
  const parts = u.pathname.split('/').filter(Boolean);
  // player.vimeo.com/video/123  -> id at index 1; vimeo.com/123 -> index 0
  const candidate = parts[parts.length - 1];
  if (!candidate || !VIMEO_ID_RE.test(candidate)) return null;
  return { provider: 'vimeo', kind: 'video', id: candidate, embedSrc: `https://player.vimeo.com/video/${candidate}` };
}

// --- Spotify: open.spotify.com/{type}/{id} | /embed/{type}/{id} ---
function parseSpotify(u) {
  const parts = u.pathname.split('/').filter(Boolean);
  let type = parts[0];
  let id = parts[1];
  if (type === 'embed') {
    type = parts[1];
    id = parts[2];
  }
  if (!type || !id || !SPOTIFY_TYPES.has(type) || !SPOTIFY_ID_RE.test(id)) return null;
  const kind = (type === 'episode' || type === 'show') ? 'audio' : 'audio';
  return { provider: 'spotify', kind, id, embedSrc: `https://open.spotify.com/embed/${type}/${id}` };
}

// --- Apple Podcasts: podcasts.apple.com/.../id{digits}?i={digits} ---
function parseApple(u) {
  // Preserve only the numeric podcast id (last path segment "id123") and the
  // optional episode param "i". Rebuild against embed.podcasts.apple.com.
  const parts = u.pathname.split('/').filter(Boolean);
  const idSeg = parts.find((p) => /^id\d+$/.test(p));
  if (!idSeg) return null;
  const path = u.pathname.replace(/^\/+/, '');
  const i = u.searchParams.get('i');
  let embedSrc = `https://embed.podcasts.apple.com/${path}`;
  if (i && /^\d+$/.test(i)) embedSrc += `?i=${i}`;
  return { provider: 'apple', kind: 'audio', id: idSeg.slice(2), embedSrc };
}

// Parse a raw external media URL into a safe embed descriptor, or null.
// Returns { provider, kind:'video'|'audio', id, embedSrc } | null.
export function parseEmbed(raw) {
  const u = safeUrl(raw);
  if (!u) return null;
  const host = u.hostname.toLowerCase();
  if (YT_HOSTS.has(host))      return parseYouTube(u);
  if (VIMEO_HOSTS.has(host))   return parseVimeo(u);
  if (SPOTIFY_HOSTS.has(host)) return parseSpotify(u);
  if (APPLE_HOSTS.has(host))   return parseApple(u);
  return null;
}

// True if a URL is a safe http/https link (for <a href> like registration_url,
// link_url). Rejects javascript:, data:, and malformed URLs. NOT for iframes.
export function isSafeExternalUrl(raw) {
  const u = safeUrl(raw);
  return !!u;
}

// Convenience: YouTube poster image from a video URL (no API needed).
export function youTubeThumbnail(raw) {
  const parsed = parseEmbed(raw);
  if (!parsed || parsed.provider !== 'youtube') return null;
  return `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`;
}
