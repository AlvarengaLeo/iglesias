import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { Badge } from '../../components/Badge.jsx';
import { useEbRole } from '../hooks/useEbRole.js';
import { billingOverview, listSubscriptions, subscriptionDetail, recordPayment, setSubscriptionStatus } from '../api/eb.js';
import { money, date, dateTime } from '../format.js';

const SUB_STATUS = {
  trialing: { label: 'Trial', tone: 'info' },
  active: { label: 'Activa', tone: 'success' },
  past_due: { label: 'Atrasada', tone: 'warning' },
  canceled: { label: 'Cancelada', tone: 'error' },
  paused: { label: 'Pausada', tone: 'muted' },
  incomplete: { label: 'Incompleta', tone: 'muted' },
};
const PAY_STATUS = { paid: 'success', pending: 'muted', failed: 'error', refunded: 'warning', disputed: 'error' };
const sLabel = (s) => SUB_STATUS[s]?.label || s;
const sTone = (s) => SUB_STATUS[s]?.tone || 'muted';

export function Facturacion({ onToast }) {
  const [sel, setSel] = useState(null);
  const [refresh, setRefresh] = useState(0);
  return sel
    ? <SubDetail id={sel} onBack={() => setSel(null)} onChanged={() => setRefresh((k) => k + 1)} onToast={onToast} />
    : <SubList key={refresh} onOpen={setSel} />;
}

function SubList({ onOpen }) {
  const [ov, setOv] = useState(null);
  const [status, setStatus] = useState('');
  const [state, setState] = useState({ loading: true, items: [], error: null });

  useEffect(() => { billingOverview().then(setOv).catch(() => {}); }, []);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    listSubscriptions(status || null, null)
      .then((items) => { if (alive) setState({ loading: false, items, error: null }); })
      .catch((e) => { if (alive) setState({ loading: false, items: [], error: e.message }); });
    return () => { alive = false; };
  }, [status]);

  return (
    <div className="page">
      <div className="eb-stat-grid" style={{ marginBottom: 16 }}>
        <Kpi label="MRR" value={ov ? money(ov.mrr_cents) : '—'} accent />
        <Kpi label="Activas" value={ov?.active ?? '—'} />
        <Kpi label="En trial" value={ov?.trialing ?? '—'} />
        <Kpi label="Atrasadas" value={ov?.past_due ?? '—'} />
        <Kpi label="Cobrado (total)" value={ov ? money(ov.collected_cents) : '—'} />
        <Kpi label="Pagos fallidos" value={ov?.failed_payments ?? '—'} />
      </div>
      <div className="card">
        <div className="card-header"><div className="section-head"><h2>Suscripciones</h2><p>{state.items.length}</p></div></div>
        <div className="card-pad-sm" style={{ borderBottom: '1px solid var(--border-soft)' }}>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 200 }}>
            <option value="">Todos los estados</option>
            {Object.keys(SUB_STATUS).map((k) => <option key={k} value={k}>{SUB_STATUS[k].label}</option>)}
          </select>
        </div>
        {state.loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Cargando…</div>
          : state.error ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--error)' }}>{state.error}</div>
          : state.items.length === 0 ? <div className="empty-state" style={{ padding: 40 }}>Sin suscripciones.</div>
          : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Iglesia</th><th>Plan</th><th>Estado</th><th>Precio/mes</th><th>Trial vence</th><th>Último pago</th><th>Total</th><th></th></tr></thead>
              <tbody>{state.items.map((s) => (
                <tr key={s.subscription_id} style={{ cursor: 'pointer' }} onClick={() => onOpen(s.subscription_id)}>
                  <td><strong>{s.public_name}</strong><div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.slug}</div></td>
                  <td>{s.plan_name || '—'}</td>
                  <td><Badge tone={sTone(s.status)} dot>{sLabel(s.status)}</Badge></td>
                  <td>{money(s.monthly_price_cents)}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{s.status === 'trialing' ? date(s.trial_ends_at) : '—'}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{s.last_payment_at ? date(s.last_payment_at) : '—'}</td>
                  <td>{money(s.total_paid_cents)}</td>
                  <td className="row-actions"><button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); onOpen(s.subscription_id); }}>Ver <Icon name="chevronRight" size={14} /></button></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
      </div>
    </div>
  );
}

function SubDetail({ id, onBack, onChanged, onToast }) {
  const { can } = useEbRole();
  const [data, setData] = useState(null);
  const [payOpen, setPayOpen] = useState(false);

  const load = () => subscriptionDetail(id).then(setData).catch(() => setData(null));
  useEffect(() => { load(); }, [id]);

  const sub = data?.subscription;
  const changeStatus = async (s, reason) => {
    try { await setSubscriptionStatus(id, s, reason); onToast({ title: 'Suscripción actualizada' }); await load(); onChanged(); }
    catch (e) { onToast({ tone: 'error', icon: 'alert', title: 'No se pudo', sub: e.message }); }
  };

  if (!data || !sub) return <div className="page"><div className="card card-pad" style={{ color: 'var(--muted)' }}>Cargando…</div></div>;

  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 14 }}><Icon name="chevronLeft" size={16} /> Volver a facturación</button>
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0 }}>{sub.public_name}</h2>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>{sub.plan_name} · {money(sub.monthly_price_cents)}/mes</div>
          </div>
          <Badge tone={sTone(sub.status)} dot>{sLabel(sub.status)}</Badge>
        </div>
        <div style={{ marginTop: 14 }}>
          <Field label="Estado" value={sLabel(sub.status)} />
          {sub.trial_ends_at && <Field label="Trial vence" value={date(sub.trial_ends_at)} />}
          {sub.current_period_ends_at && <Field label="Período actual vence" value={date(sub.current_period_ends_at)} />}
          {sub.canceled_at && <Field label="Cancelada" value={`${date(sub.canceled_at)}${sub.cancel_reason ? ' · ' + sub.cancel_reason : ''}`} />}
          <Field label="Proveedor de pago" value={sub.payment_provider || 'Manual'} />
        </div>
        {can('billing.manage') && (
          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => setPayOpen(true)}><Icon name="creditCard" size={14} /> Registrar pago</button>
            {sub.status !== 'canceled' && <button className="btn btn-secondary" onClick={() => changeStatus('canceled', 'Cancelada desde Backoffice')}>Cancelar</button>}
            {sub.status === 'canceled' && <button className="btn btn-secondary" onClick={() => changeStatus('active')}>Reactivar</button>}
            {sub.status === 'active' && <button className="btn btn-secondary" onClick={() => changeStatus('paused')}>Pausar</button>}
            {sub.status === 'paused' && <button className="btn btn-secondary" onClick={() => changeStatus('active')}>Reanudar</button>}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header"><div className="section-head"><h3 style={{ margin: 0 }}>Pagos</h3></div></div>
        {data.payments.length === 0 ? <div className="empty-state" style={{ padding: 24 }}>Sin pagos registrados.</div>
          : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Monto</th><th>Estado</th><th>Método</th><th>Fecha</th><th>Nota</th></tr></thead>
              <tbody>{data.payments.map((p) => (
                <tr key={p.id}>
                  <td><strong>{money(p.amount_cents)}</strong></td>
                  <td><Badge tone={PAY_STATUS[p.status] || 'muted'}>{p.status}</Badge></td>
                  <td style={{ color: 'var(--muted)' }}>{p.payment_method || '—'}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{dateTime(p.paid_at || p.failed_at || p.created_at)}</td>
                  <td style={{ color: 'var(--muted)' }}>{p.notes || '—'}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
      </div>

      {payOpen && <PaymentModal sub={sub} onClose={() => setPayOpen(false)} onDone={async () => { setPayOpen(false); await load(); onChanged(); }} onToast={onToast} />}
    </div>
  );
}

function PaymentModal({ sub, onClose, onDone, onToast }) {
  const [amount, setAmount] = useState((sub.monthly_price_cents / 100).toString());
  const [status, setStatus] = useState('paid');
  const [method, setMethod] = useState('manual');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const cents = Math.round(parseFloat(amount || '0') * 100);
    if (!cents || cents < 0) { onToast({ tone: 'error', icon: 'alert', title: 'Monto inválido' }); return; }
    setBusy(true);
    try { await recordPayment(sub.id, cents, status, method, notes); onToast({ title: 'Pago registrado' }); onDone(); }
    catch (e) { onToast({ tone: 'error', icon: 'alert', title: 'No se pudo', sub: e.message }); setBusy(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h3>Registrar pago</h3><button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18} /></button></div>
        <div className="modal-body">
          <label className="field"><span>Monto (USD)</span><input className="input" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
          <label className="field"><span>Estado</span>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="paid">Pagado</option><option value="failed">Fallido</option><option value="pending">Pendiente</option><option value="refunded">Reembolsado</option>
            </select>
          </label>
          <label className="field"><span>Método</span>
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="manual">Manual</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option><option value="check">Cheque</option>
            </select>
          </label>
          <label className="field"><span>Nota (opcional)</span><input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Un pago "Pagado" sobre una suscripción en trial la activa automáticamente.</p>
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? 'Guardando…' : 'Registrar'}</button>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }) {
  return <div className="kpi"><div className="kpi-label">{label}</div><div className="kpi-value" style={accent ? { color: 'var(--coffee)' } : undefined}>{value}</div></div>;
}
function Field({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '7px 0', borderBottom: '1px solid var(--border-soft)' }}>
      <span style={{ color: 'var(--muted)', fontSize: 14 }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
}
