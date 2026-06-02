// DonacionesScreen — Fase 7: conectado a Supabase.
// 4 tabs (Todas, Recurrentes, Campañas, Recibos), filtros, registrar donación
// via rpc_register_donation, crear campaña, drawer detalle, reenviar recibo
// via rpc_resend_receipt (NO duplica donation).

import { useState, useEffect } from 'react';
import { Icon } from '../components/Icon.jsx';
import { Badge } from '../components/Badge.jsx';
import { formatMoney as fmt } from '../components/charts/index.jsx';
import { Kpi } from '../components/Kpi.jsx';
import { useChurch } from '../hooks/useChurch.js';
import { useAuth } from '../hooks/useAuth.js';
import { useRole } from '../hooks/useRole.js';
import {
  listDonations, getDonationDetail, registerDonation, getDonationsKpis,
  PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE, FREQUENCY_LABEL,
} from '../api/donations.js';
import { listFunds } from '../api/funds.js';
import { listCampaigns, listCampaignProgress, createCampaign, setCampaignVisibility } from '../api/campaigns.js';
import { listAllRecurring } from '../api/recurring.js';
import { listReceipts, resendReceipt, RECEIPT_STATUS_LABEL, RECEIPT_STATUS_TONE, RESEND_REASON_LABEL } from '../api/receipts.js';
import { listPeople, personDisplayName, personInitials } from '../api/people.js';
import {
  listIntents, countPendingIntents, linkIntentToDonation, markContacted, cancelIntent,
  intentDonorDisplayName, intentDonorInitials, intentReferenceCode,
  INTENT_STATUS_LABEL, INTENT_STATUS_TONE, INTENT_FREQUENCY_LABEL, INTENT_TYPE_LABEL,
} from '../api/donationIntents.js';
import { exportReceiptPdf } from '../lib/exportPdf.js';
import { dollarsToCents, centsToDollars } from '../lib/money.js';
import { formatDate, formatRelativeTime, shortenId } from '../lib/formatters.js';

const formatMoney = (cents) => fmt(Number(cents) / 100);

export function DonacionesScreen({ onToast }) {
  const { church, churchId } = useChurch();
  const { user } = useAuth();
  const { can } = useRole();

  const [tab, setTab] = useState('Todas');
  const [filters, setFilters] = useState({ fund_id: '', campaign_id: '', payment_method: '', payment_status: '', frequency: '' });
  const [donations, setDonations] = useState(null);
  const [funds, setFunds] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [campaignProgress, setCampaignProgress] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [intents, setIntents] = useState([]);
  const [pendingIntentCount, setPendingIntentCount] = useState(0);
  // Si está seteado, RegisterDonationModal abre pre-llenado y al guardar
  // se vincula la donation creada al intent vía rpc_link_intent_to_donation.
  const [convertingIntent, setConvertingIntent] = useState(null);

  const refetchAll = async () => {
    if (!churchId) return;
    try {
      const [d, f, c, r, cp, rec, k, ints, pc] = await Promise.all([
        listDonations(churchId, filters),
        listFunds(churchId),
        listCampaigns(churchId),
        listAllRecurring(churchId),
        listCampaignProgress(churchId),
        listReceipts(churchId),
        getDonationsKpis(churchId),
        listIntents(churchId, { limit: 200 }),
        countPendingIntents(churchId),
      ]);
      setDonations(d);
      setFunds(f);
      setCampaigns(c);
      setRecurring(r);
      setCampaignProgress(cp);
      setReceipts(rec);
      setKpis(k);
      setIntents(ints);
      setPendingIntentCount(pc);
    } catch (e) {
      console.error(e);
      onToast({ tone: 'error', icon: 'alert', title: 'Error al cargar donaciones', sub: e.message });
    }
  };

  useEffect(() => { refetchAll(); }, [churchId, JSON.stringify(filters)]);

  const handleRegisterDonation = async (payload) => {
    try {
      const result = await registerDonation({
        churchId, personId: payload.personId, amountCents: payload.amountCents,
        fundId: payload.fundId, campaignId: payload.campaignId,
        paymentMethod: payload.paymentMethod, paymentStatus: 'paid',
        frequency: payload.frequency, donationDate: payload.donationDate,
        notes: payload.notes, autoGenerateReceipt: payload.autoGenerateReceipt,
      });

      // Si veníamos convirtiendo un intent, enlazar.
      if (convertingIntent && result?.donation_id) {
        try {
          await linkIntentToDonation(convertingIntent.id, result.donation_id);
        } catch (linkErr) {
          // La donation ya se creó, pero el link falló — avisar pero no romper.
          onToast({
            tone: 'warning', icon: 'alert',
            title: 'Donación creada, pero no se pudo vincular la intención',
            sub: linkErr.message,
          });
        }
      }

      onToast({
        title: convertingIntent ? 'Intención convertida en donación' : 'Donación registrada correctamente',
        sub: result.receipt_number ? `Recibo ${result.receipt_number} generado` : 'Sin recibo automático',
      });
      setShowRegisterModal(false);
      setConvertingIntent(null);
      await refetchAll();
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'Error al registrar', sub: e.message });
    }
  };

  const handleConvertIntent = (intent) => {
    setConvertingIntent(intent);
    setShowRegisterModal(true);
  };

  const handleMarkContacted = async (intent) => {
    try {
      await markContacted(intent.id);
      onToast({ title: 'Intención marcada como contactada' });
      await refetchAll();
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'Error', sub: e.message });
    }
  };

  const handleCancelIntent = async (intent) => {
    if (!window.confirm(`¿Cancelar la intención de ${intentDonorDisplayName(intent)}?`)) return;
    try {
      await cancelIntent(intent.id);
      onToast({ title: 'Intención cancelada' });
      await refetchAll();
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'Error', sub: e.message });
    }
  };

  const handleCreateCampaign = async (payload) => {
    try {
      await createCampaign(churchId, payload, user.id);
      onToast({ title: 'Campaña creada', sub: 'Ya aparece en tu lista de campañas.' });
      setShowCampaignModal(false);
      await refetchAll();
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'Error al crear campaña', sub: e.message });
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-text">
          <h2 className="page-greeting">Donaciones</h2>
          <p className="page-sub">Gestiona aportes, fondos, campañas y recibos</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => setShowCampaignModal(true)} disabled={!can('campaigns.write')}>
            <Icon name="target" size={14} /> Crear campaña
          </button>
          <button className="btn btn-primary" onClick={() => setShowRegisterModal(true)} disabled={!can('donations.create')}>
            <Icon name="plus" size={14} /> Registrar donación
          </button>
        </div>
      </div>

      <DonationKpis kpis={kpis} />

      <div className="card dash-in" style={{ marginBottom: 16, padding: 14 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <FilterPill label="Fondo" value={filters.fund_id} onChange={(v) => setFilters({ ...filters, fund_id: v })} options={[{ value: '', label: 'Todos' }, ...funds.map((f) => ({ value: f.id, label: f.name }))]} />
          <FilterPill label="Campaña" value={filters.campaign_id} onChange={(v) => setFilters({ ...filters, campaign_id: v })} options={[{ value: '', label: 'Todas' }, ...campaigns.map((c) => ({ value: c.id, label: c.name }))]} />
          <FilterPill label="Método" value={filters.payment_method} onChange={(v) => setFilters({ ...filters, payment_method: v })} options={[{ value: '', label: 'Todos' }, ...Object.entries(PAYMENT_METHOD_LABEL).map(([v, l]) => ({ value: v, label: l }))]} />
          <FilterPill label="Estado" value={filters.payment_status} onChange={(v) => setFilters({ ...filters, payment_status: v })} options={[{ value: '', label: 'Todos' }, ...Object.entries(PAYMENT_STATUS_LABEL).map(([v, l]) => ({ value: v, label: l }))]} />
          <FilterPill label="Frecuencia" value={filters.frequency} onChange={(v) => setFilters({ ...filters, frequency: v })} options={[{ value: '', label: 'Todas' }, ...Object.entries(FREQUENCY_LABEL).map(([v, l]) => ({ value: v, label: l }))]} />
          {(filters.fund_id || filters.campaign_id || filters.payment_method || filters.payment_status || filters.frequency) && (
            <button className="chip" onClick={() => setFilters({ fund_id: '', campaign_id: '', payment_method: '', payment_status: '', frequency: '' })}>
              <Icon name="x" size={11} /> Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <div className="card dash-in" style={{ marginBottom: 16, animationDelay: '.06s' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-soft)', padding: '0 12px' }}>
          {['Todas', 'Recurrentes', 'Campañas', 'Recibos', 'Intenciones'].map((t) => (
            <button key={t} className={`tab-u ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t}
              {t === 'Todas' && donations !== null && <span className="count">{donations.length}</span>}
              {t === 'Recurrentes' && <span className="count">{recurring.filter((r) => r.status === 'active').length}</span>}
              {t === 'Campañas' && <span className="count">{campaigns.filter((c) => c.status === 'active').length}</span>}
              {t === 'Recibos' && <span className="count">{receipts.length}</span>}
              {t === 'Intenciones' && (
                <span className="count" style={pendingIntentCount > 0 ? { background: 'var(--warning-bg)', color: 'var(--warning)' } : {}}>
                  {pendingIntentCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'Todas' && <DonationsTable donations={donations} onSelect={setSelected} selectedId={selected?.id} />}
        {tab === 'Recurrentes' && <RecurringTable rows={recurring} />}
        {tab === 'Campañas' && <CampaignsList campaigns={campaigns} progress={campaignProgress} onToast={onToast} onRefresh={refetchAll} canEdit={can('campaigns.write')} />}
        {tab === 'Recibos' && <ReceiptsTable receipts={receipts} />}
        {tab === 'Intenciones' && (
          <IntentsList
            intents={intents}
            canConvert={can('donations.create')}
            onConvert={handleConvertIntent}
            onMarkContacted={handleMarkContacted}
            onCancel={handleCancelIntent}
          />
        )}
      </div>

      {selected && (
        <DonationDrawer
          donationId={selected.id}
          church={church}
          onClose={() => setSelected(null)}
          onToast={onToast}
          onRefresh={refetchAll}
          canResend={can('receipts.resend')}
        />
      )}

      {showRegisterModal && (
        <RegisterDonationModal
          churchId={churchId}
          funds={funds}
          campaigns={campaigns.filter((c) => c.status === 'active')}
          onClose={() => { setShowRegisterModal(false); setConvertingIntent(null); }}
          onSubmit={handleRegisterDonation}
          initial={convertingIntent ? {
            donorEmail: convertingIntent.donor_email,
            amount: String(centsToDollars(convertingIntent.amount_cents)),
            fundId: convertingIntent.fund_id,
            campaignId: convertingIntent.campaign_id || '',
            frequency: convertingIntent.frequency,
            notes: [
              convertingIntent.note && `Mensaje del donante: ${convertingIntent.note}`,
              `Convertida desde intención ${intentReferenceCode(convertingIntent)}`,
            ].filter(Boolean).join('\n'),
          } : null}
        />
      )}

      {showCampaignModal && (
        <CreateCampaignModal
          funds={funds}
          onClose={() => setShowCampaignModal(false)}
          onSubmit={handleCreateCampaign}
        />
      )}
    </div>
  );
}

function DonationKpis({ kpis }) {
  const loading = !kpis;
  return (
    <div className="grid grid-4 dash-reveal" style={{ marginBottom: 16 }}>
      <Kpi icon="dollar" label="Total este mes" loading={loading} value={kpis ? Number(kpis.monthTotal) : null} format={formatMoney} />
      <Kpi icon="refresh" label="Recurrentes activos" loading={loading} value={kpis ? Number(kpis.recurringActiveCount) : null} />
      <Kpi icon="clock" label="Pendientes" loading={loading} value={kpis ? `${kpis.pendingCount} (${formatMoney(kpis.pendingTotal)})` : null} />
      <Kpi icon="receipt" label="Recibos del mes" loading={loading} value={kpis ? Number(kpis.receiptsThisMonth) : null} />
    </div>
  );
}

function FilterPill({ label, value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        border: '1px solid var(--border)', borderRadius: 999,
        padding: '6px 26px 6px 12px', fontSize: 12, fontWeight: 600,
        background: value ? 'var(--coffee-bg)' : 'var(--card)',
        color: value ? 'var(--coffee)' : 'var(--text)',
        cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
        backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2366727D\' stroke-width=\'2\'><path d=\'m6 9 6 6 6-6\'/></svg>")',
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{label}: {o.label}</option>
      ))}
    </select>
  );
}

function DonationsTable({ donations, onSelect, selectedId }) {
  if (donations === null) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Cargando…</div>;
  if (donations.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Sin donaciones con esos filtros.</div>;

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Donante</th>
            <th style={{ width: 100, textAlign: 'right' }}>Monto</th>
            <th>Fondo / Campaña</th>
            <th>Frecuencia</th>
            <th>Método</th>
            <th>Estado</th>
            <th>Recibo</th>
            <th style={{ width: 100 }}>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {donations.map((d, i) => (
            <tr key={d.id} className={`tbl-row ${selectedId === d.id ? 'selected' : ''}`} onClick={() => onSelect(d)} style={{ cursor: 'pointer', animationDelay: `${Math.min(i, 18) * 0.025}s` }}>
              <td>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{d.donor_name_snapshot}</div>
                {d.donor_email_snapshot && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.donor_email_snapshot}</div>}
              </td>
              <td className="tnum" style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(d.amount_cents)}</td>
              <td>
                <div style={{ fontSize: 13 }}>{d.fund?.name || '—'}</div>
                {d.campaign?.name && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.campaign.name}</div>}
              </td>
              <td className="muted">{FREQUENCY_LABEL[d.frequency]}</td>
              <td className="muted">{PAYMENT_METHOD_LABEL[d.payment_method]}</td>
              <td><Badge tone={PAYMENT_STATUS_TONE[d.payment_status]} dot>{PAYMENT_STATUS_LABEL[d.payment_status]}</Badge></td>
              <td>
                {d.receipt?.receipt_number ? (
                  <div>
                    <span className="mono" style={{ fontSize: 12 }}>{d.receipt.receipt_number}</span>
                    <div style={{ fontSize: 11, marginTop: 2 }}>
                      <Badge tone={RECEIPT_STATUS_TONE[d.receipt.status]}>{RECEIPT_STATUS_LABEL[d.receipt.status]}</Badge>
                    </div>
                  </div>
                ) : <span className="muted" style={{ fontSize: 12 }}>Sin recibo</span>}
              </td>
              <td className="muted" style={{ fontSize: 12 }}>{formatDate(d.donation_date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecurringTable({ rows }) {
  if (rows.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Sin donaciones recurrentes.</div>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Donante</th>
            <th style={{ textAlign: 'right' }}>Monto</th>
            <th>Frecuencia</th>
            <th>Próximo cobro</th>
            <th>Fondo</th>
            <th>Estado</th>
            <th>Inicio</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const donorName = r.donor?.organization_name || `${r.donor?.first_name || ''} ${r.donor?.last_name || ''}`.trim() || '—';
            const statusTone = { active: 'success', paused: 'warning', canceled: 'muted', past_due: 'error' }[r.status] || 'muted';
            const statusLabel = { active: 'Activo', paused: 'Pausado', canceled: 'Cancelado', past_due: 'Atrasado' }[r.status] || r.status;
            return (
              <tr key={r.id} className="tbl-row" style={{ animationDelay: `${Math.min(i, 18) * 0.025}s` }}>
                <td style={{ fontWeight: 600 }}>{donorName}</td>
                <td className="tnum" style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(r.amount_cents)}</td>
                <td>{FREQUENCY_LABEL[r.frequency]}</td>
                <td className="muted">{r.next_charge_date ? formatDate(r.next_charge_date) : '—'}</td>
                <td>{r.fund?.name || '—'}</td>
                <td><Badge tone={statusTone} dot>{statusLabel}</Badge></td>
                <td className="muted" style={{ fontSize: 12 }}>{formatDate(r.started_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CampaignsList({ campaigns, progress, onToast, onRefresh, canEdit }) {
  if (campaigns.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Sin campañas registradas.</div>;
  const progressById = Object.fromEntries(progress.map((p) => [p.campaign_id, p]));

  const toggleVisibility = async (c) => {
    try {
      await setCampaignVisibility(c.id, !c.is_visible_on_portal);
      onToast({ title: c.is_visible_on_portal ? 'Campaña oculta del portal' : 'Campaña visible en portal' });
      await onRefresh();
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'Error', sub: e.message });
    }
  };

  return (
    <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
      {campaigns.map((c) => {
        const p = progressById[c.id];
        const pct = p ? Math.round(p.progress_pct) : 0;
        const collected = p ? Number(p.collected_cents) : 0;
        return (
          <div key={c.id} className="campaign-card">
            <div className="campaign-head">
              <div>
                <div className="campaign-name">{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  Meta · {formatMoney(c.goal_cents)} · {c.fund?.name || 'Sin fondo'}
                </div>
              </div>
              <Badge tone={c.status === 'active' ? 'success' : c.status === 'closed' ? 'muted' : 'warning'} dot>
                {{ draft: 'Borrador', active: 'Activa', closed: 'Cerrada', archived: 'Archivada' }[c.status] || c.status}
              </Badge>
            </div>
            <div className="campaign-money">
              <span className="raised">{formatMoney(collected)}</span>
              <span className="goal">recaudados · {pct}%</span>
            </div>
            <div className="progress thick">
              <div className="progress-bar" style={{ width: `${Math.min(pct, 100)}%`, background: pct >= 90 ? 'var(--success)' : 'var(--coffee)' }} />
            </div>
            <div className="campaign-foot">
              <span>{c.end_date ? `Hasta ${formatDate(c.end_date)}` : 'Sin fecha límite'}</span>
              <button onClick={() => canEdit && toggleVisibility(c)} disabled={!canEdit} style={{ background: 'none', border: 'none', color: 'var(--coffee)', cursor: canEdit ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 600 }}>
                {c.is_visible_on_portal ? '✓ En portal' : 'Mostrar en portal'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReceiptsTable({ receipts }) {
  if (receipts.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Sin recibos generados.</div>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Recibo #</th>
            <th>Donante</th>
            <th>Tipo</th>
            <th style={{ textAlign: 'right' }}>Monto</th>
            <th>Estado</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {receipts.map((r, i) => (
            <tr key={r.id} className="tbl-row" style={{ animationDelay: `${Math.min(i, 18) * 0.025}s` }}>
              <td className="mono">{r.receipt_number}</td>
              <td style={{ fontWeight: 600 }}>{r.person_name_snapshot}</td>
              <td>{r.receipt_type === 'annual_statement' ? `Anual ${r.tax_year}` : 'Por donación'}</td>
              <td className="tnum" style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(r.total_amount_cents)}</td>
              <td><Badge tone={RECEIPT_STATUS_TONE[r.status]}>{RECEIPT_STATUS_LABEL[r.status]}</Badge></td>
              <td className="muted" style={{ fontSize: 12 }}>{formatDate(r.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DonationDrawer({ donationId, church, onClose, onToast, onRefresh, canResend }) {
  const [detail, setDetail] = useState(null);
  const [showResend, setShowResend] = useState(false);

  useEffect(() => {
    setDetail(null);
    getDonationDetail(donationId).then(setDetail).catch((e) => onToast({ tone: 'error', icon: 'alert', title: 'Error', sub: e.message }));
  }, [donationId]);

  if (!detail) {
    return (
      <div className="drawer-overlay" onClick={onClose}>
        <div className="drawer" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-header"><span>Cargando…</span><button className="icon-btn" onClick={onClose}><Icon name="x" /></button></div>
          <div className="drawer-body"><div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Cargando…</div></div>
        </div>
      </div>
    );
  }

  const d = detail.donation;
  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Donación</div>
            <h3 style={{ margin: '4px 0 6px', fontSize: 22, fontWeight: 800 }}>{formatMoney(d.amount_cents)}</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              <Badge tone={PAYMENT_STATUS_TONE[d.payment_status]} dot>{PAYMENT_STATUS_LABEL[d.payment_status]}</Badge>
              {d.receipt?.receipt_number && <Badge tone={RECEIPT_STATUS_TONE[d.receipt.status]}>Recibo {d.receipt.receipt_number}</Badge>}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>

        <div className="drawer-body">
          <Section title="Donante">
            <InfoRow icon="user" label="Nombre" value={d.donor_name_snapshot} />
            {d.donor_email_snapshot && <InfoRow icon="mail" label="Email" value={d.donor_email_snapshot} />}
          </Section>

          <Section title="Detalles del aporte">
            <InfoRow icon="dollar" label="Fondo" value={d.fund?.name || '—'} />
            {d.campaign?.name && <InfoRow icon="target" label="Campaña" value={d.campaign.name} />}
            <InfoRow icon="refresh" label="Frecuencia" value={FREQUENCY_LABEL[d.frequency]} />
            <InfoRow icon="creditCard" label="Método" value={PAYMENT_METHOD_LABEL[d.payment_method]} />
            <InfoRow icon="calendar" label="Fecha" value={formatDate(d.donation_date)} />
            {d.stripe_payment_intent_id && <InfoRow icon="link" label="Stripe ID" value={<span className="mono" style={{ fontSize: 11 }}>{shortenId(d.stripe_payment_intent_id, 16)}</span>} />}
            {d.check_number && <InfoRow icon="fileText" label="Cheque #" value={<span className="mono">{d.check_number}</span>} />}
            {d.notes && <InfoRow icon="fileText" label="Notas" value={d.notes} />}
          </Section>

          {d.receipt && (
            <Section title={`Recibo ${d.receipt.receipt_number}`}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={async () => {
                    try {
                      const result = await exportReceiptPdf({
                        donation: d, receipt: d.receipt, deliveries: detail.deliveries, church,
                      });
                      onToast({ title: 'Recibo descargado', sub: result.filename });
                    } catch (e) {
                      onToast({ tone: 'error', icon: 'alert', title: 'Error al generar PDF', sub: e.message });
                    }
                  }}
                >
                  <Icon name="download" size={12} /> PDF
                </button>
                {canResend && (
                  <button className="btn btn-sm btn-primary" onClick={() => setShowResend(true)}>
                    <Icon name="send" size={12} /> Reenviar
                  </button>
                )}
              </div>

              {detail.deliveries.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Historial de envíos ({detail.deliveries.length})</div>
                  {detail.deliveries.map((del) => (
                    <div key={del.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-soft)' }}>
                      <Icon name="mail" size={14} />
                      <div style={{ flex: 1, fontSize: 12 }}>
                        <div style={{ fontWeight: 600 }}>{RESEND_REASON_LABEL[del.reason] || del.reason}</div>
                        <div className="muted">a {del.recipient_email || '—'}</div>
                        {del.reason_notes && <div className="muted" style={{ marginTop: 2 }}>"{del.reason_notes}"</div>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{formatRelativeTime(del.sent_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}
        </div>

        {showResend && d.receipt && (
          <ResendReceiptModal
            receiptId={d.receipt.id}
            currentEmail={d.donor_email_snapshot}
            onClose={() => setShowResend(false)}
            onSuccess={async () => {
              setShowResend(false);
              onToast({ title: 'Recibo reenviado', sub: 'Historial actualizado.' });
              const det = await getDonationDetail(donationId);
              setDetail(det);
              await onRefresh();
            }}
            onError={(msg) => onToast({ tone: 'error', icon: 'alert', title: 'Error', sub: msg })}
          />
        )}
      </div>
    </div>
  );
}

function ResendReceiptModal({ receiptId, currentEmail, onClose, onSuccess, onError }) {
  const [reason, setReason] = useState('donor_lost');
  const [reasonNotes, setReasonNotes] = useState('');
  const [recipient, setRecipient] = useState(currentEmail || '');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!recipient.trim()) return onError('Debes indicar un email destinatario.');
    setSaving(true);
    try {
      await resendReceipt({ receiptId, reason, reasonNotes, recipientEmail: recipient });
      onSuccess();
    } catch (e) {
      onError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div><h3>Reenviar recibo</h3><p>El reenvío no crea una nueva donación; solo registra el envío.</p></div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Motivo del reenvío</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              {Object.entries(RESEND_REASON_LABEL).filter(([k]) => k !== 'initial').map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>Notas <span className="hint">(opcional)</span></label>
            <textarea value={reasonNotes} onChange={(e) => setReasonNotes(e.target.value)} rows={2} />
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>Enviar a</label>
            <input type="email" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
          </div>
          <div className="banner info" style={{ marginTop: 14 }}>
            <Icon name="info" /> El envío real por email se conectará al activar Resend en Fase 11+. Por ahora el registro queda en el historial.
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            <Icon name="send" size={14} /> {saving ? 'Enviando…' : 'Reenviar recibo'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RegisterDonationModal({ churchId, funds, campaigns, onClose, onSubmit, initial = null }) {
  const [donorSearch, setDonorSearch] = useState(initial?.donorEmail || '');
  const [debouncedSearch, setDebouncedSearch] = useState(initial?.donorEmail || '');
  const [donorOptions, setDonorOptions] = useState([]);
  const [donor, setDonor] = useState(null);
  const [amount, setAmount] = useState(initial?.amount || '');
  const [fundId, setFundId] = useState(initial?.fundId || funds.find((f) => f.is_default)?.id || funds[0]?.id || '');
  const [campaignId, setCampaignId] = useState(initial?.campaignId || '');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [frequency, setFrequency] = useState(initial?.frequency || 'one_time');
  const [donationDate, setDonationDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(initial?.notes || '');
  const [autoReceipt, setAutoReceipt] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(donorSearch), 300);
    return () => clearTimeout(t);
  }, [donorSearch]);

  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) { setDonorOptions([]); return; }
    listPeople(churchId, { search: debouncedSearch, limit: 8 }).then(setDonorOptions).catch(() => setDonorOptions([]));
  }, [debouncedSearch, churchId]);

  const handleSubmit = () => {
    if (!donor) return alert('Selecciona un donante.');
    const cents = dollarsToCents(amount);
    if (cents <= 0) return alert('Monto debe ser mayor a $0.');
    if (!fundId) return alert('Selecciona un fondo.');
    setSaving(true);
    onSubmit({
      personId: donor.id, amountCents: cents, fundId, campaignId: campaignId || null,
      paymentMethod, frequency, donationDate: new Date(donationDate).toISOString(),
      notes, autoGenerateReceipt: autoReceipt,
    }).finally(() => setSaving(false));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div><h3>Registrar donación</h3><p>Captura el aporte y genera el recibo automáticamente.</p></div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Donante</label>
            {donor ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg)' }}>
                <div className="avatar">{personInitials(donor)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{personDisplayName(donor)}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{donor.email || donor.phone || '—'}</div>
                </div>
                <button className="btn btn-sm btn-ghost" onClick={() => { setDonor(null); setDonorSearch(''); }}>
                  <Icon name="x" size={14} /> Cambiar
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <input placeholder="Buscar por nombre, email o teléfono…" value={donorSearch} onChange={(e) => setDonorSearch(e.target.value)} autoFocus />
                {donorOptions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-md)', zIndex: 10, maxHeight: 280, overflowY: 'auto' }}>
                    {donorOptions.map((p) => (
                      <button key={p.id} type="button" onClick={() => { setDonor(p); setDonorSearch(''); setDonorOptions([]); }} style={{ width: '100%', textAlign: 'left', padding: 10, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div className="avatar sm">{personInitials(p)}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{personDisplayName(p)}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.email || p.phone || '—'}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
            <div className="field">
              <label>Monto (USD)</label>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100.00" inputMode="decimal" />
            </div>
            <div className="field">
              <label>Fecha</label>
              <input type="date" value={donationDate} onChange={(e) => setDonationDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Fondo</label>
              <select value={fundId} onChange={(e) => setFundId(e.target.value)}>
                {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Campaña <span className="hint">(opcional)</span></label>
              <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
                <option value="">Sin campaña</option>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Método</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {Object.entries(PAYMENT_METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Frecuencia</label>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                {Object.entries(FREQUENCY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Notas <span className="hint">(opcional)</span></label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={autoReceipt} onChange={(e) => setAutoReceipt(e.target.checked)} />
                Generar recibo automáticamente
              </label>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !donor || !amount}>
            <Icon name="check" size={14} /> {saving ? 'Registrando…' : 'Registrar donación'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateCampaignModal({ funds, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: '', description: '', goal: '', fund_id: '',
    start_date: new Date().toISOString().split('T')[0], end_date: '',
    status: 'active', is_visible_on_portal: true,
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = () => {
    if (!form.name.trim()) return alert('Nombre requerido');
    const goalCents = dollarsToCents(form.goal);
    if (goalCents <= 0) return alert('Meta debe ser > 0');
    setSaving(true);
    onSubmit({
      name: form.name, description: form.description, goal_cents: goalCents,
      fund_id: form.fund_id || null, start_date: form.start_date, end_date: form.end_date || null,
      status: form.status, is_visible_on_portal: form.is_visible_on_portal,
    }).finally(() => setSaving(false));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div><h3>Crear campaña</h3><p>Define una meta de recaudación.</p></div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Nombre</label>
              <input value={form.name} onChange={set('name')} placeholder="Construcción del santuario" autoFocus />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Descripción <span className="hint">(opcional)</span></label>
              <textarea value={form.description} onChange={set('description')} rows={2} />
            </div>
            <div className="field">
              <label>Meta (USD)</label>
              <input value={form.goal} onChange={set('goal')} placeholder="50000" inputMode="decimal" />
            </div>
            <div className="field">
              <label>Fondo</label>
              <select value={form.fund_id} onChange={set('fund_id')}>
                <option value="">Sin fondo asociado</option>
                {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Fecha inicio</label>
              <input type="date" value={form.start_date} onChange={set('start_date')} />
            </div>
            <div className="field">
              <label>Fecha cierre <span className="hint">(opcional)</span></label>
              <input type="date" value={form.end_date} onChange={set('end_date')} />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Estado</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[{ v: 'draft', l: 'Borrador' }, { v: 'active', l: 'Activa' }].map((opt) => (
                  <button key={opt.v} type="button" className={`chip ${form.status === opt.v ? 'active' : ''}`} onClick={() => setForm({ ...form, status: opt.v })}>{opt.l}</button>
                ))}
              </div>
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={form.is_visible_on_portal} onChange={(e) => setForm({ ...form, is_visible_on_portal: e.target.checked })} />
                Visible en portal público
              </label>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !form.name || !form.goal}>
            <Icon name="check" size={14} /> {saving ? 'Creando…' : 'Crear campaña'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>{title}</div>
      <div>{children}</div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg-2)', color: 'var(--muted)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Icon name={icon} size={14} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 500, wordBreak: 'break-word' }}>{value}</div>
      </div>
    </div>
  );
}

// ============================================================
// IntentsList — Tab "Intenciones"
// ============================================================
function IntentsList({ intents, canConvert, onConvert, onMarkContacted, onCancel }) {
  if (!intents) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Cargando…</div>;
  }
  if (intents.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
        <Icon name="handHeart" size={28} />
        <div style={{ marginTop: 8, fontSize: 13 }}>Sin intenciones de donación todavía.</div>
        <div style={{ marginTop: 4, fontSize: 11 }}>Cuando alguien complete el formulario del portal público, aparecerá aquí.</div>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Donante</th>
            <th style={{ width: 110, textAlign: 'right' }}>Monto</th>
            <th>Destino</th>
            <th>Frecuencia</th>
            <th>Email</th>
            <th>Estado</th>
            <th style={{ width: 110 }}>Fecha</th>
            <th style={{ width: 130 }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {intents.map((intent, i) => (
            <IntentRow
              key={intent.id}
              index={i}
              intent={intent}
              canConvert={canConvert}
              onConvert={onConvert}
              onMarkContacted={onMarkContacted}
              onCancel={onCancel}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IntentRow({ intent, canConvert, onConvert, onMarkContacted, onCancel, index = 0 }) {
  const isPending = intent.status === 'pending_payment' || intent.status === 'payment_provider_pending';
  const isCompleted = intent.status === 'completed';
  const typeBadge = INTENT_TYPE_LABEL[intent.donor_type] || intent.donor_type;
  const typeIcon = intent.donor_type === 'business' ? 'users' : intent.donor_type === 'anonymous' ? 'eyeOff' : 'user';
  const destination = intent.campaign?.name || intent.fund?.name || '—';

  return (
    <tr className="tbl-row" style={{ opacity: isCompleted || intent.status === 'canceled' ? 0.55 : 1, animationDelay: `${Math.min(index, 18) * 0.025}s` }}>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="avatar sm">{intentDonorInitials(intent)}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{intentDonorDisplayName(intent)}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name={typeIcon} size={10} /> {typeBadge}
            </div>
          </div>
        </div>
      </td>
      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(intent.amount_cents)}</td>
      <td>
        <div style={{ fontSize: 13 }}>{destination}</div>
        {intent.campaign?.name && intent.fund?.name && (
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{intent.fund.name}</div>
        )}
      </td>
      <td>{INTENT_FREQUENCY_LABEL[intent.frequency] || intent.frequency}</td>
      <td style={{ fontSize: 12 }}><a href={`mailto:${intent.donor_email}`} style={{ color: 'var(--text)' }}>{intent.donor_email}</a></td>
      <td><Badge tone={INTENT_STATUS_TONE[intent.status] || 'muted'} dot>{INTENT_STATUS_LABEL[intent.status] || intent.status}</Badge></td>
      <td style={{ fontSize: 12, color: 'var(--muted)' }}>{formatRelativeTime(intent.created_at)}</td>
      <td>
        {isPending ? (
          <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
            {canConvert && (
              <button
                className="btn btn-sm btn-primary"
                title="Convertir en donación confirmada"
                onClick={() => onConvert(intent)}
              >
                <Icon name="check" size={12} /> Registrar
              </button>
            )}
            {!intent.contacted_at && (
              <button className="btn btn-sm btn-ghost" title="Marcar como contactado" onClick={() => onMarkContacted(intent)}>
                <Icon name="phone" size={12} />
              </button>
            )}
            <button className="btn btn-sm btn-ghost" title="Cancelar intención" onClick={() => onCancel(intent)}>
              <Icon name="x" size={12} />
            </button>
          </div>
        ) : isCompleted ? (
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{intentReferenceCode(intent)}</span>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>—</span>
        )}
      </td>
    </tr>
  );
}
