// ReportesScreen — Fase 9: conectado a Supabase.
// KPIs reales, 4 charts reales, filtros recalculan, export Excel funcional via xlsx.
// PDF stub, email stub. Annual statement real via insert contribution_receipts.

import { useState, useEffect, useMemo } from 'react';
import { Icon } from '../components/Icon.jsx';
import { Badge } from '../components/Badge.jsx';
import { LineChart, BarChart, DonutChart, HBarChart, formatMoney as fmt } from '../components/charts/index.jsx';
import { useChurch } from '../hooks/useChurch.js';
import { useAuth } from '../hooks/useAuth.js';
import { useRole } from '../hooks/useRole.js';
import {
  getReportKpis, getMonthlyDonations, getDonationsByFund, getDonationsByMethod, getTopCampaigns,
} from '../api/reports.js';
import { listFunds } from '../api/funds.js';
import { listCampaigns } from '../api/campaigns.js';
import { exportDonationsToExcel } from '../lib/exportExcel.js';
import { generateAnnualStatement } from '../api/receipts.js';
import { listPeople, personDisplayName } from '../api/people.js';
import { formatDate } from '../lib/formatters.js';

const formatMoney = (cents) => fmt(Number(cents) / 100);
const MONTH_LABEL = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function ReportesScreen({ onToast }) {
  const { churchId } = useChurch();
  const { user } = useAuth();
  const { can } = useRole();

  const [tab, setTab] = useState('Resumen');
  const [filters, setFilters] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    return {
      dateStart: start.toISOString().split('T')[0],
      dateEnd: now.toISOString().split('T')[0],
      fundId: '',
      campaignId: '',
    };
  });
  const [kpis, setKpis] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [fundData, setFundData] = useState([]);
  const [methodData, setMethodData] = useState([]);
  const [topCampaigns, setTopCampaigns] = useState([]);
  const [funds, setFunds] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [showAnnualModal, setShowAnnualModal] = useState(false);

  const dateStartISO = filters.dateStart ? new Date(filters.dateStart).toISOString() : null;
  const dateEndISO = filters.dateEnd ? new Date(filters.dateEnd + 'T23:59:59').toISOString() : null;

  const refetch = async () => {
    if (!churchId) return;
    try {
      const [k, monthly, byFund, byMethod, top, f, c] = await Promise.all([
        getReportKpis(churchId, { dateStart: dateStartISO, dateEnd: dateEndISO, fundId: filters.fundId || null, campaignId: filters.campaignId || null }),
        getMonthlyDonations(churchId, 12),
        getDonationsByFund(churchId, { dateStart: dateStartISO, dateEnd: dateEndISO }),
        getDonationsByMethod(churchId, { dateStart: dateStartISO, dateEnd: dateEndISO }),
        getTopCampaigns(churchId, 5),
        listFunds(churchId),
        listCampaigns(churchId),
      ]);
      setKpis(k);
      setMonthlyData(monthly.map((m) => ({ label: MONTH_LABEL[m.month - 1] + ' ' + String(m.year).slice(2), value: Number(m.total_cents) / 100 })));
      setFundData(byFund.map((f) => ({ label: f.label.slice(0, 12), value: f.value / 100 })));
      setMethodData(byMethod.map((m) => ({ ...m, value: m.value / 100 })));
      setTopCampaigns(top.map((c) => ({ ...c, value: c.value / 100 })));
      setFunds(f);
      setCampaigns(c);
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'Error al cargar reportes', sub: e.message });
    }
  };

  useEffect(() => { refetch(); }, [churchId, JSON.stringify(filters)]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const result = await exportDonationsToExcel(churchId, {
        dateStart: dateStartISO, dateEnd: dateEndISO,
        fund_id: filters.fundId || undefined,
        campaign_id: filters.campaignId || undefined,
      });
      onToast({ title: 'Excel descargado', sub: `${result.rowCount} filas en ${result.filename}` });
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'Error al exportar', sub: e.message });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    onToast({ tone: 'info', icon: 'info', title: 'PDF pendiente', sub: 'Generación de PDF requiere librería adicional (Fase 11+).' });
  };

  const handleSendEmail = () => {
    onToast({ tone: 'info', icon: 'info', title: 'Email pendiente', sub: 'El envío por email se activará al configurar Resend (Edge Function).' });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-text">
          <h2 className="page-greeting">Reportes</h2>
          <p className="page-sub">Consulta el comportamiento de las donaciones y campañas</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={handleExportPdf}><Icon name="download" size={14} /> Descargar PDF</button>
          <button className="btn btn-secondary" onClick={handleExportExcel} disabled={exporting || !can('reports.export')}>
            <Icon name="folder" size={14} /> {exporting ? 'Exportando…' : 'Exportar Excel'}
          </button>
          <button className="btn btn-secondary" onClick={handleSendEmail}><Icon name="send" size={14} /> Enviar por email</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: 14 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="field" style={{ minWidth: 140 }}>
            <label style={{ fontSize: 11 }}>Desde</label>
            <input type="date" value={filters.dateStart} onChange={(e) => setFilters({ ...filters, dateStart: e.target.value })} />
          </div>
          <div className="field" style={{ minWidth: 140 }}>
            <label style={{ fontSize: 11 }}>Hasta</label>
            <input type="date" value={filters.dateEnd} onChange={(e) => setFilters({ ...filters, dateEnd: e.target.value })} />
          </div>
          <div className="field" style={{ minWidth: 200 }}>
            <label style={{ fontSize: 11 }}>Fondo</label>
            <select value={filters.fundId} onChange={(e) => setFilters({ ...filters, fundId: e.target.value })}>
              <option value="">Todos los fondos</option>
              {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ minWidth: 200 }}>
            <label style={{ fontSize: 11 }}>Campaña</label>
            <select value={filters.campaignId} onChange={(e) => setFilters({ ...filters, campaignId: e.target.value })}>
              <option value="">Todas las campañas</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 18 }} onClick={refetch}><Icon name="refresh" size={12} /> Refrescar</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <Kpi icon="dollar" label="Total recibido" value={kpis ? formatMoney(kpis.totalCents) : '—'} />
        <Kpi icon="check" label="Total neto" value={kpis ? formatMoney(kpis.netCents) : '—'} sub={kpis && kpis.feesCents > 0 ? `Comisiones: ${formatMoney(kpis.feesCents)}` : null} />
        <Kpi icon="users" label="Donantes únicos" value={kpis ? String(kpis.uniqueDonors) : '—'} />
        <Kpi icon="star" label="Top campaña" value={kpis?.topCampaign?.name || '—'} sub={kpis?.topCampaign ? formatMoney(kpis.topCampaign.total_cents) : null} />
      </div>

      {/* Tabs */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-soft)', padding: '0 12px' }}>
          {['Resumen', 'Fondos', 'Campañas', 'Donantes', 'Recibos'].map((t) => (
            <button key={t} className={`tab-u ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {tab === 'Resumen' && (
          <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card" style={{ padding: 16 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>Donaciones por mes</h3>
              {monthlyData.length > 0 ? <LineChart data={monthlyData} height={220} /> : <Empty />}
            </div>
            <div className="card" style={{ padding: 16 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>Donaciones por fondo</h3>
              {fundData.length > 0 ? <BarChart data={fundData} height={220} /> : <Empty />}
            </div>
            <div className="card" style={{ padding: 16 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>Métodos de pago</h3>
              {methodData.length > 0 ? <DonutChart data={methodData} size={180} label="Total" /> : <Empty />}
            </div>
            <div className="card" style={{ padding: 16 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>Top campañas</h3>
              {topCampaigns.length > 0 ? <HBarChart data={topCampaigns} /> : <Empty />}
            </div>
          </div>
        )}

        {tab === 'Fondos' && fundData.length > 0 && (
          <div style={{ padding: 16 }}>
            <BarChart data={fundData} height={300} />
            <table className="table" style={{ marginTop: 20 }}>
              <thead><tr><th>Fondo</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>%</th></tr></thead>
              <tbody>
                {fundData.map((f) => {
                  const total = fundData.reduce((s, x) => s + x.value, 0);
                  return (
                    <tr key={f.label}>
                      <td style={{ fontWeight: 600 }}>{f.label}</td>
                      <td className="tnum" style={{ textAlign: 'right' }}>{fmt(f.value)}</td>
                      <td className="tnum muted" style={{ textAlign: 'right' }}>{Math.round((f.value / total) * 100)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Campañas' && (
          <div style={{ padding: 16 }}>
            {topCampaigns.length > 0 ? <HBarChart data={topCampaigns} /> : <Empty />}
          </div>
        )}

        {tab === 'Donantes' && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            <Icon name="users" size={32} />
            <p style={{ marginTop: 10 }}>Donantes únicos en el período: <strong>{kpis?.uniqueDonors || 0}</strong></p>
            <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={handleExportExcel}>
              <Icon name="folder" size={12} /> Exportar a Excel
            </button>
          </div>
        )}

        {tab === 'Recibos' && (
          <div style={{ padding: 16 }}>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>Genera estados anuales de contribución para enviar al IRS.</p>
            <button className="btn btn-primary" onClick={() => setShowAnnualModal(true)} disabled={!can('receipts.create')}>
              <Icon name="receipt" size={14} /> Generar estado anual de contribuciones
            </button>
          </div>
        )}
      </div>

      {/* Available reports table */}
      <div className="card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-soft)' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Reportes disponibles</h3>
        </div>
        <div>
          {[
            { name: 'Reporte mensual', desc: 'Resumen de donaciones del último mes', icon: 'calendar' },
            { name: 'Donaciones por fondo', desc: 'Distribución por fondo en el período', icon: 'folder' },
            { name: 'Estado anual de contribuciones', desc: 'Comprobante fiscal anual por donante', icon: 'receipt' },
            { name: 'Recibos enviados', desc: 'Lista de envíos de recibos del mes', icon: 'mail' },
            { name: 'Donantes recurrentes', desc: 'Donantes con contribución programada', icon: 'refresh' },
            { name: 'Donaciones grandes', desc: 'Donaciones por encima de $500', icon: 'star' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderTop: i === 0 ? 'none' : '1px solid var(--border-soft)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--coffee-bg)', color: 'var(--coffee)', display: 'grid', placeItems: 'center' }}>
                <Icon name={r.icon} size={14} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.desc}</div>
              </div>
              <button className="btn btn-sm btn-ghost" onClick={handleExportExcel}><Icon name="folder" size={12} /> Excel</button>
              <button className="btn btn-sm btn-ghost" onClick={handleSendEmail}><Icon name="send" size={12} /> Enviar</button>
            </div>
          ))}
        </div>
      </div>

      {showAnnualModal && (
        <AnnualStatementModal churchId={churchId} userId={user.id} onClose={() => setShowAnnualModal(false)} onToast={onToast} />
      )}
    </div>
  );
}

function Kpi({ icon, label, value, sub }) {
  return (
    <div className="kpi">
      <div className="kpi-label"><Icon name={icon} /> {label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-meta"><span className="muted">{sub}</span></div>}
    </div>
  );
}

function Empty() {
  return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Sin datos para mostrar.</div>;
}

function AnnualStatementModal({ churchId, userId, onClose, onToast }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [donorSearch, setDonorSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [options, setOptions] = useState([]);
  const [donor, setDonor] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(donorSearch), 300);
    return () => clearTimeout(t);
  }, [donorSearch]);

  useEffect(() => {
    if (!debounced || debounced.length < 2) { setOptions([]); return; }
    listPeople(churchId, { search: debounced, status: 'donor', limit: 8 }).catch(() => listPeople(churchId, { search: debounced, limit: 8 })).then(setOptions);
  }, [debounced, churchId]);

  const handleGenerate = async () => {
    if (!donor) return alert('Selecciona un donante.');
    setSaving(true);
    try {
      const receipt = await generateAnnualStatement({ churchId, personId: donor.id, taxYear: year, createdByUserId: userId });
      onToast({ title: 'Estado anual generado', sub: `Recibo ${receipt.receipt_number} por ${fmt(Number(receipt.total_amount_cents) / 100)}` });
      onClose();
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'Error', sub: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div><h3>Estado anual de contribuciones</h3><p>Genera un comprobante fiscal con todas las donaciones del año.</p></div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Año fiscal</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[year, year - 1, year - 2].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label>Donante</label>
            {donor ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg)' }}>
                <div style={{ flex: 1, fontWeight: 600 }}>{personDisplayName(donor)}</div>
                <button className="btn btn-sm btn-ghost" onClick={() => setDonor(null)}><Icon name="x" size={14} /></button>
              </div>
            ) : (
              <input placeholder="Buscar donante…" value={donorSearch} onChange={(e) => setDonorSearch(e.target.value)} />
            )}
            {!donor && options.length > 0 && (
              <div style={{ marginTop: 6, border: '1px solid var(--border)', borderRadius: 10, maxHeight: 240, overflowY: 'auto' }}>
                {options.map((p) => (
                  <button key={p.id} type="button" onClick={() => { setDonor(p); setOptions([]); }} style={{ width: '100%', padding: 10, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                    {personDisplayName(p)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="banner info" style={{ marginTop: 14 }}>
            <Icon name="info" /> Se generará un nuevo recibo tipo "annual_statement" con la suma de todas las donaciones pagadas del año seleccionado.
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={!donor || saving}>
            <Icon name="receipt" size={14} /> {saving ? 'Generando…' : 'Generar estado anual'}
          </button>
        </div>
      </div>
    </div>
  );
}
