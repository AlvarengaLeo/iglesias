// Pantalla "Equipos" (Teams) — F4: serving admin + Mi servicio.
// Sub-tabs reducidos por rol. Calendario/Cultos/Mis equipos/Chat (staff·leader)
// y Mi servicio/Mi equipo/Chat (servidor). El chat (tab) llega en F5.
import { useState, useEffect, useCallback } from 'react';
import { useChurch } from '../hooks/useChurch.js';
import { useRole } from '../hooks/useRole.js';
import { useT } from '../i18n/index.js';
import { Icon } from '../components/Icon.jsx';
import { Badge } from '../components/Badge.jsx';
import { ChatView } from '../components/chat/ChatView.jsx';
import { listPeople } from '../api/people.js';
import {
  listServiceEvents, createServiceEvent, updateServiceEvent, getServiceDetail,
  listTeams, getTeam, createTeam, createPosition, addTeamMember,
  assignPerson, respondAssignment, assignmentTransition, fillReplacement,
  getMyServices, ASSIGNMENT_STATUS, SERVICE_TYPES, personDisplayName,
} from '../api/teams.js';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function tabsForRole(role) {
  if (role === 'servidor') return ['mi-servicio', 'mi-equipo', 'chat'];
  if (role === 'leader') return ['calendario', 'equipos', 'chat'];
  return ['calendario', 'cultos', 'equipos', 'chat'];
}
const TAB_LABEL_KEY = {
  calendario: 'tab.calendar', cultos: 'tab.services', equipos: 'tab.my_teams',
  'mi-servicio': 'tab.my_service', 'mi-equipo': 'tab.my_team', chat: 'tab.chat',
};
const readTabFromHash = () => {
  const q = window.location.hash.split('?')[1] || '';
  return new URLSearchParams(q).get('tab');
};
const SERVICE_TYPE_LABEL = {
  culto_general: 'Culto general', servicio_hispano: 'Servicio Hispano', servicio_ingles: 'Servicio Inglés',
  jovenes: 'Jóvenes', ninos: 'Niños', estudio_biblico: 'Estudio bíblico', vigilia: 'Vigilia',
  ensayo: 'Ensayo', evento_especial: 'Evento especial',
};

function useFmt() {
  const { church } = useChurch();
  const locale = church?.locale === 'en' ? 'en-US' : 'es-ES';
  const tz = church?.timezone || undefined;
  const dateTime = (iso) => iso ? new Date(iso).toLocaleString(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: tz }) : '—';
  const dayLabel = (iso) => iso ? new Date(iso).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz }) : '—';
  const timeLabel = (iso) => iso ? new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: tz }) : '—';
  const clean = (s) => (s || '').replace('.', '');
  // Bloque de fecha para la card (día grande + mes + día de semana abreviado).
  const dateParts = (iso) => {
    if (!iso) return { day: '—', mon: '', dow: '' };
    const d = new Date(iso);
    return {
      day: d.toLocaleDateString(locale, { day: 'numeric', timeZone: tz }),
      mon: clean(d.toLocaleDateString(locale, { month: 'short', timeZone: tz })),
      dow: clean(d.toLocaleDateString(locale, { weekday: 'short', timeZone: tz })),
    };
  };
  // Clave de día (yyyy-mm-dd) en la zona horaria de la iglesia, para agrupar.
  const dayKey = (iso) => iso ? new Date(iso).toLocaleDateString('en-CA', { timeZone: tz }) : '';
  // Hora HH:mm (24h) en la zona horaria de la iglesia, para prefijar inputs.
  const timeInput = (iso) => iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }) : '';
  // Convierte (fecha 'yyyy-mm-dd' + hora 'HH:mm' en la tz de la iglesia) → instante UTC ISO.
  // Evita el drift de interpretar la hora en la tz del navegador.
  const toUtcISO = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    const naive = new Date(`${dateStr}T${timeStr}:00Z`);
    const asTz = new Date(naive.toLocaleString('en-US', { timeZone: tz || 'UTC' }));
    const asUtc = new Date(naive.toLocaleString('en-US', { timeZone: 'UTC' }));
    return new Date(naive.getTime() + (asUtc.getTime() - asTz.getTime())).toISOString();
  };
  return { dateTime, dayLabel, timeLabel, dateParts, dayKey, timeInput, toUtcISO, locale, tz };
}

function StatusBadge({ status, t }) {
  const meta = ASSIGNMENT_STATUS[status] || { tone: 'muted', key: 'status.' + status };
  return <Badge tone={meta.tone}>{t(meta.key)}</Badge>;
}

function Empty({ icon, title, body }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
      <div style={{ display: 'inline-flex', marginBottom: 10, color: 'var(--muted)' }}><Icon name={icon} size={30} /></div>
      <h3 style={{ margin: '0 0 6px' }}>{title}</h3>
      {body && <p className="page-sub" style={{ maxWidth: 420, margin: '0 auto' }}>{body}</p>}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Crear culto (modal)
// ----------------------------------------------------------------------------
function CreateServiceModal({ churchId, onClose, onCreated, onToast, t, editing = null }) {
  const fmt = useFmt();
  const ev = editing?.event;
  const isEdit = editing?.mode === 'edit';
  const isDup = editing?.mode === 'duplicate';
  const [form, setForm] = useState(() => ev ? {
    title: isEdit ? ev.title : `${ev.title} (copia)`,
    serviceType: ev.service_type || 'culto_general',
    language: ev.language || '',
    date: fmt.dayKey(ev.start_datetime),
    startTime: fmt.timeInput(ev.start_datetime),
    endTime: ev.end_datetime ? fmt.timeInput(ev.end_datetime) : '',
    location: ev.location || '',
    notes: (ev.notes === 'seed:equipos-demo' ? '' : ev.notes) || '',
  } : { title: '', serviceType: 'culto_general', language: '', date: '', startTime: '', endTime: '', location: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const heading = isEdit ? 'Editar culto' : isDup ? 'Duplicar culto' : t('action.create_service');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date || !form.startTime) {
      onToast({ tone: 'error', icon: 'alert', title: 'Completa título, fecha y hora de inicio' });
      return;
    }
    setSaving(true);
    try {
      const start = fmt.toUtcISO(form.date, form.startTime);
      const end = form.endTime ? fmt.toUtcISO(form.date, form.endTime) : null;
      if (isEdit) {
        await updateServiceEvent(ev.id, {
          title: form.title.trim(), service_type: form.serviceType, language: form.language || null,
          start_datetime: start, end_datetime: end, location: form.location.trim() || null, notes: form.notes.trim() || null,
        });
        onToast({ title: 'Culto actualizado' });
        onCreated(ev.id);
      } else {
        const id = await createServiceEvent({
          churchId, title: form.title.trim(), serviceType: form.serviceType,
          language: form.language || null, start, end,
          location: form.location.trim() || null, notes: form.notes.trim() || null,
        });
        onToast({ title: isDup ? 'Culto duplicado' : 'Culto creado' });
        onCreated(id);
      }
    } catch (err) {
      onToast({ tone: 'error', icon: 'alert', title: 'No se pudo guardar', sub: err.message });
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h3>{heading}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon name="x" size={16} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field"><label>Título</label>
              <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Servicio Hispano" autoFocus required /></div>
            <div className="grid grid-2" style={{ gap: 12 }}>
              <div className="field"><label>Tipo</label>
                <select value={form.serviceType} onChange={(e) => set('serviceType', e.target.value)}>
                  {SERVICE_TYPES.map((s) => <option key={s} value={s}>{SERVICE_TYPE_LABEL[s]}</option>)}
                </select></div>
              <div className="field"><label>Idioma <span className="hint">(opcional)</span></label>
                <select value={form.language} onChange={(e) => set('language', e.target.value)}>
                  <option value="">—</option><option value="es">Español</option><option value="en">Inglés</option><option value="mixed">Bilingüe</option>
                </select></div>
            </div>
            <div className="grid grid-2" style={{ gap: 12 }}>
              <div className="field"><label>Fecha</label>
                <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required /></div>
              <div className="field" style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}><label>Inicio</label>
                  <input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} required /></div>
                <div style={{ flex: 1 }}><label>Fin</label>
                  <input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} /></div>
              </div>
            </div>
            <div className="field"><label>Lugar <span className="hint">(opcional)</span></label>
              <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Templo principal" /></div>
            <div className="field"><label>Notas <span className="hint">(opcional)</span></label>
              <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>{t('action.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : t('action.save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Asignar persona (modal)
// ----------------------------------------------------------------------------
function AssignModal({ churchId, serviceEventId, teams, onClose, onAssigned, onToast, t }) {
  const [teamId, setTeamId] = useState(teams[0]?.id || '');
  const [positionId, setPositionId] = useState('');
  const [personId, setPersonId] = useState('');
  const [arrival, setArrival] = useState('');
  const [people, setPeople] = useState([]);
  const [saving, setSaving] = useState(false);

  const team = teams.find((tm) => tm.id === teamId);
  const positions = (team?.positions || []).filter((p) => p.is_active);

  useEffect(() => {
    listPeople(churchId, { limit: 500 }).then(setPeople).catch(() => {});
  }, [churchId]);
  useEffect(() => { setPositionId(positions[0]?.id || ''); }, [teamId]); // eslint-disable-line

  const submit = async (e) => {
    e.preventDefault();
    if (!teamId || !positionId || !personId) {
      onToast({ tone: 'error', icon: 'alert', title: 'Elige equipo, posición y persona' });
      return;
    }
    setSaving(true);
    try {
      await assignPerson({ churchId, serviceEventId, positionId, personId, arrivalTime: arrival || null });
      onToast({ title: 'Asignación enviada' });
      onAssigned();
    } catch (err) {
      onToast({ tone: 'error', icon: 'alert', title: 'No se pudo asignar', sub: err.message });
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h3>{t('action.assign')}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon name="x" size={16} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field"><label>{t('common.team')}</label>
              <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                {teams.map((tm) => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
              </select></div>
            <div className="field"><label>{t('common.position')}</label>
              <select value={positionId} onChange={(e) => setPositionId(e.target.value)}>
                <option value="">—</option>
                {positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></div>
            <div className="field"><label>Persona</label>
              <select value={personId} onChange={(e) => setPersonId(e.target.value)}>
                <option value="">Selecciona…</option>
                {people.map((p) => <option key={p.id} value={p.id}>{personDisplayName(p)}</option>)}
              </select></div>
            <div className="field"><label>Hora de llegada <span className="hint">(opcional)</span></label>
              <input type="time" value={arrival} onChange={(e) => setArrival(e.target.value)} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>{t('action.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '…' : t('action.send')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Detalle de servicio (drawer)
// ----------------------------------------------------------------------------
function ServiceDetailDrawer({ serviceEventId, churchId, teams, canManage, onClose, onToast, t }) {
  const { dateTime } = useFmt();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getServiceDetail(serviceEventId).then(setDetail)
      .catch((e) => onToast({ tone: 'error', icon: 'alert', title: 'Error', sub: e.message }))
      .finally(() => setLoading(false));
  }, [serviceEventId]); // eslint-disable-line
  useEffect(() => { load(); }, [load]);

  const cancelAssignment = async (a) => {
    try { await assignmentTransition({ assignmentId: a.assignment_id, toStatus: 'cancelled' }); onToast({ title: 'Asignación cancelada' }); load(); }
    catch (e) { onToast({ tone: 'error', icon: 'alert', title: 'Error', sub: e.message }); }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div><strong>{detail?.title || t('common.loading')}</strong>
            <div className="page-sub">{detail ? dateTime(detail.start_datetime) : ''}</div></div>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon name="x" size={18} /></button>
        </div>
        <div className="drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {loading ? <p className="page-sub">{t('common.loading')}</p> : detail && (
            <>
              {detail.location && <div><Icon name="globe" size={14} /> {detail.location}</div>}
              {detail.notes && <div className="card" style={{ padding: 12, fontSize: 13 }}>{detail.notes}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Asignaciones</strong>
                {canManage && <button className="btn btn-sm btn-primary" onClick={() => setAssignOpen(true)}><Icon name="plus" size={13} /> {t('action.assign')}</button>}
              </div>
              {(detail.assignments || []).length === 0
                ? <Empty icon="users" title="Sin asignaciones aún" />
                : detail.assignments.map((a) => (
                  <div key={a.assignment_id} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{a.person_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.team} · {a.position}{a.arrival_time ? ` · ${a.arrival_time}` : ''}</div>
                    </div>
                    <StatusBadge status={a.status} t={t} />
                    {canManage && a.status !== 'cancelled' && (
                      <button className="btn btn-sm btn-ghost" title="Cancelar" onClick={() => cancelAssignment(a)}><Icon name="x" size={13} /></button>
                    )}
                  </div>
                ))}
            </>
          )}
        </div>
      </div>
      {assignOpen && (
        <AssignModal churchId={churchId} serviceEventId={serviceEventId} teams={teams}
          onClose={() => setAssignOpen(false)} onAssigned={() => { setAssignOpen(false); load(); }} onToast={onToast} t={t} />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Calendario / Cultos — agenda rica + vista de mes
// ----------------------------------------------------------------------------
function staffingOf(ev) {
  const live = (ev.assignments || []).filter((a) => a.status !== 'cancelled' && a.status !== 'replaced');
  return { assigned: live.length, confirmed: live.filter((a) => a.status === 'confirmed').length, teamIds: [...new Set(live.map((a) => a.team_id))] };
}

function StaffingMeter({ assigned, confirmed }) {
  const pct = assigned ? Math.round((confirmed / assigned) * 100) : 0;
  const tone = assigned === 0 ? 'empty' : confirmed >= assigned ? 'full' : confirmed > 0 ? 'partial' : 'none';
  return (
    <div className="eq-staff" title={`${confirmed} de ${assigned} confirmados`}>
      <div className="eq-staff-bar"><div className={`eq-staff-fill ${tone}`} style={{ width: `${pct}%` }} /></div>
      <span className="eq-staff-label">{assigned === 0 ? 'Sin asignar' : `${confirmed}/${assigned} confirmados`}</span>
    </div>
  );
}

function TeamChips({ teamIds, teams }) {
  const names = teamIds.map((id) => teams.find((t) => t.id === id)?.name).filter(Boolean);
  if (!names.length) return null;
  return (
    <div className="eq-chips">
      {names.slice(0, 4).map((n) => <span key={n} className="eq-chip">{n}</span>)}
      {names.length > 4 && <span className="eq-chip eq-chip-more">+{names.length - 4}</span>}
    </div>
  );
}

function ServiceCard({ ev, teams, fmt, onOpen, hero }) {
  const { assigned, confirmed, teamIds } = staffingOf(ev);
  const p = fmt.dateParts(ev.start_datetime);
  return (
    <button className={`eq-svc-card ${hero ? 'hero' : ''}`} onClick={() => onOpen(ev.id)}>
      <div className="eq-date-block">
        <span className="eq-date-dow">{p.dow}</span>
        <span className="eq-date-day">{p.day}</span>
        <span className="eq-date-mon">{p.mon}</span>
      </div>
      <div className="eq-svc-main">
        <div className="eq-svc-top">
          <span className="eq-svc-title">{ev.title}</span>
          <Badge tone="navy">{SERVICE_TYPE_LABEL[ev.service_type] || ev.service_type}</Badge>
          {ev.status === 'cancelled' && <Badge tone="error">Cancelado</Badge>}
        </div>
        <div className="eq-svc-meta">
          <Icon name="clock" size={13} /> {fmt.timeLabel(ev.start_datetime)}{ev.location ? ` · ${ev.location}` : ''}
        </div>
        <TeamChips teamIds={teamIds} teams={teams} />
        <StaffingMeter assigned={assigned} confirmed={confirmed} />
      </div>
      <Icon name="chevronRight" size={18} />
    </button>
  );
}

function MonthGrid({ events, fmt, monthCursor, onPrev, onNext, onPickDay, selectedDay, locale }) {
  const byDay = {};
  for (const ev of events) { const k = fmt.dayKey(ev.start_datetime); (byDay[k] = byDay[k] || []).push(ev); }
  const y = monthCursor.getFullYear(), m = monthCursor.getMonth();
  const first = new Date(y, m, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: fmt.tz });
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ d, key, count: (byDay[key] || []).length });
  }
  const dows = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const monthLabel = first.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  return (
    <div className="eq-month card">
      <div className="eq-month-head">
        <button className="icon-btn" onClick={onPrev} aria-label="Mes anterior"><Icon name="chevronLeft" size={18} /></button>
        <strong style={{ textTransform: 'capitalize' }}>{monthLabel}</strong>
        <button className="icon-btn" onClick={onNext} aria-label="Mes siguiente"><Icon name="chevronRight" size={18} /></button>
      </div>
      <div className="eq-month-grid">
        {dows.map((d, i) => <div key={'h' + i} className="eq-month-dow">{d}</div>)}
        {cells.map((c, i) => c === null
          ? <div key={'e' + i} className="eq-month-cell empty" />
          : <button key={c.key} type="button"
              className={`eq-month-cell ${c.count ? 'has' : ''} ${selectedDay === c.key ? 'sel' : ''} ${c.key === todayKey ? 'today' : ''}`}
              onClick={() => onPickDay(c.count ? c.key : null)} disabled={!c.count}
              aria-label={`Día ${c.d}${c.count ? `, ${c.count} servicios` : ''}`}>
              <span className="eq-month-num">{c.d}</span>
              {c.count > 0 && <span className="eq-month-dot">{c.count}</span>}
            </button>
        )}
      </div>
    </div>
  );
}

function ServicesAgenda({ churchId, canManage, withCreate, onToast, t }) {
  const fmt = useFmt();
  const [events, setEvents] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [teams, setTeams] = useState([]);
  const [view, setView] = useState('list');
  const [fType, setFType] = useState('all');
  const [fTeam, setFTeam] = useState('all');
  const [monthCursor, setMonthCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selectedDay, setSelectedDay] = useState(null);

  const load = useCallback(() => {
    const from = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
    listServiceEvents(churchId, { from, limit: 300 }).then(setEvents).catch((e) => onToast({ tone: 'error', icon: 'alert', title: 'Error', sub: e.message }));
  }, [churchId]); // eslint-disable-line
  useEffect(() => { load(); }, [load]);
  useEffect(() => { listTeams(churchId).then(setTeams).catch(() => {}); }, [churchId]);

  if (events === null) return <p className="page-sub">{t('common.loading')}</p>;

  const filtered = events.filter((ev) =>
    (fType === 'all' || ev.service_type === fType) &&
    (fTeam === 'all' || staffingOf(ev).teamIds.includes(fTeam))
  );

  const groups = {};
  for (const ev of filtered) { const k = fmt.dayKey(ev.start_datetime); (groups[k] = groups[k] || []).push(ev); }
  const dayKeys = Object.keys(groups).sort();
  const next = filtered[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="eq-cal-toolbar">
        <div className="eq-segment" role="tablist" aria-label="Vista">
          <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}><Icon name="menu" size={14} /> Lista</button>
          <button type="button" className={view === 'month' ? 'active' : ''} onClick={() => setView('month')}><Icon name="calendar" size={14} /> Mes</button>
        </div>
        <select value={fType} onChange={(e) => setFType(e.target.value)} aria-label="Filtrar por tipo">
          <option value="all">Todos los tipos</option>
          {SERVICE_TYPES.map((s) => <option key={s} value={s}>{SERVICE_TYPE_LABEL[s]}</option>)}
        </select>
        <select value={fTeam} onChange={(e) => setFTeam(e.target.value)} aria-label="Filtrar por equipo">
          <option value="all">Todos los equipos</option>
          {teams.map((tm) => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
        </select>
        <span style={{ flex: 1 }} />
        {withCreate && canManage && (
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Icon name="plus" size={14} /> {t('action.create_service')}</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Empty icon="calendar" title={t('empty.no_services')} body={canManage ? 'Crea el primer culto para empezar.' : null} />
      ) : view === 'month' ? (
        <>
          <MonthGrid events={filtered} fmt={fmt} monthCursor={monthCursor} locale={fmt.locale}
            onPrev={() => { setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1)); setSelectedDay(null); }}
            onNext={() => { setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1)); setSelectedDay(null); }}
            onPickDay={setSelectedDay} selectedDay={selectedDay} />
          {selectedDay && (groups[selectedDay] || []).length > 0 && (
            <div>
              <div className="sidebar-section-label" style={{ textTransform: 'capitalize' }}>{fmt.dayLabel(groups[selectedDay][0].start_datetime)}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {groups[selectedDay].map((ev) => <ServiceCard key={ev.id} ev={ev} teams={teams} fmt={fmt} onOpen={setOpenId} />)}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div>
            <div className="sidebar-section-label">{t('common.upcoming')}</div>
            <ServiceCard ev={next} teams={teams} fmt={fmt} onOpen={setOpenId} hero />
          </div>
          {dayKeys.map((day) => {
            const dayEvents = groups[day].filter((ev) => ev.id !== next.id);
            if (!dayEvents.length) return null;
            return (
              <div key={day}>
                <div className="sidebar-section-label" style={{ textTransform: 'capitalize' }}>{fmt.dayLabel(groups[day][0].start_datetime)}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dayEvents.map((ev) => <ServiceCard key={ev.id} ev={ev} teams={teams} fmt={fmt} onOpen={setOpenId} />)}
                </div>
              </div>
            );
          })}
        </>
      )}

      {openId && (
        <ServiceDetailDrawer serviceEventId={openId} churchId={churchId} teams={teams} canManage={canManage}
          onClose={() => { setOpenId(null); load(); }} onToast={onToast} t={t} />
      )}
      {createOpen && (
        <CreateServiceModal churchId={churchId} onClose={() => setCreateOpen(false)}
          onCreated={(id) => { setCreateOpen(false); load(); setOpenId(id); }} onToast={onToast} t={t} />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Cultos — tabla de gestión (todos los servicios: estados, staffing, acciones)
// ----------------------------------------------------------------------------
const EVENT_STATUS = {
  draft:     { label: 'Borrador',   tone: 'muted' },
  scheduled: { label: 'Programado', tone: 'info' },
  completed: { label: 'Realizado',  tone: 'success' },
  cancelled: { label: 'Cancelado',  tone: 'error' },
};
function EventStatusBadge({ status }) {
  const m = EVENT_STATUS[status] || { label: status, tone: 'muted' };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

function CultosTab({ churchId, canManage, onToast, t }) {
  const fmt = useFmt();
  const [events, setEvents] = useState(null);
  const [teams, setTeams] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [modal, setModal] = useState(null); // null | {mode:'new'|'edit'|'duplicate', event?}
  const [fStatus, setFStatus] = useState('upcoming');

  const load = useCallback(() => {
    listServiceEvents(churchId, { from: null, limit: 500, order: 'desc' })
      .then(setEvents).catch((e) => onToast({ tone: 'error', icon: 'alert', title: 'Error', sub: e.message }));
  }, [churchId]); // eslint-disable-line
  useEffect(() => { load(); }, [load]);
  useEffect(() => { listTeams(churchId).then(setTeams).catch(() => {}); }, [churchId]);

  if (events === null) return <p className="page-sub">{t('common.loading')}</p>;

  const cutoff = Date.now() - 12 * 3600 * 1000;
  const matchStatus = (ev) => {
    const ts = new Date(ev.start_datetime).getTime();
    switch (fStatus) {
      case 'upcoming':  return ev.status !== 'cancelled' && ev.status !== 'draft' && ts >= cutoff;
      case 'past':      return ev.status !== 'cancelled' && ev.status !== 'draft' && ts < cutoff;
      case 'draft':     return ev.status === 'draft';
      case 'cancelled': return ev.status === 'cancelled';
      default:          return true;
    }
  };
  const rows = events.filter(matchStatus);
  const FILTERS = [['upcoming', 'Próximos'], ['past', 'Pasados'], ['draft', 'Borradores'], ['cancelled', 'Cancelados'], ['all', 'Todos']];

  const cancelEvent = async (ev) => {
    try { await updateServiceEvent(ev.id, { status: 'cancelled' }); onToast({ title: 'Culto cancelado' }); load(); }
    catch (e) { onToast({ tone: 'error', icon: 'alert', title: 'Error', sub: e.message }); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="eq-cal-toolbar">
        <div className="eq-segment" role="tablist" aria-label="Estado">
          {FILTERS.map(([k, label]) => (
            <button key={k} type="button" className={fStatus === k ? 'active' : ''} onClick={() => setFStatus(k)}>{label}</button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        {canManage && (
          <button className="btn btn-primary" onClick={() => setModal({ mode: 'new' })}><Icon name="plus" size={14} /> {t('action.create_service')}</button>
        )}
      </div>

      {rows.length === 0 ? (
        <Empty icon="calendar" title="No hay cultos en esta vista" body={canManage && fStatus === 'upcoming' ? 'Crea el primer culto para empezar.' : null} />
      ) : (
        <div className="card eq-table-wrap">
          <table className="eq-table">
            <thead><tr><th>Fecha</th><th>Servicio</th><th>Tipo</th><th>Estado</th><th>Staffing</th>{canManage && <th aria-label="Acciones" />}</tr></thead>
            <tbody>
              {rows.map((ev) => {
                const { assigned, confirmed } = staffingOf(ev);
                const pct = assigned ? Math.round((confirmed / assigned) * 100) : 0;
                return (
                  <tr key={ev.id} className="eq-trow" onClick={() => setOpenId(ev.id)}>
                    <td className="eq-td-date">{fmt.dateTime(ev.start_datetime)}</td>
                    <td><strong>{ev.title}</strong>{ev.location && <div className="eq-sub">{ev.location}</div>}</td>
                    <td><Badge tone="navy">{SERVICE_TYPE_LABEL[ev.service_type] || ev.service_type}</Badge></td>
                    <td><EventStatusBadge status={ev.status} /></td>
                    <td className="eq-td-staff">{assigned === 0 ? <span className="eq-sub">Sin asignar</span> : `${confirmed}/${assigned} · ${pct}%`}</td>
                    {canManage && (
                      <td className="eq-td-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-sm btn-ghost" title="Editar" onClick={() => setModal({ mode: 'edit', event: ev })}><Icon name="edit" size={14} /></button>
                        <button className="btn btn-sm btn-ghost" title="Duplicar" onClick={() => setModal({ mode: 'duplicate', event: ev })}><Icon name="fileText" size={14} /></button>
                        {ev.status !== 'cancelled' && <button className="btn btn-sm btn-ghost" title="Cancelar" onClick={() => cancelEvent(ev)}><Icon name="x" size={14} /></button>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {openId && (
        <ServiceDetailDrawer serviceEventId={openId} churchId={churchId} teams={teams} canManage={canManage}
          onClose={() => { setOpenId(null); load(); }} onToast={onToast} t={t} />
      )}
      {modal && (
        <CreateServiceModal churchId={churchId} editing={modal.mode === 'new' ? null : modal}
          onClose={() => setModal(null)} onCreated={() => { setModal(null); load(); }} onToast={onToast} t={t} />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Equipos (lista + detalle)
// ----------------------------------------------------------------------------
function TeamsTab({ churchId, canManage, onToast, t }) {
  const [teams, setTeams] = useState(null);
  const [openTeam, setOpenTeam] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const load = useCallback(() => { listTeams(churchId).then(setTeams).catch((e) => onToast({ tone: 'error', icon: 'alert', title: 'Error', sub: e.message })); }, [churchId]); // eslint-disable-line
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!newName.trim()) return;
    try { await createTeam({ churchId, name: newName.trim() }); setNewName(''); setCreating(false); load(); onToast({ title: 'Equipo creado' }); }
    catch (e) { onToast({ tone: 'error', icon: 'alert', title: 'Error', sub: e.message }); }
  };

  if (teams === null) return <p className="page-sub">{t('common.loading')}</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {canManage && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {creating ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre del equipo" autoFocus />
              <button className="btn btn-primary btn-sm" onClick={create}>{t('action.save')}</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setCreating(false)}>{t('action.cancel')}</button>
            </div>
          ) : <button className="btn btn-primary" onClick={() => setCreating(true)}><Icon name="plus" size={14} /> Nuevo equipo</button>}
        </div>
      )}
      {teams.length === 0 ? <Empty icon="users" title={t('empty.no_teams')} /> : (
        <div className="grid grid-2" style={{ gap: 12 }}>
          {teams.map((tm) => (
            <button key={tm.id} className="card" onClick={() => setOpenTeam(tm.id)}
              style={{ padding: 16, textAlign: 'left', cursor: 'pointer' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{tm.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {(tm.members || []).filter((m) => m.is_active).length} miembros · {(tm.positions || []).length} posiciones
              </div>
            </button>
          ))}
        </div>
      )}
      {openTeam && <TeamDetailDrawer teamId={openTeam} churchId={churchId} canManage={canManage} onClose={() => { setOpenTeam(null); load(); }} onToast={onToast} t={t} />}
    </div>
  );
}

function TeamDetailDrawer({ teamId, churchId, canManage, onClose, onToast, t }) {
  const [team, setTeam] = useState(null);
  const [people, setPeople] = useState([]);
  const [newPos, setNewPos] = useState('');
  const [addPersonId, setAddPersonId] = useState('');

  const load = useCallback(() => { getTeam(teamId).then(setTeam).catch((e) => onToast({ tone: 'error', icon: 'alert', title: 'Error', sub: e.message })); }, [teamId]); // eslint-disable-line
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (canManage) listPeople(churchId, { limit: 500 }).then(setPeople).catch(() => {}); }, [churchId, canManage]);

  const addPos = async () => {
    if (!newPos.trim()) return;
    try { await createPosition({ churchId, teamId, name: newPos.trim() }); setNewPos(''); load(); }
    catch (e) { onToast({ tone: 'error', icon: 'alert', title: 'Error', sub: e.message }); }
  };
  const addMember = async () => {
    if (!addPersonId) return;
    try { await addTeamMember({ churchId, teamId, personId: addPersonId }); setAddPersonId(''); load(); onToast({ title: 'Miembro agregado' }); }
    catch (e) { onToast({ tone: 'error', icon: 'alert', title: 'Error', sub: e.message }); }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <strong>{team?.name || t('common.loading')}</strong>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon name="x" size={18} /></button>
        </div>
        <div className="drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {team && (
            <>
              <div>
                <div className="sidebar-section-label">Posiciones</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(team.positions || []).map((p) => <Badge key={p.id} tone="navy">{p.name}</Badge>)}
                  {(team.positions || []).length === 0 && <span className="page-sub">Sin posiciones</span>}
                </div>
                {canManage && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <input value={newPos} onChange={(e) => setNewPos(e.target.value)} placeholder="Nueva posición (ej. Guitarrista)" />
                    <button className="btn btn-sm btn-secondary" onClick={addPos}><Icon name="plus" size={13} /></button>
                  </div>
                )}
              </div>
              <div>
                <div className="sidebar-section-label">Miembros</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(team.members || []).filter((m) => m.is_active).map((m) => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon name="users" size={14} />
                      <span style={{ flex: 1 }}>{personDisplayName(m.person)}</span>
                      {m.team_role === 'leader' && <Badge tone="coffee">Líder</Badge>}
                    </div>
                  ))}
                  {(team.members || []).filter((m) => m.is_active).length === 0 && <span className="page-sub">Sin miembros</span>}
                </div>
                {canManage && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <select value={addPersonId} onChange={(e) => setAddPersonId(e.target.value)} style={{ flex: 1 }}>
                      <option value="">Agregar miembro…</option>
                      {people.map((p) => <option key={p.id} value={p.id}>{personDisplayName(p)}</option>)}
                    </select>
                    <button className="btn btn-sm btn-secondary" onClick={addMember}><Icon name="plus" size={13} /></button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Mi servicio (servidor)
// ----------------------------------------------------------------------------
function MyServiceTab({ churchId, personId, onToast, t }) {
  const { dateTime } = useFmt();
  const [items, setItems] = useState(null);

  const load = useCallback(() => { getMyServices(churchId).then(setItems).catch((e) => onToast({ tone: 'error', icon: 'alert', title: 'Error', sub: e.message })); }, [churchId]); // eslint-disable-line
  useEffect(() => { if (personId) load(); }, [personId, load]);

  if (!personId) return <Empty icon="alert" title={t('empty.not_linked_title')} body={t('empty.not_linked_body')} />;
  if (items === null) return <p className="page-sub">{t('common.loading')}</p>;
  if (items.length === 0) return <Empty icon="calendar" title={t('empty.no_assignments')} />;

  const respond = async (a, response) => {
    try { await respondAssignment({ assignmentId: a.assignment_id, response }); onToast({ title: 'Listo' }); load(); }
    catch (e) { onToast({ tone: 'error', icon: 'alert', title: 'Error', sub: e.message }); }
  };

  const [next, ...rest] = items;
  const Card = ({ a, hero }) => (
    <div className="card" style={{ padding: hero ? 20 : 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: hero ? 18 : 14 }}>{a.title}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{dateTime(a.start_datetime)}</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>{a.team} · <strong>{a.position}</strong>{a.arrival_time ? ` · llega ${a.arrival_time}` : ''}</div>
        </div>
        <StatusBadge status={a.status} t={t} />
      </div>
      {a.status !== 'cancelled' && a.status !== 'replaced' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={() => respond(a, 'confirmed')} disabled={a.status === 'confirmed'}>
            <Icon name="check" size={13} /> {t('action.confirm')}</button>
          <button className="btn btn-secondary btn-sm" onClick={() => respond(a, 'declined')}>{t('action.cant_attend')}</button>
          <button className="btn btn-ghost btn-sm" onClick={() => respond(a, 'needs_replacement')}>{t('action.request_replacement')}</button>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><div className="sidebar-section-label">{t('common.upcoming')}</div><Card a={next} hero /></div>
      {rest.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rest.map((a) => <Card key={a.assignment_id} a={a} />)}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Mi equipo (servidor): equipos donde pertenece (read-only)
// ----------------------------------------------------------------------------
function MyTeamTab({ churchId, onToast, t }) {
  const [teams, setTeams] = useState(null);
  useEffect(() => { listTeams(churchId).then(setTeams).catch((e) => onToast({ tone: 'error', icon: 'alert', title: 'Error', sub: e.message })); }, [churchId]); // eslint-disable-line
  if (teams === null) return <p className="page-sub">{t('common.loading')}</p>;
  if (teams.length === 0) return <Empty icon="users" title={t('tab.my_team')} body={t('empty.no_teams')} />;
  return (
    <div className="grid grid-2" style={{ gap: 12 }}>
      {teams.map((tm) => (
        <div key={tm.id} className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{tm.name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{(tm.members || []).filter((m) => m.is_active).length} miembros</div>
        </div>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Pantalla principal
// ----------------------------------------------------------------------------
export function EquiposScreen({ onToast }) {
  const { role, isServidor, isServingManager } = useRole();
  const { churchId, personId } = useChurch();
  const t = useT();

  const tabs = tabsForRole(role);
  const [tab, setTab] = useState(() => {
    const fromHash = readTabFromHash();
    return tabs.includes(fromHash) ? fromHash : tabs[0];
  });
  useEffect(() => { if (!tabs.includes(tab)) setTab(tabs[0]); }, [role]); // eslint-disable-line

  const canManage = isServingManager;

  const content = () => {
    switch (tab) {
      case 'calendario': return <ServicesAgenda churchId={churchId} canManage={canManage} withCreate={false} onToast={onToast} t={t} />;
      case 'cultos':     return <CultosTab churchId={churchId} canManage={canManage} onToast={onToast} t={t} />;
      case 'equipos':    return <TeamsTab churchId={churchId} canManage={canManage} onToast={onToast} t={t} />;
      case 'mi-servicio':return <MyServiceTab churchId={churchId} personId={personId} onToast={onToast} t={t} />;
      case 'mi-equipo':  return <MyTeamTab churchId={churchId} onToast={onToast} t={t} />;
      case 'chat':       return <ChatView churchId={churchId} onToast={onToast} />;
      default: return null;
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-text">
          <h2 className="page-greeting">{t('equipos.title')}</h2>
          <p className="page-sub">{isServidor ? t('equipos.subtitle_servidor') : t('equipos.subtitle')}</p>
        </div>
      </div>
      <div className="equipos-tabs" role="tablist" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {tabs.map((id) => (
          <button key={id} role="tab" aria-selected={tab === id}
            className={`btn ${tab === id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(id)}>
            {t(TAB_LABEL_KEY[id])}
          </button>
        ))}
      </div>
      {content()}
    </div>
  );
}
