// ReportesScreen — NOTA Fase 5+: datos hardcoded.
// La conexion a Supabase entra en la fase del modulo correspondiente.
import { useState } from 'react';
import { Icon } from '../components/Icon.jsx';
import { Badge } from '../components/Badge.jsx';
import { LineChart, BarChart, DonutChart, HBarChart, formatMoney } from '../components/charts/index.jsx';

// Reportes screen

export function ReportesScreen({ onToast }) {
  const [tab, setTab] = useState('Resumen');

  const monthlyData = [
    { label: 'Sep', value: 5400 }, { label: 'Oct', value: 6100 },
    { label: 'Nov', value: 5900 }, { label: 'Dic', value: 7800 },
    { label: 'Ene', value: 6200 }, { label: 'Feb', value: 5800 },
    { label: 'Mar', value: 7400 }, { label: 'Abr', value: 6900 },
    { label: 'May', value: 8450 },
  ];
  const fundData = [
    { label: 'General', value: 28900 }, { label: 'Construc.', value: 12400 },
    { label: 'Misiones', value: 6800 }, { label: 'Jóvenes', value: 3200 },
    { label: 'Ayuda', value: 1900 },
  ];
  const methodData = [
    { label: 'Tarjeta', value: 22400, color: '#1F2B38' },
    { label: 'ACH', value: 18900, color: '#8A6A4A' },
    { label: 'Efectivo', value: 6800, color: '#B89A7A' },
    { label: 'Cheque', value: 4100, color: '#5C7CB0' },
  ];
  const topCampaigns = [
    { label: 'Fondo de construcción', value: 32400 },
    { label: 'Misiones 2026', value: 11200 },
    { label: 'Ayuda comunitaria', value: 1280 },
    { label: 'Retiro de matrimonios', value: 980 },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-text">
          <h2 className="page-greeting">Reportes</h2>
          <p className="page-sub">Consulta el comportamiento de las donaciones y campañas · Año fiscal 2026</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary"><Icon name="mail" size={14} /> Enviar por email</button>
          <button className="btn btn-secondary" onClick={() => onToast({ title: 'Reporte descargado', sub: 'estado-anual-2026.pdf' })}><Icon name="download" size={14} /> Descargar PDF</button>
          <button className="btn btn-primary" onClick={() => onToast({ title: 'Exportado a Excel', sub: 'reporte-donaciones-mayo.xlsx' })}><Icon name="fileText" size={14} /> Exportar Excel</button>
        </div>
      </div>

      {/* Controls */}
      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <span className="filter-label">Período</span>
        <button className="pill-btn"><Icon name="calendar" /> 1 ene 2026 — 31 may 2026 <Icon name="chevronDown" /></button>
        <span className="filter-label" style={{ marginLeft: 4 }}>Fondo</span>
        <button className="pill-btn"><Icon name="folder" /> Todos los fondos <Icon name="chevronDown" /></button>
        <span className="filter-label" style={{ marginLeft: 4 }}>Campaña</span>
        <button className="pill-btn"><Icon name="target" /> Todas las campañas <Icon name="chevronDown" /></button>
        <div style={{ flex: 1 }}></div>
        <button className="btn btn-sm btn-ghost"><Icon name="refresh" size={12} /> Actualizar</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <div className="kpi">
          <div className="kpi-label"><Icon name="dollar" /> Total recibido</div>
          <div className="kpi-value">$53,200</div>
          <div className="kpi-meta"><span className="kpi-trend up"><Icon name="arrowUp" size={10} /> +18%</span> vs período anterior</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="wallet" /> Total neto</div>
          <div className="kpi-value">$51,840</div>
          <div className="kpi-meta">Después de comisiones · 97.4%</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="users" /> Donantes únicos</div>
          <div className="kpi-value">94</div>
          <div className="kpi-meta">12 nuevos este período</div>
        </div>
        <div className="kpi" style={{ background: 'linear-gradient(135deg, #1F2B38, #2B3A4A)', color: '#fff', borderColor: 'transparent' }}>
          <div className="kpi-label" style={{ color: 'rgba(255,255,255,0.7)' }}><Icon name="star" /> Mayor recaudación</div>
          <div className="kpi-value" style={{ color: '#fff', fontSize: 18 }}>Fondo de construcción</div>
          <div className="kpi-meta" style={{ color: 'rgba(255,255,255,0.7)' }}>$32,400 · 61% del total de campañas</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-underline" style={{ marginBottom: 16 }}>
        {['Resumen', 'Fondos', 'Campañas', 'Donantes', 'Recibos'].map(t => (
          <button key={t} className={`tab-u ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* Resumen content */}
      <div className="grid grid-12">
        <div className="card col-span-8">
          <div className="card-header">
            <div>
              <h3>Donaciones por mes</h3>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Tendencia · Sep 2025 — May 2026</span>
            </div>
            <Badge tone="success" icon="arrowUp">+18%</Badge>
          </div>
          <div style={{ padding: 16 }}>
            <LineChart data={monthlyData} height={260} accent="#8A6A4A" selectedIndex={8} />
          </div>
        </div>

        <div className="col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{
            background: 'linear-gradient(135deg, #F4ECE2, #FFFFFF)',
            border: '1px solid #E8DBC8',
          }}>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--coffee)', color: '#fff', display: 'grid', placeItems: 'center' }}>
                  <Icon name="sparkle" size={16} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--coffee)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Insight pastoral</div>
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text)', fontWeight: 500 }}>
                Este mes las donaciones crecieron <strong style={{ color: 'var(--coffee)' }}>+12%</strong> en comparación con el mes anterior, impulsadas por los nuevos donantes recurrentes.
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--info-bg)', color: 'var(--info)', display: 'grid', placeItems: 'center' }}>
                  <Icon name="folder" size={16} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Distribución</div>
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text)', fontWeight: 500 }}>
                El <strong>Fondo General</strong> representa el <strong style={{ color: 'var(--info)' }}>58%</strong> de las donaciones del período. Construcción se acerca rápido con 23%.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-12" style={{ marginTop: 16 }}>
        <div className="card col-span-5">
          <div className="card-header"><h3>Donaciones por fondo</h3><span style={{ fontSize: 11, color: 'var(--muted)' }}>Total por categoría</span></div>
          <div style={{ padding: 16 }}>
            <BarChart data={fundData} height={220} accent="#1F2B38" highlightIndex={0} />
          </div>
        </div>
        <div className="card col-span-4">
          <div className="card-header"><h3>Métodos de pago</h3></div>
          <div style={{ padding: 20 }}>
            <DonutChart data={methodData} size={140} label="Recibido" />
          </div>
        </div>
        <div className="card col-span-3">
          <div className="card-header"><h3>Top campañas</h3></div>
          <div style={{ padding: 20 }}>
            <HBarChart data={topCampaigns} color="#8A6A4A" />
          </div>
        </div>
      </div>

      {/* Reports table */}
      <div className="section-head" style={{ marginTop: 32 }}>
        <h2>Reportes disponibles</h2>
        <span className="desc">Genera, descarga o envía por email</span>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Reporte</th>
                <th>Descripción</th>
                <th>Última generación</th>
                <th style={{ width: 260, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Reporte mensual', desc: 'Resumen de donaciones y actividad del mes', last: 'Hoy · 09:14', icon: 'calendar' },
                { name: 'Donaciones por fondo', desc: 'Desglose por cada fondo del período seleccionado', last: 'Hace 2 días', icon: 'folder' },
                { name: 'Estado anual de contribuciones', desc: 'Recibo fiscal consolidado por donante · IRS', last: '31 ene 2026', icon: 'receipt' },
                { name: 'Recibos enviados', desc: 'Historial de envíos y reenvíos de recibos', last: 'Hoy · 09:14', icon: 'mail' },
                { name: 'Donantes recurrentes', desc: 'Lista de donantes con aportes mensuales/anuales activos', last: 'Hace 1 semana', icon: 'refresh' },
                { name: 'Donaciones grandes', desc: 'Aportes mayores a $1,000 para seguimiento pastoral', last: 'Hace 3 días', icon: 'star' },
              ].map((r, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--coffee-bg)', color: 'var(--coffee)', display: 'grid', placeItems: 'center' }}>
                        <Icon name={r.icon} size={15} />
                      </div>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                    </div>
                  </td>
                  <td className="muted" style={{ fontSize: 12 }}>{r.desc}</td>
                  <td className="muted" style={{ fontSize: 12 }}>{r.last}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm btn-secondary"><Icon name="eye" size={12} /> Ver</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => onToast({ title: 'Reporte descargado', sub: r.name + '.pdf' })}><Icon name="download" size={12} /> Descargar</button>
                      <button className="btn btn-sm btn-coffee" onClick={() => onToast({ title: 'Reporte enviado', sub: 'Enviado al equipo de liderazgo' })}><Icon name="send" size={12} /> Enviar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
