// Inicio / Dashboard screen.
// NOTA Fase 5+: datos hardcoded. La conexión a Supabase entra en Fase 10.
import { Icon } from '../components/Icon.jsx';
import { Badge } from '../components/Badge.jsx';
import { LineChart, BarChart, DonutChart, formatMoney } from '../components/charts/index.jsx';
import { useChurch } from '../hooks/useChurch.js';

export function InicioScreen({ onToast, onAction }) {
  const { church } = useChurch();
  const churchGreeting = church?.public_name || 'Iglesia';

  const monthlyData = [
    { label: 'Ene', value: 6200 },
    { label: 'Feb', value: 5800 },
    { label: 'Mar', value: 7400 },
    { label: 'Abr', value: 6900 },
    { label: 'May', value: 7100 },
    { label: 'Jun', value: 8200 },
    { label: 'Jul', value: 7600 },
    { label: 'Ago', value: 8450 },
  ];
  const fundData = [
    { label: 'General', value: 4900 },
    { label: 'Construc.', value: 1850 },
    { label: 'Misiones', value: 920 },
    { label: 'Jóvenes', value: 480 },
    { label: 'Ayuda', value: 300 },
  ];
  const typeData = [
    { label: 'Diezmo', value: 5100, color: '#1F2B38' },
    { label: 'Ofrenda', value: 1820, color: '#8A6A4A' },
    { label: 'Campaña', value: 1130, color: '#B89A7A' },
    { label: 'Misiones', value: 400, color: '#5C7CB0' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-text">
          <h2 className="page-greeting">Bienvenido, {churchGreeting}</h2>
          <p className="page-sub">Resumen general de actividad, donaciones y portal · Domingo, 25 de mayo</p>
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
        <div className="kpi">
          <div className="kpi-label"><Icon name="dollar" /> Donaciones del mes</div>
          <div className="kpi-value">$8,450</div>
          <div className="kpi-meta">
            <span className="kpi-trend up"><Icon name="arrowUp" size={10} /> +12%</span>
            vs mes anterior
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="refresh" /> Donantes recurrentes</div>
          <div className="kpi-value">48</div>
          <div className="kpi-meta">
            <span className="kpi-trend up"><Icon name="arrowUp" size={10} /> +6</span>
            nuevos este mes
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="target" /> Campañas activas</div>
          <div className="kpi-value">3</div>
          <div className="kpi-meta">
            <Badge tone="warning" dot>1 cerca de su meta</Badge>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="receipt" /> Recibos enviados</div>
          <div className="kpi-value">126</div>
          <div className="kpi-meta">
            <span className="muted">8 reenviados este mes</span>
          </div>
        </div>
      </div>

      <div className="grid grid-12" style={{ marginBottom: 16 }}>
        <div className="card col-span-8">
          <div className="card-header">
            <div>
              <h3>Tendencia mensual de donaciones</h3>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Últimos 8 meses · Total recibido</span>
            </div>
            <div className="card-header-actions">
              <div className="tabs">
                <button className="tab">3M</button>
                <button className="tab active">8M</button>
                <button className="tab">1A</button>
              </div>
            </div>
          </div>
          <div style={{ padding: 16 }}>
            <LineChart data={monthlyData} height={240} accent="#8A6A4A" selectedIndex={5} />
          </div>
        </div>
        <div className="card col-span-4">
          <div className="card-header">
            <h3>Distribución por tipo</h3>
            <button className="btn-ghost btn btn-sm"><Icon name="moreH" /></button>
          </div>
          <div style={{ padding: 20 }}>
            <DonutChart data={typeData} size={140} label="Este mes" />
          </div>
        </div>
      </div>

      <div className="grid grid-12" style={{ marginBottom: 16 }}>
        <div className="card col-span-7">
          <div className="card-header">
            <h3>Donaciones por fondo</h3>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Mes actual</span>
          </div>
          <div style={{ padding: 16 }}>
            <BarChart data={fundData} height={220} accent="#1F2B38" highlightIndex={0} />
          </div>
        </div>
        <div className="card col-span-5">
          <div className="card-header">
            <h3>Actividad reciente</h3>
            <a className="subtle-link">Ver todo</a>
          </div>
          <div style={{ padding: '8px 12px 16px' }}>
            <div className="timeline">
              <ActivityItem icon="handHeart" tone="coffee" text={<><strong>María González</strong> donó $250 al Fondo General</>} time="hace 12 minutos" />
              <ActivityItem icon="receipt" tone="success" text={<>Recibo #2024-126 enviado a <strong>Carlos Méndez</strong></>} time="hace 1 hora" />
              <ActivityItem icon="users" tone="navy" text={<>Nueva persona registrada: <strong>Familia Ramírez</strong></>} time="hace 3 horas" />
              <ActivityItem icon="upload" tone="warning" text={<>Cambios publicados en el <strong>portal público</strong></>} time="hace 5 horas" />
              <ActivityItem icon="handHeart" tone="coffee" text={<><strong>José Antonio</strong> donó $100 a Misiones 2026</>} time="ayer · 18:42" />
              <ActivityItem icon="refresh" tone="navy" text={<>Recibo reenviado a <strong>Ana Torres</strong> — Cambio de correo</>} time="ayer · 14:10" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-12">
        <div className="card col-span-7">
          <div className="card-header">
            <h3>Campañas activas</h3>
            <button className="btn btn-sm btn-secondary"><Icon name="plus" size={12} /> Crear campaña</button>
          </div>
          <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <CampaignCard name="Fondo de construcción" goal={50000} raised={32400} progress={0.648} status="active" note="6 meses restantes" />
            <CampaignCard name="Misiones 2026" goal={12000} raised={11200} progress={0.93} status="nearGoal" note="Cerca de su meta" />
            <CampaignCard name="Ayuda comunitaria" goal={5000} raised={1280} progress={0.256} status="active" note="Recién iniciada" />
            <button style={{
              border: '1.5px dashed var(--border)', background: 'var(--bg)',
              borderRadius: 12, padding: 16,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 6, color: 'var(--muted)', fontWeight: 600, fontSize: 13,
            }}>
              <Icon name="plus" />
              Nueva campaña
            </button>
          </div>
        </div>

        <div className="card col-span-5">
          <div className="card-header">
            <h3>Acciones pendientes</h3>
            <Badge tone="warning">4 por completar</Badge>
          </div>
          <div style={{ padding: '8px 12px 16px' }}>
            <div className="checklist">
              <CheckItem done={false} label="Conectar Stripe" meta="Requerido para recibir donaciones en línea" action="Conectar" />
              <CheckItem done={false} label="Completar datos fiscales" meta="EIN y representante autorizado" />
              <CheckItem done={false} label="Publicar portal" meta="3 cambios sin publicar" />
              <CheckItem done={false} label="Revisar recibos pendientes" meta="2 recibos fallidos esta semana" />
              <CheckItem done={true} label="Invitar al tesorero" meta="Completado hace 2 días" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ icon, tone = 'coffee', text, time }) {
  return (
    <div className="timeline-item">
      <div className={`timeline-dot ${tone}`}><Icon name={icon} /></div>
      <div className="timeline-body">
        <p>{text}</p>
        <span>{time}</span>
      </div>
    </div>
  );
}

function CampaignCard({ name, goal, raised, progress, status, note }) {
  return (
    <div className="campaign-card">
      <div className="campaign-head">
        <div>
          <div className="campaign-name">{name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Meta · {formatMoney(goal)}</div>
        </div>
        {status === 'nearGoal'
          ? <Badge tone="warning" dot>Cerca de meta</Badge>
          : <Badge tone="success" dot>Activa</Badge>}
      </div>
      <div className="campaign-money">
        <span className="raised">{formatMoney(raised)}</span>
        <span className="goal">recaudados · {Math.round(progress * 100)}%</span>
      </div>
      <div className="progress thick">
        <div className="progress-bar" style={{ width: `${progress * 100}%`, background: status === 'nearGoal' ? 'var(--success)' : 'var(--coffee)' }}></div>
      </div>
      <div className="campaign-foot">
        <span>{note}</span>
        <a className="subtle-link">Ver campaña →</a>
      </div>
    </div>
  );
}

function CheckItem({ done, label, meta, action }) {
  return (
    <div className={`check-item ${done ? 'done' : ''}`}>
      <div className={`check-box ${done ? 'done' : ''}`}>
        {done && <Icon name="check" size={11} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="label">{label}</div>
        <div className="meta">{meta}</div>
      </div>
      {!done && action && <button className="btn btn-sm btn-coffee">{action}</button>}
    </div>
  );
}
