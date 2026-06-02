import { useEffect, useState, useCallback } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { Badge } from '../../components/Badge.jsx';
import { listChurches, churchOverview, churchUsers, churchActivity, churchOnboarding, setOnboardingTask } from '../api/eb.js';
import { money, date, dateTime, statusTone, planLabel, statusLabel } from '../format.js';

const PAGE = 25;
const STATUS_OPTS = [
  { v: '', label: 'Todos los estados' },
  { v: 'active', label: 'Activa' },
  { v: 'trialing', label: 'Trial' },
  { v: 'past_due', label: 'Atrasada' },
  { v: 'canceled', label: 'Cancelada' },
];
const CHURCH_ROLE = { admin: 'Admin', pastor: 'Pastor', treasurer: 'Tesorero', secretary: 'Secretaria', leader: 'Líder', viewer: 'Solo lectura' };

export function Iglesias({ onToast }) {
  const [selected, setSelected] = useState(null); // church id or null (list view)
  return selected
    ? <ChurchDetail id={selected} onBack={() => setSelected(null)} onToast={onToast} />
    : <ChurchList onOpen={setSelected} onToast={onToast} />;
}

// ---------------- LIST ----------------
function ChurchList({ onOpen, onToast }) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [state, setState] = useState({ loading: true, items: [], total: 0, error: null });

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    listChurches({ p_search: debounced || null, p_status: status || null, p_limit: PAGE, p_offset: 0 })
      .then((r) => { if (alive) setState({ loading: false, items: r.items || [], total: r.total || 0, error: null }); })
      .catch((e) => { if (alive) setState({ loading: false, items: [], total: 0, error: e.message }); });
    return () => { alive = false; };
  }, [debounced, status]);

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <div className="section-head"><h2>Iglesias</h2><p>{state.total} iglesia{state.total === 1 ? '' : 's'} registrada{state.total === 1 ? '' : 's'}</p></div>
        </div>
        <div className="card-pad-sm" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', borderBottom: '1px solid var(--border-soft)' }}>
          <input className="input" placeholder="Buscar por nombre, slug o razón social…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 200 }}>
            {STATUS_OPTS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
          </select>
        </div>
        {state.loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Cargando…</div>
        ) : state.error ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--error)' }}>{state.error}</div>
        ) : state.items.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>Sin iglesias que coincidan.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Iglesia</th><th>Plan</th><th>Estado</th><th>Portal</th><th>Usuarios</th><th>Alta</th><th></th></tr>
              </thead>
              <tbody>
                {state.items.map((c) => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => onOpen(c.id)}>
                    <td>
                      <div className="person-cell">
                        <div className="avatar sm">{c.logo_url ? <img src={c.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} /> : (c.public_name || '··').slice(0, 2).toUpperCase()}</div>
                        <div><strong>{c.public_name}</strong><div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.slug}</div></div>
                      </div>
                    </td>
                    <td>{planLabel(c.plan)}</td>
                    <td><Badge tone={statusTone(c.plan_status)} dot>{statusLabel(c.plan_status)}</Badge></td>
                    <td>{c.portal_published ? <Badge tone="success">Publicado</Badge> : <Badge tone="muted">Borrador</Badge>}</td>
                    <td>{c.user_count}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{date(c.created_at)}</td>
                    <td className="row-actions"><button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); onOpen(c.id); }}>Ver <Icon name="chevronRight" size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- DETAIL ----------------
const TABS = ['Resumen', 'Datos', 'Usuarios', 'Onboarding', 'Portal', 'Actividad'];

function ChurchDetail({ id, onBack, onToast }) {
  const [tab, setTab] = useState('Resumen');
  const [ov, setOv] = useState(null);
  const [users, setUsers] = useState(null);
  const [activity, setActivity] = useState(null);
  const [onb, setOnb] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setOv(null); setError(null);
    churchOverview(id).then((d) => { if (alive) setOv(d); }).catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    let alive = true;
    if (tab === 'Usuarios' && users === null) churchUsers(id).then((d) => { if (alive) setUsers(d); }).catch(() => {});
    if (tab === 'Actividad' && activity === null) churchActivity(id).then((d) => { if (alive) setActivity(d); }).catch(() => {});
    if (tab === 'Onboarding' && onb === null) churchOnboarding(id).then((d) => { if (alive) setOnb(d); }).catch((e) => { if (alive) onToast?.({ tone: 'error', title: 'Onboarding', sub: e.message }); });
    return () => { alive = false; };
  }, [tab, id, users, activity, onb, onToast]);

  const c = ov?.church;

  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 14 }}><Icon name="chevronLeft" size={16} /> Volver a iglesias</button>

      {error ? (
        <div className="card card-pad" style={{ color: 'var(--error)' }}>{error}</div>
      ) : !ov ? (
        <div className="card card-pad" style={{ color: 'var(--muted)' }}>Cargando…</div>
      ) : (
        <>
          <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div className="avatar lg">{c.logo_url ? <img src={c.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} /> : (c.public_name || '··').slice(0, 2).toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0 }}>{c.public_name}</h2>
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>{c.slug} · {planLabel(c.plan)}</div>
            </div>
            <Badge tone={statusTone(c.plan_status)} dot>{statusLabel(c.plan_status)}</Badge>
            <a className="btn btn-secondary btn-sm" href={`/portal.html?slug=${encodeURIComponent(c.slug)}`} target="_blank" rel="noopener noreferrer"><Icon name="globe" size={14} /> Ver portal</a>
          </div>

          <div className="eb-tabs">
            {TABS.map((t) => <button key={t} className={`eb-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
          </div>

          {tab === 'Resumen' && (
            <div className="eb-stat-grid">
              <Stat label="Usuarios activos" value={ov.user_count} />
              <Stat label="Donaciones (pagadas)" value={ov.donation_count} />
              <Stat label="Total recaudado" value={money(ov.donation_total_cents)} />
              <Stat label="Campañas activas" value={ov.active_campaigns} />
              <Stat label="Portal" value={ov.portal_published ? 'Publicado' : 'Borrador'} />
              <Stat label="Última actividad" value={date(ov.last_activity)} />
            </div>
          )}

          {tab === 'Datos' && (
            <div className="card card-pad">
              <Field label="Nombre legal" value={c.legal_name} />
              <Field label="Nombre público" value={c.public_name} />
              <Field label="Slug" value={c.slug} />
              <Field label="EIN" value={c.ein} />
              <Field label="Email" value={c.email} />
              <Field label="Teléfono" value={c.phone} />
              <Field label="Pastor" value={c.pastor_name} />
              <Field label="Tesorero" value={c.treasurer_name} />
              <Field label="Plan" value={planLabel(c.plan)} />
              <Field label="Idioma" value={c.locale} />
              <Field label="Zona horaria" value={c.timezone} />
              <Field label="Creada" value={date(c.created_at)} />
            </div>
          )}

          {tab === 'Usuarios' && (
            <div className="card">
              {users === null ? <div style={{ padding: 24, color: 'var(--muted)' }}>Cargando…</div>
                : users.length === 0 ? <div className="empty-state" style={{ padding: 24 }}>Sin usuarios.</div>
                : (
                  <div className="table-wrap"><table className="table">
                    <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Último acceso</th></tr></thead>
                    <tbody>{users.map((u) => (
                      <tr key={u.id}>
                        <td><strong>{u.full_name || '—'}</strong></td>
                        <td style={{ color: 'var(--muted)' }}>{u.email}</td>
                        <td>{CHURCH_ROLE[u.role] || u.role}</td>
                        <td>{u.is_active ? <Badge tone="success">Activo</Badge> : <Badge tone="muted">Inactivo</Badge>}</td>
                        <td style={{ color: 'var(--muted)', fontSize: 13 }}>{u.last_seen_at ? dateTime(u.last_seen_at) : '—'}</td>
                      </tr>
                    ))}</tbody>
                  </table></div>
                )}
            </div>
          )}

          {tab === 'Onboarding' && (
            <OnboardingTab id={id} onb={onb} setOnb={setOnb} onToast={onToast} />
          )}

          {tab === 'Portal' && (
            <div className="card card-pad">
              <Field label="Estado del portal" value={ov.portal_published ? 'Publicado' : (ov.portal_status || 'Borrador')} />
              <Field label="URL pública" value={`/portal.html?slug=${c.slug}`} />
              <a className="btn btn-secondary" href={`/portal.html?slug=${encodeURIComponent(c.slug)}`} target="_blank" rel="noopener noreferrer" style={{ marginTop: 10 }}><Icon name="globe" size={14} /> Abrir portal público</a>
            </div>
          )}

          {tab === 'Actividad' && (
            <div className="card">
              {activity === null ? <div style={{ padding: 24, color: 'var(--muted)' }}>Cargando…</div>
                : activity.length === 0 ? <div className="empty-state" style={{ padding: 24 }}>Sin actividad reciente.</div>
                : (
                  <div className="table-wrap"><table className="table">
                    <thead><tr><th>Acción</th><th>Entidad</th><th>Por</th><th>Fecha</th></tr></thead>
                    <tbody>{activity.map((a) => (
                      <tr key={a.id}>
                        <td><strong>{a.action}</strong></td>
                        <td style={{ color: 'var(--muted)' }}>{a.entity_type || '—'}</td>
                        <td style={{ color: 'var(--muted)' }}>{a.actor_name || '—'}</td>
                        <td style={{ color: 'var(--muted)', fontSize: 13 }}>{dateTime(a.created_at)}</td>
                      </tr>
                    ))}</tbody>
                  </table></div>
                )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------- ONBOARDING TAB ----------------
function OnboardingTab({ id, onb, setOnb, onToast }) {
  const [busy, setBusy] = useState(null);

  const refresh = useCallback(() => {
    setOnb(null);
    churchOnboarding(id).then(setOnb).catch((e) => onToast?.({ tone: 'error', title: 'Onboarding', sub: e.message }));
  }, [id, setOnb, onToast]);

  const toggle = async (t) => {
    const next = t.status === 'done' ? 'pending' : 'done';
    setBusy(t.task_key);
    try {
      const updated = await setOnboardingTask(id, t.task_key, next);
      setOnb(updated);
    } catch (e) {
      onToast?.({ tone: 'error', title: 'No se pudo actualizar', sub: e.message });
    } finally { setBusy(null); }
  };

  if (onb === null) return <div className="card card-pad" style={{ color: 'var(--muted)' }}>Cargando…</div>;

  const auto = onb.tasks.filter((t) => t.is_auto);
  const manual = onb.tasks.filter((t) => !t.is_auto);

  return (
    <div className="card card-pad">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
        <div>
          <strong style={{ fontSize: 16 }}>Progreso de onboarding</strong>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>{onb.done} de {onb.total} tareas · {onb.pct}%</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={refresh}><Icon name="refresh" size={14} /> Recalcular</button>
      </div>
      <div className="eb-onb-progress"><div style={{ width: `${onb.pct}%` }} /></div>

      <div className="eb-onb-group-title">Detectadas automáticamente</div>
      {auto.map((t) => <OnbRow key={t.task_key} t={t} />)}

      <div className="eb-onb-group-title">Manuales</div>
      {manual.map((t) => (
        <OnbRow key={t.task_key} t={t} action={
          <button className="btn btn-sm btn-ghost" disabled={busy === t.task_key} onClick={() => toggle(t)}>
            {t.status === 'done' ? 'Marcar pendiente' : 'Marcar hecho'}
          </button>
        } />
      ))}
    </div>
  );
}

function OnbRow({ t, action }) {
  const done = t.status === 'done';
  const blocked = t.status === 'blocked';
  return (
    <div className="eb-onb-row">
      <div className={`eb-onb-check ${done ? 'done' : blocked ? 'blocked' : ''}`}>{done ? '✓' : blocked ? '!' : ''}</div>
      <div className="t">
        {t.title}
        <small>{done ? (t.completed_at ? `Completado ${date(t.completed_at)}` : 'Completado') : blocked ? 'Bloqueado' : t.status === 'in_progress' ? 'En progreso' : 'Pendiente'}{t.is_auto ? ' · auto' : ''}</small>
      </div>
      {action}
    </div>
  );
}

function Stat({ label, value }) {
  return <div className="kpi"><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div></div>;
}
function Field({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '9px 0', borderBottom: '1px solid var(--border-soft)' }}>
      <span style={{ color: 'var(--muted)', fontSize: 14 }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: 'right' }}>{value || '—'}</span>
    </div>
  );
}
