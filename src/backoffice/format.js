export const money = (cents) => '$' + (Number(cents || 0) / 100).toLocaleString('en-US');

export const date = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const dateTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// plan_status / estados → tono de Badge
export const statusTone = (s) => ({
  active: 'success', trialing: 'info', trial: 'info',
  past_due: 'warning', canceled: 'error', cancelled: 'error',
  suspended: 'error', paused: 'muted',
}[s] || 'muted');

export const planLabel = (p) => ({ ministerio: 'Ministerio', comunidad: 'Comunidad', enterprise: 'Enterprise' }[p] || p || '—');
export const statusLabel = (s) => ({
  active: 'Activa', trialing: 'Trial', past_due: 'Atrasada', canceled: 'Cancelada', suspended: 'Suspendida',
}[s] || s || '—');
