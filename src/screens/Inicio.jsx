// InicioScreen — Fase 10: conectado a Supabase.
// KPIs via rpc_dashboard_kpis, charts from views/mv, recent activity from
// audit_logs, active campaigns from vw_campaign_progress, dynamic pending actions.

import { useState, useEffect } from 'react';
import { Icon } from '../components/Icon.jsx';
import { Badge } from '../components/Badge.jsx';
import { LineChart, BarChart, DonutChart, formatMoney as fmt } from '../components/charts/index.jsx';
import { useChurch } from '../hooks/useChurch.js';
import {
  getDashboardKpis, getActiveCampaignsProgress, getRecentActivity,
  getPendingActions, getMonthlyTrend, getThisMonthBreakdown,
} from '../api/dashboard.js';
import { formatRelativeTime } from '../lib/formatters.js';

const MONTH_LABEL = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const formatMoney = (cents) => fmt(Number(cents) / 100);

export function InicioScreen({ onToast, onAction }) {
  const { church, churchId } = useChurch();
  const [kpis, setKpis] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [activity, setActivity] = useState([]);
  const [pending, setPending] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [breakdown, setBreakdown] = useState({ byFund: [], byFreq: [] });

  useEffect(() => {
    if (!churchId) return;
    Promise.all([
      getDashboardKpis(churchId),
      getActiveCampaignsProgress(churchId),
      getRecentActivity(churchId),
      getPendingActions(churchId),
      getMonthlyTrend(churchId, 8),
      getThisMonthBreakdown(churchId),
    ]).then(([k, c, a, p, m, b]) => {
      setKpis(k);
      setCampaigns(c);
      setActivity(a);
      setPending(p);
      setMonthly(m.map((r) => ({ label: MONTH_LABEL[r.month - 1], value: Number(r.total_cents) / 100 })));
      setBreakdown(b);
    }).catch((e) => {
      onToast({ tone: 'error', icon: 'alert', title: 'Error al cargar dashboard', sub: e.message });
    });
  }, [churchId]);

  const monthChange = kpis && Number(kpis.donations_prev_month_cents) > 0
    ? Math.round(((Number(kpis.donations_month_cents) - Number(kpis.donations_prev_month_cents)) / Number(kpis.donations_prev_month_cents)) * 100)
    : null;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-text">
          <h2 className="page-greeting">Bienvenido, {church?.public_name || 'Iglesia'}</h2>
          <p className="page-sub">Resumen general de actividad, donaciones y portal</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => onAction?.('persona')}>
            <Icon name="users" size={14} /> Agregar persona
          </button>
          <button className="btn btn-secondary" onClick={() => onAction?.('publicar')}>
            <Icon name="upload" size={14} /> Publicar cambios
          </button>
          <button className="btn btn-primary" onClick={() => onAction?.('donacion')}>
            <Icon name="plus" size={14} /> Registrar donación
          </button>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <Kpi icon="dollar" label="Donaciones del mes" value={kpis ? formatMoney(kpis.donations_month_cents) : '—'} trend={monthChange} trendLabel="vs mes anterior" />
        <Kpi icon="refresh" label="Donantes recurrentes" value={kpis ? String(kpis.active_recurring_count) : '—'} sub={kpis ? `${kpis.new_recurring_month} nuevos este mes` : null} />
        <Kpi icon="target" label="Campañas activas" value={kpis ? String(kpis.active_campaigns_count) : '—'} sub={kpis && kpis.campaigns_near_goal > 0 ? <Badge tone="warning" dot>{kpis.campaigns_near_goal} cerca de meta</Badge> : null} />
        <Kpi icon="receipt" label="Recibos enviados" value={kpis ? String(kpis.receipts_sent_month) : '—'} sub={kpis ? `${kpis.receipts_resent_month} reenviados` : null} />
      </div>

      <div className="grid grid-12" style={{ marginBottom: 16 }}>
        <div className="card col-span-8">
          <div className="card-header">
            <div>
              <h3>Tendencia mensual de donaciones</h3>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Últimos {monthly.length} meses</span>
            </div>
          </div>
          <div style={{ padding: 16 }}>
            {monthly.length > 0 ? <LineChart data={monthly} height={240} accent="#8A6A4A" /> : <Empty />}
          </div>
        </div>
        <div className="card col-span-4">
          <div className="card-header"><h3>Distribución por frecuencia</h3></div>
          <div style={{ padding: 20 }}>
            {breakdown.byFreq.length > 0 ? <DonutChart data={breakdown.byFreq.map((d) => ({ ...d, value: d.value / 100 }))} size={140} label="Este mes" /> : <Empty />}
          </div>
        </div>
      </div>

      <div className="grid grid-12" style={{ marginBottom: 16 }}>
        <div className="card col-span-7">
          <div className="card-header"><h3>Donaciones por fondo</h3><span style={{ fontSize: 11, color: 'var(--muted)' }}>Mes actual</span></div>
          <div style={{ padding: 16 }}>
            {breakdown.byFund.length > 0 ? <BarChart data={breakdown.byFund.map((d) => ({ label: d.label.slice(0, 14), value: d.value / 100 }))} height={220} accent="#1F2B38" /> : <Empty />}
          </div>
        </div>
        <div className="card col-span-5">
          <div className="card-header"><h3>Actividad reciente</h3></div>
          <div style={{ padding: '8px 12px 16px' }}>
            {activity.length === 0 ? (
              <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>Sin actividad reciente.</div>
            ) : (
              <div className="timeline">
                {activity.slice(0, 8).map((a) => <ActivityRow key={a.id} entry={a} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-12">
        <div className="card col-span-7">
          <div className="card-header"><h3>Campañas activas</h3></div>
          <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {campaigns.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', padding: 20, color: 'var(--muted)', textAlign: 'center', fontSize: 13 }}>
                Aún no hay campañas activas.
              </div>
            ) : (
              campaigns.map((c) => <CampaignCard key={c.campaign_id} campaign={c} />)
            )}
          </div>
        </div>

        <div className="card col-span-5">
          <div className="card-header">
            <h3>Acciones pendientes</h3>
            {pending.filter((p) => !p.done).length > 0 && (
              <Badge tone="warning">{pending.filter((p) => !p.done).length} por completar</Badge>
            )}
          </div>
          <div style={{ padding: '8px 12px 16px' }}>
            <div className="checklist">
              {pending.length === 0 ? (
                <div style={{ padding: 20, color: 'var(--success)', fontSize: 13, textAlign: 'center' }}>
                  <Icon name="check" size={20} /> Todo en orden.
                </div>
              ) : pending.map((p) => <CheckItem key={p.id} item={p} onNavigate={onAction} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, trend, trendLabel, sub }) {
  return (
    <div className="kpi">
      <div className="kpi-label"><Icon name={icon} /> {label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-meta">
        {trend != null && (
          <span className={`kpi-trend ${trend >= 0 ? 'up' : 'down'}`}>
            <Icon name={trend >= 0 ? 'arrowUp' : 'arrowDown'} size={10} /> {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
        {trendLabel && <span>{trendLabel}</span>}
        {sub && (typeof sub === 'string' ? <span className="muted">{sub}</span> : sub)}
      </div>
    </div>
  );
}

function Empty() {
  return <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Sin datos para mostrar.</div>;
}

function ActivityRow({ entry }) {
  const map = {
    'donation.create': { icon: 'handHeart', tone: 'coffee', label: 'Donación registrada' },
    'donation.update': { icon: 'edit', tone: 'navy', label: 'Donación actualizada' },
    'donation.delete': { icon: 'x', tone: 'error', label: 'Donación eliminada' },
    'receipt.resend': { icon: 'refresh', tone: 'navy', label: 'Recibo reenviado' },
    'receipt.create': { icon: 'receipt', tone: 'success', label: 'Recibo generado' },
    'portal.publish': { icon: 'upload', tone: 'warning', label: 'Portal publicado' },
    'church.update': { icon: 'settings', tone: 'muted', label: 'Configuración actualizada' },
    'church_users.invite': { icon: 'users', tone: 'coffee', label: 'Usuario invitado' },
    'church_users.accept': { icon: 'check', tone: 'success', label: 'Invitación aceptada' },
  };
  const info = map[entry.action] || { icon: 'info', tone: 'muted', label: entry.action };

  // Build human description
  let text = info.label;
  if (entry.action === 'donation.create' && entry.after_data) {
    const amt = entry.after_data.amount_cents ? formatMoney(entry.after_data.amount_cents) : '';
    text = `Nueva donación ${amt}`;
  } else if (entry.action === 'receipt.resend' && entry.metadata) {
    text = `Recibo reenviado · ${entry.metadata.reason || ''}`;
  }

  return (
    <div className="timeline-item">
      <div className={`timeline-dot ${info.tone}`}><Icon name={info.icon} /></div>
      <div className="timeline-body">
        <p>{text}</p>
        <span>{formatRelativeTime(entry.created_at)}</span>
      </div>
    </div>
  );
}

function CampaignCard({ campaign }) {
  const collected = Number(campaign.collected_cents);
  const goal = Number(campaign.goal_cents);
  const pct = Math.min(100, Math.round(Number(campaign.progress_pct)));
  const status = pct >= 90 ? 'nearGoal' : 'active';

  return (
    <div className="campaign-card">
      <div className="campaign-head">
        <div>
          <div className="campaign-name">{campaign.name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Meta · {formatMoney(goal)}</div>
        </div>
        {status === 'nearGoal'
          ? <Badge tone="warning" dot>Cerca de meta</Badge>
          : <Badge tone="success" dot>Activa</Badge>}
      </div>
      <div className="campaign-money">
        <span className="raised">{formatMoney(collected)}</span>
        <span className="goal">recaudados · {pct}%</span>
      </div>
      <div className="progress thick">
        <div className="progress-bar" style={{ width: `${pct}%`, background: status === 'nearGoal' ? 'var(--success)' : 'var(--coffee)' }} />
      </div>
      <div className="campaign-foot">
        <span>{campaign.end_date ? `Hasta ${new Date(campaign.end_date).toLocaleDateString('es', { day: 'numeric', month: 'short' })}` : 'Sin fecha límite'}</span>
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>{campaign.donor_count} donante{campaign.donor_count === 1 ? '' : 's'}</span>
      </div>
    </div>
  );
}

function CheckItem({ item, onNavigate }) {
  return (
    <div className={`check-item ${item.done ? 'done' : ''}`}>
      <div className={`check-box ${item.done ? 'done' : ''}`}>
        {item.done && <Icon name="check" size={11} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="label">{item.label}</div>
        <div className="meta">{item.meta}</div>
      </div>
      {!item.done && item.action && item.actionTarget && (
        <button className="btn btn-sm btn-coffee" onClick={() => onNavigate?.(item.actionTarget === 'configuracion' ? 'publicar' : item.actionTarget)}>
          {item.action}
        </button>
      )}
    </div>
  );
}
