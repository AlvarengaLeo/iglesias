// DonacionesScreen — NOTA Fase 5+: datos hardcoded.
// La conexion a Supabase entra en la fase del modulo correspondiente.
import { useState } from 'react';
import { Icon } from '../components/Icon.jsx';
import { Badge } from '../components/Badge.jsx';
import { formatMoney } from '../components/charts/index.jsx';

// Donaciones screen

const DONATIONS = [
  { id: 1, donor: 'María González', initials: 'MG', tone: 'navy', amount: 250, fund: 'Fondo General', freq: 'Mensual', method: 'ACH', status: 'Pagada', receipt: 'Enviado', date: '23 may 2026', stripeId: 'pi_3OqL2xH...' },
  { id: 2, donor: 'Lucía Hernández', initials: 'LH', tone: 'coffee', amount: 500, fund: 'Construcción', freq: 'Única', method: 'Tarjeta', status: 'Pagada', receipt: 'Enviado', date: '23 may 2026', stripeId: 'pi_3OqK8mF...' },
  { id: 3, donor: 'Carlos Méndez', initials: 'CM', tone: 'navy', amount: 100, fund: 'Misiones 2026', freq: 'Mensual', method: 'ACH', status: 'Pendiente', receipt: 'Pendiente', date: '22 may 2026' },
  { id: 4, donor: 'José Antonio Vargas', initials: 'JV', tone: 'navy', amount: 200, fund: 'Fondo General', freq: 'Única', method: 'Efectivo', status: 'Pagada', receipt: 'Generado', date: '21 may 2026' },
  { id: 5, donor: 'Familia Ortega', initials: 'FO', tone: 'coffee', amount: 400, fund: 'Fondo General', freq: 'Mensual', method: 'Stripe', status: 'Pagada', receipt: 'Enviado', date: '21 may 2026' },
  { id: 6, donor: 'Pedro Castillo', initials: 'PC', tone: 'navy', amount: 75, fund: 'Ayuda comunitaria', freq: 'Única', method: 'Cheque', status: 'Pagada', receipt: 'Reenviado', date: '20 may 2026' },
  { id: 7, donor: 'Ana Torres', initials: 'AT', tone: 'coffee', amount: 150, fund: 'Misiones 2026', freq: 'Única', method: 'Tarjeta', status: 'Fallida', receipt: 'Fallido', date: '19 may 2026' },
  { id: 8, donor: 'Sofía Mendoza', initials: 'SM', tone: 'navy', amount: 50, fund: 'Fondo General', freq: 'Única', method: 'Tarjeta', status: 'Pagada', receipt: 'Enviado', date: '18 may 2026' },
  { id: 9, donor: 'Roberto Salinas', initials: 'RS', tone: 'navy', amount: 1200, fund: 'Construcción', freq: 'Anual', method: 'ACH', status: 'Pagada', receipt: 'Enviado', date: '15 may 2026' },
  { id: 10, donor: 'Lucía Hernández', initials: 'LH', tone: 'coffee', amount: 200, fund: 'Fondo General', freq: 'Mensual', method: 'Tarjeta', status: 'Reembolsada', receipt: 'Generado', date: '12 may 2026' },
];

export function DonacionesScreen({ onToast }) {
  const [tab, setTab] = useState('Todas');
  const [selected, setSelected] = useState(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showRegisterDonation, setShowRegisterDonation] = useState(false);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-text">
          <h2 className="page-greeting">Donaciones</h2>
          <p className="page-sub">Gestiona aportes, fondos, campañas y recibos · Mayo 2026</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary"><Icon name="receipt" size={14} /> Ver recibos</button>
          <button className="btn btn-secondary" onClick={() => setShowCampaignModal(true)}><Icon name="target" size={14} /> Crear campaña</button>
          <button className="btn btn-primary" onClick={() => setShowRegisterDonation(true)}><Icon name="plus" size={14} /> Registrar donación</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <div className="kpi">
          <div className="kpi-label"><Icon name="dollar" /> Total recibido este mes</div>
          <div className="kpi-value">$8,450</div>
          <div className="kpi-meta"><span className="kpi-trend up"><Icon name="arrowUp" size={10} /> +12%</span> vs mes anterior</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="refresh" /> Recurrentes activas</div>
          <div className="kpi-value">48</div>
          <div className="kpi-meta">$3,840 mensuales programados</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="clock" /> Donaciones pendientes</div>
          <div className="kpi-value">3</div>
          <div className="kpi-meta"><Badge tone="warning" dot>$350 en proceso</Badge></div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="receipt" /> Recibos generados</div>
          <div className="kpi-value">126</div>
          <div className="kpi-meta"><span className="muted">120 enviados · 6 pendientes</span></div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <span className="filter-label">Filtros</span>
        <button className="pill-btn"><Icon name="calendar" /> Mayo 2026 <Icon name="chevronDown" /></button>
        <button className="pill-btn"><Icon name="folder" /> Fondo: Todos <Icon name="chevronDown" /></button>
        <button className="pill-btn"><Icon name="target" /> Campaña: Todas <Icon name="chevronDown" /></button>
        <button className="pill-btn"><Icon name="creditCard" /> Método: Todos <Icon name="chevronDown" /></button>
        <button className="pill-btn"><Icon name="check" /> Estado: Todos <Icon name="chevronDown" /></button>
        <div style={{ flex: 1 }}></div>
        <div className="input-wrap" style={{ width: 240 }}>
          <Icon name="search" />
          <input className="input" placeholder="Buscar donación..." />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="tabs">
          {['Todas', 'Recurrentes', 'Campañas', 'Recibos'].map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t}<span className="tab-count">{t === 'Todas' ? 126 : t === 'Recurrentes' ? 48 : t === 'Campañas' ? 3 : 126}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-sm btn-secondary"><Icon name="download" size={12} /> Exportar</button>
      </div>

      {tab === 'Todas' || tab === 'Recurrentes' ? (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}><input type="checkbox" /></th>
                  <th>Donante</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                  <th>Fondo / Campaña</th>
                  <th>Frecuencia</th>
                  <th>Método</th>
                  <th>Estado</th>
                  <th>Recibo</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {DONATIONS.filter(d => tab === 'Todas' || d.freq !== 'Única').map(d => (
                  <tr key={d.id} className={selected?.id === d.id ? 'selected' : ''} onClick={() => setSelected(d)}>
                    <td onClick={e => e.stopPropagation()}><input type="checkbox" /></td>
                    <td>
                      <div className="person-cell">
                        <div className={`avatar ${d.tone === 'coffee' ? 'coffee' : 'navy'}`}>{d.initials}</div>
                        <div style={{ fontWeight: 600 }}>{d.donor}</div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontFeatureSettings: '"tnum"' }}>{formatMoney(d.amount)}</td>
                    <td>{d.fund}</td>
                    <td><FreqBadge freq={d.freq} /></td>
                    <td><MethodBadge method={d.method} /></td>
                    <td><StatusBadge status={d.status} /></td>
                    <td><ReceiptBadge receipt={d.receipt} /></td>
                    <td className="muted" style={{ fontSize: 12 }}>{d.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid var(--border-soft)', fontSize: 12, color: 'var(--muted)' }}>
            <span>Mostrando 1–10 de 126 donaciones · Total filtrado: <strong style={{ color: 'var(--text)' }}>$3,125</strong></span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm btn-secondary"><Icon name="chevronLeft" size={12} /></button>
              <button className="btn btn-sm btn-secondary">1</button>
              <button className="btn btn-sm btn-primary">2</button>
              <button className="btn btn-sm btn-secondary">3</button>
              <button className="btn btn-sm btn-secondary"><Icon name="chevronRight" size={12} /></button>
            </div>
          </div>
        </div>
      ) : tab === 'Campañas' ? (
        <CampaignsView onCreate={() => setShowCampaignModal(true)} />
      ) : (
        <ReceiptsView onToast={onToast} />
      )}

      {/* Donation drawer */}
      {selected && <DonationDrawer donation={selected} onClose={() => setSelected(null)} onToast={onToast} />}

      {/* Create campaign modal */}
      {showCampaignModal && <CampaignModal onClose={() => setShowCampaignModal(false)} onCreate={() => { setShowCampaignModal(false); onToast({ title: 'Campaña creada', sub: 'Ahora puedes activarla o publicarla en el portal.' }); }} />}

      {/* Register donation modal */}
      {showRegisterDonation && <RegisterDonationModal onClose={() => setShowRegisterDonation(false)} onCreate={() => { setShowRegisterDonation(false); onToast({ title: 'Donación registrada correctamente', sub: 'Se generó automáticamente el recibo.' }); }} />}
    </div>
  );
};

const FreqBadge = ({ freq }) => {
  const map = { Única: 'muted', Mensual: 'navy', Anual: 'coffee' };
  return <Badge tone={map[freq]}>{freq}</Badge>;
};
const MethodBadge = ({ method }) => {
  const map = { Tarjeta: 'creditCard', ACH: 'wallet', Efectivo: 'dollar', Cheque: 'fileText', Stripe: 'creditCard' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text)' }}>
      <Icon name={map[method] || 'wallet'} size={13} />
      {method}
    </span>
  );
};
const StatusBadge = ({ status }) => {
  const map = {
    Pagada: 'success', Pendiente: 'warning', Fallida: 'error', Reembolsada: 'muted',
  };
  return <Badge tone={map[status]} dot>{status}</Badge>;
};
const ReceiptBadge = ({ receipt }) => {
  const map = {
    Enviado: 'success', Generado: 'navy', Reenviado: 'coffee', Pendiente: 'warning', Fallido: 'error',
  };
  return <Badge tone={map[receipt]}>{receipt}</Badge>;
};

const DonationDrawer = ({ donation: d, onClose, onToast }) => (
  <div className="drawer-overlay" onClick={onClose}>
    <div className="drawer" onClick={e => e.stopPropagation()}>
      <div className="drawer-header">
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Donación #{(2024000 + d.id).toLocaleString()}</div>
          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{formatMoney(d.amount)}</h3>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <StatusBadge status={d.status} />
            <ReceiptBadge receipt={d.receipt} />
          </div>
        </div>
        <button className="icon-btn" onClick={onClose}><Icon name="x" /></button>
      </div>
      <div className="drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <DSection title="Donante">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, background: 'var(--bg)', borderRadius: 10 }}>
            <div className={`avatar ${d.tone === 'coffee' ? 'coffee' : 'navy'}`}>{d.initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{d.donor}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.donor.toLowerCase().replace(/ /g, '.')}@gmail.com</div>
            </div>
            <button className="btn btn-sm btn-ghost">Ver perfil <Icon name="arrowRight" size={12} /></button>
          </div>
        </DSection>

        <DSection title="Detalles del aporte">
          <Row label="Fondo / Campaña" value={d.fund} />
          <Row label="Frecuencia" value={<FreqBadge freq={d.freq} />} />
          <Row label="Método de pago" value={<MethodBadge method={d.method} />} />
          <Row label="Estado del pago" value={<StatusBadge status={d.status} />} />
          <Row label="Fecha" value={d.date} />
          {d.stripeId && <Row label="ID de Stripe" value={<span className="mono">{d.stripeId}</span>} />}
        </DSection>

        <DSection title="Recibo de contribución">
          <div style={{ padding: 14, background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--coffee-bg)', color: 'var(--coffee)', display: 'grid', placeItems: 'center' }}>
                  <Icon name="receipt" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Recibo #2024-{String(d.id).padStart(3, '0')}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.receipt} a {d.donor.toLowerCase().replace(/ /g, '.')}@gmail.com</div>
                </div>
              </div>
              <ReceiptBadge receipt={d.receipt} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="btn btn-sm btn-secondary"><Icon name="eye" size={12} /> Ver recibo</button>
              <button className="btn btn-sm btn-secondary"><Icon name="download" size={12} /> PDF</button>
              <button className="btn btn-sm btn-coffee" onClick={() => onToast({ title: 'Recibo reenviado', sub: `Enviado a ${d.donor.toLowerCase().replace(/ /g, '.')}@gmail.com` })}>
                <Icon name="send" size={12} /> Reenviar
              </button>
            </div>
          </div>
        </DSection>

        <DSection title="Historial de envíos del recibo">
          <div style={{ background: 'var(--bg)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-soft)' }}>
            <table className="table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Correo</th>
                  <th>Motivo</th>
                  <th>Por</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>23 may</td>
                  <td>{d.donor.toLowerCase().replace(/ /g, '.')}@gmail.com</td>
                  <td>Envío original</td>
                  <td>Sistema</td>
                </tr>
                <tr>
                  <td>24 may</td>
                  <td>{d.donor.toLowerCase().replace(/ /g, '.')}@gmail.com</td>
                  <td>Donante perdió el recibo</td>
                  <td>Pastor Miguel</td>
                </tr>
                <tr>
                  <td>26 may</td>
                  <td>contador@iglesiacr.org</td>
                  <td>Solicitud del contador</td>
                  <td>Tesorera Ana</td>
                </tr>
              </tbody>
            </table>
          </div>
        </DSection>
      </div>
      <div className="drawer-foot">
        <button className="btn btn-secondary"><Icon name="refresh" size={14} /> Ver historial</button>
        <button className="btn btn-primary"><Icon name="edit" size={14} /> Editar</button>
      </div>
    </div>
  </div>
);

const Row = ({ label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-soft)' }}>
    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 500 }}>{value}</span>
  </div>
);

const DSection = ({ title, children }) => (
  <div>
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>{title}</div>
    {children}
  </div>
);

const CampaignsView = ({ onCreate }) => {
  const campaigns = [
    { name: 'Fondo de construcción', desc: 'Para la ampliación del santuario y nuevo salón infantil.', goal: 50000, raised: 32400, status: 'Activa', end: '31 dic 2026' },
    { name: 'Misiones 2026', desc: 'Apoyo a misioneros en Centroamérica y proyecto Honduras.', goal: 12000, raised: 11200, status: 'Cerca de meta', end: '30 jul 2026' },
    { name: 'Ayuda comunitaria', desc: 'Banco de alimentos y útiles escolares para familias.', goal: 5000, raised: 1280, status: 'Activa', end: '15 ago 2026' },
  ];
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>Campañas activas</h3>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>3 campañas en curso · $44,880 recaudados en total</span>
        </div>
        <button className="btn btn-primary" onClick={onCreate}><Icon name="plus" size={14} /> Crear campaña</button>
      </div>
      <div className="grid grid-3">
        {campaigns.map((c, i) => (
          <div key={i} className="campaign-card" style={{ padding: 20 }}>
            <div className="campaign-head">
              <div>
                <div className="campaign-name" style={{ fontSize: 15 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>{c.desc}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, fontFeatureSettings: '"tnum"' }}>{formatMoney(c.raised)}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>de {formatMoney(c.goal)}</div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--coffee)' }}>{Math.round(c.raised/c.goal*100)}%</div>
            </div>
            <div className="progress thick">
              <div className="progress-bar" style={{ width: `${c.raised/c.goal*100}%`, background: c.status === 'Cerca de meta' ? 'var(--success)' : 'var(--coffee)' }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <Badge tone={c.status === 'Cerca de meta' ? 'warning' : 'success'} dot>{c.status}</Badge>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Cierra · {c.end}</span>
            </div>
            <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>Ver detalles</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const ReceiptsView = ({ onToast }) => (
  <div className="card">
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Recibo</th>
            <th>Donante</th>
            <th style={{ textAlign: 'right' }}>Monto</th>
            <th>Estado</th>
            <th>Fecha de envío</th>
            <th>Reenvíos</th>
            <th style={{ width: 160, textAlign: 'right' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {DONATIONS.map((d, i) => (
            <tr key={d.id}>
              <td><span className="mono">#2024-{String(d.id).padStart(3,'0')}</span></td>
              <td>
                <div className="person-cell">
                  <div className={`avatar sm ${d.tone === 'coffee' ? 'coffee' : 'navy'}`}>{d.initials}</div>
                  <span style={{ fontWeight: 600 }}>{d.donor}</span>
                </div>
              </td>
              <td style={{ textAlign: 'right', fontWeight: 700, fontFeatureSettings: '"tnum"' }}>{formatMoney(d.amount)}</td>
              <td><ReceiptBadge receipt={d.receipt} /></td>
              <td className="muted" style={{ fontSize: 12 }}>{d.date}</td>
              <td className="muted" style={{ fontSize: 12 }}>{i % 4 === 0 ? '2 veces' : i % 5 === 0 ? '1 vez' : '—'}</td>
              <td>
                <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn btn-sm btn-ghost"><Icon name="eye" size={14} /></button>
                  <button className="btn btn-sm btn-ghost"><Icon name="download" size={14} /></button>
                  <button className="btn btn-sm btn-ghost" onClick={() => onToast({ title: 'Recibo reenviado', sub: `Enviado a ${d.donor}` })}><Icon name="send" size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const CampaignModal = ({ onClose, onCreate }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <div>
          <h3>Crear campaña</h3>
          <p>Define una meta de recaudación temporal con su propio recibo y página pública.</p>
        </div>
        <button className="icon-btn" onClick={onClose}><Icon name="x" /></button>
      </div>
      <div className="modal-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Nombre de campaña</label>
            <input placeholder="Ej. Fondo de construcción 2026" />
          </div>
          <div className="field">
            <label>Meta</label>
            <input placeholder="$50,000" />
          </div>
          <div className="field">
            <label>Fondo asociado</label>
            <select><option>Construcción</option><option>Misiones</option><option>General</option></select>
          </div>
          <div className="field">
            <label>Fecha de inicio</label>
            <input type="date" defaultValue="2026-06-01" />
          </div>
          <div className="field">
            <label>Fecha de cierre</label>
            <input type="date" defaultValue="2026-12-31" />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Descripción breve <span className="hint">(aparecerá en el portal)</span></label>
            <textarea placeholder="Cuéntale a tu congregación el propósito de esta campaña..."></textarea>
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Estado inicial</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="chip">Borrador</button>
              <button className="chip active">Activa</button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={onCreate}><Icon name="check" size={14} /> Crear campaña</button>
      </div>
    </div>
  </div>
);

const RegisterDonationModal = ({ onClose, onCreate }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <div>
          <h3>Registrar donación</h3>
          <p>Para aportes recibidos en efectivo, cheque o por transferencia.</p>
        </div>
        <button className="icon-btn" onClick={onClose}><Icon name="x" /></button>
      </div>
      <div className="modal-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Donante</label>
            <div className="input-wrap"><Icon name="search" /><input className="input" placeholder="Buscar persona o agregar nueva..." defaultValue="María González" /></div>
          </div>
          <div className="field">
            <label>Monto</label>
            <input placeholder="$250.00" />
          </div>
          <div className="field">
            <label>Fecha</label>
            <input type="date" defaultValue="2026-05-25" />
          </div>
          <div className="field">
            <label>Fondo</label>
            <select><option>Fondo General</option><option>Construcción</option><option>Misiones 2026</option></select>
          </div>
          <div className="field">
            <label>Método</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Efectivo', 'Cheque', 'ACH', 'Tarjeta'].map((m, i) => (
                <button key={m} className={`chip ${i === 0 ? 'active' : ''}`}>{m}</button>
              ))}
            </div>
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Nota interna <span className="hint">(opcional)</span></label>
            <textarea placeholder="Detalle adicional sobre este aporte..."></textarea>
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" defaultChecked /> Generar y enviar recibo automáticamente
            </label>
          </div>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={onCreate}><Icon name="check" size={14} /> Registrar donación</button>
      </div>
    </div>
  </div>
);
