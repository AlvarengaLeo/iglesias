// Shared helpers for the public portal (English locale).

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const formatMoney = (cents) => '$' + (Number(cents) / 100).toLocaleString('en-US');

export function initials(name) {
  if (!name) return '··';
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

export function formatDate(value, opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', opts);
}

export function formatTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// "9:00 AM" from a "HH:MM[:SS]" time string.
export function formatClock(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':');
  const d = new Date();
  d.setHours(Number(h), Number(m), 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatDuration(seconds) {
  const s = Number(seconds);
  if (!s || s <= 0) return '';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

export function socialUrl(network, handle) {
  const clean = handle.replace(/^@/, '').trim();
  if (clean.startsWith('http')) return clean;
  switch (network) {
    case 'facebook': return `https://facebook.com/${clean}`;
    case 'instagram': return `https://instagram.com/${clean}`;
    case 'youtube':   return `https://youtube.com/${clean.startsWith('@') ? clean : '@' + clean}`;
    default: return '#';
  }
}
