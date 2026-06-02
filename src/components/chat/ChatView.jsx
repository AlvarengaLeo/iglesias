// Vista de chat del módulo Equipos: lista de canales + hilo + composer.
// 2 paneles en desktop; en móvil alterna lista/hilo. Realtime vía useChannelMessages.
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useRole } from '../../hooks/useRole.js';
import { useT } from '../../i18n/index.js';
import { Icon } from '../Icon.jsx';
import { Badge } from '../Badge.jsx';
import { useChatChannels, useChannelMessages, useChannelPresence } from '../../hooks/useChat.js';
import { channelDisplayName, createOrGetDm, uploadAttachment, getSignedUrl, deleteMessage } from '../../api/chat.js';
import { listChurchUsers } from '../../api/users.js';

function AttachmentView({ att }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    getSignedUrl(att.storage_path).then((u) => { if (alive) setUrl(u); }).catch(() => {});
    return () => { alive = false; };
  }, [att.storage_path]);
  const isImage = (att.mime || '').startsWith('image/');
  if (!url) return <div className="eq-att-loading">…</div>;
  if (isImage) return <a href={url} target="_blank" rel="noreferrer"><img className="eq-att-img" src={url} alt="" /></a>;
  return <a className="eq-att-file" href={url} target="_blank" rel="noreferrer"><Icon name="fileText" size={14} /> {(att.name || att.storage_path).split('/').pop()}</a>;
}

function NewDmButton({ churchId, myUserId, onCreated, onToast, t }) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState([]);
  useEffect(() => {
    if (open && !users.length) listChurchUsers(churchId).then(setUsers).catch(() => {});
  }, [open]); // eslint-disable-line
  const start = async (cuId) => {
    if (!cuId) return;
    try { const r = await createOrGetDm(churchId, cuId); onCreated(r.channel_id); }
    catch (e) { onToast?.({ tone: 'error', icon: 'alert', title: 'Error', sub: e.message }); }
    setOpen(false);
  };
  return (
    <div style={{ marginBottom: 10 }}>
      {open ? (
        <select autoFocus defaultValue="" onChange={(e) => start(e.target.value)} onBlur={() => setOpen(false)} style={{ width: '100%' }}>
          <option value="">Nuevo mensaje a…</option>
          {users.filter((u) => u.is_active && u.user_id !== myUserId).map((u) => (
            <option key={u.id} value={u.id}>{u.full_name || u.email_snapshot}</option>
          ))}
        </select>
      ) : (
        <button className="btn btn-sm btn-secondary" style={{ width: '100%' }} onClick={() => setOpen(true)}>
          <Icon name="plus" size={13} /> {t('chat.direct_messages')}
        </button>
      )}
    </div>
  );
}

const memberName = (m) =>
  m?.person ? (m.person.organization_name || `${m.person.first_name || ''} ${m.person.last_name || ''}`.trim() || 'Miembro') : 'Miembro';

function Thread({ channel, churchId, myUserId, myName, canModerate, onBack, t, onToast }) {
  const { messages, hasMore, send, loadOlder, loading, markDeletedLocal } = useChannelMessages(channel.id);
  const { online, typing, notifyTyping } = useChannelPresence(channel.id, { id: myUserId, name: myName });
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [mentionIds, setMentionIds] = useState([]);
  const [showMentions, setShowMentions] = useState(false);

  const mentionableMembers = (channel.members || []).filter((m) => m.is_active && m.user_id !== myUserId);

  const pickMention = (m) => {
    setDraft((d) => `${d}@${memberName(m)} `);
    setMentionIds((ids) => (ids.includes(m.church_user_id) ? ids : [...ids, m.church_user_id]));
    setShowMentions(false);
  };

  const onDelete = async (m) => {
    try { await deleteMessage(m.id); markDeletedLocal(m.id); }
    catch (err) { onToast?.({ tone: 'error', icon: 'alert', title: 'No se pudo eliminar', sub: err.message }); }
  };

  const onPickFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    try {
      const metas = [];
      for (const f of files) metas.push(await uploadAttachment(churchId, channel.id, f));
      setPending((p) => [...p, ...metas]);
    } catch (err) {
      onToast?.({ tone: 'error', icon: 'alert', title: 'No se pudo subir', sub: err.message });
    } finally { setUploading(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body && !pending.length) return;
    const atts = pending; const mts = mentionIds;
    setDraft(''); setPending([]); setMentionIds([]); setSending(true);
    try { await send(body, atts.length ? atts : null, mts.length ? mts : null); }
    catch { setDraft(body); setPending(atts); setMentionIds(mts); }
    finally { setSending(false); }
  };

  return (
    <div className="eq-thread-inner">
      <div className="eq-thread-head">
        <button className="icon-btn eq-back" onClick={onBack} aria-label="Volver"><Icon name="chevronLeft" size={18} /></button>
        <strong style={{ flex: 1 }}>{channelDisplayName(channel, myUserId)}</strong>
        {online > 0 && <span className="eq-online"><span className="eq-online-dot" /> {online}</span>}
      </div>
      <div className="eq-msgs">
        {hasMore && (
          <div style={{ textAlign: 'center' }}>
            <button className="btn btn-sm btn-ghost" onClick={loadOlder}>Cargar anteriores</button>
          </div>
        )}
        {messages.map((m) => {
          const atts = m.attachments || [];
          const showBubble = (m.body || atts.length === 0);
          const canDelete = !m.deleted_at && (m.sender_user_id === myUserId || canModerate);
          return (
            <div key={m.id} className={`eq-msg ${m.sender_user_id === myUserId ? 'me' : ''}`}>
              {m.sender_user_id !== myUserId && <div className="eq-msg-author">{m.senderName}</div>}
              {showBubble && (
                <div className="eq-msg-bubble">
                  {m.deleted_at ? <em style={{ opacity: 0.6 }}>mensaje eliminado</em> : m.body}
                  {m.edited_at && !m.deleted_at && <span className="eq-msg-edited"> (editado)</span>}
                </div>
              )}
              {!m.deleted_at && atts.map((att) => <AttachmentView key={att.id || att.storage_path} att={att} />)}
              {canDelete && (
                <button className="eq-msg-del" onClick={() => onDelete(m)} title="Eliminar"><Icon name="x" size={11} /></button>
              )}
            </div>
          );
        })}
        {messages.length === 0 && !loading && <div className="eq-chat-empty">{t('chat.no_messages')}</div>}
      </div>
      {typing.length > 0 && <div className="eq-typing">{typing.join(', ')} escribiendo…</div>}
      {pending.length > 0 && (
        <div className="eq-pending">
          {pending.map((p, i) => (
            <span key={i} className="eq-pending-chip">
              <Icon name="fileText" size={12} /> {(p.name || 'archivo')}
              <button type="button" onClick={() => setPending((arr) => arr.filter((_, j) => j !== i))} aria-label="Quitar">×</button>
            </span>
          ))}
        </div>
      )}
      <form className="eq-composer" onSubmit={submit}>
        {showMentions && mentionableMembers.length > 0 && (
          <div className="eq-mention-pop">
            {mentionableMembers.map((m) => (
              <button type="button" key={m.church_user_id} onClick={() => pickMention(m)}>@{memberName(m)}</button>
            ))}
          </div>
        )}
        <button type="button" className="icon-btn" title="Mencionar" onClick={() => setShowMentions((s) => !s)} disabled={!mentionableMembers.length}>
          <Icon name="users" size={18} />
        </button>
        <label className="icon-btn" title="Adjuntar" style={{ cursor: 'pointer' }}>
          <Icon name="image" size={18} />
          <input type="file" multiple style={{ display: 'none' }} onChange={onPickFiles}
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" />
        </label>
        <input value={draft} onChange={(e) => { setDraft(e.target.value); notifyTyping(); }} placeholder={t('chat.message_placeholder')} />
        <button className="btn btn-primary" type="submit" disabled={(!draft.trim() && !pending.length) || sending || uploading} aria-label="Enviar">
          <Icon name="send" size={16} />
        </button>
      </form>
    </div>
  );
}

export function ChatView({ churchId, onToast }) {
  const { user } = useAuth();
  const myUserId = user?.id;
  const myName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Tú';
  const { isServingManager, isLeader } = useRole();
  const canModerate = isServingManager || isLeader;
  const t = useT();
  const { channels, unread, refresh } = useChatChannels(churchId);
  const [activeId, setActiveId] = useState(null);
  const [mobileThread, setMobileThread] = useState(false);

  const active = channels.find((c) => c.id === activeId);
  const openChannel = (id) => { setActiveId(id); setMobileThread(true); };

  const groups = { team: [], service: [], position: [], dm: [] };
  for (const c of channels) (groups[c.room_type] ||= []).push(c);

  const Group = ({ label, list }) => {
    if (!list.length) return null;
    return (
      <div>
        <div className="sidebar-section-label">{label}</div>
        {list.map((c) => (
          <button key={c.id} className={`eq-chan ${activeId === c.id ? 'active' : ''}`} onClick={() => openChannel(c.id)}>
            <span className="eq-chan-name">{channelDisplayName(c, myUserId)}</span>
            {unread.byChannel[c.id] ? <Badge tone="error">{unread.byChannel[c.id]}</Badge> : null}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className={`eq-chat ${mobileThread ? 'mobile-thread' : ''}`}>
      <aside className="eq-chat-list">
        <NewDmButton churchId={churchId} myUserId={myUserId} onToast={onToast}
          onCreated={(id) => { refresh(); openChannel(id); }} t={t} />
        <Group label={t('chat.team_channels')} list={groups.team} />
        <Group label={t('chat.service_channels')} list={groups.service} />
        <Group label={t('chat.direct_messages')} list={groups.dm} />
        {channels.length === 0 && <div className="page-sub" style={{ padding: 8 }}>{t('chat.select_channel')}</div>}
      </aside>
      <section className="eq-chat-thread">
        {active
          ? <Thread channel={active} churchId={churchId} myUserId={myUserId} myName={myName} canModerate={canModerate} onBack={() => setMobileThread(false)} t={t} onToast={onToast} />
          : <div className="eq-chat-empty">{t('chat.select_channel')}</div>}
      </section>
    </div>
  );
}
