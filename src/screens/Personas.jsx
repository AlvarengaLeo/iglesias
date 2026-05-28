// PersonasScreen — Fase 6: conectado a Supabase.
// Lista real + búsqueda debounced + filtros + modal agregar + drawer con 4 tabs +
// edit inline + tags (display) + household (display) + followups.
//
// Lo que NO está en esta fase (intencional):
//   - CRUD de tags desde UI (solo display; API ya disponible)
//   - Crear/editar households desde UI (solo display)
//   - Envío de mensaje al donante (Fase de comunicaciones futura)

import { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '../components/Icon.jsx';
import { Badge } from '../components/Badge.jsx';
import { formatMoney } from '../components/charts/index.jsx';
import { useChurch } from '../hooks/useChurch.js';
import { useAuth } from '../hooks/useAuth.js';
import { useRole } from '../hooks/useRole.js';
import {
  listPeople,
  getPersonDetail,
  createPerson,
  updatePerson,
  STATUS_TO_DB,
  STATUS_TO_UI,
  STATUS_TONE,
  personDisplayName,
  personInitials,
} from '../api/people.js';
import {
  listFollowupsByPerson,
  createFollowup,
  FOLLOWUP_TYPE_LABEL,
  FOLLOWUP_TYPE_ICON,
  FOLLOWUP_TYPE_TONE,
} from '../api/followups.js';
import { formatDate, formatRelativeTime } from '../lib/formatters.js';

const FILTERS = ['Todos', 'Miembros', 'Visitantes', 'Donantes', 'Servidores', 'Líderes', 'Inactivos'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PersonasScreen({ onToast }) {
  const { churchId } = useChurch();
  const { user } = useAuth();
  const { can } = useRole();

  const [filter, setFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [people, setPeople] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null); // person object from list
  const [showAddModal, setShowAddModal] = useState(false);

  // Debounce search input (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch list when churchId / filter / debouncedSearch change
  const refetch = async () => {
    if (!churchId) return;
    setError(null);
    try {
      const data = await listPeople(churchId, {
        search: debouncedSearch,
        status: STATUS_TO_DB[filter] || null,
      });
      setPeople(data);
    } catch (e) {
      console.error(e);
      setError(e.message);
      setPeople([]);
    }
  };

  useEffect(() => {
    refetch();
  }, [churchId, filter, debouncedSearch]);

  // Counts per filter (computed from non-filtered list — we re-query without
  // status filter for counts; cached separately for accuracy)
  const [counts, setCounts] = useState({});
  useEffect(() => {
    if (!churchId) return;
    listPeople(churchId, { limit: 1000 })
      .then((all) => {
        const c = { Todos: all.length };
        for (const [uiLabel, dbVal] of Object.entries(STATUS_TO_DB)) {
          if (!dbVal) continue;
          c[uiLabel] = all.filter((p) => p.status === dbVal).length;
        }
        setCounts(c);
      })
      .catch(() => setCounts({ Todos: 0 }));
  }, [churchId, people?.length]);

  const handleCreatePerson = async (payload) => {
    try {
      await createPerson(churchId, payload, user.id);
      onToast({ title: 'Persona agregada correctamente', sub: 'Aparece en tu lista.' });
      setShowAddModal(false);
      await refetch();
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'Error al guardar', sub: e.message });
    }
  };

  const handleUpdatePerson = async (personId, patch) => {
    try {
      const updated = await updatePerson(personId, patch);
      onToast({ title: 'Persona actualizada correctamente' });
      await refetch();
      // Update selected to keep drawer in sync
      if (selected?.id === personId) setSelected({ ...selected, ...updated });
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'Error al actualizar', sub: e.message });
      throw e;
    }
  };

  const totalLabel = useMemo(() => {
    if (people === null) return 'Cargando…';
    const total = counts.Todos ?? people.length;
    return `${total} persona${total === 1 ? '' : 's'} registrada${total === 1 ? '' : 's'}`;
  }, [counts, people]);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-text">
          <h2 className="page-greeting">Personas</h2>
          <p className="page-sub">
            Administra miembros, visitantes, donantes y servidores · {totalLabel}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => onToast({ tone: 'info', icon: 'info', title: 'Exportar pendiente', sub: 'Se activa en Fase 9 con Reportes.' })}>
            <Icon name="download" size={14} /> Exportar
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
            disabled={!can('people.write')}
          >
            <Icon name="plus" size={14} /> Agregar persona
          </button>
        </div>
      </div>

      {/* Filter / Search bar */}
      <div className="card" style={{ marginBottom: 16, padding: 14 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="input-wrap" style={{ flex: '1 1 280px', minWidth: 240 }}>
            <Icon name="search" />
            <input
              className="input"
              placeholder="Buscar por nombre, teléfono o email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map((f) => (
              <button
                key={f}
                className={`chip ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f} <span className="count">{counts[f] ?? '—'}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 32 }}><input type="checkbox" /></th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Tipo</th>
                <th>Última actividad</th>
                <th style={{ width: 120, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {people === null && (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                    Cargando personas…
                  </td>
                </tr>
              )}
              {people !== null && people.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                    {error ? `Error: ${error}` :
                      debouncedSearch ? `Sin resultados para "${debouncedSearch}"` :
                      filter !== 'Todos' ? `Sin personas en categoría "${filter}"` :
                      'Tu congregación empieza aquí. Click "Agregar persona" para comenzar.'}
                  </td>
                </tr>
              )}
              {people?.map((p) => (
                <PersonRow
                  key={p.id}
                  person={p}
                  isSelected={selected?.id === p.id}
                  onSelect={() => setSelected(p)}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px', borderTop: '1px solid var(--border-soft)',
            fontSize: 12, color: 'var(--muted)',
          }}
        >
          <span>
            Mostrando {people?.length || 0} {people?.length === 1 ? 'persona' : 'personas'}
            {filter !== 'Todos' && ` (filtro: ${filter})`}
          </span>
          <span style={{ fontSize: 11 }}>
            {people !== null && people.length === 200 && '⚠ Mostrando primeros 200. Filtra para ver menos.'}
          </span>
        </div>
      </div>

      {/* Drawer */}
      {selected && (
        <PersonDrawer
          personId={selected.id}
          onClose={() => setSelected(null)}
          canEdit={can('people.write')}
          canSeePrivateNotes={can('people.notes.private')}
          onSave={handleUpdatePerson}
          onToast={onToast}
          currentUserId={user.id}
          churchId={churchId}
        />
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddPersonModal
          onClose={() => setShowAddModal(false)}
          onCreate={handleCreatePerson}
        />
      )}
    </div>
  );
}

// =====================================================================
// PersonRow — fila individual de la tabla
// =====================================================================
function PersonRow({ person, isSelected, onSelect }) {
  const name = personDisplayName(person);
  const initials = personInitials(person);
  const tone = STATUS_TONE[person.status] || 'muted';
  const tags = (person.tag_assignments || []).map((ta) => ta.tag).filter(Boolean);
  const tagPreview = tags.slice(0, 2).map((t) => t.name).join(' · ') || '—';
  const lastActivity = person.last_activity_at
    ? formatRelativeTime(person.last_activity_at)
    : person.joined_at
      ? `Unido · ${formatDate(person.joined_at)}`
      : '—';

  return (
    <tr className={isSelected ? 'selected' : ''} onClick={onSelect} style={{ cursor: 'pointer' }}>
      <td onClick={(e) => e.stopPropagation()}><input type="checkbox" /></td>
      <td>
        <div className="person-cell">
          <div className={`avatar ${tone === 'coffee' ? 'coffee' : tone === 'navy' ? 'navy' : ''}`}>
            {initials}
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{tagPreview}</div>
          </div>
        </div>
      </td>
      <td className="muted tnum">{person.phone || '—'}</td>
      <td className="muted">{person.email || '—'}</td>
      <td><PersonBadge status={person.status} /></td>
      <td className="muted" style={{ fontSize: 12 }}>{lastActivity}</td>
      <td onClick={(e) => e.stopPropagation()}>
        <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-sm btn-ghost" title="Ver perfil" onClick={onSelect}>
            <Icon name="eye" size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function PersonBadge({ status }) {
  const label = STATUS_TO_UI[status] || status || '—';
  const tone = STATUS_TONE[status] || 'muted';
  return <Badge tone={tone} dot>{label}</Badge>;
}

// =====================================================================
// PersonDrawer — perfil completo con 4 tabs
// =====================================================================
function PersonDrawer({ personId, onClose, canEdit, canSeePrivateNotes, onSave, onToast, currentUserId, churchId }) {
  const [tab, setTab] = useState('Resumen');
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setEditing(false);
    setDetail(null);
    getPersonDetail(personId)
      .then(setDetail)
      .catch((e) => {
        console.error(e);
        onToast({ tone: 'error', icon: 'alert', title: 'No se pudo cargar el perfil', sub: e.message });
      });
  }, [personId]);

  if (!detail) {
    return (
      <div className="drawer-overlay" onClick={onClose}>
        <div className="drawer" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-header">
            <span style={{ color: 'var(--muted)' }}>Cargando…</span>
            <button className="icon-btn" onClick={onClose}><Icon name="x" /></button>
          </div>
          <div className="drawer-body">
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
              Cargando datos del perfil…
            </div>
          </div>
        </div>
      </div>
    );
  }

  const p = detail.person;
  const name = personDisplayName(p);
  const initials = personInitials(p);
  const tone = STATUS_TONE[p.status] || 'muted';

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div className={`avatar lg ${tone === 'coffee' ? 'coffee' : 'navy'}`}>{initials}</div>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>{name}</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                <PersonBadge status={p.status} />
                {detail.recurring && <Badge tone="coffee" icon="refresh">Recurrente</Badge>}
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>

        <div style={{ padding: '0 24px' }}>
          <div className="tabs-underline">
            {['Resumen', 'Donaciones', 'Seguimiento', 'Notas'].map((t) => (
              <button
                key={t}
                className={`tab-u ${tab === t ? 'active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="drawer-body">
          {tab === 'Resumen' && (
            <ProfileResumen
              detail={detail}
              editing={editing}
              canEdit={canEdit}
              onCancelEdit={() => setEditing(false)}
              onSaveEdit={async (patch) => {
                await onSave(personId, patch);
                setEditing(false);
              }}
            />
          )}
          {tab === 'Donaciones' && <ProfileDonaciones detail={detail} />}
          {tab === 'Seguimiento' && (
            <ProfileSeguimiento
              detail={detail}
              canSeePrivateNotes={canSeePrivateNotes}
              canWrite={canEdit}
              churchId={churchId}
              personId={personId}
              currentUserId={currentUserId}
              onToast={onToast}
              onRefresh={() => getPersonDetail(personId).then(setDetail)}
            />
          )}
          {tab === 'Notas' && (
            <ProfileNotas
              detail={detail}
              canSeePrivateNotes={canSeePrivateNotes}
              canWrite={canEdit}
              churchId={churchId}
              personId={personId}
              currentUserId={currentUserId}
              onToast={onToast}
              onRefresh={() => getPersonDetail(personId).then(setDetail)}
            />
          )}
        </div>

        {tab === 'Resumen' && (
          <div className="drawer-foot">
            <button
              className="btn btn-secondary"
              onClick={() => onToast({ tone: 'info', icon: 'info', title: 'Mensaje pendiente', sub: 'Comunicaciones se conectan en Fase futura.' })}
            >
              <Icon name="send" size={14} /> Enviar mensaje
            </button>
            {!editing && canEdit && (
              <button className="btn btn-primary" onClick={() => setEditing(true)}>
                <Icon name="edit" size={14} /> Editar persona
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// ProfileResumen — tab Resumen (con modo edit inline)
// =====================================================================
function ProfileResumen({ detail, editing, canEdit, onCancelEdit, onSaveEdit }) {
  const { person, householdMembers, household, aggregates, recurring } = detail;
  const tags = (person.tag_assignments || []).map((ta) => ta.tag).filter(Boolean);

  if (editing) {
    return <EditPersonForm person={person} onCancel={onCancelEdit} onSave={onSaveEdit} />;
  }

  const addr = person.address || {};
  const addrFull = [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ') || '—';
  const lastDonationLabel = aggregates.lastDonation
    ? `${formatMoney(Number(aggregates.lastDonation.amount_cents) / 100)} · ${formatRelativeTime(aggregates.lastDonation.donation_date)}`
    : 'Sin donaciones';
  const recurringLabel = recurring
    ? `Activa · ${formatMoney(Number(recurring.amount_cents) / 100)}/${recurring.frequency === 'monthly' ? 'mes' : 'año'}`
    : 'No activa';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Section title="Contacto">
        <InfoRow icon="phone" label="Teléfono" value={person.phone || '—'} />
        <InfoRow icon="mail" label="Email" value={person.email || '—'} />
        <InfoRow icon="map" label="Dirección" value={addrFull} />
      </Section>

      <Section title="Etiquetas">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {tags.length ? (
            tags.map((t) => (
              <Badge key={t.id} tone="coffee">{t.name}</Badge>
            ))
          ) : (
            <span className="muted" style={{ fontSize: 12 }}>Sin etiquetas</span>
          )}
        </div>
      </Section>

      {household && (
        <Section title={`Familia · ${household.name}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {householdMembers
              .filter((m) => m.person?.id !== person.id)
              .map((m) => (
                <FamilyRow
                  key={m.person.id}
                  name={personDisplayName(m.person)}
                  rel={m.relationship}
                  status={m.person.status}
                />
              ))}
            {householdMembers.length === 1 && (
              <span className="muted" style={{ fontSize: 12 }}>Sin otros miembros en el hogar.</span>
            )}
          </div>
        </Section>
      )}

      <Section title="Resumen de donaciones">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <MiniStat
            label="Total donado este año"
            value={formatMoney(aggregates.paidThisYearCents / 100)}
          />
          <MiniStat label="Última donación" value={lastDonationLabel} />
          <MiniStat
            label="Donación recurrente"
            value={recurringLabel}
            success={!!recurring}
          />
          <MiniStat label="Recibos generados" value={String(aggregates.receiptCount)} />
        </div>
      </Section>

      {(person.pastoral_note || person.next_followup_at) && (
        <Section title="Seguimiento">
          {person.next_followup_at && (
            <InfoRow
              icon="calendar"
              label="Próximo seguimiento"
              value={formatDate(person.next_followup_at)}
              highlight
            />
          )}
          {person.pastoral_note && (
            <InfoRow icon="fileText" label="Nota resumen" value={person.pastoral_note} />
          )}
        </Section>
      )}
    </div>
  );
}

// =====================================================================
// EditPersonForm — modo edit inline en el drawer
// =====================================================================
function EditPersonForm({ person, onCancel, onSave }) {
  const [form, setForm] = useState({
    person_type: person.person_type,
    first_name: person.first_name || '',
    last_name: person.last_name || '',
    organization_name: person.organization_name || '',
    email: person.email || '',
    phone: person.phone || '',
    status: person.status,
    pastoral_note: person.pastoral_note || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSave = async () => {
    // Validations
    if (form.person_type === 'individual' && !form.first_name?.trim() && !form.last_name?.trim()) {
      return alert('Persona individual: requiere al menos nombre o apellido.');
    }
    if (form.person_type === 'organization' && !form.organization_name?.trim()) {
      return alert('Organización: requiere nombre.');
    }
    if (form.email && !EMAIL_REGEX.test(form.email)) {
      return alert('Email inválido.');
    }
    setSaving(true);
    try {
      await onSave(form);
    } catch {
      // toast handled by parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Section title="Editar perfil">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {form.person_type === 'individual' ? (
            <>
              <div className="field">
                <label>Nombre</label>
                <input value={form.first_name} onChange={set('first_name')} autoFocus />
              </div>
              <div className="field">
                <label>Apellido</label>
                <input value={form.last_name} onChange={set('last_name')} />
              </div>
            </>
          ) : (
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Nombre de organización</label>
              <input value={form.organization_name} onChange={set('organization_name')} autoFocus />
            </div>
          )}
          <div className="field">
            <label>Teléfono</label>
            <input value={form.phone} onChange={set('phone')} placeholder="(305) 555-0000" />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="email@ejemplo.com" />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Tipo</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(STATUS_TO_UI).map(([dbVal, label]) => (
                <button
                  key={dbVal}
                  type="button"
                  className={`chip ${form.status === dbVal ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, status: dbVal })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Nota pastoral <span className="hint">(visible solo a admin/pastor)</span></label>
            <textarea value={form.pastoral_note} onChange={set('pastoral_note')} rows={3} />
          </div>
        </div>
      </Section>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Icon name="check" size={14} /> {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

// =====================================================================
// ProfileDonaciones
// =====================================================================
function ProfileDonaciones({ detail }) {
  const { donations, aggregates } = detail;
  const monthlyAvg = aggregates.paidThisYearCents / 100 / Math.max(1, new Date().getMonth() + 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <MiniStat label="Total este año" value={formatMoney(aggregates.paidThisYearCents / 100)} />
        <MiniStat label="Promedio mensual" value={formatMoney(Math.round(monthlyAvg))} />
      </div>
      <Section title={`Historial (${donations.length})`}>
        {donations.length === 0 && (
          <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
            Esta persona aún no ha registrado donaciones.
          </div>
        )}
        {donations.map((d) => (
          <div
            key={d.id}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '1px solid var(--border-soft)',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                {formatMoney(Number(d.amount_cents) / 100)} · {d.fund?.name || '—'}
                {d.campaign?.name && <span style={{ color: 'var(--muted)' }}> · {d.campaign.name}</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {formatDate(d.donation_date)} · {paymentMethodLabel(d.payment_method)}
              </div>
            </div>
            <PaymentStatusBadge status={d.payment_status} />
          </div>
        ))}
      </Section>
    </div>
  );
}

function paymentMethodLabel(m) {
  return ({
    card: 'Tarjeta', ach: 'ACH', cash: 'Efectivo',
    check: 'Cheque', stripe: 'Stripe', other: 'Otro',
  }[m]) || m;
}

function PaymentStatusBadge({ status }) {
  const map = {
    paid:     { tone: 'success', label: 'Pagada' },
    pending:  { tone: 'warning', label: 'Pendiente' },
    failed:   { tone: 'error', label: 'Fallida' },
    refunded: { tone: 'muted', label: 'Reembolsada' },
    disputed: { tone: 'error', label: 'Disputa' },
  };
  const m = map[status] || { tone: 'muted', label: status };
  return <Badge tone={m.tone} dot>{m.label}</Badge>;
}

// =====================================================================
// ProfileSeguimiento — followups públicos + agregar
// =====================================================================
function ProfileSeguimiento({ detail, canSeePrivateNotes, canWrite, churchId, personId, currentUserId, onToast, onRefresh }) {
  const { followups, person } = detail;
  // Only show non-private here (private goes to Notas tab)
  const items = followups.filter((f) => !f.is_private);
  const [showForm, setShowForm] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {person.next_followup_at && (
        <div className="banner info">
          <Icon name="info" />
          Próximo seguimiento: <strong>{formatDate(person.next_followup_at)}</strong>
        </div>
      )}
      {!showForm && canWrite && (
        <button
          className="btn btn-secondary"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => setShowForm(true)}
        >
          <Icon name="plus" size={14} /> Agregar seguimiento
        </button>
      )}
      {showForm && (
        <AddFollowupForm
          churchId={churchId}
          personId={personId}
          currentUserId={currentUserId}
          forcePrivate={false}
          onCancel={() => setShowForm(false)}
          onCreate={async () => {
            await onRefresh();
            setShowForm(false);
            onToast({ title: 'Seguimiento agregado' });
          }}
          onError={(msg) => onToast({ tone: 'error', icon: 'alert', title: 'Error', sub: msg })}
        />
      )}
      <Section title={`Historial pastoral (${items.length})`}>
        {items.length === 0 ? (
          <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
            Sin seguimientos públicos.
          </div>
        ) : (
          <div className="timeline">
            {items.map((f) => (
              <div key={f.id} className="timeline-item">
                <div className={`timeline-dot ${FOLLOWUP_TYPE_TONE[f.followup_type] || 'coffee'}`}>
                  <Icon name={FOLLOWUP_TYPE_ICON[f.followup_type] || 'info'} />
                </div>
                <div className="timeline-body">
                  <p><strong>{FOLLOWUP_TYPE_LABEL[f.followup_type]}:</strong> {f.title}</p>
                  {f.body && <p style={{ marginTop: 4, color: 'var(--muted)' }}>{f.body}</p>}
                  <span>{formatDate(f.occurred_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// =====================================================================
// ProfileNotas — followups privados (admin/pastor only)
// =====================================================================
function ProfileNotas({ detail, canSeePrivateNotes, canWrite, churchId, personId, currentUserId, onToast, onRefresh }) {
  const { followups } = detail;
  const items = followups.filter((f) => f.is_private);
  const [showForm, setShowForm] = useState(false);

  if (!canSeePrivateNotes) {
    return (
      <div className="banner">
        <Icon name="lock" />
        Las notas pastorales son privadas. Solo admin y pastor pueden verlas.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="banner">
        <Icon name="lock" />
        Las notas pastorales son privadas y solo visibles para admin/pastor.
      </div>
      {!showForm && canWrite && (
        <button
          className="btn btn-secondary"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => setShowForm(true)}
        >
          <Icon name="plus" size={14} /> Agregar nota
        </button>
      )}
      {showForm && (
        <AddFollowupForm
          churchId={churchId}
          personId={personId}
          currentUserId={currentUserId}
          forcePrivate={true}
          onCancel={() => setShowForm(false)}
          onCreate={async () => {
            await onRefresh();
            setShowForm(false);
            onToast({ title: 'Nota agregada' });
          }}
          onError={(msg) => onToast({ tone: 'error', icon: 'alert', title: 'Error', sub: msg })}
        />
      )}
      {items.length === 0 ? (
        <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
          Sin notas privadas todavía.
        </div>
      ) : (
        items.map((f) => (
          <div
            key={f.id}
            style={{
              background: 'var(--bg)', padding: 14, borderRadius: 12,
              border: '1px solid var(--border-soft)',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
              {FOLLOWUP_TYPE_LABEL[f.followup_type]} · {formatDate(f.occurred_at)}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{f.title}</div>
            {f.body && <div style={{ fontSize: 13, lineHeight: 1.55 }}>{f.body}</div>}
          </div>
        ))
      )}
    </div>
  );
}

// =====================================================================
// AddFollowupForm — used by both Seguimiento and Notas tabs
// =====================================================================
function AddFollowupForm({ churchId, personId, currentUserId, forcePrivate, onCancel, onCreate, onError }) {
  const [type, setType] = useState(forcePrivate ? 'note' : 'visit');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return alert('Título requerido');
    setSaving(true);
    try {
      await createFollowup(
        churchId,
        personId,
        { followup_type: type, title, body, is_private: forcePrivate },
        currentUserId
      );
      onCreate();
    } catch (e) {
      onError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        background: 'var(--bg)', padding: 14, borderRadius: 12,
        border: '1px solid var(--border-soft)',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <div className="field">
        <label>Tipo</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.entries(FOLLOWUP_TYPE_LABEL).map(([k, v]) => (
            <button key={k} type="button" className={`chip ${type === k ? 'active' : ''}`} onClick={() => setType(k)}>
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Título</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Breve descripción" autoFocus />
      </div>
      <div className="field">
        <label>Detalles <span className="hint">(opcional)</span></label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button className="btn btn-sm btn-ghost" onClick={onCancel} disabled={saving}>Cancelar</button>
        <button className="btn btn-sm btn-primary" onClick={handleSubmit} disabled={saving || !title.trim()}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

// =====================================================================
// AddPersonModal
// =====================================================================
function AddPersonModal({ onClose, onCreate }) {
  const [personType, setPersonType] = useState('individual');
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    organization_name: '',
    phone: '',
    email: '',
    status: 'visitor',
    pastoral_note: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async () => {
    const errs = {};
    if (personType === 'individual') {
      if (!form.first_name?.trim() && !form.last_name?.trim()) {
        errs.name = 'Requiere al menos nombre o apellido';
      }
    } else {
      if (!form.organization_name?.trim()) errs.org = 'Nombre de organización requerido';
    }
    if (form.email && !EMAIL_REGEX.test(form.email)) errs.email = 'Email inválido';
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaving(true);
    await onCreate({ ...form, person_type: personType });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Agregar persona</h3>
            <p>Captura la información esencial. Podrás completar el perfil después.</p>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="modal-body">
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Tipo de registro</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className={`chip ${personType === 'individual' ? 'active' : ''}`}
                onClick={() => setPersonType('individual')}
              >
                <Icon name="user" size={12} /> Individuo
              </button>
              <button
                type="button"
                className={`chip ${personType === 'organization' ? 'active' : ''}`}
                onClick={() => setPersonType('organization')}
              >
                <Icon name="folder" size={12} /> Organización
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {personType === 'individual' ? (
              <>
                <div className="field">
                  <label>Nombre</label>
                  <input value={form.first_name} onChange={set('first_name')} placeholder="María" autoFocus />
                </div>
                <div className="field">
                  <label>Apellido</label>
                  <input value={form.last_name} onChange={set('last_name')} placeholder="González" />
                </div>
                {errors.name && (
                  <div style={{ gridColumn: '1 / -1', color: 'var(--error)', fontSize: 12 }}>{errors.name}</div>
                )}
              </>
            ) : (
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Nombre de organización</label>
                <input value={form.organization_name} onChange={set('organization_name')} placeholder="ABC Construction LLC" autoFocus />
                {errors.org && <div style={{ color: 'var(--error)', fontSize: 12 }}>{errors.org}</div>}
              </div>
            )}
            <div className="field">
              <label>Teléfono</label>
              <input value={form.phone} onChange={set('phone')} placeholder="(305) 555-0000" />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={set('email')} placeholder="email@ejemplo.com" />
              {errors.email && <div style={{ color: 'var(--error)', fontSize: 12 }}>{errors.email}</div>}
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Tipo</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.entries(STATUS_TO_UI).map(([dbVal, label]) => (
                  <button
                    key={dbVal}
                    type="button"
                    className={`chip ${form.status === dbVal ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, status: dbVal })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Notas <span className="hint">(opcional)</span></label>
              <textarea
                value={form.pastoral_note}
                onChange={set('pastoral_note')}
                placeholder="Observaciones pastorales, contexto familiar, etc."
              />
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            <Icon name="check" size={14} /> {saving ? 'Guardando…' : 'Guardar persona'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// Mini-components
// =====================================================================
function Section({ title, children }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11, fontWeight: 700, color: 'var(--muted)',
          textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  );
}

function InfoRow({ icon, label, value, highlight }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
      <div
        style={{
          width: 30, height: 30, borderRadius: 8,
          background: highlight ? 'var(--coffee-bg)' : 'var(--bg-2)',
          color: highlight ? 'var(--coffee)' : 'var(--muted)',
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}
      >
        <Icon name={icon} size={14} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 500, wordBreak: 'break-word' }}>{value}</div>
      </div>
    </div>
  );
}

function FamilyRow({ name, rel, status }) {
  const RELATIONSHIPS = {
    head: 'Cabeza', spouse: 'Cónyuge', child: 'Hijo/a',
    parent: 'Padre/Madre', sibling: 'Hermano/a',
    grandparent: 'Abuelo/a', other: 'Otro', member: 'Miembro',
  };
  const i = name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 8px', borderRadius: 8, background: 'var(--bg)',
      }}
    >
      <div className="avatar sm">{i}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{RELATIONSHIPS[rel] || rel}</div>
      </div>
      {status && <PersonBadge status={status} />}
    </div>
  );
}

function MiniStat({ label, value, success }) {
  return (
    <div
      style={{
        padding: 12, borderRadius: 10, background: 'var(--bg)',
        border: '1px solid var(--border-soft)',
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
      <div
        style={{
          fontSize: 14, fontWeight: 700,
          color: success ? 'var(--success)' : 'var(--text)',
        }}
      >
        {value}
      </div>
    </div>
  );
}
