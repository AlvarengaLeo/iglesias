// PortalScreen — Fase 8: conectado a Supabase.
// Editor de 6 secciones que actualiza portal_settings.draft_data.
// Guardar persiste draft, Publicar via rpc_publish_portal, Descartar via rpc_discard_portal_draft.
// Service times reales desde tabla. Toggle campaign.is_visible_on_portal.

import { useState, useEffect, useMemo, useRef } from 'react';
import { Icon } from '../components/Icon.jsx';
import { Badge } from '../components/Badge.jsx';
import { AssetUploader } from '../components/AssetUploader.jsx';
import { useChurch } from '../hooks/useChurch.js';
import { useRole } from '../hooks/useRole.js';
import {
  getPortalSettings, saveDraft, publishPortal, discardDraft, hasUnsavedChanges, getPublicPortalBySlug,
} from '../api/portal.js';
import {
  listServiceTimes, createServiceTime, updateServiceTime, deleteServiceTime, DAYS,
} from '../api/serviceTimes.js';
import { listFunds } from '../api/funds.js';
import { listCampaigns, setCampaignVisibility } from '../api/campaigns.js';
import { updateChurchLogoUrl, updateChurchFaviconUrl } from '../api/churches.js';
import { deleteChurchAsset, pathFromPublicUrl } from '../lib/storage.js';
import { formatDate } from '../lib/formatters.js';
import { ContentModule } from './ContentModule.jsx';
import { HOME_COPY_DEFAULTS } from '../lib/homeCopyDefaults.js';

// Secciones de configuración del portal (modelo draft/publish via portal_settings).
const SECTIONS = [
  { id: 'identidad', label: 'Identidad', icon: 'sparkle' },
  { id: 'inicio',    label: 'Inicio',    icon: 'home' },
  { id: 'home',      label: 'Textos de la home', icon: 'fileText' },
  { id: 'horarios',  label: 'Horarios',  icon: 'clock' },
  { id: 'donaciones',label: 'Donaciones',icon: 'dollar' },
  { id: 'campanas',  label: 'Campañas visibles', icon: 'target' },
  { id: 'contacto',  label: 'Contacto',  icon: 'mail' },
  // Presencia institucional (contenido público en inglés)
  { id: 'about',     label: 'About / Story',  icon: 'info' },
  { id: 'beliefs',   label: 'What We Believe', icon: 'book' },
  { id: 'media',     label: 'Watch & Gallery', icon: 'monitor' },
];

// Secciones de contenido (tablas live, sin draft/publish). Se editan en inglés
// porque alimentan el portal público (inglés).
const CONTENT_SECTIONS = [
  { id: 'sermones',    label: 'Sermons',    icon: 'book',     type: 'sermons' },
  { id: 'eventos',     label: 'Events',     icon: 'calendar', type: 'events' },
  { id: 'podcast',     label: 'Podcast',    icon: 'activity', type: 'podcast' },
  { id: 'ministerios', label: 'Ministries', icon: 'users',    type: 'ministries' },
];
const CONTENT_BY_ID = Object.fromEntries(CONTENT_SECTIONS.map((s) => [s.id, s]));

export function PortalScreen({ onToast }) {
  const { church, churchId, refreshChurch } = useChurch();
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
  // Filled by PortalPreview — lets editors scroll the live preview to a section
  // and flash it ("Show in preview"), so non-tech users see what they're editing.
  const previewApi = useRef(null);
  const showInPreview = (sectionId) => previewApi.current?.scrollTo(sectionId);

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

  const isContent = !!CONTENT_BY_ID[section];

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
          {!isContent && (isDirty || hasUnpublished) && (
            <button className="btn btn-ghost" onClick={handleDiscard} disabled={!canEdit || saving}>
              <Icon name="x" size={14} /> Descartar
            </button>
          )}
          {!isContent && (
            <button className="btn btn-secondary" onClick={handleSave} disabled={!canEdit || !isDirty || saving}>
              <Icon name="save" size={14} /> {saving ? 'Guardando…' : 'Guardar'}
            </button>
          )}
          {!isContent && (
            <button className="btn btn-primary" onClick={handlePublish} disabled={!canPublish || saving}>
              <Icon name="upload" size={14} /> Publicar portal
            </button>
          )}
        </div>
      </div>

      {!isContent && (isDirty || hasUnpublished) && (
        <div className="banner warning" style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: 'var(--warning-bg)', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #F0DCC2' }}>
          <Icon name="alert" />
          Hay cambios sin {isDirty ? 'guardar' : 'publicar'}. {isDirty ? 'Guarda primero para crear un borrador.' : 'Tus visitantes aún ven la versión publicada.'}
        </div>
      )}

      <div className="grid grid-12" style={{ gap: 16 }}>
        {/* Left: sections nav (config + content groups) */}
        <div className="col-span-2">
          <div className="card" style={{ padding: 8, height: 'fit-content' }}>
            <div className="sidebar-section-label" style={{ padding: '6px 10px' }}>Configuración</div>
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
            <div className="sidebar-section-label" style={{ padding: '12px 10px 6px' }}>Contenido del sitio</div>
            {CONTENT_SECTIONS.map((s) => (
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
        </div>

        {isContent ? (
          /* Content sections: full-width manager, no draft preview */
          <div className="col-span-10">
            <div className="card" style={{ padding: 24 }}>
              <ContentModule
                type={CONTENT_BY_ID[section].type}
                churchId={churchId}
                canEdit={canEdit}
                onToast={onToast}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Config editor */}
            <div className="col-span-5">
              <div className="card" style={{ padding: 24 }}>
                {section === 'identidad' && <IdentidadEditor draft={draft.identity || {}} church={church} churchId={churchId} onChange={(p) => updateDraft('identity', p)} canEdit={canEdit} onToast={onToast} refreshChurch={refreshChurch} />}
                {section === 'inicio' && <InicioEditor draft={draft.hero || {}} onChange={(p) => updateDraft('hero', p)} canEdit={canEdit} onToast={onToast} churchId={churchId} onShowInPreview={showInPreview} />}
                {section === 'home' && <HomeTextsEditor draft={draft.home || {}} onChange={(p) => updateDraft('home', p)} canEdit={canEdit} onShowInPreview={showInPreview} />}
                {section === 'horarios' && <HorariosEditor serviceTimes={serviceTimes} churchId={churchId} canEdit={canEdit} onToast={onToast} onRefresh={refetch} />}
                {section === 'donaciones' && <DonacionesEditor draft={draft.donations || {}} funds={funds} onChange={(p) => updateDraft('donations', p)} canEdit={canEdit} />}
                {section === 'campanas' && <CampanasEditor campaigns={campaigns} onToast={onToast} onRefresh={refetch} canEdit={canEdit} />}
                {section === 'contacto' && <ContactoEditor draft={draft.contact || {}} onChange={(p) => updateDraft('contact', p)} canEdit={canEdit} />}
                {section === 'about' && <AboutEditor draft={draft.about || {}} onChange={(p) => updateDraft('about', p)} canEdit={canEdit} />}
                {section === 'beliefs' && <BeliefsEditor draft={draft.beliefs || {}} onChange={(p) => updateDraft('beliefs', p)} canEdit={canEdit} />}
                {section === 'media' && <MediaEditor draft={draft.media || {}} churchId={churchId} onChange={(p) => updateDraft('media', p)} canEdit={canEdit} onToast={onToast} />}
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
                apiRef={previewApi}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// IdentidadEditor
// ============================================================
// El logo es atributo de la iglesia (churches.logo_url) — único source of truth.
// El portal público lo lee de ahí vía rpc_public_portal_by_slug.
// Cambiarlo aquí o en Configuración tiene el mismo efecto.
function IdentidadEditor({ draft, church, churchId, onChange, canEdit, onToast, refreshChurch }) {
  const handleLogoUploaded = async ({ publicUrl, path }) => {
    try {
      const oldPath = pathFromPublicUrl(church?.logo_url);
      if (oldPath && oldPath !== path) {
        await deleteChurchAsset(oldPath).catch(() => {});
      }
      await updateChurchLogoUrl(churchId, publicUrl);
      await refreshChurch?.();
      onToast({ title: 'Logo actualizado', sub: 'Visible en sidebar y portal público.' });
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'No se pudo guardar el logo', sub: e.message });
    }
  };

  const handleLogoRemove = async () => {
    try {
      const oldPath = pathFromPublicUrl(church?.logo_url);
      if (oldPath) await deleteChurchAsset(oldPath).catch(() => {});
      await updateChurchLogoUrl(churchId, null);
      await refreshChurch?.();
      onToast({ title: 'Logo eliminado' });
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'No se pudo eliminar', sub: e.message });
    }
  };

  const handleFaviconUploaded = async ({ publicUrl, path }) => {
    try {
      const oldPath = pathFromPublicUrl(church?.favicon_url);
      if (oldPath && oldPath !== path) await deleteChurchAsset(oldPath).catch(() => {});
      await updateChurchFaviconUrl(churchId, publicUrl);
      await refreshChurch?.();
      onToast({ title: 'Favicon actualizado', sub: 'Es el ícono de la pestaña de tu portal.' });
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'No se pudo guardar el favicon', sub: e.message });
    }
  };

  const handleFaviconRemove = async () => {
    try {
      const oldPath = pathFromPublicUrl(church?.favicon_url);
      if (oldPath) await deleteChurchAsset(oldPath).catch(() => {});
      await updateChurchFaviconUrl(churchId, null);
      await refreshChurch?.();
      onToast({ title: 'Favicon eliminado' });
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'No se pudo eliminar', sub: e.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <H title="Identidad" desc="Cómo aparece tu iglesia en el portal público." />
      <div className="field">
        <label>Logo</label>
        <AssetUploader
          churchId={churchId}
          kind="logo"
          currentUrl={church?.logo_url}
          shape="circle"
          disabled={!canEdit}
          label={church?.logo_url ? 'Cambiar logo' : 'Subir logo'}
          helpText="Idealmente cuadrado. PNG o SVG con fondo transparente se ven mejor. Se aplica de inmediato al sidebar y al portal."
          onUploaded={handleLogoUploaded}
          onRemove={church?.logo_url ? handleLogoRemove : undefined}
        />
      </div>
      <div className="field">
        <label>Favicon</label>
        <AssetUploader
          churchId={churchId}
          kind="favicon"
          currentUrl={church?.favicon_url}
          shape="square"
          disabled={!canEdit}
          label={church?.favicon_url ? 'Cambiar favicon' : 'Subir favicon'}
          helpText="El ícono de la pestaña del navegador de tu portal. Imagen cuadrada (ideal 512×512), PNG con fondo transparente. Si no subes uno, se usa tu logo. Se aplica de inmediato."
          onUploaded={handleFaviconUploaded}
          onRemove={church?.favicon_url ? handleFaviconRemove : undefined}
        />
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
function InicioEditor({ draft, onChange, canEdit, onToast, churchId, onShowInPreview }) {
  const handleUploaded = async ({ publicUrl, path }) => {
    const oldPath = pathFromPublicUrl(draft.image_url);
    if (oldPath && oldPath !== path) {
      await deleteChurchAsset(oldPath).catch(() => {});
    }
    onChange({ image_url: publicUrl });
    onToast({ title: 'Imagen actualizada', sub: 'Recuerda "Guardar" y luego "Publicar" para que aparezca en el portal público.' });
  };

  const handleRemoveImage = async () => {
    const oldPath = pathFromPublicUrl(draft.image_url);
    if (oldPath) await deleteChurchAsset(oldPath).catch(() => {});
    onChange({ image_url: null });
    onToast({ title: 'Imagen eliminada del draft' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <H
        title="Inicio (hero)"
        desc="La sección principal del portal público — la primera imagen y titular que ven tus visitantes."
        action={onShowInPreview && (
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => onShowInPreview('pp-hero')} title="Resalta esta sección en la vista previa">
            <Icon name="eye" size={13} /> Ver en la vista previa
          </button>
        )}
      />
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
        <AssetUploader
          churchId={churchId}
          kind="hero"
          currentUrl={draft.image_url}
          shape="rect"
          disabled={!canEdit}
          label={draft.image_url ? 'Cambiar imagen' : 'Subir imagen'}
          helpText="Recomendado: 1600×900 px. Se mostrará como banner principal del portal."
          onUploaded={handleUploaded}
          onRemove={draft.image_url ? handleRemoveImage : undefined}
        />
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
// AboutEditor (Our Story) — published_data.about
// ============================================================
// ============================================================
// HomeTextsEditor — editable home-page copy (published_data.home)
// Section eyebrows/titles/leads + the 3 "Plan your visit" cards + Give block.
// Empty fields fall back to HOME_COPY_DEFAULTS on the public site.
// ============================================================
// Plain-language map of every editable home-page block: a friendly name, a
// one-line "where it appears", the live preview anchor, and its fields with the
// visual ROLE each one plays (so a non-tech user knows what they're touching).
const HOME_SECTIONS = [
  {
    group: 'welcome', icon: 'sparkle', name: 'Welcome', anchor: 'pp-welcome',
    where: 'The short greeting band right below your hero image.',
    fields: [{ key: 'eyebrow', label: 'Kicker label', role: 'kicker' }],
    footnote: 'The big heading and paragraph here come from your “About / Story” section.',
  },
  {
    group: 'life', icon: 'image', name: 'Life Together', anchor: 'pp-life',
    where: 'The community photo collage. Shows up once you add 3+ photos in “Watch & Gallery”.',
    fields: [
      { key: 'eyebrow', label: 'Kicker label', role: 'kicker' },
      { key: 'title', label: 'Heading', role: 'heading' },
      { key: 'lead', label: 'Paragraph', role: 'paragraph', area: true, rows: 3 },
    ],
  },
  {
    group: 'plan', icon: 'map', name: 'Plan Your Visit', anchor: 'pp-plan',
    where: 'The “first visit” section with three info cards: service times, location, what to expect.',
    fields: [
      { key: 'eyebrow', label: 'Kicker label', role: 'kicker' },
      { key: 'title', label: 'Heading', role: 'heading' },
      { key: 'lead', label: 'Paragraph', role: 'paragraph', area: true },
      { key: 'when_title', label: 'Card 1 — title (service times)', role: 'card' },
      { key: 'where_title', label: 'Card 2 — title (location)', role: 'card' },
      { key: 'where_note', label: 'Card 2 — extra note', role: 'cardnote', area: true },
      { key: 'expect_title', label: 'Card 3 — title (what to expect)', role: 'card' },
      { key: 'expect_body', label: 'Card 3 — paragraph', role: 'cardnote', area: true, rows: 4 },
    ],
  },
  {
    group: 'message', icon: 'monitor', name: 'Latest Message', anchor: 'pp-message',
    where: 'The featured sermon block. Appears when you have a visible sermon.',
    fields: [
      { key: 'eyebrow', label: 'Kicker label', role: 'kicker' },
      { key: 'title', label: 'Heading', role: 'heading' },
      { key: 'lead', label: 'Paragraph', role: 'paragraph', area: true },
    ],
  },
  {
    group: 'events', icon: 'calendar', name: 'Events', anchor: 'pp-events',
    where: 'The upcoming-events row. Appears when you have future events.',
    fields: [
      { key: 'eyebrow', label: 'Kicker label', role: 'kicker' },
      { key: 'title', label: 'Heading', role: 'heading' },
    ],
  },
  {
    group: 'ministries', icon: 'users', name: 'Ministries', anchor: 'pp-ministries',
    where: 'The ministries & projects row. Appears when you feature ministries.',
    fields: [
      { key: 'eyebrow', label: 'Kicker label', role: 'kicker' },
      { key: 'title', label: 'Heading', role: 'heading' },
    ],
  },
  {
    group: 'campaigns', icon: 'target', name: 'Campaigns', anchor: 'pp-campaigns',
    where: 'The fundraising campaigns block. Appears when a campaign is visible on the portal.',
    fields: [
      { key: 'eyebrow', label: 'Kicker label', role: 'kicker' },
      { key: 'title', label: 'Heading', role: 'heading' },
      { key: 'sub', label: 'Subtitle', role: 'paragraph' },
    ],
  },
  {
    group: 'podcast', icon: 'activity', name: 'Podcast', anchor: 'pp-podcast',
    where: 'The podcast teaser. Appears when you have a published episode.',
    fields: [
      { key: 'eyebrow', label: 'Kicker label', role: 'kicker' },
      { key: 'title', label: 'Heading', role: 'heading' },
    ],
  },
  {
    group: 'give', icon: 'heart', name: 'Give', anchor: 'give',
    where: 'The dark “Be part of the work” donation band near the bottom.',
    fields: [
      { key: 'eyebrow', label: 'Kicker label', role: 'kicker' },
      { key: 'title', label: 'Heading', role: 'heading' },
      { key: 'text', label: 'Paragraph', role: 'paragraph', area: true },
      { key: 'cta', label: 'Button text', role: 'button' },
    ],
  },
  {
    group: 'contact', icon: 'mail', name: 'Contact', anchor: 'contact',
    where: 'The contact section with your address, phone and map at the very bottom.',
    fields: [
      { key: 'eyebrow', label: 'Kicker label', role: 'kicker' },
      { key: 'title', label: 'Heading', role: 'heading' },
      { key: 'sub', label: 'Subtitle', role: 'paragraph' },
    ],
  },
];

const ROLE_TAG = {
  kicker: 'Kicker',
  heading: 'Heading',
  paragraph: 'Paragraph',
  card: 'Card title',
  cardnote: 'Card text',
  button: 'Button',
};

const roleChipStyle = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase',
  padding: '2px 7px', borderRadius: 999, background: 'var(--coffee-bg)', color: 'var(--coffee)',
  whiteSpace: 'nowrap',
};
const sectionCardStyle = {
  border: '1px solid var(--border-soft)', borderRadius: 12, padding: 16, background: 'var(--bg)',
};
const sectionIconBadge = {
  width: 30, height: 30, borderRadius: 8, background: 'var(--coffee-bg)', color: 'var(--coffee)',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

function HomeTextsEditor({ draft, onChange, canEdit, onShowInPreview }) {
  // Pass `undefined` as value to clear an override and fall back to the suggested copy.
  const setField = (group, key, value) =>
    onChange({ [group]: { ...(draft[group] || {}), [key]: value } });

  // Inline render (NOT a nested component) so inputs keep focus across keystrokes.
  const renderField = (group, f) => {
    const def = HOME_COPY_DEFAULTS[group]?.[f.key] ?? '';
    const saved = draft[group]?.[f.key];
    const hasOverride = typeof saved === 'string';
    // The box mirrors what the visitor sees: the church's own text, or — if they
    // never touched it — the suggested wording that's currently live, ready to edit.
    const value = hasOverride ? saved : def;
    const isCustom = hasOverride && saved.trim() !== '' && saved !== def;
    const isBlank = hasOverride && saved.trim() === '';
    const common = {
      value,
      onChange: (e) => setField(group, f.key, e.target.value),
      disabled: !canEdit,
    };
    return (
      <div className="field" key={`${group}.${f.key}`} style={{ margin: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <label style={{ margin: 0 }}>{f.label}</label>
          <span style={roleChipStyle}>{ROLE_TAG[f.role] || 'Text'}</span>
          {isCustom && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--coffee)' }}>• Custom</span>}
          <span style={{ flex: 1 }} />
          {hasOverride && canEdit && (
            <button
              type="button" className="btn btn-sm btn-ghost" style={{ fontSize: 11, padding: '2px 7px' }}
              onClick={() => setField(group, f.key, undefined)} title="Restore the suggested wording"
            >
              <Icon name="refresh" size={11} /> Reset
            </button>
          )}
        </div>
        {f.area
          ? <textarea {...common} rows={f.rows || 2} />
          : <input {...common} />}
        {isBlank && (
          <span className="hint">Empty — the portal will show the suggested text: “{def}”.</span>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <H
        title="Home page texts"
        desc="Every label and paragraph on your public home page — already filled in with the exact wording your visitors see right now. Change any box to make it yours; clear it to go back to the suggestion. Written in English (the portal’s language)."
      />
      {HOME_SECTIONS.map((sec) => (
        <section key={sec.group} style={sectionCardStyle}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
            <span style={sectionIconBadge}><Icon name={sec.icon} size={15} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{sec.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{sec.where}</div>
            </div>
            {onShowInPreview && (
              <button
                type="button" className="btn btn-sm btn-ghost" style={{ flexShrink: 0 }}
                onClick={() => onShowInPreview(sec.anchor)}
                title="Scroll the live preview on the right to this section and highlight it"
              >
                <Icon name="eye" size={13} /> Show in preview
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {sec.fields.map((f) => renderField(sec.group, f))}
          </div>
          {sec.footnote && (
            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <Icon name="info" size={12} /> <span>{sec.footnote}</span>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function AboutEditor({ draft, onChange, canEdit }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <H title="About / Our Story" desc="Tu página pública 'About'. Escribe en inglés (es el idioma del portal)." />
      <div className="field">
        <label>Headline</label>
        <input value={draft.headline || ''} onChange={(e) => onChange({ headline: e.target.value })} disabled={!canEdit} placeholder="Welcome to our church family" />
      </div>
      <div className="field">
        <label>Tagline <span className="hint">(optional)</span></label>
        <input value={draft.tagline || ''} onChange={(e) => onChange({ tagline: e.target.value })} disabled={!canEdit} placeholder="A place to belong, believe, and become" />
      </div>
      <div className="field">
        <label>Our story</label>
        <textarea value={draft.story || ''} onChange={(e) => onChange({ story: e.target.value })} disabled={!canEdit} rows={6} placeholder="Tell the story of your church… (separate paragraphs with a blank line)" />
        <span className="hint">Separa párrafos con una línea en blanco.</span>
      </div>
      <div className="field">
        <label>Mission <span className="hint">(optional)</span></label>
        <textarea value={draft.mission || ''} onChange={(e) => onChange({ mission: e.target.value })} disabled={!canEdit} rows={2} />
      </div>
      <div className="field">
        <label>Vision <span className="hint">(optional)</span></label>
        <textarea value={draft.vision || ''} onChange={(e) => onChange({ vision: e.target.value })} disabled={!canEdit} rows={2} />
      </div>
    </div>
  );
}

// ============================================================
// BeliefsEditor (What We Believe) — published_data.beliefs
// ============================================================
function BeliefsEditor({ draft, onChange, canEdit }) {
  const items = Array.isArray(draft.items) ? draft.items : [];
  const setItem = (i, patch) => {
    const next = items.map((it, idx) => (idx === i ? { ...it, ...patch } : it));
    onChange({ items: next });
  };
  const addItem = () => onChange({ items: [...items, { title: '', text: '' }] });
  const removeItem = (i) => onChange({ items: items.filter((_, idx) => idx !== i) });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <H title="What We Believe" desc="Declaración de fe. Cada punto aparece como una tarjeta en la página About." action={canEdit ? (
        <button className="btn btn-sm btn-primary" onClick={addItem}><Icon name="plus" size={12} /> Add</button>
      ) : null} />
      <div className="field">
        <label>Intro <span className="hint">(optional)</span></label>
        <textarea value={draft.intro || ''} onChange={(e) => onChange({ intro: e.target.value })} disabled={!canEdit} rows={2} />
      </div>
      {items.length === 0 && <div style={{ padding: 16, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>Sin puntos. Click "Add".</div>}
      {items.map((it, i) => (
        <div key={i} style={{ padding: 12, border: '1px solid var(--border-soft)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ flex: 1 }} value={it.title || ''} onChange={(e) => setItem(i, { title: e.target.value })} disabled={!canEdit} placeholder="The Bible" />
            {canEdit && <button className="btn btn-sm btn-ghost" onClick={() => removeItem(i)}><Icon name="x" size={14} /></button>}
          </div>
          <textarea value={it.text || ''} onChange={(e) => setItem(i, { text: e.target.value })} disabled={!canEdit} rows={2} placeholder="We believe the Bible is the inspired Word of God…" />
        </div>
      ))}
    </div>
  );
}

// ============================================================
// MediaEditor (Watch Live + Photo gallery) — published_data.media
// ============================================================
function MediaEditor({ draft, churchId, onChange, canEdit, onToast }) {
  const gallery = Array.isArray(draft.gallery) ? draft.gallery : [];
  const addPhoto = ({ publicUrl }) => {
    onChange({ gallery: [...gallery, { url: publicUrl, caption: '' }] });
    onToast?.({ title: 'Foto agregada', sub: 'Recuerda Guardar y Publicar.' });
  };
  const setCaption = (i, caption) => onChange({ gallery: gallery.map((g, idx) => (idx === i ? { ...g, caption } : g)) });
  const removePhoto = async (i) => {
    const g = gallery[i];
    const path = pathFromPublicUrl(g?.url);
    if (path) await deleteChurchAsset(path).catch(() => {});
    onChange({ gallery: gallery.filter((_, idx) => idx !== i) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <H title="Watch Live & Gallery" desc="Transmisión en vivo y galería de fotos del portal." />
      <div className="field">
        <label>Watch Live URL <span className="hint">(YouTube/Facebook Live)</span></label>
        <input value={draft.live_url || ''} onChange={(e) => onChange({ live_url: e.target.value })} disabled={!canEdit} placeholder="https://youtube.com/@tuiglesia/live" />
        <span className="hint">Si está vacío, el botón "Watch Live" no aparece.</span>
      </div>
      <div className="field">
        <label>Agregar foto a la galería</label>
        <AssetUploader
          churchId={churchId}
          kind="gallery"
          shape="rect"
          disabled={!canEdit}
          label="Subir foto"
          helpText="Cada foto subida se agrega a la galería. PNG/JPG/WebP, máx 2 MB."
          onUploaded={addPhoto}
        />
      </div>
      {gallery.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
          {gallery.map((g, i) => (
            <div key={i} style={{ border: '1px solid var(--border-soft)', borderRadius: 8, overflow: 'hidden' }}>
              <img src={g.url} alt="" style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />
              <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <input style={{ fontSize: 12 }} value={g.caption || ''} onChange={(e) => setCaption(i, e.target.value)} disabled={!canEdit} placeholder="Caption" />
                {canEdit && <button className="btn btn-sm btn-ghost" onClick={() => removePhoto(i)}><Icon name="x" size={12} /> Quitar</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PortalPreview — live, true-to-design preview.
// Embeds the REAL public portal (portal.html?preview=1) in an iframe and
// streams the current draft to it over postMessage, so it renders pixel-for-
// pixel like the public site and updates as you type. Content arrays
// (sermons/events/…) are borrowed from the published version. Scaled to fit.
// ============================================================
const PREVIEW_DEVICES = {
  desktop: { w: 1280, h: 1640 },
  mobile: { w: 390, h: 800 },
};

function PortalPreview({ draft, device, onDeviceChange, church, serviceTimes, campaigns, funds, apiRef }) {
  const slug = church?.slug || '';
  const frameRef = useRef(null);
  const readyRef = useRef(false);
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [realData, setRealData] = useState(null);

  // Borrow the published portal's real content arrays (sermons/events/projects/
  // podcast live in tables, not in the draft). Falls back to empty if unpublished.
  useEffect(() => {
    let alive = true;
    if (!slug) { setRealData(null); return undefined; }
    getPublicPortalBySlug(slug)
      .then((d) => { if (alive) setRealData(d); })
      .catch(() => { if (alive) setRealData(null); });
    return () => { alive = false; };
  }, [slug]);

  // Exact shape the public PortalApp/HomePage expect — with the DRAFT as
  // published_data so unsaved edits preview live.
  const previewData = useMemo(() => {
    const base = realData || {
      campaigns: [], serviceTimes: [], funds: [],
      latestSermons: [], upcomingEvents: [], featuredProjects: [], latestPodcast: [],
      payment_available: false,
    };
    return {
      ...base,
      church: church || base.church || {},
      portal: { published_data: draft || {}, published_at: null },
      serviceTimes: (serviceTimes || []).filter((s) => s.is_active !== false),
      campaigns: campaigns || [],
      funds: funds || [],
    };
  }, [realData, church, draft, serviceTimes, campaigns, funds]);

  const dataRef = useRef(previewData);
  const post = () => {
    const w = frameRef.current?.contentWindow;
    if (w && readyRef.current) {
      w.postMessage({ source: 'portal-admin-preview', data: dataRef.current }, window.location.origin);
    }
  };

  // Handshake: the iframe announces it's ready to receive the draft.
  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin !== window.location.origin) return;
      if (e.data && e.data.source === 'portal-preview-ready') { readyRef.current = true; post(); }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // Re-stream whenever the draft (or borrowed content) changes.
  useEffect(() => { dataRef.current = previewData; post(); }, [previewData]);

  // Expose a scrollTo() so editors can reveal+flash the section being edited.
  useEffect(() => {
    if (!apiRef) return undefined;
    apiRef.current = {
      scrollTo: (sectionId) => {
        const w = frameRef.current?.contentWindow;
        if (w) w.postMessage({ source: 'portal-admin-scroll', section: sectionId }, window.location.origin);
      },
    };
    return () => { apiRef.current = null; };
  }, [apiRef]);

  // Scale the device frame to the available pane width.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const compute = () => setScale(Math.min(1, el.clientWidth / PREVIEW_DEVICES[device].w));
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [device]);

  const dev = PREVIEW_DEVICES[device];

  return (
    <div className="card" style={{ position: 'sticky', top: 88 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Vista previa</div>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 999, background: 'var(--coffee-bg)', color: 'var(--coffee)' }}>EN VIVO</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className={`btn btn-sm ${device === 'desktop' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onDeviceChange('desktop')} aria-label="Vista escritorio">
            <Icon name="monitor" size={12} />
          </button>
          <button className={`btn btn-sm ${device === 'mobile' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onDeviceChange('mobile')} aria-label="Vista móvil">
            <Icon name="smartphone" size={12} />
          </button>
        </div>
      </div>

      <div ref={wrapRef} style={{ padding: 16, background: 'var(--bg)', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: dev.w * scale,
          height: dev.h * scale,
          overflow: 'hidden',
          borderRadius: device === 'mobile' ? 22 : 12,
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border-soft)',
          background: '#fff',
        }}>
          <iframe
            ref={frameRef}
            title="Vista previa del portal público"
            src={`/portal.html?slug=${encodeURIComponent(slug || 'preview')}&preview=1`}
            onLoad={() => post()}
            style={{ width: dev.w, height: dev.h, border: 0, transform: `scale(${scale})`, transformOrigin: 'top left', display: 'block' }}
          />
        </div>
      </div>

      <div style={{ padding: '10px 20px 16px', fontSize: 11, color: 'var(--muted)', borderTop: '1px solid var(--border-soft)' }}>
        Refleja tus cambios sin guardar. El contenido (sermones, eventos…) muestra la versión publicada.
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
