// PersonasScreen — NOTA Fase 5+: datos hardcoded.
// La conexion a Supabase entra en la fase del modulo correspondiente.
import { useState } from 'react';
import { Icon } from '../components/Icon.jsx';
import { Badge } from '../components/Badge.jsx';
import { formatMoney } from '../components/charts/index.jsx';

// Personas screen

const PEOPLE = [
  { id: 1, name: 'María González Pérez', initials: 'MG', phone: '(305) 555-0142', email: 'maria.gonzalez@gmail.com', type: 'Miembro', tone: 'navy', lastActivity: 'Donación · hace 2 días', tags: ['Diezmo recurrente', 'Coro'], totalYear: 3200, recurring: true, follow: 'Visita pastoral · 15 jun' },
  { id: 2, name: 'Carlos Méndez', initials: 'CM', phone: '(786) 555-0188', email: 'cmendez@correo.com', type: 'Donante', tone: 'coffee', lastActivity: 'Donación · hace 5 días', tags: ['Mensual'], totalYear: 1850, recurring: true },
  { id: 3, name: 'Ana Torres Ramírez', initials: 'AT', phone: '(305) 555-0199', email: 'ana.t@yahoo.com', type: 'Servidor', tone: 'success', lastActivity: 'Reunión · hace 1 día', tags: ['Niños', 'Líder'], totalYear: 1200, recurring: false },
  { id: 4, name: 'Familia Ramírez', initials: 'FR', phone: '(305) 555-0210', email: 'ramirez.familia@gmail.com', type: 'Visitante', tone: 'info', lastActivity: 'Primera visita · 2 mar', tags: ['Nuevos'], totalYear: 0, recurring: false },
  { id: 5, name: 'José Antonio Vargas', initials: 'JV', phone: '(786) 555-0233', email: 'jvargas@hotmail.com', type: 'Miembro', tone: 'navy', lastActivity: 'Donación · hace 1 semana', tags: ['Misiones'], totalYear: 980, recurring: false },
  { id: 6, name: 'Lucía Hernández', initials: 'LH', phone: '(305) 555-0277', email: 'lucia.h@gmail.com', type: 'Donante', tone: 'coffee', lastActivity: 'Donación · hace 3 días', tags: ['Anual'], totalYear: 5400, recurring: true },
  { id: 7, name: 'Pedro Castillo', initials: 'PC', phone: '(786) 555-0301', email: 'p.castillo@correo.com', type: 'Servidor', tone: 'success', lastActivity: 'Reunión · hace 4 días', tags: ['Alabanza'], totalYear: 720, recurring: false },
  { id: 8, name: 'Roberto Salinas', initials: 'RS', phone: '(305) 555-0322', email: 'rsalinas@gmail.com', type: 'Inactivo', tone: 'muted', lastActivity: 'Sin actividad · 6 meses', tags: [], totalYear: 0, recurring: false },
  { id: 9, name: 'Familia Ortega', initials: 'FO', phone: '(786) 555-0344', email: 'ortega.f@correo.com', type: 'Miembro', tone: 'navy', lastActivity: 'Donación · hace 6 días', tags: ['Diezmo recurrente', 'Familia'], totalYear: 4100, recurring: true },
  { id: 10, name: 'Sofía Mendoza', initials: 'SM', phone: '(305) 555-0359', email: 'sofiam@gmail.com', type: 'Visitante', tone: 'info', lastActivity: 'Visita · hace 10 días', tags: ['Joven'], totalYear: 50, recurring: false },
];

export function PersonasScreen({ onToast }) {
  const [filter, setFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [profileTab, setProfileTab] = useState('Resumen');

  const counts = {
    Todos: PEOPLE.length,
    Miembros: PEOPLE.filter(p => p.type === 'Miembro').length,
    Visitantes: PEOPLE.filter(p => p.type === 'Visitante').length,
    Donantes: PEOPLE.filter(p => p.type === 'Donante').length,
    Servidores: PEOPLE.filter(p => p.type === 'Servidor').length,
    Inactivos: PEOPLE.filter(p => p.type === 'Inactivo').length,
  };

  const filtered = PEOPLE.filter(p => {
    if (filter !== 'Todos' && p.type !== filter.replace(/s$/, '')) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filters = ['Todos', 'Miembros', 'Visitantes', 'Donantes', 'Servidores', 'Inactivos'];

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-text">
          <h2 className="page-greeting">Personas</h2>
          <p className="page-sub">Administra miembros, visitantes, donantes y servidores · {PEOPLE.length} personas registradas</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary"><Icon name="download" size={14} /> Exportar</button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Icon name="plus" size={14} /> Agregar persona
          </button>
        </div>
      </div>

      {/* Filter / Search bar */}
      <div className="card" style={{ marginBottom: 16, padding: 14 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="input-wrap" style={{ flex: '1 1 280px', minWidth: 240 }}>
            <Icon name="search" />
            <input className="input" placeholder="Buscar por nombre, teléfono o email" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {filters.map(f => (
              <button key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f} <span className="count">{counts[f]}</span>
              </button>
            ))}
          </div>
          <button className="pill-btn"><Icon name="filter" /> Etiquetas <Icon name="chevronDown" /></button>
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
              {filtered.map(p => (
                <tr key={p.id} className={selected?.id === p.id ? 'selected' : ''} onClick={() => setSelected(p)}>
                  <td onClick={e => e.stopPropagation()}><input type="checkbox" /></td>
                  <td>
                    <div className="person-cell">
                      <div className={`avatar ${p.tone === 'coffee' ? 'coffee' : p.tone === 'navy' ? 'navy' : ''}`}>{p.initials}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.tags.slice(0,2).join(' · ') || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="muted tnum">{p.phone}</td>
                  <td className="muted">{p.email}</td>
                  <td><PersonBadge type={p.type} /></td>
                  <td className="muted" style={{ fontSize: 12 }}>{p.lastActivity}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm btn-ghost" title="Ver perfil" onClick={() => setSelected(p)}><Icon name="eye" size={14} /></button>
                      <button className="btn btn-sm btn-ghost" title="Editar"><Icon name="edit" size={14} /></button>
                      <button className="btn btn-sm btn-ghost" title="Enviar mensaje"><Icon name="send" size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid var(--border-soft)', fontSize: 12, color: 'var(--muted)' }}>
          <span>Mostrando 1–{filtered.length} de {PEOPLE.length} personas</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-sm btn-secondary" disabled><Icon name="chevronLeft" size={12} /> Anterior</button>
            <button className="btn btn-sm btn-secondary">Siguiente <Icon name="chevronRight" size={12} /></button>
          </div>
        </div>
      </div>

      {/* Drawer */}
      {selected && (
        <div className="drawer-overlay" onClick={() => setSelected(null)}>
          <div className="drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div className={`avatar lg ${selected.tone === 'coffee' ? 'coffee' : 'navy'}`}>{selected.initials}</div>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>{selected.name}</h3>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <PersonBadge type={selected.type} />
                    {selected.recurring && <Badge tone="coffee" icon="refresh">Recurrente</Badge>}
                  </div>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setSelected(null)}><Icon name="x" /></button>
            </div>

            <div style={{ padding: '0 24px' }}>
              <div className="tabs-underline">
                {['Resumen', 'Donaciones', 'Seguimiento', 'Notas'].map(t => (
                  <button key={t} className={`tab-u ${profileTab === t ? 'active' : ''}`} onClick={() => setProfileTab(t)}>{t}</button>
                ))}
              </div>
            </div>

            <div className="drawer-body">
              {profileTab === 'Resumen' && <ProfileResumen p={selected} />}
              {profileTab === 'Donaciones' && <ProfileDonaciones p={selected} />}
              {profileTab === 'Seguimiento' && <ProfileSeguimiento p={selected} />}
              {profileTab === 'Notas' && <ProfileNotas p={selected} />}
            </div>

            <div className="drawer-foot">
              <button className="btn btn-secondary"><Icon name="send" size={14} /> Enviar mensaje</button>
              <button className="btn btn-primary"><Icon name="edit" size={14} /> Editar persona</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Agregar persona</h3>
                <p>Captura la información esencial. Podrás completar el perfil después.</p>
              </div>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}><Icon name="x" /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="field"><label>Nombre</label><input placeholder="María" /></div>
                <div className="field"><label>Apellido</label><input placeholder="González" /></div>
                <div className="field"><label>Teléfono</label><input placeholder="(305) 555-0000" /></div>
                <div className="field"><label>Email</label><input placeholder="email@ejemplo.com" /></div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>Tipo</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['Miembro', 'Visitante', 'Donante', 'Servidor'].map((t, i) => (
                      <button key={t} className={`chip ${i === 0 ? 'active' : ''}`}>{t}</button>
                    ))}
                  </div>
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>Notas <span className="hint">(opcional)</span></label>
                  <textarea placeholder="Observaciones pastorales, contexto familiar, etc."></textarea>
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => { setShowAddModal(false); onToast({ title: 'Persona agregada correctamente', sub: 'Aparecerá en tu lista de personas.' }); }}>
                <Icon name="check" size={14} /> Guardar persona
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PersonBadge = ({ type }) => {
  const map = {
    Miembro: { tone: 'navy', icon: null },
    Visitante: { tone: 'info', icon: null },
    Donante: { tone: 'coffee', icon: null },
    Servidor: { tone: 'success', icon: null },
    Inactivo: { tone: 'muted', icon: null },
  };
  const m = map[type] || { tone: 'muted' };
  return <Badge tone={m.tone} dot>{type}</Badge>;
};

const ProfileResumen = ({ p }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    {/* Contact */}
    <Section title="Contacto">
      <InfoRow icon="phone" label="Teléfono" value={p.phone} />
      <InfoRow icon="mail" label="Email" value={p.email} />
      <InfoRow icon="map" label="Dirección" value="2310 SW 27th Ave, Miami FL 33145" />
    </Section>

    {/* Tags */}
    <Section title="Etiquetas">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {p.tags.length ? p.tags.map(t => <Badge key={t} tone="coffee">{t}</Badge>) : <span className="muted" style={{ fontSize: 12 }}>Sin etiquetas</span>}
        <button className="chip" style={{ padding: '4px 10px' }}><Icon name="plus" size={11} /> Agregar</button>
      </div>
    </Section>

    {/* Family */}
    <Section title="Familia">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <FamilyRow name="José González" rel="Esposo" type="Miembro" />
        <FamilyRow name="Daniel González" rel="Hijo" type="Servidor" />
        <FamilyRow name="Lucía González" rel="Hija" type="Visitante" />
      </div>
    </Section>

    {/* Donation summary */}
    <Section title="Resumen de donaciones">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <MiniStat label="Total donado este año" value={formatMoney(p.totalYear)} />
        <MiniStat label="Última donación" value="$250 · hace 2 días" />
        <MiniStat label="Donación recurrente" value={p.recurring ? 'Activa · $200/mes' : 'No activa'} success={p.recurring} />
        <MiniStat label="Recibos enviados" value="14" />
      </div>
    </Section>

    {/* Follow-up */}
    <Section title="Seguimiento">
      <InfoRow icon="clock" label="Último contacto" value="Visita pastoral · 12 mayo" />
      <InfoRow icon="calendar" label="Próximo seguimiento" value="15 junio · Visita programada" highlight />
    </Section>
  </div>
);

const ProfileDonaciones = ({ p }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <MiniStat label="Total este año" value={formatMoney(p.totalYear)} />
      <MiniStat label="Promedio mensual" value={formatMoney(Math.round(p.totalYear/8))} />
    </div>
    <Section title="Historial">
      {[
        { date: '23 may 2026', amount: 250, fund: 'Fondo General', method: 'ACH', status: 'Pagada' },
        { date: '23 abr 2026', amount: 250, fund: 'Fondo General', method: 'ACH', status: 'Pagada' },
        { date: '15 abr 2026', amount: 100, fund: 'Misiones 2026', method: 'Tarjeta', status: 'Pagada' },
        { date: '23 mar 2026', amount: 250, fund: 'Fondo General', method: 'ACH', status: 'Pagada' },
        { date: '23 feb 2026', amount: 200, fund: 'Fondo General', method: 'ACH', status: 'Pagada' },
      ].map((d, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-soft)' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{formatMoney(d.amount)} · {d.fund}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.date} · {d.method}</div>
          </div>
          <Badge tone="success" dot>{d.status}</Badge>
        </div>
      ))}
    </Section>
  </div>
);

const ProfileSeguimiento = ({ p }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div className="banner info">
      <Icon name="info" />
      Próximo seguimiento: <strong>Visita pastoral programada para el 15 de junio</strong>
    </div>
    <Section title="Historial pastoral">
      <Timeline items={[
        { icon: 'phone', text: 'Llamada de seguimiento — María compartió motivos de oración por su hijo.', time: '12 may 2026', tone: 'coffee' },
        { icon: 'user', text: 'Visita pastoral en casa — Familia recibió oración y palabras de aliento.', time: '20 abr 2026', tone: 'navy' },
        { icon: 'mail', text: 'Envío de recurso devocional «Caminar con Cristo».', time: '14 mar 2026', tone: 'success' },
      ]} />
    </Section>
  </div>
);

const ProfileNotas = ({ p }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div className="banner">
      <Icon name="lock" />
      Las notas pastorales son privadas y solo visibles para administradores y pastores.
    </div>
    <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 12, border: '1px solid var(--border-soft)' }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Nota · Pastor Miguel · 12 may 2026</div>
      <div style={{ fontSize: 13, lineHeight: 1.55 }}>Familia muy comprometida con el ministerio de niños. María está liderando el grupo de oración de las mujeres. Solicitar oración por la salud de su madre.</div>
    </div>
    <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 12, border: '1px solid var(--border-soft)' }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Nota · Pastora Elena · 28 mar 2026</div>
      <div style={{ fontSize: 13, lineHeight: 1.55 }}>Daniel (hijo) participará en el campamento juvenil de verano. Confirmar inscripción.</div>
    </div>
    <button className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}><Icon name="plus" size={14} /> Agregar nota</button>
  </div>
);

const Section = ({ title, children }) => (
  <div>
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>{title}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
  </div>
);

const InfoRow = ({ icon, label, value, highlight }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
    <div style={{
      width: 30, height: 30, borderRadius: 8,
      background: highlight ? 'var(--coffee-bg)' : 'var(--bg-2)',
      color: highlight ? 'var(--coffee)' : 'var(--muted)',
      display: 'grid', placeItems: 'center', flexShrink: 0
    }}><Icon name={icon} size={14} /></div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
    </div>
  </div>
);

const FamilyRow = ({ name, rel, type }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 8, background: 'var(--bg)' }}>
    <div className="avatar sm">{name.split(' ').map(n => n[0]).join('').slice(0,2)}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{rel}</div>
    </div>
    <PersonBadge type={type} />
  </div>
);

const MiniStat = ({ label, value, success }) => (
  <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border-soft)' }}>
    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 14, fontWeight: 700, color: success ? 'var(--success)' : 'var(--text)' }}>{value}</div>
  </div>
);

const Timeline = ({ items }) => (
  <div className="timeline">
    {items.map((it, i) => (
      <div key={i} className="timeline-item">
        <div className={`timeline-dot ${it.tone || 'coffee'}`}><Icon name={it.icon} /></div>
        <div className="timeline-body">
          <p>{it.text}</p>
          <span>{it.time}</span>
        </div>
      </div>
    ))}
  </div>
);
