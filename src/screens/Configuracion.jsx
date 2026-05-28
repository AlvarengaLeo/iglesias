// ConfiguracionScreen — NOTA Fase 5+: datos hardcoded.
// La conexion a Supabase entra en la fase del modulo correspondiente.
import { useState } from 'react';
import { Icon } from '../components/Icon.jsx';
import { Badge } from '../components/Badge.jsx';

// Configuración screen

export function ConfiguracionScreen({ onToast }) {
  const [lang, setLang] = useState('es');
  const [stripeStatus] = useState('Conectado');

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-text">
          <h2 className="page-greeting">Configuración</h2>
          <p className="page-sub">Gestiona los ajustes principales de tu iglesia</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => onToast({ title: 'Cambios guardados', sub: 'Tus ajustes se actualizaron correctamente.' })}>
            <Icon name="check" size={14} /> Guardar cambios
          </button>
        </div>
      </div>

      <div className="grid grid-12">
        {/* Datos de la iglesia */}
        <div className="card col-span-8">
          <SettingHeader icon="sparkle" title="Datos de la iglesia" desc="Información oficial usada en recibos, reportes y comunicación con el IRS." />
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="field" style={{ gridColumn: '1 / -1' }}><label>Nombre legal</label><input defaultValue="Iglesia Casa de Restauración Inc." /><span className="hint">Usado en recibos fiscales y documentos oficiales</span></div>
              <div className="field"><label>Nombre público</label><input defaultValue="Casa de Restauración" /></div>
              <div className="field"><label>EIN <span className="hint">(IRS)</span></label><input defaultValue="86-2143598" className="mono" /></div>
              <div className="field" style={{ gridColumn: '1 / -1' }}><label>Dirección</label><input defaultValue="2310 SW 27th Ave, Miami FL 33145" /></div>
              <div className="field"><label>Teléfono</label><input defaultValue="(305) 555-0100" /></div>
              <div className="field"><label>Email</label><input defaultValue="admin@casaderestauracion.org" /></div>
              <div className="field"><label>Pastor principal</label><input defaultValue="Miguel Ángel Rodríguez" /></div>
              <div className="field"><label>Tesorero</label><input defaultValue="Ana Patricia Soto" /></div>
            </div>
          </div>
        </div>

        {/* Idioma */}
        <div className="col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <SettingHeader icon="globe" title="Idioma" desc="Idioma del panel y de las comunicaciones con donantes." compact />
            <div style={{ padding: '0 20px 20px' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setLang('es')}
                  style={{
                    flex: 1, padding: 14, borderRadius: 12,
                    border: lang === 'es' ? '2px solid var(--navy)' : '1px solid var(--border)',
                    background: lang === 'es' ? '#F4ECE2' : 'var(--card)',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: 18, marginBottom: 4 }}>🇪🇸</div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Español</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Predeterminado</div>
                </button>
                <button
                  onClick={() => setLang('en')}
                  style={{
                    flex: 1, padding: 14, borderRadius: 12,
                    border: lang === 'en' ? '2px solid var(--navy)' : '1px solid var(--border)',
                    background: lang === 'en' ? '#F4ECE2' : 'var(--card)',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: 18, marginBottom: 4 }}>🇺🇸</div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>English</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Bilingüe</div>
                </button>
              </div>
            </div>
          </div>

          {/* Suscripción */}
          <div className="card" style={{ background: 'linear-gradient(135deg, #1F2B38, #2B3A4A)', color: '#fff', borderColor: 'transparent' }}>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(184, 154, 122, 0.2)', color: '#B89A7A', display: 'grid', placeItems: 'center' }}>
                  <Icon name="layers" size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Suscripción</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Plan Ministerio</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                <CfgRow dark label="Estado" value={<Badge tone="success" dot>Activa</Badge>} />
                <CfgRow dark label="Próximo cobro" value="15 jun 2026" />
                <CfgRow dark label="Método de pago" value={<span style={{ fontFeatureSettings: '"tnum"' }}>•••• 4892</span>} />
                <CfgRow dark label="Importe" value="$49 /mes" />
              </div>
              <button className="btn" style={{ width: '100%', justifyContent: 'center', marginTop: 14, background: 'var(--coffee)', color: '#fff' }}>
                Ver facturación <Icon name="arrowRight" size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Usuarios y permisos */}
        <div className="card col-span-7">
          <SettingHeader icon="users" title="Usuarios y permisos" desc="Define quién accede al sistema y con qué nivel de permisos." action={<button className="btn btn-sm btn-primary"><Icon name="plus" size={12} /> Invitar usuario</button>} />
          <div style={{ padding: '0 0 8px' }}>
            {[
              { name: 'Miguel Ángel Rodríguez', email: 'miguel@casaderestauracion.org', role: 'Pastor / Admin', tone: 'coffee', initials: 'MR', last: 'Activo ahora' },
              { name: 'Ana Patricia Soto', email: 'ana@casaderestauracion.org', role: 'Tesorero', tone: 'navy', initials: 'AS', last: 'Hace 1 hora' },
              { name: 'Carla Domínguez', email: 'carla@casaderestauracion.org', role: 'Secretaria', tone: 'navy', initials: 'CD', last: 'Ayer' },
              { name: 'Pedro Castillo', email: 'pedro@casaderestauracion.org', role: 'Líder de ministerio', tone: 'navy', initials: 'PC', last: 'Hace 3 días' },
            ].map((u, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 24px', borderTop: i === 0 ? 'none' : '1px solid var(--border-soft)' }}>
                <div className={`avatar ${u.tone === 'coffee' ? 'coffee' : 'navy'}`}>{u.initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{u.email}</div>
                </div>
                <RoleBadge role={u.role} />
                <div style={{ fontSize: 11, color: 'var(--muted)', width: 100, textAlign: 'right' }}>{u.last}</div>
                <div className="row-actions">
                  <button className="btn btn-sm btn-ghost" title="Cambiar rol"><Icon name="edit" size={14} /></button>
                  <button className="btn btn-sm btn-ghost" title="Desactivar"><Icon name="lock" size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stripe */}
        <div className="card col-span-5">
          <SettingHeader icon="creditCard" title="Stripe / Métodos de pago" desc="Conexión con tu procesador de pagos." compact />
          <div style={{ padding: '0 24px 20px' }}>
            <div style={{
              background: 'var(--success-bg)',
              border: '1px solid #D4E8DC',
              borderRadius: 12,
              padding: 14,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff', display: 'grid', placeItems: 'center', color: '#635BFF', fontWeight: 800, fontSize: 14 }}>S</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>Cuenta Stripe conectada</span>
                  <Badge tone="success" dot>{stripeStatus}</Badge>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>acct_1NkLpQ... · Última sync: hace 4 min</div>
              </div>
              <button className="btn btn-sm btn-secondary">Gestionar</button>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Métodos activos</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { method: 'Tarjeta de crédito/débito', icon: 'creditCard', on: true, fee: '2.9% + $0.30' },
                  { method: 'ACH · Transferencia bancaria', icon: 'wallet', on: true, fee: '0.8% (máx $5)' },
                  { method: 'Apple Pay / Google Pay', icon: 'smartphone', on: true, fee: 'Incluido' },
                ].map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid var(--border-soft)', borderRadius: 10 }}>
                    <Icon name={m.icon} size={16} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{m.method}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Comisión · {m.fee}</div>
                    </div>
                    <div className={`toggle ${m.on ? 'on' : ''}`}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recibos de contribución */}
        <div className="card col-span-12">
          <SettingHeader icon="receipt" title="Recibos de contribución" desc="Personaliza los recibos enviados a tus donantes. Cumplen con los requisitos del IRS para deducciones." />
          <div style={{ padding: '0 24px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label>Logo en recibos</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--coffee)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>CR</div>
                  <button className="btn btn-sm btn-secondary"><Icon name="upload" size={12} /> Cambiar logo</button>
                </div>
              </div>
              <div className="field">
                <label>Representante autorizado</label>
                <input defaultValue="Miguel Ángel Rodríguez · Pastor Principal" />
              </div>
              <div className="field">
                <label>Mensaje por defecto</label>
                <textarea defaultValue="Gracias por tu generosidad y compromiso con el Reino. Tu aporte se invierte fielmente en la obra del Señor."></textarea>
              </div>
              <div className="field">
                <label>Aviso fiscal <span className="hint">(requerido por el IRS)</span></label>
                <textarea defaultValue="No se entregaron bienes ni servicios a cambio de esta contribución, excepto beneficios religiosos intangibles."></textarea>
              </div>
              <div className="field">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <label>Incluir firma manuscrita</label>
                    <div className="hint">Aparece al final del recibo en formato escaneado.</div>
                  </div>
                  <div className="toggle on"></div>
                </div>
              </div>
            </div>

            {/* Preview receipt */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Vista previa del recibo</div>
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 24, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '1px solid var(--border-soft)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--coffee)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14 }}>CR</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Iglesia Casa de Restauración</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>EIN 86-2143598 · 501(c)(3)</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>Recibo</div>
                    <div style={{ fontSize: 12, fontWeight: 700 }} className="mono">#2024-126</div>
                  </div>
                </div>

                <div style={{ marginTop: 14, fontSize: 11, lineHeight: 1.6 }}>
                  <div style={{ color: 'var(--muted)' }}>Donante</div>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>María González Pérez</div>
                  <div style={{ color: 'var(--muted)' }}>Aporte</div>
                  <div style={{ fontWeight: 600 }}>$250.00 · Fondo General · 23 mayo 2026</div>
                </div>

                <div style={{ marginTop: 12, padding: 10, background: 'var(--bg)', borderRadius: 8, fontSize: 10, color: 'var(--muted)', lineHeight: 1.5 }}>
                  "Gracias por tu generosidad y compromiso con el Reino. Tu aporte se invierte fielmente en la obra del Señor."
                </div>

                <div style={{ marginTop: 12, padding: 10, background: '#FBF8F4', borderRadius: 8, fontSize: 9, color: '#856630', lineHeight: 1.5, fontStyle: 'italic' }}>
                  No se entregaron bienes ni servicios a cambio de esta contribución, excepto beneficios religiosos intangibles.
                </div>

                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-soft)', fontSize: 10, color: 'var(--muted)' }}>
                  <div style={{ fontStyle: 'italic', fontFamily: 'cursive', fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>Miguel A. Rodríguez</div>
                  Pastor Principal · Representante autorizado
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingHeader = ({ icon, title, desc, action, compact }) => (
  <div style={{
    padding: compact ? '20px 24px 12px' : '20px 24px',
    borderBottom: compact ? 'none' : '1px solid var(--border-soft)',
    display: 'flex', alignItems: 'flex-start', gap: 14
  }}>
    <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--coffee-bg)', color: 'var(--coffee)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      <Icon name={icon} size={16} />
    </div>
    <div style={{ flex: 1 }}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{title}</h3>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{desc}</div>
    </div>
    {action}
  </div>
);

const CfgRow = ({ label, value, dark }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '4px 0',
    borderBottom: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid var(--border-soft)',
  }}>
    <span style={{ color: dark ? 'rgba(255,255,255,0.6)' : 'var(--muted)' }}>{label}</span>
    <span style={{ fontWeight: 600, color: dark ? '#fff' : 'var(--text)' }}>{value}</span>
  </div>
);

const RoleBadge = ({ role }) => {
  const map = {
    'Pastor / Admin': 'coffee',
    'Tesorero': 'navy',
    'Secretaria': 'info',
    'Líder de ministerio': 'muted',
  };
  return <Badge tone={map[role] || 'muted'}>{role}</Badge>;
};
