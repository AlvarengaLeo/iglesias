// PortalScreen — NOTA Fase 5+: datos hardcoded.
// La conexion a Supabase entra en la fase del modulo correspondiente.
import { useState } from 'react';
import { Icon } from '../components/Icon.jsx';
import { Badge } from '../components/Badge.jsx';

// Portal screen — editor with live preview

export function PortalScreen({ onToast }) {
  const [section, setSection] = useState('Identidad');
  const [device, setDevice] = useState('desktop');
  const [hasChanges, setHasChanges] = useState(true);

  const sections = [
    { id: 'Identidad', icon: 'sparkle' },
    { id: 'Inicio', icon: 'home' },
    { id: 'Horarios', icon: 'clock' },
    { id: 'Donaciones', icon: 'handHeart' },
    { id: 'Campañas visibles', icon: 'target' },
    { id: 'Contacto', icon: 'phone' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h2 className="page-greeting" style={{ margin: 0 }}>Portal</h2>
            <Badge tone={hasChanges ? 'warning' : 'success'} dot>{hasChanges ? 'Cambios sin publicar' : 'Publicado'}</Badge>
          </div>
          <p className="page-sub">Administra la información pública de tu iglesia · iglesiacr.app/casaderestauracion</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost"><Icon name="eye" size={14} /> Vista previa</button>
          <button className="btn btn-secondary" onClick={() => onToast({ title: 'Cambios guardados', sub: 'Tu portal sigue en borrador hasta que publiques.' })}><Icon name="save" size={14} /> Guardar cambios</button>
          <button className="btn btn-primary" onClick={() => { setHasChanges(false); onToast({ title: 'Portal publicado', sub: 'Los cambios ya son visibles para tu comunidad.' }); }}>
            <Icon name="rocket" size={14} /> Publicar portal
          </button>
        </div>
      </div>

      {/* Unsaved alert */}
      {hasChanges && (
        <div className="banner" style={{ marginBottom: 16 }}>
          <Icon name="alert" />
          <div>
            <strong>Hay cambios sin publicar.</strong> Tu comunidad aún ve la versión anterior del portal hasta que publiques.
          </div>
          <div className="banner-actions">
            <button className="btn btn-sm btn-ghost">Descartar</button>
            <button className="btn btn-sm btn-coffee" onClick={() => { setHasChanges(false); onToast({ title: 'Portal publicado' }); }}>Publicar ahora</button>
          </div>
        </div>
      )}

      {/* Two column */}
      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 16 }}>
        {/* Left — sections + editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div style={{ padding: '12px 8px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '4px 12px 8px' }}>Secciones del portal</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {sections.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSection(s.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px',
                      border: 'none',
                      background: section === s.id ? 'var(--bg-2)' : 'transparent',
                      borderRadius: 8,
                      color: section === s.id ? 'var(--text)' : 'var(--muted)',
                      fontWeight: section === s.id ? 700 : 500,
                      fontSize: 13,
                      textAlign: 'left',
                    }}
                  >
                    <Icon name={s.icon} size={15} />
                    <span style={{ flex: 1 }}>{s.id}</span>
                    {section === s.id && <Icon name="chevronRight" size={14} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Editar · {section}</h3>
            </div>
            <div style={{ padding: 20 }}>
              {section === 'Identidad' && <IdentidadEditor />}
              {section === 'Inicio' && <InicioEditor />}
              {section === 'Horarios' && <HorariosEditor />}
              {section === 'Donaciones' && <DonacionesEditor />}
              {section === 'Campañas visibles' && <CampañasEditor />}
              {section === 'Contacto' && <ContactoEditor />}
            </div>
          </div>
        </div>

        {/* Right — Live preview */}
        <div style={{ position: 'sticky', top: 88, alignSelf: 'flex-start' }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Vista previa en vivo</div>
              <div className="tabs">
                <button className={`tab ${device === 'desktop' ? 'active' : ''}`} onClick={() => setDevice('desktop')}><Icon name="monitor" size={12} /> Escritorio</button>
                <button className={`tab ${device === 'mobile' ? 'active' : ''}`} onClick={() => setDevice('mobile')}><Icon name="smartphone" size={12} /> Móvil</button>
              </div>
            </div>

            {device === 'desktop' ? (
              <div className="browser-frame">
                <div className="browser-bar">
                  <div className="browser-dots"><div className="browser-dot"></div><div className="browser-dot"></div><div className="browser-dot"></div></div>
                  <div className="browser-url">iglesiacr.app/casaderestauracion</div>
                </div>
                <DesktopPreview />
              </div>
            ) : (
              <div style={{ padding: 16, background: 'var(--bg-2)', borderRadius: 12, display: 'grid', placeItems: 'center' }}>
                <div className="phone-frame">
                  <div className="phone-screen">
                    <MobilePreview />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ Editors ============

const IdentidadEditor = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div className="field">
      <label>Logo</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 64, height: 64, borderRadius: 12, background: 'var(--coffee)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: 18 }}>CR</div>
        <div style={{ flex: 1 }}>
          <button className="btn btn-secondary btn-sm"><Icon name="upload" size={12} /> Subir nuevo logo</button>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>PNG o SVG · Mínimo 200×200px</div>
        </div>
      </div>
    </div>
    <div className="field">
      <label>Nombre legal</label>
      <input defaultValue="Iglesia Casa de Restauración Inc." />
    </div>
    <div className="field">
      <label>Nombre público <span className="hint">(aparece en el portal)</span></label>
      <input defaultValue="Casa de Restauración" />
    </div>
    <div className="field">
      <label>Color principal del portal</label>
      <div style={{ display: 'flex', gap: 8 }}>
        {['#1F2B38', '#8A6A4A', '#3D5681', '#4F9D7B', '#C25C5C'].map((c, i) => (
          <div key={c} style={{
            width: 36, height: 36, borderRadius: 10,
            background: c, cursor: 'pointer',
            border: i === 1 ? '3px solid #fff' : '3px solid transparent',
            boxShadow: i === 1 ? '0 0 0 2px var(--navy)' : 'none',
          }}></div>
        ))}
      </div>
    </div>
  </div>
);

const InicioEditor = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div className="field">
      <label>Título principal</label>
      <input defaultValue="Una casa de fe, restauración y comunidad" />
    </div>
    <div className="field">
      <label>Mensaje de bienvenida</label>
      <textarea rows={3} defaultValue="Somos una iglesia hispana en Miami donde toda familia encuentra un hogar espiritual. Te invitamos a visitarnos cada domingo."></textarea>
    </div>
    <div className="field">
      <label>Imagen principal</label>
      <div style={{ border: '1.5px dashed var(--border)', borderRadius: 12, padding: 20, textAlign: 'center', background: 'var(--bg)' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--card)', display: 'grid', placeItems: 'center', margin: '0 auto 10px', color: 'var(--muted)' }}>
          <Icon name="image" />
        </div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>congregacion-domingo.jpg</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>1920×1080 · 240 KB</div>
        <button className="btn btn-sm btn-secondary" style={{ marginTop: 10 }}>Cambiar imagen</button>
      </div>
    </div>
    <div className="field">
      <label>Texto del botón principal</label>
      <input defaultValue="Donar ahora" />
    </div>
  </div>
);

const HorariosEditor = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    {[
      { day: 'Domingo', time: '10:00 AM', type: 'Servicio dominical', addr: 'Sede principal' },
      { day: 'Domingo', time: '6:00 PM', type: 'Servicio bilingüe', addr: 'Sede principal' },
      { day: 'Miércoles', time: '7:30 PM', type: 'Estudio bíblico', addr: 'Online + presencial' },
      { day: 'Viernes', time: '7:00 PM', type: 'Jóvenes y adolescentes', addr: 'Salón de jóvenes' },
    ].map((h, i) => (
      <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 90px 1fr auto', gap: 8, padding: 12, background: 'var(--bg)', borderRadius: 10, alignItems: 'center' }}>
        <input defaultValue={h.day} style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, background: 'var(--card)' }} />
        <input defaultValue={h.time} style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, background: 'var(--card)' }} />
        <input defaultValue={h.type} style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, background: 'var(--card)' }} />
        <button className="btn btn-sm btn-ghost" style={{ padding: 6 }}><Icon name="x" size={14} /></button>
      </div>
    ))}
    <button className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}><Icon name="plus" size={14} /> Agregar reunión</button>
  </div>
);

const DonacionesEditor = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div className="field">
      <label>Texto del botón donar</label>
      <input defaultValue="Donar ahora" />
    </div>
    <div className="field">
      <label>Fondo predeterminado</label>
      <select><option>Fondo General</option><option>Diezmos</option><option>Ofrendas</option></select>
    </div>
    <div className="field">
      <label>Frecuencias visibles</label>
      <div style={{ display: 'flex', gap: 6 }}>
        {[{l:'Única', a:true}, {l:'Mensual', a:true}, {l:'Anual', a:false}].map(f => (
          <button key={f.l} className={`chip ${f.a ? 'active' : ''}`}>{f.l}</button>
        ))}
      </div>
    </div>
    <div className="field">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <label>Mostrar donaciones recurrentes</label>
          <div className="hint">Tus donantes podrán configurar aportes automáticos.</div>
        </div>
        <div className="toggle on"></div>
      </div>
    </div>
  </div>
);

const CampañasEditor = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div className="hint" style={{ fontSize: 12, color: 'var(--muted)' }}>Selecciona las campañas visibles en el portal público.</div>
    {[
      { name: 'Fondo de construcción', raised: 32400, goal: 50000, on: true },
      { name: 'Misiones 2026', raised: 11200, goal: 12000, on: true },
      { name: 'Ayuda comunitaria', raised: 1280, goal: 5000, on: false },
    ].map((c, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border-soft)' }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--coffee-bg)', color: 'var(--coffee)', display: 'grid', placeItems: 'center' }}>
          <Icon name="target" size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>${c.raised.toLocaleString()} de ${c.goal.toLocaleString()}</div>
        </div>
        <div className={`toggle ${c.on ? 'on' : ''}`}></div>
      </div>
    ))}
  </div>
);

const ContactoEditor = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div className="field"><label>Dirección</label><input defaultValue="2310 SW 27th Ave, Miami FL 33145" /></div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div className="field"><label>Teléfono</label><input defaultValue="(305) 555-0100" /></div>
      <div className="field"><label>Email</label><input defaultValue="hola@casaderestauracion.org" /></div>
    </div>
    <div className="field"><label>Enlace de mapa</label><input defaultValue="https://maps.google.com/?q=..." /></div>
    <div className="field">
      <label>Redes sociales</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {['Facebook', 'Instagram', 'YouTube', 'WhatsApp'].map(r => (
          <div key={r} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg-2)', display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 11, fontWeight: 600 }}>{r[0]}</div>
            <input defaultValue={`@casaderestauracion`} style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ============ Live Preview ============

const DesktopPreview = () => (
  <div style={{ background: '#fff', fontSize: 12 }}>
    {/* Top nav */}
    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 28px', borderBottom: '1px solid #EEF0F3' }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--coffee)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 11 }}>CR</div>
      <div style={{ marginLeft: 10, fontWeight: 700, color: 'var(--text)' }}>Casa de Restauración</div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 18, fontSize: 11, color: 'var(--muted)' }}>
        <span>Inicio</span><span>Horarios</span><span>Donar</span><span>Contacto</span>
      </div>
    </div>
    {/* Hero */}
    <div style={{
      padding: '40px 28px 36px',
      background: 'linear-gradient(135deg, #1F2B38, #2B3A4A)',
      color: '#fff',
      position: 'relative',
    }}>
      <div style={{ fontSize: 11, color: '#B89A7A', fontWeight: 600, marginBottom: 8, letterSpacing: '0.04em' }}>IGLESIA HISPANA · MIAMI</div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: 8, maxWidth: '70%' }}>
        Una casa de fe, restauración y comunidad
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 16, maxWidth: '60%', lineHeight: 1.4 }}>
        Somos una iglesia hispana donde toda familia encuentra un hogar espiritual.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{ padding: '7px 14px', borderRadius: 8, background: '#8A6A4A', color: '#fff', border: 'none', fontWeight: 600, fontSize: 11 }}>Donar ahora</button>
        <button style={{ padding: '7px 14px', borderRadius: 8, background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 600, fontSize: 11 }}>Visítanos</button>
      </div>
    </div>
    {/* Horarios */}
    <div style={{ padding: '28px' }}>
      <div style={{ fontSize: 10, color: 'var(--coffee)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Nuestros servicios</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Horarios de reunión</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          ['Domingo · 10:00 AM', 'Servicio dominical'],
          ['Domingo · 6:00 PM', 'Servicio bilingüe'],
          ['Miércoles · 7:30 PM', 'Estudio bíblico'],
          ['Viernes · 7:00 PM', 'Jóvenes'],
        ].map((h, i) => (
          <div key={i} style={{ padding: '10px 12px', border: '1px solid var(--border-soft)', borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>{h[0]}</div>
            <div style={{ fontWeight: 600, fontSize: 11 }}>{h[1]}</div>
          </div>
        ))}
      </div>
    </div>
    {/* Campaigns */}
    <div style={{ padding: '0 28px 28px' }}>
      <div style={{ fontSize: 10, color: 'var(--coffee)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Campañas activas</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Apoya con tu donación</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[['Fondo de construcción', 32400, 50000], ['Misiones 2026', 11200, 12000]].map((c, i) => (
          <div key={i} style={{ padding: 12, background: 'var(--bg)', borderRadius: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 6 }}>{c[0]}</div>
            <div style={{ height: 5, background: '#fff', borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ width: `${c[1]/c[2]*100}%`, height: '100%', background: 'var(--coffee)' }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)' }}>
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>${c[1].toLocaleString()}</span>
              <span>de ${c[2].toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
    {/* Footer */}
    <div style={{ padding: '20px 28px', background: 'var(--bg)', borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)' }}>
      <span>2310 SW 27th Ave, Miami FL 33145</span>
      <span>(305) 555-0100 · hola@casaderestauracion.org</span>
    </div>
  </div>
);

const MobilePreview = () => (
  <div style={{ fontSize: 10, background: '#fff', height: '100%', overflowY: 'auto' }}>
    <div style={{ padding: '20px 16px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--coffee)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 9 }}>CR</div>
      <div style={{ fontWeight: 700, fontSize: 11 }}>Casa de Restauración</div>
    </div>
    <div style={{ padding: '20px 16px 24px', background: 'linear-gradient(135deg, #1F2B38, #2B3A4A)', color: '#fff' }}>
      <div style={{ fontSize: 9, color: '#B89A7A', fontWeight: 600, marginBottom: 6 }}>IGLESIA HISPANA</div>
      <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2, marginBottom: 8 }}>Una casa de fe y restauración</div>
      <div style={{ fontSize: 9, opacity: 0.7, marginBottom: 12 }}>Toda familia encuentra un hogar.</div>
      <button style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'var(--coffee)', color: '#fff', border: 'none', fontSize: 10, fontWeight: 600 }}>Donar ahora</button>
    </div>
    <div style={{ padding: '16px' }}>
      <div style={{ fontSize: 8, color: 'var(--coffee)', fontWeight: 700, marginBottom: 4 }}>HORARIOS</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[['Domingo · 10:00 AM', 'Dominical'], ['Miércoles · 7:30 PM', 'Estudio bíblico']].map((h, i) => (
          <div key={i} style={{ padding: 8, border: '1px solid var(--border-soft)', borderRadius: 6 }}>
            <div style={{ fontSize: 8, color: 'var(--muted)' }}>{h[0]}</div>
            <div style={{ fontWeight: 600, fontSize: 9 }}>{h[1]}</div>
          </div>
        ))}
      </div>
    </div>
    <div style={{ padding: '0 16px 16px' }}>
      <div style={{ fontSize: 8, color: 'var(--coffee)', fontWeight: 700, marginBottom: 4 }}>CAMPAÑAS</div>
      <div style={{ padding: 10, background: 'var(--bg)', borderRadius: 6 }}>
        <div style={{ fontWeight: 600, fontSize: 9, marginBottom: 4 }}>Fondo de construcción</div>
        <div style={{ height: 4, background: '#fff', borderRadius: 999, overflow: 'hidden', marginBottom: 4 }}>
          <div style={{ width: '65%', height: '100%', background: 'var(--coffee)' }}></div>
        </div>
        <div style={{ fontSize: 8, color: 'var(--muted)' }}>$32,400 de $50,000</div>
      </div>
    </div>
  </div>
);
