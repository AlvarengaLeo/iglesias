import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { Badge } from '../../components/Badge.jsx';
import { useEbRole } from '../hooks/useEbRole.js';
import { listTickets, ticketDetail, createTicket, addTicketMessage, setTicketStatus, listChurches } from '../api/eb.js';
import { dateTime } from '../format.js';

const PRIORITY = {
  low: { label: 'Baja', tone: 'muted' }, medium: { label: 'Media', tone: 'info' },
  high: { label: 'Alta', tone: 'warning' }, urgent: { label: 'Urgente', tone: 'error' },
};
const TSTATUS = {
  open: { label: 'Abierto', tone: 'info' }, in_progress: { label: 'En progreso', tone: 'warning' },
  waiting_customer: { label: 'Esperando cliente', tone: 'muted' }, resolved: { label: 'Resuelto', tone: 'success' },
  closed: { label: 'Cerrado', tone: 'muted' },
};
const pLabel = (p) => PRIORITY[p]?.label || p;
const pTone = (p) => PRIORITY[p]?.tone || 'muted';
const sLabel = (s) => TSTATUS[s]?.label || s;
const sTone = (s) => TSTATUS[s]?.tone || 'muted';

export function Soporte({ onToast }) {
  const [sel, setSel] = useState(null);
  const [refresh, setRefresh] = useState(0);
  return sel
    ? <TicketDetail id={sel} onBack={() => setSel(null)} onChanged={() => setRefresh((k) => k + 1)} onToast={onToast} />
    : <TicketList key={refresh} onOpen={setSel} onToast={onToast} />;
}

function TicketList({ onOpen, onToast }) {
  const { can } = useEbRole();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [state, setState] = useState({ loading: true, items: [], open: 0, error: null });
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    listTickets(status || null, debounced || null)
      .then((r) => { if (alive) setState({ loading: false, items: r.items || [], open: r.open_count || 0, error: null }); })
      .catch((e) => { if (alive) setState({ loading: false, items: [], open: 0, error: e.message }); });
    return () => { alive = false; };
  }, [status, debounced]);

  return (
    <div className="page">
      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="section-head"><h2>Tickets de soporte</h2><p>{state.open} abierto{state.open === 1 ? '' : 's'}</p></div>
          {can('support.manage') && <button className="btn btn-primary btn-sm" onClick={() => setNewOpen(true)}><Icon name="plus" size={14} /> Nuevo ticket</button>}
        </div>
        <div className="card-pad-sm" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', borderBottom: '1px solid var(--border-soft)' }}>
          <input className="input" placeholder="Buscar por asunto o iglesia…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 200 }}>
            <option value="">Todos los estados</option>
            {Object.keys(TSTATUS).map((k) => <option key={k} value={k}>{TSTATUS[k].label}</option>)}
          </select>
        </div>
        {state.loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Cargando…</div>
          : state.error ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--error)' }}>{state.error}</div>
          : state.items.length === 0 ? <div className="empty-state" style={{ padding: 40 }}>Sin tickets que coincidan.</div>
          : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Asunto</th><th>Iglesia</th><th>Prioridad</th><th>Estado</th><th>Mensajes</th><th>Creado</th><th></th></tr></thead>
              <tbody>{state.items.map((t) => (
                <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => onOpen(t.id)}>
                  <td><strong>{t.subject}</strong><div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.category}</div></td>
                  <td>{t.church_name || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                  <td><Badge tone={pTone(t.priority)}>{pLabel(t.priority)}</Badge></td>
                  <td><Badge tone={sTone(t.status)} dot>{sLabel(t.status)}</Badge></td>
                  <td>{t.message_count}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{dateTime(t.created_at)}</td>
                  <td className="row-actions"><button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); onOpen(t.id); }}>Ver <Icon name="chevronRight" size={14} /></button></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
      </div>
      {newOpen && <NewTicketModal onClose={() => setNewOpen(false)} onDone={(id) => { setNewOpen(false); onOpen(id); }} onToast={onToast} />}
    </div>
  );
}

function TicketDetail({ id, onBack, onChanged, onToast }) {
  const { can } = useEbRole();
  const [data, setData] = useState(null);
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => ticketDetail(id).then(setData).catch(() => setData(null));
  useEffect(() => { load(); }, [id]);

  const t = data?.ticket;
  const writable = can('support.manage');

  const changeStatus = async (s, assignSelf) => {
    try { const upd = await setTicketStatus(id, s, assignSelf); setData(upd); onToast({ title: 'Ticket actualizado' }); onChanged(); }
    catch (e) { onToast({ tone: 'error', icon: 'alert', title: 'No se pudo', sub: e.message }); }
  };
  const send = async () => {
    if (!reply.trim()) return;
    setBusy(true);
    try { const upd = await addTicketMessage(id, reply.trim(), internal); setData(upd); setReply(''); setInternal(false); onChanged(); }
    catch (e) { onToast({ tone: 'error', icon: 'alert', title: 'No se pudo', sub: e.message }); }
    finally { setBusy(false); }
  };

  if (!data || !t) return <div className="page"><div className="card card-pad" style={{ color: 'var(--muted)' }}>Cargando…</div></div>;
  const closed = t.status === 'resolved' || t.status === 'closed';

  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 14 }}><Icon name="chevronLeft" size={16} /> Volver a soporte</button>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0 }}>{t.subject}</h2>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>{t.church_name || 'Sin iglesia'} · {t.category}{t.assigned_name ? ` · asignado a ${t.assigned_name}` : ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Badge tone={pTone(t.priority)}>{pLabel(t.priority)}</Badge>
            <Badge tone={sTone(t.status)} dot>{sLabel(t.status)}</Badge>
          </div>
        </div>
        {writable && (
          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {t.status === 'open' && <button className="btn btn-primary" onClick={() => changeStatus('in_progress', true)}>Tomar ticket</button>}
            {!closed && <button className="btn btn-secondary" onClick={() => changeStatus('waiting_customer')}>Esperando cliente</button>}
            {!closed && <button className="btn btn-secondary" onClick={() => changeStatus('resolved')}>Resolver</button>}
            {t.status === 'resolved' && <button className="btn btn-secondary" onClick={() => changeStatus('closed')}>Cerrar</button>}
            {closed && <button className="btn btn-secondary" onClick={() => changeStatus('open')}>Reabrir</button>}
          </div>
        )}
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px' }}>Conversación</h3>
        {data.messages.length === 0 ? <div className="empty-state" style={{ padding: 16 }}>Sin mensajes.</div>
          : (
            <div className="eb-thread">
              {data.messages.map((m) => (
                <div key={m.id} className={`eb-msg ${m.is_internal ? 'internal' : ''}`}>
                  <div className="eb-msg-head">
                    <strong>{m.author_name}{m.is_internal && <span className="eb-msg-internal-tag"> · nota interna</span>}</strong>
                    <span className="when">{dateTime(m.created_at)}</span>
                  </div>
                  <div className="eb-msg-body">{m.body}</div>
                </div>
              ))}
            </div>
          )}

        {writable && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--border-soft)', paddingTop: 14 }}>
            <textarea className="input" rows={3} placeholder="Escribe una respuesta o nota interna…" value={reply} onChange={(e) => setReply(e.target.value)} style={{ resize: 'vertical', width: '100%' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Nota interna (no visible para la iglesia)
              </label>
              <button className="btn btn-primary" onClick={send} disabled={busy || !reply.trim()}><Icon name="send" size={14} /> {busy ? 'Enviando…' : 'Enviar'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NewTicketModal({ onClose, onDone, onToast }) {
  const [churches, setChurches] = useState([]);
  const [churchId, setChurchId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [busy, setBusy] = useState(false);

  useEffect(() => { listChurches({ p_limit: 100, p_offset: 0 }).then((r) => setChurches(r.items || [])).catch(() => {}); }, []);

  const submit = async () => {
    if (!subject.trim()) { onToast({ tone: 'error', icon: 'alert', title: 'Asunto requerido' }); return; }
    setBusy(true);
    try { const r = await createTicket(churchId || null, subject.trim(), description, category, priority); onToast({ title: 'Ticket creado' }); onDone(r.ticket_id); }
    catch (e) { onToast({ tone: 'error', icon: 'alert', title: 'No se pudo', sub: e.message }); setBusy(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h3>Nuevo ticket</h3><button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18} /></button></div>
        <div className="modal-body">
          <label className="field"><span>Iglesia (opcional)</span>
            <select className="input" value={churchId} onChange={(e) => setChurchId(e.target.value)}>
              <option value="">— Sin iglesia / interno —</option>
              {churches.map((c) => <option key={c.id} value={c.id}>{c.public_name}</option>)}
            </select>
          </label>
          <label className="field"><span>Asunto</span><input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ej. No puedo publicar el portal" /></label>
          <label className="field"><span>Descripción</span><textarea className="input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} style={{ resize: 'vertical' }} /></label>
          <div style={{ display: 'flex', gap: 12 }}>
            <label className="field" style={{ flex: 1 }}><span>Categoría</span>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="general">General</option><option value="billing">Facturación</option><option value="technical">Técnico</option>
                <option value="portal">Portal</option><option value="onboarding">Onboarding</option><option value="account">Cuenta</option>
              </select>
            </label>
            <label className="field" style={{ flex: 1 }}><span>Prioridad</span>
              <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                {Object.keys(PRIORITY).map((k) => <option key={k} value={k}>{PRIORITY[k].label}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? 'Creando…' : 'Crear ticket'}</button>
        </div>
      </div>
    </div>
  );
}
