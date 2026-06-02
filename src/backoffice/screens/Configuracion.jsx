import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { Badge } from '../../components/Badge.jsx';
import { useEbRole } from '../hooks/useEbRole.js';
import {
  listAudit, listFlags, setFlag, listStaff, setStaffRole, setStaffActive,
  listPlans, updatePlan, getSettings, updateSettings,
} from '../api/eb.js';
import { money, dateTime } from '../format.js';

const ROLES = ['super_admin', 'sales', 'support', 'billing', 'tech', 'viewer'];
const ROLE_LABEL = { super_admin: 'Super Admin', sales: 'Ventas', support: 'Soporte', billing: 'Facturación', tech: 'Técnico', viewer: 'Solo lectura' };
const TABS = ['Auditoría', 'Feature flags', 'Usuarios internos', 'Planes', 'Empresa'];

export function Configuracion({ onToast }) {
  const { can } = useEbRole();
  const [tab, setTab] = useState(can('audit.view') ? 'Auditoría' : 'Empresa');
  return (
    <div className="page">
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Configuración</h2>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>Planes, flags, usuarios internos, auditoría y datos de empresa</div>
      </div>
      <div className="eb-tabs">
        {TABS.map((t) => <button key={t} className={`eb-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      {tab === 'Auditoría' && <AuditTab onToast={onToast} />}
      {tab === 'Feature flags' && <FlagsTab onToast={onToast} />}
      {tab === 'Usuarios internos' && <StaffTab onToast={onToast} />}
      {tab === 'Planes' && <PlansTab onToast={onToast} />}
      {tab === 'Empresa' && <SettingsTab onToast={onToast} />}
    </div>
  );
}

function AuditTab({ onToast }) {
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { listAudit(debounced || null, null).then(setRows).catch((e) => { setRows([]); onToast?.({ tone: 'error', title: 'Auditoría', sub: e.message }); }); }, [debounced, onToast]);

  return (
    <div className="card">
      <div className="card-header"><div className="section-head"><h3 style={{ margin: 0 }}>Registro de auditoría</h3><p>Acciones sensibles del Backoffice</p></div></div>
      <div className="card-pad-sm" style={{ borderBottom: '1px solid var(--border-soft)' }}>
        <input className="input" placeholder="Buscar por acción, actor o iglesia…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 320, maxWidth: '100%' }} />
      </div>
      {rows === null ? <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>Cargando…</div>
        : rows.length === 0 ? <div className="empty-state" style={{ padding: 30 }}>Sin registros.</div>
        : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Acción</th><th>Actor</th><th>Rol</th><th>Iglesia</th><th>Detalle</th><th>Fecha</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.action}</strong><div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.entity_type || '—'}</div></td>
                <td>{r.actor_name || '—'}</td>
                <td>{ROLE_LABEL[r.eb_role] || r.eb_role || '—'}</td>
                <td>{r.church_name || '—'}</td>
                <td style={{ color: 'var(--muted)', fontSize: 12, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.metadata ? JSON.stringify(r.metadata) : '—'}</td>
                <td style={{ color: 'var(--muted)', fontSize: 13, whiteSpace: 'nowrap' }}>{dateTime(r.created_at)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
    </div>
  );
}

function FlagsTab({ onToast }) {
  const { can } = useEbRole();
  const writable = can('config.manage');
  const [flags, setFlags] = useState(null);
  const [busy, setBusy] = useState(null);
  useEffect(() => { listFlags().then(setFlags).catch(() => setFlags([])); }, []);

  const toggle = async (f) => {
    setBusy(f.key);
    try { setFlags(await setFlag(f.key, !f.enabled)); onToast?.({ title: 'Flag actualizado' }); }
    catch (e) { onToast?.({ tone: 'error', icon: 'alert', title: 'No se pudo', sub: e.message }); }
    finally { setBusy(null); }
  };

  if (flags === null) return <div className="card card-pad" style={{ color: 'var(--muted)' }}>Cargando…</div>;
  return (
    <div className="card">
      <div className="card-header"><div className="section-head"><h3 style={{ margin: 0 }}>Feature flags globales</h3><p>Activan/desactivan funciones de la plataforma</p></div></div>
      <div style={{ padding: '6px 0' }}>
        {flags.map((f) => (
          <div key={f.key} className="eb-flag-row">
            <div style={{ flex: 1 }}>
              <code style={{ fontSize: 13, fontWeight: 600 }}>{f.key}</code>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{f.description}</div>
            </div>
            {writable ? (
              <label className={`eb-switch ${f.enabled ? 'on' : ''} ${busy === f.key ? 'busy' : ''}`}>
                <input type="checkbox" checked={f.enabled} onChange={() => toggle(f)} disabled={busy === f.key} />
                <span className="eb-switch-track"><span className="eb-switch-thumb" /></span>
              </label>
            ) : <Badge tone={f.enabled ? 'success' : 'muted'}>{f.enabled ? 'On' : 'Off'}</Badge>}
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffTab({ onToast }) {
  const { can, role: myRole } = useEbRole();
  const writable = can('staff.manage');
  const [staff, setStaff] = useState(null);
  useEffect(() => { listStaff().then(setStaff).catch(() => setStaff([])); }, []);

  const changeRole = async (u, r) => {
    try { setStaff(await setStaffRole(u.user_id, r)); onToast?.({ title: 'Rol actualizado' }); }
    catch (e) { onToast?.({ tone: 'error', icon: 'alert', title: 'No se pudo', sub: e.message }); }
  };
  const toggleActive = async (u) => {
    try { setStaff(await setStaffActive(u.user_id, !u.is_active)); onToast?.({ title: u.is_active ? 'Desactivado' : 'Activado' }); }
    catch (e) { onToast?.({ tone: 'error', icon: 'alert', title: 'No se pudo', sub: e.message }); }
  };

  if (staff === null) return <div className="card card-pad" style={{ color: 'var(--muted)' }}>Cargando…</div>;
  return (
    <div className="card">
      <div className="card-header"><div className="section-head"><h3 style={{ margin: 0 }}>Usuarios internos</h3><p>{staff.length} miembro{staff.length === 1 ? '' : 's'} del equipo</p></div></div>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Último acceso</th></tr></thead>
        <tbody>{staff.map((u) => (
          <tr key={u.user_id}>
            <td><strong>{u.full_name || '—'}</strong></td>
            <td style={{ color: 'var(--muted)' }}>{u.email || '—'}</td>
            <td>
              {writable ? (
                <select className="input" value={u.role} disabled={!u.is_active} onChange={(e) => changeRole(u, e.target.value)} style={{ width: 150, padding: '4px 8px' }}>
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              ) : (ROLE_LABEL[u.role] || u.role)}
            </td>
            <td>{u.is_active ? <Badge tone="success" dot>Activo</Badge> : <Badge tone="muted">Inactivo</Badge>}</td>
            <td style={{ color: 'var(--muted)', fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                <span>{u.last_seen_at ? dateTime(u.last_seen_at) : '—'}</span>
                {writable && (u.role !== 'super_admin' || !u.is_active) && (
                  <button className="btn btn-sm btn-ghost" onClick={() => toggleActive(u)}>{u.is_active ? 'Desactivar' : 'Activar'}</button>
                )}
              </div>
            </td>
          </tr>
        ))}</tbody>
      </table></div>
      <div className="card-pad-sm" style={{ borderTop: '1px solid var(--border-soft)', color: 'var(--muted)', fontSize: 12.5 }}>
        Para invitar un nuevo miembro se usa el script <code>scripts/create-eb-staff.mjs</code> (requiere service_role).
      </div>
    </div>
  );
}

function PlansTab({ onToast }) {
  const { can } = useEbRole();
  const writable = can('config.manage');
  const [plans, setPlans] = useState(null);
  const [edit, setEdit] = useState(null);
  useEffect(() => { listPlans().then(setPlans).catch(() => setPlans([])); }, []);

  if (plans === null) return <div className="card card-pad" style={{ color: 'var(--muted)' }}>Cargando…</div>;
  return (
    <div className="card">
      <div className="card-header"><div className="section-head"><h3 style={{ margin: 0 }}>Planes y precios</h3><p>Catálogo de suscripción</p></div></div>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Código</th><th>Nombre</th><th>Precio/mes</th><th>Estado</th>{writable && <th></th>}</tr></thead>
        <tbody>{plans.map((p) => (
          <tr key={p.id}>
            <td><code>{p.code}</code></td>
            <td><strong>{p.name}</strong><div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.description}</div></td>
            <td>{money(p.monthly_price_cents)}</td>
            <td>{p.is_active ? <Badge tone="success">Activo</Badge> : <Badge tone="muted">Inactivo</Badge>}</td>
            {writable && <td className="row-actions"><button className="btn btn-sm btn-ghost" onClick={() => setEdit(p)}><Icon name="edit" size={14} /> Editar</button></td>}
          </tr>
        ))}</tbody>
      </table></div>
      {edit && <PlanModal plan={edit} onClose={() => setEdit(null)} onDone={(updated) => { setPlans(updated); setEdit(null); }} onToast={onToast} />}
    </div>
  );
}

function PlanModal({ plan, onClose, onDone, onToast }) {
  const [name, setName] = useState(plan.name);
  const [price, setPrice] = useState((plan.monthly_price_cents / 100).toString());
  const [active, setActive] = useState(plan.is_active);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const cents = Math.round(parseFloat(price || '0') * 100);
    if (cents < 0 || Number.isNaN(cents)) { onToast?.({ tone: 'error', icon: 'alert', title: 'Precio inválido' }); return; }
    setBusy(true);
    try { const u = await updatePlan(plan.id, name, cents, active); onToast?.({ title: 'Plan actualizado' }); onDone(u); }
    catch (e) { onToast?.({ tone: 'error', icon: 'alert', title: 'No se pudo', sub: e.message }); setBusy(false); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h3>Editar plan · {plan.code}</h3><button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18} /></button></div>
        <div className="modal-body">
          <label className="field"><span>Nombre</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="field"><span>Precio mensual (USD)</span><input className="input" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Plan activo</label>
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}

function SettingsTab({ onToast }) {
  const { can } = useEbRole();
  const writable = can('staff.manage');
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { getSettings().then(setS).catch(() => setS({})); }, []);

  const save = async () => {
    setBusy(true);
    try { const u = await updateSettings(s.company_name, s.support_email, s.website, s.terms_url); setS(u); onToast?.({ title: 'Configuración guardada' }); }
    catch (e) { onToast?.({ tone: 'error', icon: 'alert', title: 'No se pudo', sub: e.message }); }
    finally { setBusy(false); }
  };
  const set = (k) => (e) => setS((p) => ({ ...p, [k]: e.target.value }));

  if (s === null) return <div className="card card-pad" style={{ color: 'var(--muted)' }}>Cargando…</div>;
  return (
    <div className="card card-pad" style={{ maxWidth: 560 }}>
      <h3 style={{ margin: '0 0 14px' }}>Datos de la empresa</h3>
      <label className="field"><span>Nombre de la empresa</span><input className="input" value={s.company_name || ''} onChange={set('company_name')} disabled={!writable} /></label>
      <label className="field"><span>Email de soporte</span><input className="input" value={s.support_email || ''} onChange={set('support_email')} disabled={!writable} /></label>
      <label className="field"><span>Sitio web</span><input className="input" value={s.website || ''} onChange={set('website')} disabled={!writable} /></label>
      <label className="field"><span>URL de términos</span><input className="input" value={s.terms_url || ''} onChange={set('terms_url')} disabled={!writable} /></label>
      {writable && <button className="btn btn-primary" onClick={save} disabled={busy} style={{ marginTop: 12 }}><Icon name="save" size={14} /> {busy ? 'Guardando…' : 'Guardar cambios'}</button>}
    </div>
  );
}
