import { useEffect, useState, useCallback } from 'react';
import { dashboard } from '../api/eb.js';
import { money } from '../format.js';
import { EbBars, EbDonut, EbHBars } from '../components/charts.jsx';

const PERIODS = [{ m: 6, label: '6 meses' }, { m: 12, label: '12 meses' }, { m: 24, label: '24 meses' }];

const SUB_STATUS = {
  active: { label: 'Activas', color: '#5E8B7E' },
  trialing: { label: 'En trial', color: '#4A6FA5' },
  past_due: { label: 'Atrasadas', color: '#C08552' },
  canceled: { label: 'Canceladas', color: '#9A8C98' },
  paused: { label: 'Pausadas', color: '#B0B6BD' },
  incomplete: { label: 'Incompletas', color: '#D08C8C' },
};
const LEAD_LABELS = {
  new: 'Nuevos', contacted: 'Contactados', demo_scheduled: 'Demo agendada', demo_completed: 'Demo hecha',
  trial_created: 'Trial creado', converted: 'Convertidos', lost: 'Perdidos', not_qualified: 'No califican',
};
const LEAD_ORDER = ['new', 'contacted', 'demo_scheduled', 'demo_completed', 'trial_created', 'converted', 'lost', 'not_qualified'];
const PLAN_LABELS = { ministerio: 'Ministerio', comunidad: 'Comunidad', enterprise: 'Enterprise' };

export function Dashboard({ onNavigate }) {
  const [months, setMonths] = useState(6);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback((m) => {
    setLoading(true); setError(null);
    dashboard(m)
      .then((d) => setData(d))
      .catch((e) => setError(e.message || 'No se pudo cargar el dashboard'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(months); }, [months, load]);

  const k = data?.kpis || {};
  const go = (screen) => () => onNavigate(screen);

  // ---- transforms ----
  const subData = (data?.sub_status || []).map((r) => ({
    label: SUB_STATUS[r.label]?.label || r.label, value: r.value, color: SUB_STATUS[r.label]?.color, raw: r.label,
  }));
  const planData = (data?.by_plan || []).map((r) => ({ label: PLAN_LABELS[r.label] || r.label, value: r.value }));
  const funnelData = [...(data?.lead_funnel || [])]
    .sort((a, b) => LEAD_ORDER.indexOf(a.label) - LEAD_ORDER.indexOf(b.label))
    .map((r) => ({ label: LEAD_LABELS[r.label] || r.label, value: r.value }));
  const ob = data?.onboarding || {};
  const obData = [
    { label: 'Completo', value: ob.completo || 0, color: '#5E8B7E' },
    { label: 'En progreso', value: ob.en_progreso || 0, color: '#C08552' },
    { label: 'Sin empezar', value: ob.sin_empezar || 0, color: '#9A8C98' },
  ];
  const health = data?.health || {};

  return (
    <div className="page">
      <div className="eb-dash-head">
        <div>
          <h2 style={{ margin: '0 0 2px' }}>Analítica del negocio</h2>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: 13 }}>Datos en vivo de EB Connect · iglesias, suscripciones, pagos y leads</p>
        </div>
        <div className="eb-period">
          {PERIODS.map((p) => (
            <button key={p.m} className={months === p.m ? 'active' : ''} onClick={() => setMonths(p.m)}>{p.label}</button>
          ))}
        </div>
      </div>

      {error && <div className="eb-auth-error" style={{ marginBottom: 16 }}>{error}</div>}
      {loading && !data && <div style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}><div className="spinner" /></div>}

      {data && (
        <div style={{ opacity: loading ? 0.6 : 1, transition: 'opacity .2s' }}>
          {/* ---- KPI cards ---- */}
          <div className="eb-kpis">
            <Kpi label="Iglesias activas" value={k.active} foot={`${k.churches_total || 0} en total`} onClick={go('iglesias')} />
            <Kpi label="En trial" value={k.trialing} foot="Suscripciones de prueba" onClick={go('iglesias')} />
            <Kpi label="MRR" value={money(k.mrr_cents)} foot="Ingreso recurrente mensual" onClick={go('facturacion')} />
            <Kpi label="Cobrado (total)" value={money(k.collected_cents)} foot="Pagos confirmados" onClick={go('facturacion')} />
            <Kpi label="Nuevas iglesias" value={k.new_churches_30d} foot="Últimos 30 días" onClick={go('iglesias')} />
            <Kpi label="Leads abiertos" value={k.leads_open} foot="Sin convertir/perder" onClick={go('leads')} />
            <Kpi label="Onboarding pendiente" value={k.onboarding_pending} foot="Iglesias sin completar" onClick={go('iglesias')} />
            <Kpi label="Tickets abiertos" value={k.tickets_open} foot="Soporte sin resolver" alert={k.tickets_open > 0} onClick={go('soporte')} />
            <Kpi label="Pagos fallidos" value={k.failed_payments} foot="Requieren atención" alert={k.failed_payments > 0} onClick={go('facturacion')} />
          </div>

          {/* ---- charts ---- */}
          <div className="eb-charts">
            <ChartCard title="Crecimiento de iglesias" sub="Nuevas iglesias por mes">
              <EbBars data={data.growth} accent="#1F2B38" />
            </ChartCard>
            <ChartCard title="Ingresos cobrados" sub="Pagos confirmados por mes">
              <EbBars data={data.revenue} accent="#8A6A4A" format={money} onSelect={() => onNavigate('facturacion')} />
            </ChartCard>
            <ChartCard title="Estados de suscripción" sub="Distribución actual de la cartera">
              <EbDonut data={subData} centerLabel="Suscrip." onSelect={() => onNavigate('facturacion')} />
            </ChartCard>
            <ChartCard title="Iglesias por plan" sub="Distribución por plan contratado">
              <EbDonut data={planData} centerLabel="Iglesias" onSelect={() => onNavigate('iglesias')} />
            </ChartCard>
            <ChartCard title="Embudo de leads" sub="Leads por etapa del pipeline">
              <EbHBars data={funnelData} color="#4A6FA5" onSelect={() => onNavigate('leads')} />
            </ChartCard>
            <ChartCard title="Onboarding por etapa" sub="Iglesias según avance del checklist">
              <EbHBars data={obData} onSelect={() => onNavigate('iglesias')} />
            </ChartCard>
          </div>

          {/* ---- health lists ---- */}
          <div className="eb-health">
            <ChartCard title="Pagos fallidos recientes" sub="Atención de cobranza">
              <HealthList items={health.failed_payments} onNavigate={onNavigate} target="facturacion"
                render={(r) => (<><span>{r.public_name}</span><span style={{ color: 'var(--error)', fontWeight: 600 }}>{money(r.amount_cents)}</span></>)} />
            </ChartCard>
            <ChartCard title="Iglesias sin portal" sub="Portal aún no publicado">
              <HealthList items={health.no_portal} onNavigate={onNavigate} target="iglesias"
                render={(r) => (<><span>{r.public_name}</span><a>Ver →</a></>)} />
            </ChartCard>
            <ChartCard title="Iglesias sin admin" sub="Invitación no aceptada">
              <HealthList items={health.no_admin} onNavigate={onNavigate} target="iglesias"
                render={(r) => (<><span>{r.public_name}</span><a>Ver →</a></>)} />
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, foot, onClick, alert }) {
  return (
    <button className={`eb-kpi ${alert ? 'alert' : ''}`} onClick={onClick}>
      <div className="eb-kpi-label">{label}</div>
      <div className="eb-kpi-value">{value ?? '—'}</div>
      <div className="eb-kpi-foot">{foot}</div>
    </button>
  );
}

function ChartCard({ title, sub, children }) {
  return (
    <div className="eb-chart-card">
      <h3>{title}</h3>
      <p className="sub">{sub}</p>
      {children}
    </div>
  );
}

function HealthList({ items, render, onNavigate, target }) {
  if (!items?.length) return <div className="eb-health-empty">Nada pendiente — todo en orden ✓</div>;
  return (
    <div onClick={() => onNavigate(target)}>
      {items.map((r, i) => (
        <div className="eb-health-row" key={r.id || i}>{render(r)}</div>
      ))}
    </div>
  );
}
