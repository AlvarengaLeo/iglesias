import { useEffect, useState, useCallback } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { Badge } from '../../components/Badge.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useEb } from '../contexts/EbContext.jsx';
import { useEbRole } from '../hooks/useEbRole.js';
import { listLeads, leadNotes, addLeadNote, setLeadStatus, provisionChurch } from '../api/eb.js';
import { date, dateTime } from '../format.js';

const STATUS = [
  { v: 'new', label: 'Nuevo', tone: 'info' },
  { v: 'contacted', label: 'Contactado', tone: 'navy' },
  { v: 'demo_scheduled', label: 'Demo agendada', tone: 'coffee' },
  { v: 'demo_completed', label: 'Demo hecha', tone: 'coffee' },
  { v: 'trial_created', label: 'Trial', tone: 'info' },
  { v: 'converted', label: 'Convertido', tone: 'success' },
  { v: 'lost', label: 'Perdido', tone: 'error' },
  { v: 'not_qualified', label: 'No califica', tone: 'muted' },
];
const sLabel = (s) => STATUS.find((x) => x.v === s)?.label || s;
const sTone = (s) => STATUS.find((x) => x.v === s)?.tone || 'muted';
const slugify = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);

export function Leads({ onToast }) {
  const [selected, setSelected] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  return selected
    ? <LeadDetail lead={selected} onBack={() => setSelected(null)} onChanged={() => { setRefreshKey((k) => k + 1); setSelected(null); }} onToast={onToast} />
    : <LeadList key={refreshKey} onOpen={setSelected} onToast={onToast} />;
}

function LeadList({ onOpen }) {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [state, setState] = useState({ loading: true, items: [], error: null });

  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    listLeads(status || null, debounced || null)
      .then((items) => { if (alive) setState({ loading: false, items, error: null }); })
      .catch((e) => { if (alive) setState({ loading: false, items: [], error: e.message }); });
    return () => { alive = false; };
  }, [status, debounced]);

  return (
    <div className="page">
      <div className="card">
        <div className="card-header"><div className="section-head"><h2>Leads</h2><p>{state.items.length} lead{state.items.length === 1 ? '' : 's'}</p></div></div>
        <div className="card-pad-sm" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', borderBottom: '1px solid var(--border-soft)' }}>
          <input className="input" placeholder="Buscar por iglesia, contacto o email…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 200 }}>
            <option value="">Todos los estados</option>
            {STATUS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </div>
        {state.loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Cargando…</div>
          : state.error ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--error)' }}>{state.error}</div>
          : state.items.length === 0 ? <div className="empty-state" style={{ padding: 40 }}>Sin leads.</div>
          : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Iglesia</th><th>Contacto</th><th>Estado</th><th>Origen</th><th>Notas</th><th>Recibido</th><th></th></tr></thead>
              <tbody>{state.items.map((l) => (
                <tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => onOpen(l)}>
                  <td><strong>{l.church_name}</strong>{l.city && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{l.city}</div>}</td>
                  <td>{l.contact_name || '—'}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{l.email}</div></td>
                  <td><Badge tone={sTone(l.status)} dot>{sLabel(l.status)}</Badge></td>
                  <td style={{ color: 'var(--muted)' }}>{l.source || '—'}</td>
                  <td>{l.note_count || 0}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{date(l.created_at)}</td>
                  <td className="row-actions"><button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); onOpen(l); }}>Ver <Icon name="chevronRight" size={14} /></button></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
      </div>
    </div>
  );
}

function LeadDetail({ lead, onBack, onChanged, onToast }) {
  const { user } = useAuth();
  const { staff } = useEb();
  const { can } = useEbRole();
  const [status, setStatusState] = useState(lead.status);
  const [notes, setNotes] = useState(null);
  const [noteBody, setNoteBody] = useState('');
  const [convertOpen, setConvertOpen] = useState(false);
  const isConverted = !!lead.converted_church_id;

  useEffect(() => { leadNotes(lead.id).then(setNotes).catch(() => setNotes([])); }, [lead.id]);

  const changeStatus = async (s) => {
    setStatusState(s);
    try { await setLeadStatus(lead.id, s); onToast({ title: 'Estado actualizado' }); }
    catch (e) { onToast({ tone: 'error', icon: 'alert', title: 'No se pudo actualizar', sub: e.message }); }
  };
  const submitNote = async () => {
    const body = noteBody.trim();
    if (!body) return;
    try {
      await addLeadNote(lead.id, body, user.id, staff?.full_name || user.email);
      setNoteBody('');
      setNotes(await leadNotes(lead.id));
    } catch (e) { onToast({ tone: 'error', icon: 'alert', title: 'No se pudo guardar la nota', sub: e.message }); }
  };

  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 14 }}><Icon name="chevronLeft" size={16} /> Volver a leads</button>
      <div className="grid grid-12" style={{ gap: 16 }}>
        <div className="col-span-7">
          <div className="card card-pad">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div><h2 style={{ margin: 0 }}>{lead.church_name}</h2><div style={{ color: 'var(--muted)', fontSize: 13 }}>{lead.contact_name} · {lead.email}</div></div>
              <Badge tone={sTone(status)} dot>{sLabel(status)}</Badge>
            </div>
            <div style={{ marginTop: 16 }}>
              <Field label="Teléfono" value={lead.phone} />
              <Field label="Ciudad" value={lead.city} />
              <Field label="Tamaño aprox." value={lead.estimated_size} />
              <Field label="Origen" value={lead.source} />
              <Field label="Recibido" value={dateTime(lead.created_at)} />
              {lead.message && <div style={{ marginTop: 10 }}><div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 4 }}>Mensaje</div><div style={{ background: 'var(--bg-2)', borderRadius: 10, padding: 12, fontSize: 14 }}>{lead.message}</div></div>}
            </div>
            {can('leads.write') && !isConverted && (
              <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <select className="input" value={status} onChange={(e) => changeStatus(e.target.value)} style={{ width: 200 }}>
                  {STATUS.filter((s) => s.v !== 'converted').map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
                </select>
                {can('leads.convert') && <button className="btn btn-primary" onClick={() => setConvertOpen(true)}><Icon name="rocket" size={14} /> Convertir en iglesia</button>}
              </div>
            )}
            {isConverted && <div className="banner success" style={{ marginTop: 16 }}><Icon name="check" /> Convertido en iglesia.</div>}
          </div>
        </div>
        <div className="col-span-5">
          <div className="card card-pad">
            <h3 style={{ margin: '0 0 12px' }}>Notas</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input className="input" placeholder="Agregar nota…" value={noteBody} onChange={(e) => setNoteBody(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitNote()} style={{ flex: 1 }} />
              <button className="btn btn-secondary btn-sm" onClick={submitNote}>Guardar</button>
            </div>
            {notes === null ? <div style={{ color: 'var(--muted)' }}>Cargando…</div>
              : notes.length === 0 ? <div style={{ color: 'var(--muted)', fontSize: 14 }}>Sin notas todavía.</div>
              : notes.map((n) => (
                <div key={n.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-soft)' }}>
                  <div style={{ fontSize: 14 }}>{n.body}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{n.author_name || 'Staff'} · {dateTime(n.created_at)}</div>
                </div>
              ))}
          </div>
        </div>
      </div>
      {convertOpen && <ConvertModal lead={lead} onClose={() => setConvertOpen(false)} onDone={onChanged} onToast={onToast} />}
    </div>
  );
}

function ConvertModal({ lead, onClose, onDone, onToast }) {
  const [form, setForm] = useState({
    public_name: lead.church_name || '',
    legal_name: lead.church_name || '',
    slug: slugify(lead.church_name),
    admin_email: lead.email || '',
    admin_full_name: lead.contact_name || '',
    plan_code: 'ministry',
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setBusy(true);
    try {
      const res = await provisionChurch({ lead_id: lead.id, ...form, slug: slugify(form.slug) });
      onToast({ title: 'Iglesia creada', sub: res.email_sent ? `Invitación enviada a ${res.admin_email}` : `Creada, pero el email falló (${res.email_error || 'revisar'})` });
      onDone();
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'No se pudo convertir', sub: e.message });
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h3>Convertir lead en iglesia</h3><button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18} /></button></div>
        <div className="modal-body">
          <label className="field"><span>Nombre público</span><input className="input" value={form.public_name} onChange={set('public_name')} /></label>
          <label className="field"><span>Nombre legal</span><input className="input" value={form.legal_name} onChange={set('legal_name')} /></label>
          <label className="field"><span>Slug (URL)</span><input className="input" value={form.slug} onChange={set('slug')} placeholder="mi-iglesia" /></label>
          <label className="field"><span>Email del admin</span><input className="input" type="email" value={form.admin_email} onChange={set('admin_email')} /></label>
          <label className="field"><span>Nombre del admin</span><input className="input" value={form.admin_full_name} onChange={set('admin_full_name')} /></label>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Crea la iglesia (portal, fondos, onboarding, suscripción trial) e invita al administrador por email.</p>
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy || !form.public_name || !form.slug || !form.admin_email}>{busy ? 'Creando…' : 'Crear iglesia'}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '7px 0', borderBottom: '1px solid var(--border-soft)' }}>
      <span style={{ color: 'var(--muted)', fontSize: 14 }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
}
