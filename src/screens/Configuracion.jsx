// ConfiguracionScreen — conectado a Supabase.
// 7 secciones: identidad visual (logo), datos iglesia, usuarios, Stripe (lectura), recibos, idioma, suscripción.
//
// Lo que NO está en esta fase (intencional):
//   - Conectar Stripe real (sólo lectura del estado; botón stub)
//   - Ver facturación real (link a Stripe portal, stub)

import { useState, useEffect, useMemo } from 'react';
import { Icon } from '../components/Icon.jsx';
import { Badge } from '../components/Badge.jsx';
import { AssetUploader } from '../components/AssetUploader.jsx';
import { useChurch } from '../hooks/useChurch.js';
import { useRole } from '../hooks/useRole.js';
import {
  updateChurch,
  updateChurchReceiptTemplate,
  updateChurchLocale,
  updateChurchLogoUrl,
} from '../api/churches.js';
import { onboardStripe, refreshStripeStatus, openStripeDashboard } from '../api/stripeConnect.js';
import {
  listChurchUsers,
  updateUserRole,
  setUserActive,
  inviteUser,
  roleLabel,
  roleTone,
} from '../api/users.js';
import { listPeople } from '../api/people.js';
import { deleteChurchAsset, pathFromPublicUrl } from '../lib/storage.js';
import { formatRelativeTime, formatDate, initials, shortenId } from '../lib/formatters.js';

const EIN_REGEX = /^\d{2}-\d{7}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ConfiguracionScreen({ onToast }) {
  const { church, churchId, refreshChurch } = useChurch();
  const { can } = useRole();

  if (!church) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-header-text">
            <h2 className="page-greeting">Configuración</h2>
            <p className="page-sub">Cargando datos de la iglesia…</p>
          </div>
        </div>
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
          Cargando…
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-text">
          <h2 className="page-greeting">Configuración</h2>
          <p className="page-sub">Gestiona los ajustes principales de tu iglesia</p>
        </div>
      </div>

      <div className="grid grid-12">
        <ChurchInfoCard
          church={church}
          churchId={churchId}
          canEdit={can('church.edit')}
          onToast={onToast}
          refreshChurch={refreshChurch}
        />

        <div className="col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <IdentityVisualCard
            church={church}
            churchId={churchId}
            canEdit={can('church.edit')}
            onToast={onToast}
            refreshChurch={refreshChurch}
          />
          <LocaleCard
            church={church}
            churchId={churchId}
            onToast={onToast}
            refreshChurch={refreshChurch}
          />
          <SubscriptionCard church={church} onToast={onToast} />
        </div>

        <ReceiptCard
          church={church}
          churchId={churchId}
          canEdit={can('church.edit')}
          onToast={onToast}
          refreshChurch={refreshChurch}
        />

        <UsersCard
          churchId={churchId}
          canManage={can('users.manage')}
          onToast={onToast}
        />

        <StripeCard
          church={church}
          canConfig={can('stripe.config')}
          onToast={onToast}
          refreshChurch={refreshChurch}
        />
      </div>
    </div>
  );
}

// ============================================================
// 1. Datos de la iglesia
// ============================================================
function ChurchInfoCard({ church, churchId, canEdit, onToast, refreshChurch }) {
  // Construye state desde el objeto de iglesia. address es jsonb.
  const initialState = useMemo(() => buildChurchForm(church), [church.id, church.updated_at]);
  const [form, setForm] = useState(initialState);
  const [saving, setSaving] = useState(false);

  // Re-sincronizar si refreshChurch trae cambios externos.
  useEffect(() => {
    setForm(buildChurchForm(church));
  }, [church.id, church.updated_at]);

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialState);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSave = async () => {
    // Validaciones
    if (!form.legal_name?.trim()) {
      onToast({ tone: 'error', icon: 'alert', title: 'Nombre legal requerido' });
      return;
    }
    if (!form.public_name?.trim()) {
      onToast({ tone: 'error', icon: 'alert', title: 'Nombre público requerido' });
      return;
    }
    if (form.email && !EMAIL_REGEX.test(form.email)) {
      onToast({ tone: 'error', icon: 'alert', title: 'Email inválido' });
      return;
    }
    if (form.ein && !EIN_REGEX.test(form.ein)) {
      onToast({
        tone: 'warning',
        icon: 'alert',
        title: 'EIN con formato no estándar',
        sub: 'Formato esperado: XX-XXXXXXX',
      });
      // continúa, es solo warning
    }

    setSaving(true);
    try {
      const patch = {
        legal_name: form.legal_name.trim(),
        public_name: form.public_name.trim(),
        ein: form.ein?.trim() || null,
        phone: form.phone?.trim() || null,
        email: form.email?.trim() || null,
        pastor_name: form.pastor_name?.trim() || null,
        treasurer_name: form.treasurer_name?.trim() || null,
        address: {
          ...(church.address || {}),
          street: form.addr_street?.trim() || null,
          city: form.addr_city?.trim() || null,
          state: form.addr_state?.trim() || null,
          zip: form.addr_zip?.trim() || null,
        },
      };
      await updateChurch(churchId, patch);
      await refreshChurch(); // Propaga a Sidebar/Topbar
      onToast({ title: 'Datos de iglesia guardados', sub: 'Sidebar y recibos reflejan los cambios.' });
    } catch (e) {
      console.error(e);
      onToast({ tone: 'error', icon: 'alert', title: 'Error al guardar', sub: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card col-span-8">
      <SettingHeader
        icon="sparkle"
        title="Datos de la iglesia"
        desc="Información oficial usada en recibos, reportes y comunicación con el IRS."
        action={
          <button
            className="btn btn-sm btn-primary"
            onClick={handleSave}
            disabled={!canEdit || !isDirty || saving}
          >
            <Icon name="check" size={12} /> {saving ? 'Guardando…' : 'Guardar'}
          </button>
        }
      />
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Nombre legal</label>
            <input value={form.legal_name} onChange={set('legal_name')} disabled={!canEdit} />
            <span className="hint">Usado en recibos fiscales y documentos oficiales</span>
          </div>
          <div className="field">
            <label>Nombre público</label>
            <input value={form.public_name} onChange={set('public_name')} disabled={!canEdit} />
            <span className="hint">Aparece en sidebar y portal público</span>
          </div>
          <div className="field">
            <label>
              EIN <span className="hint">(IRS)</span>
            </label>
            <input value={form.ein} onChange={set('ein')} className="mono" disabled={!canEdit} placeholder="XX-XXXXXXX" />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Dirección</label>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 100px', gap: 8 }}>
              <input value={form.addr_street} onChange={set('addr_street')} placeholder="Calle y número" disabled={!canEdit} />
              <input value={form.addr_city} onChange={set('addr_city')} placeholder="Ciudad" disabled={!canEdit} />
              <input value={form.addr_state} onChange={set('addr_state')} placeholder="Estado" disabled={!canEdit} />
              <input value={form.addr_zip} onChange={set('addr_zip')} placeholder="ZIP" className="mono" disabled={!canEdit} />
            </div>
          </div>
          <div className="field">
            <label>Teléfono</label>
            <input value={form.phone} onChange={set('phone')} disabled={!canEdit} />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={set('email')} disabled={!canEdit} />
          </div>
          <div className="field">
            <label>Pastor principal</label>
            <input value={form.pastor_name} onChange={set('pastor_name')} disabled={!canEdit} />
          </div>
          <div className="field">
            <label>Tesorero</label>
            <input value={form.treasurer_name} onChange={set('treasurer_name')} disabled={!canEdit} />
          </div>
        </div>
        {!canEdit && (
          <p style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="lock" size={12} /> Solo admin/pastor pueden editar estos datos.
          </p>
        )}
      </div>
    </div>
  );
}

function buildChurchForm(church) {
  const addr = church.address || {};
  return {
    legal_name: church.legal_name || '',
    public_name: church.public_name || '',
    ein: church.ein || '',
    phone: church.phone || '',
    email: church.email || '',
    pastor_name: church.pastor_name || '',
    treasurer_name: church.treasurer_name || '',
    addr_street: addr.street || '',
    addr_city: addr.city || '',
    addr_state: addr.state || '',
    addr_zip: addr.zip || '',
  };
}

// ============================================================
// 2. Idioma
// ============================================================
function LocaleCard({ church, churchId, onToast, refreshChurch }) {
  const [locale, setLocale] = useState(church.locale || 'es');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocale(church.locale || 'es');
  }, [church.locale]);

  const handleChange = async (newLocale) => {
    if (newLocale === locale) return;
    setSaving(true);
    try {
      await updateChurchLocale(churchId, newLocale);
      setLocale(newLocale);
      await refreshChurch();
      onToast({
        title: 'Idioma actualizado',
        sub: newLocale === 'es' ? 'Panel en Español' : 'Panel set to English (UI translation v2)',
      });
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'Error al guardar idioma', sub: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <SettingHeader
        icon="globe"
        title="Idioma"
        desc="Idioma del panel y de las comunicaciones con donantes."
        compact
      />
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <LocaleButton
            active={locale === 'es'}
            onClick={() => handleChange('es')}
            disabled={saving}
            emoji="🇪🇸"
            label="Español"
            sub="Predeterminado"
          />
          <LocaleButton
            active={locale === 'en'}
            onClick={() => handleChange('en')}
            disabled={saving}
            emoji="🇺🇸"
            label="English"
            sub="Bilingüe (v2)"
          />
        </div>
        <p style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>
          La traducción completa de la UI se activa en v2. Por ahora solo persiste tu preferencia.
        </p>
      </div>
    </div>
  );
}

function LocaleButton({ active, onClick, disabled, emoji, label, sub }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, padding: 14, borderRadius: 12,
        border: active ? '2px solid var(--navy)' : '1px solid var(--border)',
        background: active ? '#F4ECE2' : 'var(--card)',
        cursor: disabled ? 'wait' : 'pointer', textAlign: 'left',
        transition: 'background 0.15s, border 0.15s',
      }}
    >
      <div style={{ fontSize: 18, marginBottom: 4 }}>{emoji}</div>
      <div style={{ fontWeight: 700, fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</div>
    </button>
  );
}

// ============================================================
// 2.b. Identidad visual (logo)
// ============================================================
function IdentityVisualCard({ church, churchId, canEdit, onToast, refreshChurch }) {
  const handleUploaded = async ({ publicUrl, path }) => {
    try {
      // Si había logo previo, intentar borrarlo (best-effort).
      const oldPath = pathFromPublicUrl(church.logo_url);
      if (oldPath && oldPath !== path) {
        await deleteChurchAsset(oldPath).catch(() => {});
      }
      await updateChurchLogoUrl(churchId, publicUrl);
      await refreshChurch();
      onToast({ title: 'Logo actualizado', sub: 'Sidebar y portal lo reflejan.' });
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'No se pudo guardar el logo', sub: e.message });
    }
  };

  const handleRemove = async () => {
    try {
      const oldPath = pathFromPublicUrl(church.logo_url);
      if (oldPath) await deleteChurchAsset(oldPath).catch(() => {});
      await updateChurchLogoUrl(churchId, null);
      await refreshChurch();
      onToast({ title: 'Logo eliminado', sub: 'Se mostrarán iniciales.' });
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'No se pudo eliminar', sub: e.message });
    }
  };

  return (
    <div className="card">
      <SettingHeader
        icon="image"
        title="Identidad visual"
        desc="Logo que aparece en el sidebar y en el portal público."
        compact
      />
      <div style={{ padding: '0 20px 20px' }}>
        <AssetUploader
          churchId={churchId}
          kind="logo"
          currentUrl={church.logo_url}
          shape="circle"
          disabled={!canEdit}
          label={church.logo_url ? 'Cambiar logo' : 'Subir logo'}
          helpText="Idealmente cuadrado (1:1). PNG o SVG con fondo transparente se ven mejor."
          onUploaded={handleUploaded}
          onRemove={church.logo_url ? handleRemove : undefined}
        />
      </div>
    </div>
  );
}

// ============================================================
// 3. Suscripción
// ============================================================
function SubscriptionCard({ church, onToast }) {
  const planLabel = {
    ministerio: 'Plan Ministerio',
    comunidad: 'Plan Comunidad',
    enterprise: 'Plan Enterprise',
  }[church.plan] || church.plan || 'Sin plan';

  const statusBadge = {
    active: <Badge tone="success" dot>Activa</Badge>,
    past_due: <Badge tone="warning" dot>Pago pendiente</Badge>,
    canceled: <Badge tone="error" dot>Cancelada</Badge>,
    trialing: <Badge tone="info" dot>Prueba</Badge>,
  }[church.plan_status] || <Badge tone="muted">{church.plan_status || '—'}</Badge>;

  return (
    <div
      className="card"
      style={{
        background: 'linear-gradient(135deg, #16307F, #1E3C94)',
        color: '#fff',
        borderColor: 'transparent',
      }}
    >
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(156, 192, 234, 0.2)', color: '#9CC0EA',
              display: 'grid', placeItems: 'center',
            }}
          >
            <Icon name="layers" size={16} />
          </div>
          <div>
            <div style={{
              fontSize: 11, color: 'rgba(255,255,255,0.6)',
              textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700,
            }}>
              Suscripción
            </div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{planLabel}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
          <CfgRow dark label="Estado" value={statusBadge} />
          <CfgRow dark label="Plan ID" value={<span className="mono">{church.plan || '—'}</span>} />
        </div>
        <button
          className="btn"
          style={{
            width: '100%', justifyContent: 'center', marginTop: 14,
            background: 'var(--coffee)', color: '#fff',
          }}
          onClick={() =>
            onToast({
              tone: 'info',
              icon: 'info',
              title: 'Facturación pendiente',
              sub: 'Se activa al conectar Stripe Customer Portal (Fase futura).',
            })
          }
        >
          Ver facturación <Icon name="arrowRight" size={12} />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// 4. Usuarios y permisos
// ============================================================
function UsersCard({ churchId, canManage, onToast }) {
  const [users, setUsers] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [showInvite, setShowInvite] = useState(false);

  const load = async () => {
    try {
      const data = await listChurchUsers(churchId);
      setUsers(data);
      setError(null);
    } catch (e) {
      console.error(e);
      setError(e.message);
      setUsers([]);
    }
  };

  useEffect(() => {
    load();
  }, [churchId]);

  const handleInviteSuccess = ({ email, role }) => {
    setShowInvite(false);
    onToast({
      title: 'Invitación enviada',
      sub: `${email} recibirá un correo con el enlace de aceptación (rol: ${roleLabel(role)}).`,
    });
    load();
  };

  const handleRoleChange = async (cu, newRole) => {
    if (newRole === cu.role) return;
    try {
      await updateUserRole(cu.id, newRole);
      await load();
      onToast({ title: 'Rol actualizado', sub: `${cu.full_name || cu.email_snapshot} → ${roleLabel(newRole)}` });
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'No se pudo cambiar el rol', sub: e.message });
    }
  };

  const handleToggleActive = async (cu) => {
    const next = !cu.is_active;
    try {
      await setUserActive(cu.id, next);
      await load();
      onToast({
        title: next ? 'Usuario reactivado' : 'Acceso desactivado',
        sub: cu.full_name || cu.email_snapshot,
      });
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'Error', sub: e.message });
    }
  };

  return (
    <div className="card col-span-7">
      <SettingHeader
        icon="users"
        title="Usuarios y permisos"
        desc="Define quién accede al sistema y con qué nivel de permisos."
        action={
          <button
            className="btn btn-sm btn-primary"
            onClick={() => setShowInvite(true)}
            disabled={!canManage}
          >
            <Icon name="plus" size={12} /> Invitar usuario
          </button>
        }
      />
      <div style={{ padding: '0 0 8px' }}>
        {users === null && (
          <div style={{ padding: '20px 24px', color: 'var(--muted)', fontSize: 13 }}>
            Cargando usuarios…
          </div>
        )}
        {users !== null && users.length === 0 && (
          <div style={{ padding: '20px 24px', color: 'var(--muted)', fontSize: 13 }}>
            {error ? `Error: ${error}` : 'Sin usuarios en esta iglesia.'}
          </div>
        )}
        {users?.map((cu, i) => (
          <UserRow
            key={cu.id}
            cu={cu}
            isFirst={i === 0}
            canManage={canManage}
            onRoleChange={handleRoleChange}
            onToggleActive={handleToggleActive}
          />
        ))}
      </div>
      {showInvite && (
        <InviteUserModal
          churchId={churchId}
          onClose={() => setShowInvite(false)}
          onSuccess={handleInviteSuccess}
          onToast={onToast}
        />
      )}
    </div>
  );
}

// ============================================================
// Modal: Invitar usuario
// ============================================================
function InviteUserModal({ churchId, onClose, onSuccess, onToast }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('secretary');
  const [fullName, setFullName] = useState('');
  const [personId, setPersonId] = useState('');
  const [people, setPeople] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Un 'servidor' debe vincularse a una ficha de persona. Cargamos la lista al elegir el rol.
  useEffect(() => {
    if (role !== 'servidor' || people.length || peopleLoading) return;
    setPeopleLoading(true);
    listPeople(churchId, { limit: 500 })
      .then((rows) => setPeople(rows || []))
      .catch(() => onToast({ tone: 'error', icon: 'alert', title: 'No se pudieron cargar las personas' }))
      .finally(() => setPeopleLoading(false));
  }, [role, churchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const personName = (p) =>
    (p.organization_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || '—');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email.trim())) {
      onToast({ tone: 'error', icon: 'alert', title: 'Email inválido' });
      return;
    }
    if (role === 'servidor' && !personId) {
      onToast({ tone: 'error', icon: 'alert', title: 'Elige a qué persona vincular el servidor' });
      return;
    }
    setSubmitting(true);
    try {
      await inviteUser({
        email: email.trim().toLowerCase(),
        role,
        churchId,
        fullName: fullName.trim() || null,
        personId: role === 'servidor' ? personId : null,
      });
      onSuccess({ email: email.trim().toLowerCase(), role });
    } catch (err) {
      const msg = err.message || 'No se pudo enviar la invitación.';
      const friendly =
        msg.includes('admin puede invitar') ? 'Solo un admin puede invitar usuarios.' :
        msg.includes('admin_role_blocked')   ? 'No se pueden invitar usuarios con rol admin desde aquí.' :
        msg.includes('invitation_already_pending') ? 'Ya hay una invitación pendiente para ese correo.' :
        msg.includes('user_already_exists')  ? 'Ese correo ya tiene una cuenta.' :
        msg.includes('Email address')        ? 'El proveedor de email rechazó la dirección. Usa un dominio real.' :
        msg;
      onToast({ tone: 'error', icon: 'alert', title: 'No se envió la invitación', sub: friendly });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Invitar usuario</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <Icon name="x" size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="persona@iglesia.org"
                autoFocus
                required
              />
            </div>
            <div className="field">
              <label>Nombre completo <span className="hint">(opcional)</span></label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nombre que aparecerá en el sistema"
              />
            </div>
            <div className="field">
              <label>Rol</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="pastor">Pastor</option>
                <option value="treasurer">Tesorero</option>
                <option value="secretary">Secretaria</option>
                <option value="leader">Líder</option>
                <option value="viewer">Lector</option>
                <option value="servidor">Servidor (voluntario)</option>
              </select>
              <span className="hint">
                {role === 'servidor'
                  ? 'Un servidor solo ve “Mi servicio”, su equipo y el chat.'
                  : 'El rol admin no se puede asignar desde aquí.'}
              </span>
            </div>
            {role === 'servidor' && (
              <div className="field">
                <label>Vincular a persona</label>
                <select value={personId} onChange={(e) => setPersonId(e.target.value)} required>
                  <option value="">
                    {peopleLoading ? 'Cargando personas…' : 'Selecciona una persona'}
                  </option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>{personName(p)}</option>
                  ))}
                </select>
                <span className="hint">El servidor verá los servicios asignados a esta persona.</span>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !email.trim()}>
              {submitting ? 'Enviando…' : 'Enviar invitación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserRow({ cu, isFirst, canManage, onRoleChange, onToggleActive }) {
  const [editingRole, setEditingRole] = useState(false);
  const name = cu.full_name || cu.email_snapshot.split('@')[0];
  const avatarInitials = initials(cu.full_name || cu.email_snapshot);
  const tone = roleTone(cu.role);

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 24px',
        borderTop: isFirst ? 'none' : '1px solid var(--border-soft)',
        opacity: cu.is_active ? 1 : 0.55,
      }}
    >
      <div className={`avatar ${tone === 'coffee' ? 'coffee' : 'navy'}`}>{avatarInitials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{cu.email_snapshot}</div>
      </div>
      {editingRole && canManage ? (
        <select
          value={cu.role}
          onChange={(e) => {
            onRoleChange(cu, e.target.value);
            setEditingRole(false);
          }}
          onBlur={() => setEditingRole(false)}
          autoFocus
          style={{
            padding: '4px 8px', fontSize: 12,
            border: '1px solid var(--border)', borderRadius: 6,
            background: 'var(--card)',
          }}
        >
          <option value="admin">Admin</option>
          <option value="pastor">Pastor</option>
          <option value="treasurer">Tesorero</option>
          <option value="secretary">Secretaria</option>
          <option value="leader">Líder</option>
          <option value="viewer">Lector</option>
          {/* 'servidor' solo aparece para usuarios que ya lo son (se crean vía invitación
              con persona vinculada); no se puede asignar desde aquí para evitar servidores sin ficha. */}
          {cu.role === 'servidor' && <option value="servidor">Servidor</option>}
        </select>
      ) : (
        <Badge tone={tone}>{roleLabel(cu.role)}</Badge>
      )}
      <div style={{ fontSize: 11, color: 'var(--muted)', width: 100, textAlign: 'right' }}>
        {cu.is_active ? formatRelativeTime(cu.last_seen_at, { fallback: '—' }) : 'Desactivado'}
      </div>
      <div className="row-actions">
        <button
          className="btn btn-sm btn-ghost"
          title={canManage ? 'Cambiar rol' : 'Solo admin puede editar'}
          onClick={() => canManage && setEditingRole(true)}
          disabled={!canManage}
        >
          <Icon name="edit" size={14} />
        </button>
        <button
          className="btn btn-sm btn-ghost"
          title={cu.is_active ? 'Desactivar acceso' : 'Reactivar'}
          onClick={() => canManage && onToggleActive(cu)}
          disabled={!canManage}
        >
          <Icon name={cu.is_active ? 'lock' : 'check'} size={14} />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// 5. Stripe
// ============================================================
// Maps Stripe's technical requirement codes (e.g. "individual.ssn_last_4",
// "external_account") to plain-Spanish labels a non-tech church admin understands.
function friendlyRequirement(code) {
  const c = String(code || '');
  const map = [
    [/external_account|bank/, 'Cuenta bancaria'],
    [/ssn_last_4/, 'Últimos 4 dígitos del Seguro Social'],
    [/id_number/, 'Número de identificación'],
    [/verification\.(document|additional_document)/, 'Foto de tu identificación'],
    [/dob/, 'Fecha de nacimiento'],
    [/address/, 'Dirección'],
    [/phone/, 'Teléfono'],
    [/email/, 'Correo electrónico'],
    [/first_name|last_name|\.name\b/, 'Nombre completo'],
    [/tax_id|ein/, 'EIN / identificación fiscal'],
    [/business_profile\.(url|product_description)/, 'Descripción o sitio web de tu iglesia'],
    [/business_profile\.mcc/, 'Categoría de la organización'],
    [/tos_acceptance/, 'Aceptar los términos de Stripe'],
    [/owners|representative|relationship/, 'Datos del representante legal'],
  ];
  for (const [re, label] of map) if (re.test(c)) return label;
  return c.replace(/_/g, ' ').replace(/\./g, ' › ');
}

function StripeCard({ church, canConfig, onToast, refreshChurch }) {
  const [busy, setBusy] = useState(false);
  const [abandoned, setAbandoned] = useState(false);
  const connected = !!church.stripe_account_id && church.stripe_charges_enabled;
  const started = !!church.stripe_account_id; // onboarding begun

  // What Stripe still needs from the church before it can enable charges.
  const requirements = church.stripe_requirements || {};
  const currentlyDue = Array.isArray(requirements.currently_due) ? requirements.currently_due : [];
  const missingLabels = [...new Set(currentlyDue.map(friendlyRequirement))];
  const needsInfo = !connected && missingLabels.length > 0;                       // church must act
  const reviewing = !connected && !needsInfo && church.stripe_details_submitted;  // Stripe is reviewing
  const notFinished = started && !connected && !church.stripe_details_submitted;  // form left incomplete

  // Coming back from Stripe's hosted onboarding → sync status (?stripe=done), or
  // note that the form was left unfinished (?stripe=refresh).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe') === 'done' && church.stripe_account_id) {
      refreshStripeStatus(church.id).then(() => refreshChurch()).catch(() => {});
    }
    if (params.get('stripe') === 'refresh') setAbandoned(true);
    if (params.has('stripe')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('stripe');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnect = async () => {
    setBusy(true);
    try {
      const { url } = await onboardStripe(church.id);
      window.location.href = url; // Stripe-hosted onboarding
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'No se pudo iniciar la conexión', sub: e.message });
      setBusy(false);
    }
  };

  const handleDashboard = async () => {
    setBusy(true);
    try {
      const { url } = await openStripeDashboard(church.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'No se pudo abrir Stripe', sub: e.message });
    } finally { setBusy(false); }
  };

  const handleRefresh = async () => {
    setBusy(true);
    try {
      await refreshStripeStatus(church.id);
      await refreshChurch();
      onToast({ title: 'Estado actualizado' });
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'No se pudo actualizar', sub: e.message });
    } finally { setBusy(false); }
  };

  const Check = ({ done, children }) => (
    <div
      role="img"
      aria-label={`${done ? 'Completado' : 'Pendiente'}: ${typeof children === 'string' ? children : ''}`}
      style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: done ? 'var(--text)' : 'var(--muted)' }}
    >
      <span aria-hidden="true" style={{
        width: 18, height: 18, borderRadius: 999, flexShrink: 0, display: 'grid', placeItems: 'center',
        background: done ? 'var(--success)' : 'var(--bg-2)', color: '#fff',
        border: done ? 'none' : '1px solid var(--border)',
      }}>
        {done && <Icon name="check" size={11} />}
      </span>
      {children}
    </div>
  );

  return (
    <div className="card col-span-5">
      <SettingHeader
        icon="creditCard"
        title="Pagos / Métodos de pago"
        desc="Recibe donaciones directo a la cuenta bancaria de tu iglesia."
        compact
        action={
          connected ? <Badge tone="success" dot>Activo</Badge>
            : needsInfo ? <Badge tone="warning" dot>Acción requerida</Badge>
            : reviewing ? <Badge tone="warning" dot>Revisando</Badge>
            : started ? <Badge tone="warning" dot>Sin terminar</Badge>
            : <Badge tone="muted">Sin conectar</Badge>
        }
      />
      <div style={{ padding: '0 24px 22px' }}>

        {!started && (
          <>
            <p style={{ fontSize: 12.5, color: 'var(--eb-ink-soft, var(--text))', lineHeight: 1.55, margin: '0 0 14px' }}>
              Conecta tu cuenta bancaria con Stripe para empezar a recibir donaciones en línea.
              Stripe verifica tu identidad y tu banco de forma segura — toma unos 5 minutos y no
              necesitas conocimientos técnicos. Las donaciones llegan <strong>directo a tu iglesia</strong>.
            </p>
            <button className="btn btn-primary" onClick={handleConnect} disabled={!canConfig || busy}>
              <Icon name="creditCard" size={14} /> {busy ? 'Abriendo…' : 'Conectar mi cuenta bancaria'}
            </button>
            <p style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>
              Se abre el formulario seguro de Stripe. Podrás volver aquí al terminar.
            </p>
          </>
        )}

        {started && (
          <>
            {abandoned && !connected && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--warning-bg)', border: '1px solid #F0DCC2', color: 'var(--warning)', borderRadius: 10, padding: '10px 12px', marginBottom: 14, fontSize: 12.5, lineHeight: 1.5 }}>
                <Icon name="info" size={14} />
                <span>Saliste del formulario de Stripe sin terminar. No pasa nada — puedes continuar cuando quieras con el botón de abajo.</span>
              </div>
            )}

            {needsInfo && (
              <div style={{ background: 'var(--warning-bg)', border: '1px solid #F0DCC2', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13, color: 'var(--warning)', marginBottom: 8 }}>
                  <Icon name="alert" size={15} /> Stripe necesita un poco más de información
                </div>
                <p style={{ margin: '0 0 8px', fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5 }}>
                  Para activar las donaciones, completa estos datos:
                </p>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--text)', display: 'grid', gap: 4 }}>
                  {missingLabels.map((l) => <li key={l}>{l}</li>)}
                </ul>
              </div>
            )}

            {reviewing && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--bg)', border: '1px solid var(--border-soft)', borderRadius: 12, padding: 14, marginBottom: 14, fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5 }}>
                <Icon name="clock" size={15} />
                <span>Enviaste tus datos y Stripe los está revisando — suele tardar unos minutos. Pulsa “Actualizar estado” en un momento para ver si ya quedó lista.</span>
              </div>
            )}

            {notFinished && !needsInfo && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--bg)', border: '1px solid var(--border-soft)', borderRadius: 12, padding: 14, marginBottom: 14, fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5 }}>
                <Icon name="info" size={15} />
                <span>Empezaste la conexión pero falta terminar el formulario de Stripe. Continúa cuando estés listo.</span>
              </div>
            )}

            <div style={{
              background: 'var(--bg)', border: '1px solid var(--border-soft)', borderRadius: 12,
              padding: 14, display: 'grid', gap: 9, marginBottom: 10,
            }}>
              <Check done={church.stripe_details_submitted}>Identidad y datos enviados</Check>
              <Check done={church.stripe_charges_enabled}>Cuenta lista para recibir donaciones</Check>
              <Check done={church.stripe_payouts_enabled}>Depósitos a tu banco habilitados</Check>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
              Los tres pasos deben estar marcados para empezar a recibir donaciones. Stripe los habilita uno a uno a medida que verifica tu información.
            </p>

            {connected ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-sm btn-secondary" onClick={handleDashboard} disabled={!canConfig || busy}>
                  <Icon name="creditCard" size={13} /> Administrar en Stripe
                </button>
                <button className="btn btn-sm btn-ghost" onClick={handleRefresh} disabled={busy}>
                  <Icon name="refresh" size={13} /> {busy ? 'Comprobando…' : 'Actualizar estado'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-sm btn-primary" onClick={handleConnect} disabled={!canConfig || busy}>
                  <Icon name="arrowRight" size={13} /> {busy ? 'Abriendo…' : (needsInfo ? 'Completar mis datos' : 'Continuar verificación')}
                </button>
                <button className="btn btn-sm btn-ghost" onClick={handleRefresh} disabled={busy}>
                  <Icon name="refresh" size={13} /> {busy ? 'Comprobando…' : 'Actualizar estado'}
                </button>
              </div>
            )}

            <p style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
              {connected
                ? 'Aceptas tarjeta, Apple Pay y Google Pay. Las donaciones se depositan en tu banco automáticamente (Stripe cobra su comisión estándar). Administra más métodos desde tu panel de Stripe.'
                : 'Tu información viaja cifrada directo a Stripe; nosotros nunca vemos tus datos bancarios.'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 6. Recibos de contribución
// ============================================================
function ReceiptCard({ church, churchId, canEdit, onToast, refreshChurch }) {
  const buildState = () => ({
    receipt_authorized_rep: church.receipt_authorized_rep || '',
    receipt_default_message: church.receipt_default_message || '',
    receipt_fiscal_notice:
      church.receipt_fiscal_notice ||
      'No se entregaron bienes ni servicios a cambio de esta contribución, excepto beneficios religiosos intangibles.',
    receipt_include_signature: !!church.receipt_include_signature,
  });

  const [form, setForm] = useState(buildState);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(buildState());
  }, [church.id, church.updated_at]);

  const set = (k) => (e) =>
    setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const isDirty = JSON.stringify(form) !== JSON.stringify(buildState());

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateChurchReceiptTemplate(churchId, form);
      await refreshChurch();
      onToast({ title: 'Plantilla de recibos guardada' });
    } catch (e) {
      onToast({ tone: 'error', icon: 'alert', title: 'Error al guardar', sub: e.message });
    } finally {
      setSaving(false);
    }
  };

  const churchLogoInitials = initials(church.public_name);

  return (
    <div className="card col-span-12">
      <SettingHeader
        icon="receipt"
        title="Recibos de contribución"
        desc="Personaliza los recibos enviados a tus donantes. Cumplen con los requisitos del IRS para deducciones."
        action={
          <button
            className="btn btn-sm btn-primary"
            onClick={handleSave}
            disabled={!canEdit || !isDirty || saving}
          >
            <Icon name="check" size={12} /> {saving ? 'Guardando…' : 'Guardar'}
          </button>
        }
      />
      <div style={{ padding: '0 24px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label>Logo en recibos</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 56, height: 56, borderRadius: 12,
                  background: church.logo_url ? `url(${church.logo_url}) center/cover` : 'var(--coffee)',
                  color: '#fff',
                  display: 'grid', placeItems: 'center',
                  fontWeight: 700,
                }}
              >
                {!church.logo_url && churchLogoInitials}
              </div>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                El logo se administra en la sección <strong>"Identidad visual"</strong> arriba.
              </span>
            </div>
          </div>
          <div className="field">
            <label>Representante autorizado</label>
            <input
              value={form.receipt_authorized_rep}
              onChange={set('receipt_authorized_rep')}
              disabled={!canEdit}
              placeholder="Nombre · cargo"
            />
          </div>
          <div className="field">
            <label>Mensaje por defecto</label>
            <textarea
              value={form.receipt_default_message}
              onChange={set('receipt_default_message')}
              disabled={!canEdit}
              rows={3}
              placeholder="Mensaje de agradecimiento que aparece en cada recibo."
            />
          </div>
          <div className="field">
            <label>
              Aviso fiscal <span className="hint">(requerido por el IRS)</span>
            </label>
            <textarea
              value={form.receipt_fiscal_notice}
              onChange={set('receipt_fiscal_notice')}
              disabled={!canEdit}
              rows={3}
            />
          </div>
          <div className="field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <label>Incluir firma manuscrita</label>
                <div className="hint">Aparece al final del recibo en formato escaneado.</div>
              </div>
              <button
                type="button"
                onClick={() => canEdit && setForm({ ...form, receipt_include_signature: !form.receipt_include_signature })}
                className={`toggle ${form.receipt_include_signature ? 'on' : ''}`}
                disabled={!canEdit}
                aria-label="Toggle firma"
              />
            </div>
          </div>
        </div>

        <ReceiptPreview church={church} form={form} initials={churchLogoInitials} />
      </div>
    </div>
  );
}

function ReceiptPreview({ church, form, initials: logoInitials }) {
  // Sample data — el preview es un mockup.
  const sample = {
    donor: 'María González Pérez',
    amount: '$250.00',
    fund: 'Fondo General',
    date: '23 mayo 2026',
    receiptNumber: '2026-000016',
  };

  return (
    <div>
      <div
        style={{
          fontSize: 11, fontWeight: 700, color: 'var(--muted)',
          textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10,
        }}
      >
        Vista previa del recibo
      </div>
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 24,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingBottom: 14, borderBottom: '1px solid var(--border-soft)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 42, height: 42, borderRadius: 10,
                background: 'var(--coffee)', color: '#fff',
                display: 'grid', placeItems: 'center',
                fontWeight: 700, fontSize: 14,
              }}
            >
              {logoInitials}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{church.legal_name}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                {church.ein ? `EIN ${church.ein} · 501(c)(3)` : '501(c)(3)'}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>Recibo</div>
            <div style={{ fontSize: 12, fontWeight: 700 }} className="mono">#{sample.receiptNumber}</div>
          </div>
        </div>

        <div style={{ marginTop: 14, fontSize: 11, lineHeight: 1.6 }}>
          <div style={{ color: 'var(--muted)' }}>Donante</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{sample.donor}</div>
          <div style={{ color: 'var(--muted)' }}>Aporte</div>
          <div style={{ fontWeight: 600 }}>
            {sample.amount} · {sample.fund} · {sample.date}
          </div>
        </div>

        {form.receipt_default_message && (
          <div
            style={{
              marginTop: 12, padding: 10,
              background: 'var(--bg)', borderRadius: 8,
              fontSize: 10, color: 'var(--muted)', lineHeight: 1.5,
            }}
          >
            "{form.receipt_default_message}"
          </div>
        )}

        <div
          style={{
            marginTop: 12, padding: 10,
            background: '#FBF8F4', borderRadius: 8,
            fontSize: 9, color: '#856630',
            lineHeight: 1.5, fontStyle: 'italic',
          }}
        >
          {form.receipt_fiscal_notice}
        </div>

        {form.receipt_include_signature && (
          <div
            style={{
              marginTop: 14, paddingTop: 12,
              borderTop: '1px solid var(--border-soft)',
              fontSize: 10, color: 'var(--muted)',
            }}
          >
            <div
              style={{
                fontStyle: 'italic', fontFamily: 'cursive',
                fontSize: 14, color: 'var(--text)', marginBottom: 2,
              }}
            >
              {form.receipt_authorized_rep?.split('·')[0]?.trim() || church.pastor_name || '—'}
            </div>
            {form.receipt_authorized_rep || 'Representante autorizado'}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Shared mini-components (presentational)
// ============================================================
function SettingHeader({ icon, title, desc, action, compact }) {
  return (
    <div
      style={{
        padding: compact ? '20px 24px 12px' : '20px 24px',
        borderBottom: compact ? 'none' : '1px solid var(--border-soft)',
        display: 'flex', alignItems: 'flex-start', gap: 14,
      }}
    >
      <div
        style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'var(--coffee-bg)', color: 'var(--coffee)',
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}
      >
        <Icon name={icon} size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{title}</h3>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{desc}</div>
      </div>
      {action}
    </div>
  );
}

function CfgRow({ label, value, dark }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 0',
        borderBottom: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid var(--border-soft)',
      }}
    >
      <span style={{ color: dark ? 'rgba(255,255,255,0.6)' : 'var(--muted)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: dark ? '#fff' : 'var(--text)' }}>{value}</span>
    </div>
  );
}
