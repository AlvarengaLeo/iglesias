// PortalScreen — Fase 8: conectado a Supabase.
// Editor de 6 secciones que actualiza portal_settings.draft_data.
// Guardar persiste draft, Publicar via rpc_publish_portal, Descartar via rpc_discard_portal_draft.
// Service times reales desde tabla. Toggle campaign.is_visible_on_portal.

import { useState, useEffect, useMemo } from 'react';
import { Icon } from '../components/Icon.jsx';
import { Badge } from '../components/Badge.jsx';
import { useChurch } from '../hooks/useChurch.js';
import { useRole } from '../hooks/useRole.js';
import {
  getPortalSettings, saveDraft, publishPortal, discardDraft, hasUnsavedChanges,
} from '../api/portal.js';
import {
  listServiceTimes, createServiceTime, updateServiceTime, deleteServiceTime, DAYS,
} from '../api/serviceTimes.js';
import { listFunds } from '../api/funds.js';
import { listCampaigns, setCampaignVisibility } from '../api/campaigns.js';
import { formatDate } from '../lib/formatters.js';

const SECTIONS = [
  { id: 'identidad', label: 'Identidad', icon: 'sparkle' },
  { id: 'inicio',    label: 'Inicio',    icon: 'home' },
  { id: 'horarios',  label: 'Horarios',  icon: 'clock' },
  { id: 'donaciones',label: 'Donaciones',icon: 'dollar' },
  { id: 'campanas',  label: 'Campañas visibles', icon: 'target' },
  { id: 'contacto',  label: 'Contacto',  icon: 'mail' },
];

export function PortalScreen({ onToast }) {
  const { church, churchId } = useChurch();
  const { can } = useRole();
  const canEdit = can('portal.write');
  const canPublish = can('portal.publish');

  const [section, setSection] = useState('identidad');
  const [device, setDevice] = useState('desktop');
  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState(null); // local working copy
  const [serviceTimes, setServiceTimes] = useState([]);
  const [funds, setFunds] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [saving, setSaving] = useState(false);

  const refetch = async () => {
    if (!churchId) return;
    try {
      const [s, st, f, c] = await Promise.all([
        getPortalSettings(churchId),
        listServiceTimes(churchId),
        listFunds(churchId),
        listCampaigns(churchId, { activeOnly: true }),
      ]);
      setSettings(s);
      setDraft(s.draft_data || {});
      setServiceTimes(st);
      setFunds(f);
      setCampaigns(c);
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'Error al cargar portal', sub: e.message });
    }
  };

  useEffect(() => { refetch(); }, [churchId]);

  const isDirty = useMemo(() => {
    if (!settings || !draft) return false;
    return JSON.stringify(draft) !== JSON.stringify(settings.draft_data);
  }, [draft, settings]);

  const hasUnpublished = useMemo(() => {
    if (!settings) return false;
    return hasUnsavedChanges(settings);
  }, [settings]);

  const publishStatusBadge = useMemo(() => {
    if (!settings) return null;
    if (hasUnpublished || isDirty) return <Badge tone="warning" dot>Cambios sin publicar</Badge>;
    if (settings.publish_status === 'published') return <Badge tone="success" dot>Publicado</Badge>;
    return <Badge tone="muted" dot>Borrador</Badge>;
  }, [settings, hasUnpublished, isDirty]);

  const updateDraft = (sectionKey, patch) => {
    setDraft({
      ...draft,
      [sectionKey]: { ...(draft[sectionKey] || {}), ...patch },
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await saveDraft(churchId, draft);
      setSettings(updated);
      onToast({ title: 'Cambios guardados correctamente', sub: 'Tu portal sigue en borrador hasta que publiques.' });
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'Error al guardar', sub: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (isDirty) {
      // Save first
      await handleSave();
    }
    if (!window.confirm('¿Publicar los cambios al portal público? Tus visitantes verán las actualizaciones inmediatamente.')) return;
    setSaving(true);
    try {
      await publishPortal(churchId);
      onToast({ title: 'Portal publicado correctamente', sub: 'Tus cambios ya son visibles para tu comunidad.' });
      await refetch();
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'Error al publicar', sub: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = async () => {
    if (!window.confirm('¿Descartar los cambios sin publicar? Esta acción no se puede deshacer.')) return;
    setSaving(true);
    try {
      await discardDraft(churchId);
      onToast({ title: 'Cambios descartados', sub: 'El borrador volvió al estado publicado.' });
      await refetch();
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'Error al descartar', sub: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (!settings || !draft) {
    return (
      <div className="page">
        <div className="page-header">
          <h2 className="page-greeting">Portal</h2>
        </div>
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Cargando…</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-text">
          <h2 className="page-greeting">Portal</h2>
          <p className="page-sub">Administra la información pública de tu iglesia · {publishStatusBadge}</p>
        </div>
        <div className="page-actions">
          {settings?.publish_status === 'published' && church?.slug && (
            <a
              className="btn btn-ghost"
              href={`/portal.html?slug=${encodeURIComponent(church.slug)}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir el portal público en una nueva pestaña"
            >
              <Icon name="arrowUpRight" size={14} /> Ver portal público
            </a>
          )}
          {(isDirty || hasUnpublished) && (
            <button className="btn btn-ghost" onClick={handleDiscard} disabled={!canEdit || saving}>
              <Icon name="x" size={14} /> Descartar
            </button>
          )}
          <button className="btn btn-secondary" onClick={handleSave} disabled={!canEdit || !isDirty || saving}>
            <Icon name="save" size={14} /> {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button className="btn btn-primary" onClick={handlePublish} disabled={!canPublish || saving}>
            <Icon name="upload" size={14} /> Publicar portal
          </button>
        </div>
      </div>

      {(isDirty || hasUnpublished) && (
        <div className="banner warning" style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: 'var(--warning-bg)', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #F0DCC2' }}>
          <Icon name="alert" />
          Hay cambios sin {isDirty ? 'guardar' : 'publicar'}. {isDirty ? 'Guarda primero para crear un borrador.' : 'Tus visitantes aún ven la versión publicada.'}
        </div>
      )}

      <div className="grid grid-12" style={{ gap: 16 }}>
        {/* Left: sections nav + editor */}
        <div className="col-span-7" style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 16 }}>
          <div className="card" style={{ padding: 8, height: 'fit-content' }}>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                className={`nav-item ${section === s.id ? 'active' : ''}`}
                style={{ color: section === s.id ? 'var(--coffee)' : 'var(--text)', background: section === s.id ? 'var(--coffee-bg)' : 'transparent' }}
                onClick={() => setSection(s.id)}
              >
                <Icon name={s.icon} size={14} /> {s.label}
              </button>
            ))}
          </div>

          <div className="card" style={{ padding: 24 }}>
            {section === 'identidad' && <IdentidadEditor draft={draft.identity || {}} church={church} onChange={(p) => updateDraft('identity', p)} canEdit={canEdit} onToast={onToast} />}
            {section === 'inicio' && <InicioEditor draft={draft.hero || {}} onChange={(p) => updateDraft('hero', p)} canEdit={canEdit} onToast={onToast} />}
            {section === 'horarios' && <HorariosEditor serviceTimes={serviceTimes} churchId={churchId} canEdit={canEdit} onToast={onToast} onRefresh={refetch} />}
            {section === 'donaciones' && <DonacionesEditor draft={draft.donations || {}} funds={funds} onChange={(p) => updateDraft('donations', p)} canEdit={canEdit} />}
            {section === 'campanas' && <CampanasEditor campaigns={campaigns} onToast={onToast} onRefresh={refetch} canEdit={canEdit} />}
            {section === 'contacto' && <ContactoEditor draft={draft.contact || {}} onChange={(p) => updateDraft('contact', p)} canEdit={canEdit} />}
          </div>
        </div>

        {/* Right: preview */}
        <div className="col-span-5">
          <PortalPreview
            draft={draft}
            published={settings.published_data}
            device={device}
            onDeviceChange={setDevice}
            church={church}
            serviceTimes={serviceTimes}
            campaigns={campaigns.filter((c) => c.is_visible_on_portal)}
            funds={funds}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// IdentidadEditor
// ============================================================
function IdentidadEditor({ draft, church, onChange, canEdit, onToast }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <H title="Identidad" desc="Cómo aparece tu iglesia en el portal público." />
      <div className="field">
        <label>Logo</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, background: draft.logo_url ? `url(${draft.logo_url}) center/cover` : 'var(--coffee)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
            {!draft.logo_url && (church?.public_name || 'CR').split(' ').slice(0,2).map((w) => w[0]).join('').toUpperCase()}
          </div>
          <button className="btn btn-sm btn-secondary" onClick={() => onToast({ tone: 'info', icon: 'info', title: 'Upload pendiente', sub: 'Subida de logo requiere Supabase Storage (Fase 11+).' })} disabled={!canEdit}>
            <Icon name="upload" size={12} /> Cambiar logo
          </button>
        </div>
      </div>
      <div className="field">
        <label>Nombre público</label>
        <input value={draft.public_name || church?.public_name || ''} onChange={(e) => onChange({ public_name: e.target.value })} disabled={!canEdit} />
        <span className="hint">El nombre que aparece en hero, header y URL</span>
      </div>
      <div className="field">
        <label>Color principal</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#8A6A4A', '#1F2B38', '#3D5681', '#4F9D7B', '#C25C5C', '#864F8C'].map((c) => (
            <button key={c} type="button" onClick={() => canEdit && onChange({ primary_color: c })} disabled={!canEdit}
              style={{ width: 36, height: 36, borderRadius: 8, background: c, border: (draft.primary_color || '#8A6A4A') === c ? '3px solid var(--text)' : '1px solid var(--border)', cursor: canEdit ? 'pointer' : 'default' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// InicioEditor (hero)
// ============================================================
function InicioEditor({ draft, onChange, canEdit, onToast }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <H title="Inicio (hero)" desc="La sección principal del portal público." />
      <div className="field">
        <label>Título principal</label>
        <input value={draft.title || ''} onChange={(e) => onChange({ title: e.target.value })} disabled={!canEdit} placeholder="Una casa de fe..." maxLength={120} />
      </div>
      <div className="field">
        <label>Mensaje de bienvenida</label>
        <textarea value={draft.message || ''} onChange={(e) => onChange({ message: e.target.value })} disabled={!canEdit} rows={4} maxLength={500} />
        <span className="hint">{(draft.message || '').length} / 500 caracteres</span>
      </div>
      <div className="field">
        <label>Texto del botón principal</label>
        <input value={draft.cta_text || ''} onChange={(e) => onChange({ cta_text: e.target.value })} disabled={!canEdit} placeholder="Donar ahora" />
      </div>
      <div className="field">
        <label>Imagen principal</label>
        <button className="btn btn-sm btn-secondary" onClick={() => onToast({ tone: 'info', icon: 'info', title: 'Upload pendiente', sub: 'Subida de imagen requiere Supabase Storage (Fase 11+).' })} disabled={!canEdit}>
          <Icon name="image" size={12} /> {draft.image_url ? 'Cambiar imagen' : 'Subir imagen'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// HorariosEditor — service_times CRUD
// ============================================================
function HorariosEditor({ serviceTimes, churchId, canEdit, onToast, onRefresh }) {
  const [editing, setEditing] = useState(null); // null or service_time row
  const [adding, setAdding] = useState(false);

  const handleSave = async (payload) => {
    try {
      if (editing && editing.id) {
        await updateServiceTime(editing.id, payload);
        onToast({ title: 'Horario actualizado' });
      } else {
        await createServiceTime(churchId, payload);
        onToast({ title: 'Horario agregado' });
      }
      await onRefresh();
      setEditing(null);
      setAdding(false);
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'Error', sub: e.message });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este horario?')) return;
    try {
      await deleteServiceTime(id);
      onToast({ title: 'Horario eliminado' });
      await onRefresh();
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'Error', sub: e.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <H title="Horarios" desc="Servicios y reuniones que aparecen en el portal." action={canEdit && !adding ? (
        <button className="btn btn-sm btn-primary" onClick={() => setAdding(true)}><Icon name="plus" size={12} /> Agregar</button>
      ) : null} />
      {serviceTimes.filter((s) => s.is_active).map((s) => (
        editing?.id === s.id ? (
          <HorarioForm key={s.id} initial={s} onCancel={() => setEditing(null)} onSave={handleSave} />
        ) : (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px solid var(--border-soft)', borderRadius: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{DAYS[s.day_of_week]} · {s.start_time?.slice(0, 5)}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.meeting_type} · {s.location || '—'}</div>
            </div>
            {canEdit && (
              <>
                <button className="btn btn-sm btn-ghost" onClick={() => setEditing(s)} title="Editar"><Icon name="edit" size={14} /></button>
                <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(s.id)} title="Eliminar"><Icon name="x" size={14} /></button>
              </>
            )}
          </div>
        )
      ))}
      {adding && <HorarioForm onCancel={() => setAdding(false)} onSave={handleSave} />}
      {serviceTimes.filter((s) => s.is_active).length === 0 && !adding && (
        <div style={{ padding: 20, color: 'var(--muted)', textAlign: 'center', fontSize: 13 }}>Sin horarios. Click "Agregar".</div>
      )}
    </div>
  );
}

function HorarioForm({ initial, onCancel, onSave }) {
  const [form, setForm] = useState({
    day_of_week: initial?.day_of_week ?? 0,
    start_time: initial?.start_time?.slice(0, 5) || '10:00',
    duration_min: initial?.duration_min || 90,
    meeting_type: initial?.meeting_type || '',
    location: initial?.location || '',
    address: initial?.address || '',
  });

  return (
    <div style={{ padding: 14, border: '2px solid var(--coffee)', borderRadius: 10, background: 'var(--bg)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="field">
          <label>Día</label>
          <select value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: Number(e.target.value) })}>
            {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Hora</label>
          <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Tipo de reunión</label>
          <input value={form.meeting_type} onChange={(e) => setForm({ ...form, meeting_type: e.target.value })} placeholder="Servicio dominical" />
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Lugar</label>
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Sede principal" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 10 }}>
        <button className="btn btn-sm btn-ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn btn-sm btn-primary" onClick={() => onSave(form)} disabled={!form.meeting_type}>Guardar</button>
      </div>
    </div>
  );
}

// ============================================================
// DonacionesEditor (portal donations section)
// ============================================================
function DonacionesEditor({ draft, funds, onChange, canEdit }) {
  const frequencies = ['one_time', 'monthly', 'annual'];
  const FREQUENCY_LABEL = { one_time: 'Única', monthly: 'Mensual', annual: 'Anual' };
  const visible = draft.visible_frequencies || ['one_time', 'monthly'];

  const toggleFreq = (f) => {
    if (!canEdit) return;
    const next = visible.includes(f) ? visible.filter((x) => x !== f) : [...visible, f];
    onChange({ visible_frequencies: next });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <H title="Donaciones" desc="Cómo aparece el botón de donar en el portal." />
      <div className="field">
        <label>Texto del botón donar</label>
        <input value={draft.button_text || 'Donar ahora'} onChange={(e) => onChange({ button_text: e.target.value })} disabled={!canEdit} />
      </div>
      <div className="field">
        <label>Fondo predeterminado</label>
        <select value={draft.default_fund_id || ''} onChange={(e) => onChange({ default_fund_id: e.target.value })} disabled={!canEdit}>
          <option value="">Seleccionar fondo</option>
          {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Frecuencias visibles</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {frequencies.map((f) => (
            <button key={f} type="button" className={`chip ${visible.includes(f) ? 'active' : ''}`} onClick={() => toggleFreq(f)} disabled={!canEdit}>
              {FREQUENCY_LABEL[f]}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={!!draft.show_recurring} onChange={(e) => onChange({ show_recurring: e.target.checked })} disabled={!canEdit} />
          Mostrar opción de donación recurrente
        </label>
      </div>
    </div>
  );
}

// ============================================================
// CampanasEditor
// ============================================================
function CampanasEditor({ campaigns, onToast, onRefresh, canEdit }) {
  const handleToggle = async (c) => {
    try {
      await setCampaignVisibility(c.id, !c.is_visible_on_portal);
      onToast({ title: c.is_visible_on_portal ? 'Campaña oculta del portal' : 'Campaña visible en portal' });
      await onRefresh();
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'Error', sub: e.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <H title="Campañas visibles" desc="Selecciona qué campañas activas aparecen en el portal público." />
      {campaigns.length === 0 ? (
        <div style={{ padding: 20, color: 'var(--muted)', textAlign: 'center', fontSize: 13 }}>Sin campañas activas. Créalas en el módulo Donaciones.</div>
      ) : (
        campaigns.map((c) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px solid var(--border-soft)', borderRadius: 10 }}>
            <Icon name="target" size={16} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Meta · ${(c.goal_cents / 100).toLocaleString()}</div>
            </div>
            <button onClick={() => canEdit && handleToggle(c)} disabled={!canEdit} className={`toggle ${c.is_visible_on_portal ? 'on' : ''}`} aria-label="Toggle visibility" />
          </div>
        ))
      )}
    </div>
  );
}

// ============================================================
// ContactoEditor
// ============================================================
function ContactoEditor({ draft, onChange, canEdit }) {
  const social = draft.social || {};
  const setSocial = (k, v) => onChange({ social: { ...social, [k]: v } });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <H title="Contacto" desc="Información de contacto en el portal público." />
      <div className="field">
        <label>Dirección</label>
        <input value={draft.address || ''} onChange={(e) => onChange({ address: e.target.value })} disabled={!canEdit} />
      </div>
      <div className="field">
        <label>Teléfono</label>
        <input value={draft.phone || ''} onChange={(e) => onChange({ phone: e.target.value })} disabled={!canEdit} />
      </div>
      <div className="field">
        <label>Email</label>
        <input type="email" value={draft.email || ''} onChange={(e) => onChange({ email: e.target.value })} disabled={!canEdit} />
      </div>
      <div className="field">
        <label>Enlace de mapa</label>
        <input value={draft.map_url || ''} onChange={(e) => onChange({ map_url: e.target.value })} disabled={!canEdit} placeholder="https://maps.google.com/?q=..." />
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 8 }}>Redes sociales</div>
      <div className="field">
        <label>Facebook</label>
        <input value={social.facebook || ''} onChange={(e) => setSocial('facebook', e.target.value)} disabled={!canEdit} placeholder="@usuario" />
      </div>
      <div className="field">
        <label>Instagram</label>
        <input value={social.instagram || ''} onChange={(e) => setSocial('instagram', e.target.value)} disabled={!canEdit} placeholder="@usuario" />
      </div>
      <div className="field">
        <label>YouTube</label>
        <input value={social.youtube || ''} onChange={(e) => setSocial('youtube', e.target.value)} disabled={!canEdit} placeholder="@canal" />
      </div>
      <div className="field">
        <label>WhatsApp</label>
        <input value={social.whatsapp || ''} onChange={(e) => setSocial('whatsapp', e.target.value)} disabled={!canEdit} placeholder="+13055550100" />
      </div>
    </div>
  );
}

// ============================================================
// PortalPreview — preview con desktop/mobile
// ============================================================
function PortalPreview({ draft, published, device, onDeviceChange, church, serviceTimes, campaigns, funds }) {
  const identity = draft.identity || {};
  const hero = draft.hero || {};
  const donations = draft.donations || {};
  const contact = draft.contact || {};
  const color = identity.primary_color || '#8A6A4A';

  return (
    <div className="card" style={{ position: 'sticky', top: 88 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Vista previa</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className={`btn btn-sm ${device === 'desktop' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onDeviceChange('desktop')}>
            <Icon name="monitor" size={12} />
          </button>
          <button className={`btn btn-sm ${device === 'mobile' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onDeviceChange('mobile')}>
            <Icon name="smartphone" size={12} />
          </button>
        </div>
      </div>

      <div style={{ padding: 16, background: 'var(--bg)' }}>
        <div style={{
          maxWidth: device === 'mobile' ? 320 : '100%',
          margin: '0 auto',
          background: '#fff',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
          fontSize: 12,
          minHeight: 480,
        }}>
          {/* Hero */}
          <div style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: '#fff', padding: device === 'mobile' ? 20 : 32, textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'inline-grid', placeItems: 'center', fontWeight: 700, marginBottom: 12 }}>
              {(identity.public_name || church?.public_name || 'CR').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
            </div>
            <div style={{ fontWeight: 700, fontSize: device === 'mobile' ? 16 : 22, marginBottom: 6 }}>{identity.public_name || church?.public_name || 'Iglesia'}</div>
            {hero.title && <div style={{ fontSize: device === 'mobile' ? 13 : 15, opacity: 0.95, marginBottom: 8 }}>{hero.title}</div>}
            {hero.message && <p style={{ margin: '12px 0', opacity: 0.85, lineHeight: 1.5 }}>{hero.message}</p>}
            <button style={{ marginTop: 12, padding: '10px 22px', background: '#fff', color, border: 'none', borderRadius: 999, fontWeight: 700, cursor: 'pointer' }}>
              {donations.button_text || hero.cta_text || 'Donar ahora'}
            </button>
          </div>

          {/* Horarios */}
          {serviceTimes.length > 0 && (
            <div style={{ padding: device === 'mobile' ? 16 : 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>Horarios</div>
              {serviceTimes.filter((s) => s.is_active).map((s) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 11, color: 'var(--text)' }}>
                  <span style={{ fontWeight: 600 }}>{DAYS[s.day_of_week]} {s.start_time?.slice(0, 5)}</span>
                  <span style={{ color: 'var(--muted)' }}>{s.meeting_type}</span>
                </div>
              ))}
            </div>
          )}

          {/* Campañas */}
          {campaigns.length > 0 && (
            <div style={{ padding: device === 'mobile' ? 16 : 24, borderTop: '1px solid var(--border-soft)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>Campañas</div>
              {campaigns.slice(0, 3).map((c) => (
                <div key={c.id} style={{ padding: 8, marginBottom: 6, border: '1px solid var(--border-soft)', borderRadius: 8, fontSize: 11, color: 'var(--text)' }}>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  <div style={{ color: 'var(--muted)', marginTop: 2 }}>Meta · ${(c.goal_cents / 100).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}

          {/* Contacto */}
          {(contact.address || contact.phone || contact.email) && (
            <div style={{ padding: device === 'mobile' ? 16 : 24, borderTop: '1px solid var(--border-soft)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>Contacto</div>
              {contact.address && <div style={{ padding: '4px 0', fontSize: 11, color: 'var(--text)' }}><Icon name="map" size={11} /> {contact.address}</div>}
              {contact.phone && <div style={{ padding: '4px 0', fontSize: 11, color: 'var(--text)' }}><Icon name="phone" size={11} /> {contact.phone}</div>}
              {contact.email && <div style={{ padding: '4px 0', fontSize: 11, color: 'var(--text)' }}><Icon name="mail" size={11} /> {contact.email}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================
function H({ title, desc, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 8 }}>
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h3>
        {desc && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{desc}</div>}
      </div>
      {action}
    </div>
  );
}
