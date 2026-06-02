// Seeder de DEMO para el módulo Equipos (casa-de-restauracion).
// Uso: node --env-file=.env.local supabase/seed-equipos.mjs
// Idempotente: borra los servicios marcados (notes='seed:equipos-demo') y recrea.
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Faltan VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const supa = createClient(url, key, { auth: { persistSession: false } });
const CHURCH = 'c1ec1ec1-0000-0000-0000-000000000001';
const MARK = 'seed:equipos-demo';

const die = (label, e) => { if (e) { console.error(label, e.message || e); process.exit(1); } };

// --- fetch catálogos ---
const { data: people, error: pe } = await supa.from('people')
  .select('id, first_name, last_name').eq('church_id', CHURCH)
  .eq('person_type', 'individual').is('deleted_at', null).limit(40);
die('people', pe);
const { data: teams, error: te } = await supa.from('service_teams')
  .select('id, name').eq('church_id', CHURCH).is('deleted_at', null);
die('teams', te);
const { data: positions, error: pose } = await supa.from('service_positions')
  .select('id, name, team_id').eq('church_id', CHURCH);
die('positions', pose);

const teamByName = Object.fromEntries(teams.map(t => [t.name, t]));
const posOf = (teamName, posName) => {
  const t = teamByName[teamName]; if (!t) return null;
  return positions.find(p => p.team_id === t.id && p.name.toLowerCase() === posName.toLowerCase()) || null;
};
if (people.length < 8) { console.error('No hay suficientes personas para sembrar'); process.exit(1); }
console.log(`Catálogo: ${people.length} personas, ${teams.length} equipos, ${positions.length} posiciones`);

// --- limpiar demo previa (cascade borra asignaciones + canales) ---
const { data: oldServices } = await supa.from('service_events')
  .select('id').eq('church_id', CHURCH).or(`notes.eq.${MARK},title.eq.Servicio de Prueba (QA navegador)`);
if (oldServices?.length) {
  await supa.from('service_events').delete().in('id', oldServices.map(s => s.id));
  console.log(`Limpieza: ${oldServices.length} servicios demo previos borrados`);
}

// --- membresías de equipo (upsert) ---
const teamRoster = {
  'Alabanza':   people.slice(0, 6),
  'Multimedia': people.slice(6, 9),
  'Sonido':     people.slice(9, 11),
  'Ujieres':    people.slice(2, 6),
  'Niños':      people.slice(0, 3),
  'Jóvenes':    people.slice(3, 8),
  'Diáconos':   people.slice(8, 11),
  'Pastoral':   people.slice(0, 2),
};
const memberRows = [];
for (const [tname, roster] of Object.entries(teamRoster)) {
  const t = teamByName[tname]; if (!t) continue;
  roster.forEach((p, i) => memberRows.push({
    church_id: CHURCH, team_id: t.id, person_id: p.id,
    team_role: i === 0 ? 'leader' : 'member', is_active: true,
  }));
}
{
  const { error } = await supa.from('service_team_members')
    .upsert(memberRows, { onConflict: 'team_id,person_id', ignoreDuplicates: true });
  die('team_members', error);
  console.log(`Miembros de equipo: ${memberRows.length} upserted`);
}

// --- servicios: próximas 3 semanas ---
// yyyy-mm-dd usando partes LOCALES (no toISOString, que rota a UTC con la hora del día)
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const NY = '-04:00'; // EDT (junio)
const nextDow = (from, dow) => { const d = new Date(from); const diff = (dow - d.getDay() + 7) % 7; d.setDate(d.getDate() + diff); return d; };
const today = new Date();
const plan = [
  { dow: 0, time: '10:00:00', title: 'Servicio Inglés',     type: 'servicio_ingles',  lang: 'en',    loc: 'Templo principal', teams: ['Alabanza','Multimedia','Sonido','Ujieres'] },
  { dow: 0, time: '12:30:00', title: 'Servicio Hispano',    type: 'servicio_hispano', lang: 'es',    loc: 'Templo principal', teams: ['Alabanza','Multimedia','Sonido','Ujieres'] },
  { dow: 3, time: '19:30:00', title: 'Estudio Bíblico',     type: 'estudio_biblico',  lang: 'es',    loc: 'Salón anexo',      teams: ['Pastoral','Ujieres'] },
  { dow: 5, time: '19:00:00', title: 'Reunión de Jóvenes',  type: 'jovenes',          lang: 'mixed', loc: 'Salón de jóvenes', teams: ['Jóvenes','Alabanza'] },
];
const serviceRows = [];
for (let week = 0; week < 3; week++) {
  for (const s of plan) {
    const base = nextDow(today, s.dow);
    base.setDate(base.getDate() + week * 7);
    const start = `${fmt(base)}T${s.time}${NY}`;
    const endH = String(Number(s.time.slice(0, 2)) + 2).padStart(2, '0');
    const end = `${fmt(base)}T${endH}${s.time.slice(2)}${NY}`;
    serviceRows.push({ church_id: CHURCH, title: s.title, service_type: s.type, language: s.lang,
      start_datetime: start, end_datetime: end, location: s.loc, status: 'scheduled', notes: MARK, _plan: s });
  }
}
const { data: created, error: ce } = await supa.from('service_events')
  .insert(serviceRows.map(({ _plan, ...r }) => r)).select('id, title, start_datetime');
die('service_events', ce);
console.log(`Servicios creados: ${created.length}`);

// --- asignaciones con estados variados ---
const STATUS_CYCLE = ['confirmed','confirmed','pending','confirmed','declined','confirmed','needs_replacement','pending'];
const positionsFor = (teamNames) => {
  // toma hasta 6 posiciones de los equipos del servicio
  const out = [];
  for (const tn of teamNames) {
    const t = teamByName[tn]; if (!t) continue;
    for (const p of positions.filter(pp => pp.team_id === t.id)) out.push({ team: t, pos: p });
  }
  return out.slice(0, 6);
};
let aIdx = 0; const assignRows = [];
created.forEach((svc, si) => {
  const planItem = serviceRows[si]._plan;
  const slots = positionsFor(planItem.teams);
  slots.forEach((slot, k) => {
    const person = people[(si * 3 + k) % people.length];
    assignRows.push({
      church_id: CHURCH, service_event_id: svc.id, team_id: slot.team.id, position_id: slot.pos.id,
      person_id: person.id, status: STATUS_CYCLE[aIdx % STATUS_CYCLE.length],
      arrival_time: planItem.time.slice(0, 5),
    });
    aIdx++;
  });
});
{
  const { error } = await supa.from('service_assignments').insert(assignRows);
  die('assignments', error);
  console.log(`Asignaciones creadas: ${assignRows.length} (estados variados)`);
}

console.log('\n✅ Seed de Equipos completo.');
