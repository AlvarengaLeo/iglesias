// Shared formatters used across modules.

// "Hace X minutos / X horas / ayer / DD mmm" relative time.
// Returns "—" if input is null/undefined.
export function formatRelativeTime(timestamp, opts = {}) {
  if (!timestamp) return opts.fallback || '—';
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffSec < 60) return 'Activo ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffH < 24) return `Hace ${diffH} h`;
  if (diffD === 1) return 'Ayer';
  if (diffD < 7) return `Hace ${diffD} días`;

  // Format as "DD mmm" (local)
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

// "DD mmm YYYY"
export function formatDate(timestamp, opts = {}) {
  if (!timestamp) return opts.fallback || '—';
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}

// 2-letter initials. Defaults to first letter of first 2 words (uppercase).
export function initials(input, fallback = '··') {
  if (!input) return fallback;
  return input
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || fallback;
}

// Pretty stripe account id: "acct_1NkLpQ..." → "acct_1NkLpQ…"
export function shortenId(id, prefix = 8) {
  if (!id) return '—';
  if (id.length <= prefix + 3) return id;
  return id.slice(0, prefix) + '…';
}
