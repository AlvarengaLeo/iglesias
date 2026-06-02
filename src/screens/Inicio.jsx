// InicioScreen — Fase 10: conectado a Supabase.
// KPIs via rpc_dashboard_kpis, charts from views/mv, recent activity from
// audit_logs, active campaigns from vw_campaign_progress, dynamic pending actions.

import { useState, useEffect } from 'react';
import { Icon } from '../components/Icon.jsx';
import { Badge } from '../components/Badge.jsx';
import { LineChart, BarChart, DonutChart, StackedBars, formatMoney as fmt } from '../components/charts/index.jsx';
import { Kpi, ChartSkeleton } from '../components/Kpi.jsx';
import { useChurch } from '../hooks/useChurch.js';
import {
  getDashboardKpis, getActiveCampaignsProgress, getDonorAcquisition,
  getIncomeComposition, getMonthlyTrend, getThisMonthBreakdown,
} from '../api/dashboard.js';

const MONTH_LABEL = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const formatMoney = (cents) => fmt(Number(cents) / 100);

export function InicioScreen({ onToast, onAction }) {
  const { church, churchId } = useChurch();
  const [kpis, setKpis] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [donorAcq, setDonorAcq] = useState(null);
  const [income, setIncome] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [breakdown, setBreakdown] = useState({ byFund: [], byFreq: [] });

  useEffect(() => {
    if (!churchId) return;
    Promise.all([
      getDashboardKpis(churchId),
      getActiveCampaignsProgress(churchId),
      getDonorAcquisition(churchId, 6),
      getIncomeComposition(churchId, 6),
      getMonthlyTrend(churchId, 8),
      getThisMonthBreakdown(churchId),
    ]).then(([k, c, d, inc, m, b]) => {
      setKpis(k);
      setCampaigns(c);
      setDonorAcq(d);
      setIncome(inc);
      setMonthly(m.map((r) => ({ label: MONTH_LABEL[r.month - 1], value: Number(r.total_cents) / 100 })));
      setBreakdown(b);
    }).catch((e) => {
      onToast({ tone: 'error', icon: 'alert', title: 'Error al cargar dashboard', sub: e.message });
    });
  }, [churchId]);

  const loading = kpis === null;
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

      <div className="grid grid-4 dash-reveal" style={{ marginBottom: 16 }}>
        <Kpi icon="dollar" label="Donaciones del mes" loading={loading} value={kpis ? Number(kpis.donations_month_cents) : null} format={formatMoney} trend={monthChange} trendLabel="vs mes anterior" />
        <Kpi icon="refresh" label="Donantes recurrentes" loading={loading} value={kpis ? Number(kpis.active_recurring_count) : null} sub={kpis ? `${kpis.new_recurring_month} nuevos este mes` : null} />
        <Kpi icon="target" label="Campañas activas" loading={loading} value={kpis ? Number(kpis.active_campaigns_count) : null} sub={kpis && kpis.campaigns_near_goal > 0 ? <Badge tone="warning" dot>{kpis.campaigns_near_goal} cerca de meta</Badge> : null} />
        <Kpi icon="receipt" label="Recibos enviados" loading={loading} value={kpis ? Number(kpis.receipts_sent_month) : null} sub={kpis ? `${kpis.receipts_resent_month} reenviados` : null} />
      </div>

      <div className="grid grid-12 dash-reveal" style={{ marginBottom: 16 }}>
        <div className="card col-span-8">
          <div className="card-header">
            <div>
              <h3>Tendencia mensual de donaciones</h3>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Últimos {monthly.length} meses</span>
            </div>
          </div>
          <div style={{ padding: 16 }}>
            {loading ? <ChartSkeleton height={240} /> : monthly.length > 0 ? <LineChart data={monthly} height={240} accent="#2348C4" /> : <Empty />}
          </div>
        </div>
        <div className="card col-span-4">
          <div className="card-header"><h3>Distribución por frecuencia</h3></div>
          <div style={{ padding: 20 }}>
            {loading ? <ChartSkeleton height={180} /> : breakdown.byFreq.length > 0 ? <DonutChart data={breakdown.byFreq.map((d) => ({ ...d, value: d.value / 100 }))} size={140} label="Este mes" /> : <Empty />}
          </div>
        </div>
      </div>

      <div className="grid grid-12 dash-reveal" style={{ marginBottom: 16 }}>
        <div className="card col-span-7">
          <div className="card-header"><h3>Donaciones por fondo</h3><span style={{ fontSize: 11, color: 'var(--muted)' }}>Mes actual</span></div>
          <div style={{ padding: 16 }}>
            {loading ? <ChartSkeleton height={220} /> : breakdown.byFund.length > 0 ? <BarChart data={breakdown.byFund.map((d) => ({ label: d.label.slice(0, 14), value: d.value / 100 }))} height={220} accent="#16307F" /> : <Empty />}
          </div>
        </div>
        <div className="card col-span-5">
          <div className="card-header">
            <div>
              <h3>Salud de donantes</h3>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Nuevos vs. recurrentes · últimos 6 meses</span>
            </div>
            {donorAcq?.retentionPct != null && <Badge tone="success" dot>{donorAcq.retentionPct}% retención</Badge>}
          </div>
          <div style={{ padding: 16 }}>
            {loading ? <ChartSkeleton height={216} /> : donorAcq?.hasData ? (
              <StackedBars data={donorAcq.data} height={216}
                series={[{ key: 'existentes', label: 'Recurrentes', color: '#16307F' }, { key: 'nuevos', label: 'Nuevos', color: '#6F8AFF' }]} />
            ) : <Empty />}
          </div>
        </div>
      </div>

      <div className="grid grid-12 dash-reveal">
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
            <div>
              <h3>Composición del ingreso</h3>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Recurrente vs. puntual · últimos 6 meses</span>
            </div>
            {income?.recurringSharePct != null && <Badge tone="info" dot>{income.recurringSharePct}% recurrente</Badge>}
          </div>
          <div style={{ padding: 16 }}>
            {loading ? <ChartSkeleton height={216} /> : income?.hasData ? (
              <StackedBars data={income.data} height={216} format={fmt}
                series={[{ key: 'recurrente', label: 'Recurrente', color: '#16307F' }, { key: 'puntual', label: 'Puntual', color: '#9CC0EA' }]} />
            ) : <Empty />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Empty() {
  return <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Sin datos para mostrar.</div>;
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

