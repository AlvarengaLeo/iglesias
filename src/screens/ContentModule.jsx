// ContentModule — reusable single-type manager for portal content.
// Embedded as sections inside PortalScreen (Sermons / Events / Podcast / Ministries).
// Live tables (save immediately) + visibility/featured toggles. Strings in English.

import { useState, useEffect } from 'react';
import { Icon } from '../components/Icon.jsx';
import { AssetUploader } from '../components/AssetUploader.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { formatDate } from '../lib/formatters.js';
import {
  listSermons, createSermon, updateSermon, deleteSermon, setSermonVisibility,
} from '../api/sermons.js';
import {
  listEvents, createEvent, updateEvent, deleteEvent, setEventVisibility, setEventFeatured,
} from '../api/events.js';
import {
  listEpisodes, createEpisode, updateEpisode, deleteEpisode, setEpisodeVisibility,
} from '../api/podcast.js';
import {
  listProjects, createProject, updateProject, deleteProject, setProjectVisibility, setProjectFeatured,
} from '../api/projects.js';
import { listFunds } from '../api/funds.js';
import { listCampaigns } from '../api/campaigns.js';

// datetime-local <-> ISO helpers
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (val) => (val ? new Date(val).toISOString() : null);

const CONFIG = {
  sermons: {
    list: listSermons, create: createSermon, update: updateSermon, del: deleteSermon,
    vis: setSermonVisibility, feat: null, add: 'Add sermon',
  },
  events: {
    list: listEvents, create: createEvent, update: updateEvent, del: deleteEvent,
    vis: setEventVisibility, feat: setEventFeatured, add: 'Add event',
  },
  podcast: {
    list: listEpisodes, create: createEpisode, update: updateEpisode, del: deleteEpisode,
    vis: setEpisodeVisibility, feat: null, add: 'Add episode',
  },
  ministries: {
    list: listProjects, create: createProject, update: updateProject, del: deleteProject,
    vis: setProjectVisibility, feat: setProjectFeatured, add: 'Add ministry',
  },
};

export function ContentModule({ type, churchId, canEdit, onToast }) {
  const cfg = CONFIG[type];
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { row } — row=null for create
  const [extra, setExtra] = useState({ funds: [], campaigns: [] }); // for ministries donation target

  const refetch = async () => {
    if (!churchId) return;
    setLoading(true);
    try {
      setRows(await cfg.list(churchId));
      if (type === 'ministries') {
        const [funds, campaigns] = await Promise.all([listFunds(churchId), listCampaigns(churchId)]);
        setExtra({ funds, campaigns });
      }
    } catch (e) {
      onToast?.({ tone: 'error', icon: 'alert', title: 'Failed to load', sub: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refetch(); }, [churchId, type]);

  const handleDelete = async (row) => {
    if (!window.confirm('Delete this item? It will disappear from the portal.')) return;
    try { await cfg.del(row.id); onToast?.({ title: 'Deleted' }); await refetch(); }
    catch (e) { onToast?.({ tone: 'error', icon: 'alert', title: 'Delete failed', sub: e.message }); }
  };
  const handleToggle = async (row) => {
    try { await cfg.vis(row.id, !row.is_visible_on_portal); onToast?.({ title: row.is_visible_on_portal ? 'Hidden' : 'Published' }); await refetch(); }
    catch (e) { onToast?.({ tone: 'error', icon: 'alert', title: 'Update failed', sub: e.message }); }
  };
  const handleFeature = async (row) => {
    try { await cfg.feat(row.id, !row.is_featured); onToast?.({ title: row.is_featured ? 'Unfeatured' : 'Featured' }); await refetch(); }
    catch (e) { onToast?.({ tone: 'error', icon: 'alert', title: 'Update failed', sub: e.message }); }
  };
  const handleSave = async (payload) => {
    try {
      if (modal.row) await cfg.update(modal.row.id, payload);
      else await cfg.create(churchId, payload, user?.id);
      onToast?.({ title: modal.row ? 'Saved' : 'Created' });
      setModal(null);
      await refetch();
    } catch (e) { onToast?.({ tone: 'error', icon: 'alert', title: 'Save failed', sub: e.message }); }
  };

  const Table = { sermons: SermonsTable, events: EventsTable, podcast: PodcastTable, ministries: MinistriesTable }[type];
  const Modal = { sermons: SermonModal, events: EventModal, podcast: EpisodeModal, ministries: MinistryModal }[type];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          <Icon name="info" size={12} /> Changes here go live on the portal immediately (no publish needed).
        </div>
        <button className="btn btn-sm btn-primary" onClick={() => setModal({ row: null })} disabled={!canEdit}>
          <Icon name="plus" size={12} /> {cfg.add}
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>
      ) : (
        <Table rows={rows} canEdit={canEdit}
          onEdit={(row) => setModal({ row })}
          onDelete={handleDelete}
          onToggle={handleToggle}
          onFeature={cfg.feat ? handleFeature : undefined}
        />
      )}

      {modal && <Modal churchId={churchId} row={modal.row} extra={extra} onClose={() => setModal(null)} onSave={handleSave} />}
    </div>
  );
}

// ---------- Shared bits ----------
function VisibilityCell({ visible, onToggle, canEdit }) {
  return (
    <button className="btn btn-sm btn-ghost" onClick={onToggle} disabled={!canEdit} title={visible ? 'Visible on portal — click to hide' : 'Hidden — click to publish'}>
      <Icon name={visible ? 'eye' : 'eyeOff'} size={14} /> {visible ? 'Visible' : 'Hidden'}
    </button>
  );
}
function RowActions({ onEdit, onDelete, canEdit }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
      <button className="btn btn-sm btn-ghost" onClick={onEdit} disabled={!canEdit}><Icon name="edit" size={14} /></button>
      <button className="btn btn-sm btn-ghost" onClick={onDelete} disabled={!canEdit}><Icon name="x" size={14} /></button>
    </div>
  );
}
function EmptyRow({ cols, label }) {
  return <tr><td colSpan={cols} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>{label}</td></tr>;
}

// ---------- Tables ----------
function SermonsTable({ rows, canEdit, onEdit, onDelete, onToggle }) {
  return (
    <table className="table">
      <thead><tr><th>Title</th><th>Series</th><th>Speaker</th><th>Date</th><th>Status</th><th></th></tr></thead>
      <tbody>
        {rows.length === 0 ? <EmptyRow cols={6} label="No sermons yet." /> : rows.map((r) => (
          <tr key={r.id}>
            <td style={{ fontWeight: 600 }}>{r.title}</td>
            <td>{r.series || '—'}</td>
            <td>{r.speaker || '—'}</td>
            <td>{formatDate(r.sermon_date)}</td>
            <td><VisibilityCell visible={r.is_visible_on_portal} canEdit={canEdit} onToggle={() => onToggle(r)} /></td>
            <td><RowActions canEdit={canEdit} onEdit={() => onEdit(r)} onDelete={() => onDelete(r)} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EventsTable({ rows, canEdit, onEdit, onDelete, onToggle, onFeature }) {
  return (
    <table className="table">
      <thead><tr><th>Title</th><th>When</th><th>Location</th><th>Featured</th><th>Status</th><th></th></tr></thead>
      <tbody>
        {rows.length === 0 ? <EmptyRow cols={6} label="No events yet." /> : rows.map((r) => (
          <tr key={r.id}>
            <td style={{ fontWeight: 600 }}>{r.title}</td>
            <td>{formatDate(r.starts_at)}</td>
            <td>{r.location || '—'}</td>
            <td>
              <button className="btn btn-sm btn-ghost" onClick={() => onFeature(r)} disabled={!canEdit} title="Toggle featured on home">
                <Icon name="star" size={14} /> {r.is_featured ? 'Yes' : 'No'}
              </button>
            </td>
            <td><VisibilityCell visible={r.is_visible_on_portal} canEdit={canEdit} onToggle={() => onToggle(r)} /></td>
            <td><RowActions canEdit={canEdit} onEdit={() => onEdit(r)} onDelete={() => onDelete(r)} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PodcastTable({ rows, canEdit, onEdit, onDelete, onToggle }) {
  return (
    <table className="table">
      <thead><tr><th>Title</th><th>Season/Ep</th><th>Published</th><th>Status</th><th></th></tr></thead>
      <tbody>
        {rows.length === 0 ? <EmptyRow cols={5} label="No episodes yet." /> : rows.map((r) => (
          <tr key={r.id}>
            <td style={{ fontWeight: 600 }}>{r.title}</td>
            <td>{[r.season ? `S${r.season}` : null, r.episode_number ? `E${r.episode_number}` : null].filter(Boolean).join(' · ') || '—'}</td>
            <td>{formatDate(r.published_at)}</td>
            <td><VisibilityCell visible={r.is_visible_on_portal} canEdit={canEdit} onToggle={() => onToggle(r)} /></td>
            <td><RowActions canEdit={canEdit} onEdit={() => onEdit(r)} onDelete={() => onDelete(r)} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MinistriesTable({ rows, canEdit, onEdit, onDelete, onToggle, onFeature }) {
  return (
    <table className="table">
      <thead><tr><th>Name</th><th>Category</th><th>Featured</th><th>Status</th><th></th></tr></thead>
      <tbody>
        {rows.length === 0 ? <EmptyRow cols={5} label="No ministries yet." /> : rows.map((r) => (
          <tr key={r.id}>
            <td style={{ fontWeight: 600 }}>{r.name}</td>
            <td style={{ textTransform: 'capitalize' }}>{r.category}</td>
            <td>
              <button className="btn btn-sm btn-ghost" onClick={() => onFeature(r)} disabled={!canEdit} title="Toggle featured on home">
                <Icon name="star" size={14} /> {r.is_featured ? 'Yes' : 'No'}
              </button>
            </td>
            <td><VisibilityCell visible={r.is_visible_on_portal} canEdit={canEdit} onToggle={() => onToggle(r)} /></td>
            <td><RowActions canEdit={canEdit} onEdit={() => onEdit(r)} onDelete={() => onDelete(r)} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------- Modals ----------
function ModalShell({ title, sub, onClose, onSave, canSave = true, saveLabel = 'Save', children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div><h3>{title}</h3>{sub && <p>{sub}</p>}</div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onSave} disabled={!canSave}>
            <Icon name="check" size={14} /> {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 };
const full = { gridColumn: '1 / -1' };

function SermonModal({ churchId, row, onClose, onSave }) {
  const [f, setF] = useState({
    title: row?.title || '', speaker: row?.speaker || '', series: row?.series || '',
    scripture_reference: row?.scripture_reference || '',
    sermon_date: row?.sermon_date || new Date().toISOString().slice(0, 10),
    description: row?.description || '', video_url: row?.video_url || '', audio_url: row?.audio_url || '',
    thumbnail_url: row?.thumbnail_url || null,
    duration_min: row?.duration_seconds ? Math.round(row.duration_seconds / 60) : '',
    is_visible_on_portal: row?.is_visible_on_portal || false,
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = () => onSave({ ...f, duration_seconds: f.duration_min ? Number(f.duration_min) * 60 : null });

  return (
    <ModalShell title={row ? 'Edit sermon' : 'Add sermon'} sub="Video/audio is embedded from YouTube, Vimeo, etc." onClose={onClose} onSave={save} canSave={!!f.title.trim() && (!!f.video_url.trim() || !!f.audio_url.trim())}>
      <div style={grid2}>
        <div className="field" style={full}><label>Title</label><input value={f.title} onChange={set('title')} autoFocus /></div>
        <div className="field"><label>Speaker</label><input value={f.speaker} onChange={set('speaker')} /></div>
        <div className="field"><label>Series</label><input value={f.series} onChange={set('series')} /></div>
        <div className="field"><label>Date</label><input type="date" value={f.sermon_date} onChange={set('sermon_date')} /></div>
        <div className="field"><label>Scripture <span className="hint">(optional)</span></label><input value={f.scripture_reference} onChange={set('scripture_reference')} placeholder="John 3:16-18" /></div>
        <div className="field" style={full}><label>Video URL <span className="hint">(YouTube / Vimeo)</span></label><input value={f.video_url} onChange={set('video_url')} placeholder="https://youtube.com/watch?v=…" /></div>
        <div className="field"><label>Audio URL <span className="hint">(optional)</span></label><input value={f.audio_url} onChange={set('audio_url')} /></div>
        <div className="field"><label>Duration (min) <span className="hint">(optional)</span></label><input value={f.duration_min} onChange={set('duration_min')} inputMode="numeric" /></div>
        <div className="field" style={full}><label>Description</label><textarea rows={3} value={f.description} onChange={set('description')} /></div>
        <div className="field" style={full}>
          <label>Thumbnail <span className="hint">(optional — YouTube poster used if blank)</span></label>
          <AssetUploader churchId={churchId} kind="sermon_thumb" currentUrl={f.thumbnail_url} label="Upload thumbnail"
            onUploaded={({ publicUrl }) => setF((p) => ({ ...p, thumbnail_url: publicUrl }))}
            onRemove={() => setF((p) => ({ ...p, thumbnail_url: null }))} />
        </div>
        <div className="field" style={full}><label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={f.is_visible_on_portal} onChange={(e) => setF({ ...f, is_visible_on_portal: e.target.checked })} /> Visible on portal</label></div>
      </div>
    </ModalShell>
  );
}

function EventModal({ churchId, row, onClose, onSave }) {
  const [f, setF] = useState({
    title: row?.title || '', description: row?.description || '',
    starts_at: toLocalInput(row?.starts_at) || '', ends_at: toLocalInput(row?.ends_at) || '',
    location: row?.location || '', address: row?.address || '', category: row?.category || '',
    image_url: row?.image_url || null, registration_url: row?.registration_url || '',
    is_featured: row?.is_featured || false, is_visible_on_portal: row?.is_visible_on_portal || false,
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = () => onSave({ ...f, starts_at: fromLocalInput(f.starts_at), ends_at: fromLocalInput(f.ends_at) });

  return (
    <ModalShell title={row ? 'Edit event' : 'Add event'} onClose={onClose} onSave={save} canSave={!!f.title.trim() && !!f.starts_at}>
      <div style={grid2}>
        <div className="field" style={full}><label>Title</label><input value={f.title} onChange={set('title')} autoFocus /></div>
        <div className="field"><label>Starts</label><input type="datetime-local" value={f.starts_at} onChange={set('starts_at')} /></div>
        <div className="field"><label>Ends <span className="hint">(optional)</span></label><input type="datetime-local" value={f.ends_at} onChange={set('ends_at')} /></div>
        <div className="field"><label>Location</label><input value={f.location} onChange={set('location')} /></div>
        <div className="field"><label>Category <span className="hint">(optional)</span></label><input value={f.category} onChange={set('category')} placeholder="conference, youth…" /></div>
        <div className="field" style={full}><label>Address <span className="hint">(optional, public)</span></label><input value={f.address} onChange={set('address')} /></div>
        <div className="field" style={full}><label>Registration link <span className="hint">(optional)</span></label><input value={f.registration_url} onChange={set('registration_url')} placeholder="https://…" /></div>
        <div className="field" style={full}><label>Description</label><textarea rows={3} value={f.description} onChange={set('description')} /></div>
        <div className="field" style={full}>
          <label>Image <span className="hint">(optional)</span></label>
          <AssetUploader churchId={churchId} kind="event_image" currentUrl={f.image_url} label="Upload image"
            onUploaded={({ publicUrl }) => setF((p) => ({ ...p, image_url: publicUrl }))}
            onRemove={() => setF((p) => ({ ...p, image_url: null }))} />
        </div>
        <div className="field"><label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={f.is_featured} onChange={(e) => setF({ ...f, is_featured: e.target.checked })} /> Featured on home</label></div>
        <div className="field"><label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={f.is_visible_on_portal} onChange={(e) => setF({ ...f, is_visible_on_portal: e.target.checked })} /> Visible on portal</label></div>
      </div>
    </ModalShell>
  );
}

function EpisodeModal({ churchId, row, onClose, onSave }) {
  const [f, setF] = useState({
    title: row?.title || '', description: row?.description || '',
    season: row?.season || '', episode_number: row?.episode_number || '',
    spotify_url: row?.spotify_url || '', apple_url: row?.apple_url || '', youtube_url: row?.youtube_url || '', audio_url: row?.audio_url || '',
    cover_image_url: row?.cover_image_url || null,
    published_at: row?.published_at ? row.published_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
    duration_min: row?.duration_seconds ? Math.round(row.duration_seconds / 60) : '',
    is_visible_on_portal: row?.is_visible_on_portal || false,
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const hasListen = [f.spotify_url, f.apple_url, f.youtube_url, f.audio_url].some((u) => u.trim());
  const save = () => onSave({
    ...f,
    season: f.season ? Number(f.season) : null,
    episode_number: f.episode_number ? Number(f.episode_number) : null,
    published_at: f.published_at ? new Date(f.published_at).toISOString() : null,
    duration_seconds: f.duration_min ? Number(f.duration_min) * 60 : null,
  });

  return (
    <ModalShell title={row ? 'Edit episode' : 'Add episode'} sub="Audio is embedded from Spotify, Apple, or YouTube." onClose={onClose} onSave={save} canSave={!!f.title.trim() && hasListen}>
      <div style={grid2}>
        <div className="field" style={full}><label>Title</label><input value={f.title} onChange={set('title')} autoFocus /></div>
        <div className="field"><label>Season <span className="hint">(optional)</span></label><input value={f.season} onChange={set('season')} inputMode="numeric" /></div>
        <div className="field"><label>Episode # <span className="hint">(optional)</span></label><input value={f.episode_number} onChange={set('episode_number')} inputMode="numeric" /></div>
        <div className="field"><label>Spotify URL</label><input value={f.spotify_url} onChange={set('spotify_url')} placeholder="https://open.spotify.com/episode/…" /></div>
        <div className="field"><label>Apple URL</label><input value={f.apple_url} onChange={set('apple_url')} /></div>
        <div className="field"><label>YouTube URL</label><input value={f.youtube_url} onChange={set('youtube_url')} /></div>
        <div className="field"><label>Audio URL <span className="hint">(fallback)</span></label><input value={f.audio_url} onChange={set('audio_url')} /></div>
        <div className="field"><label>Published</label><input type="date" value={f.published_at} onChange={set('published_at')} /></div>
        <div className="field"><label>Duration (min) <span className="hint">(optional)</span></label><input value={f.duration_min} onChange={set('duration_min')} inputMode="numeric" /></div>
        <div className="field" style={full}><label>Description</label><textarea rows={3} value={f.description} onChange={set('description')} /></div>
        <div className="field" style={full}>
          <label>Cover art <span className="hint">(optional)</span></label>
          <AssetUploader churchId={churchId} kind="podcast_cover" currentUrl={f.cover_image_url} label="Upload cover"
            onUploaded={({ publicUrl }) => setF((p) => ({ ...p, cover_image_url: publicUrl }))}
            onRemove={() => setF((p) => ({ ...p, cover_image_url: null }))} />
        </div>
        <div className="field" style={full}><label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={f.is_visible_on_portal} onChange={(e) => setF({ ...f, is_visible_on_portal: e.target.checked })} /> Visible on portal</label></div>
      </div>
    </ModalShell>
  );
}

function MinistryModal({ churchId, row, extra = { funds: [], campaigns: [] }, onClose, onSave }) {
  // Donation target encoded as "campaign:<id>" | "fund:<id>" | "" (none)
  const initialTarget = row?.campaign_id ? `campaign:${row.campaign_id}` : (row?.fund_id ? `fund:${row.fund_id}` : '');
  const [target, setTarget] = useState(initialTarget);
  const [f, setF] = useState({
    name: row?.name || '', description: row?.description || '', category: row?.category || 'ministry',
    image_url: row?.image_url || null, link_url: row?.link_url || '', leader_name: row?.leader_name || '',
    is_featured: row?.is_featured || false, is_visible_on_portal: row?.is_visible_on_portal || false,
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = () => {
    const [kind, id] = target.split(':');
    onSave({
      ...f,
      campaign_id: kind === 'campaign' ? id : null,
      fund_id: kind === 'fund' ? id : null,
    });
  };

  return (
    <ModalShell title={row ? 'Edit ministry' : 'Add ministry'} onClose={onClose} onSave={save} canSave={!!f.name.trim()}>
      <div style={grid2}>
        <div className="field"><label>Name</label><input value={f.name} onChange={set('name')} autoFocus /></div>
        <div className="field"><label>Category</label>
          <select value={f.category} onChange={set('category')}>
            <option value="ministry">Ministry</option>
            <option value="project">Project</option>
            <option value="mission">Mission</option>
          </select>
        </div>
        <div className="field"><label>Leader <span className="hint">(optional)</span></label><input value={f.leader_name} onChange={set('leader_name')} /></div>
        <div className="field"><label>Donation target <span className="hint">(shows a "Give" button)</span></label>
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">None (info only)</option>
            {extra.campaigns.length > 0 && (
              <optgroup label="Campaigns">
                {extra.campaigns.map((c) => <option key={c.id} value={`campaign:${c.id}`}>{c.name}</option>)}
              </optgroup>
            )}
            {extra.funds.length > 0 && (
              <optgroup label="Funds">
                {extra.funds.map((fd) => <option key={fd.id} value={`fund:${fd.id}`}>{fd.name}</option>)}
              </optgroup>
            )}
          </select>
        </div>
        <div className="field" style={full}><label>External link <span className="hint">(optional)</span></label><input value={f.link_url} onChange={set('link_url')} placeholder="https://…" /></div>
        <div className="field" style={full}><label>Description</label><textarea rows={3} value={f.description} onChange={set('description')} /></div>
        <div className="field" style={full}>
          <label>Image <span className="hint">(optional)</span></label>
          <AssetUploader churchId={churchId} kind="project_image" currentUrl={f.image_url} label="Upload image"
            onUploaded={({ publicUrl }) => setF((p) => ({ ...p, image_url: publicUrl }))}
            onRemove={() => setF((p) => ({ ...p, image_url: null }))} />
        </div>
        <div className="field"><label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={f.is_featured} onChange={(e) => setF({ ...f, is_featured: e.target.checked })} /> Featured on home</label></div>
        <div className="field"><label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={f.is_visible_on_portal} onChange={(e) => setF({ ...f, is_visible_on_portal: e.target.checked })} /> Visible on portal</label></div>
      </div>
    </ModalShell>
  );
}
