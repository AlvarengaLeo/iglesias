/**
 * Seed data for Sistema de Iglesia
 * --------------------------------
 * Crea: 1 iglesia (Casa de Restauración), 3 usuarios (admin/treasurer/secretary),
 * 4 fondos, 3 campañas, 12 personas, 25 donaciones, 15 recibos, 18 deliveries,
 * 4 service_times, portal_settings publicado.
 *
 * USO:
 *   npm run seed         # idempotente: actualiza si existe, crea si no
 *   npm run seed:reset   # destruye TODOS los datos de la iglesia demo y los recrea
 *
 * Requiere: SUPABASE_SERVICE_ROLE_KEY en .env.local (carga con --env-file).
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================
// Setup
// ============================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Falta VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const RESET = process.argv.includes('--reset');
const TEMP_PASSWORD = 'Iglesia2026!';

// ============================================================
// Deterministic UUIDs
// Permite re-correr el seed sin duplicar (con UPSERT).
// ============================================================

const ID = {
  church:      'c1ec1ec1-0000-0000-0000-000000000001',
  funds: {
    general:        'f0000001-0000-0000-0000-000000000001',
    misiones:       'f0000001-0000-0000-0000-000000000002',
    construccion:   'f0000001-0000-0000-0000-000000000003',
    ayuda:          'f0000001-0000-0000-0000-000000000004',
  },
  campaigns: {
    construccion:   'ca000001-0000-0000-0000-000000000001',
    misiones2026:   'ca000001-0000-0000-0000-000000000002',
    ayuda:          'ca000001-0000-0000-0000-000000000003',
  },
  people: {
    maria:          'ee000001-0000-0000-0000-000000000001',
    carlos:         'ee000001-0000-0000-0000-000000000002',
    joseAntonio:    'ee000001-0000-0000-0000-000000000003',
    lucia:          'ee000001-0000-0000-0000-000000000004',
    pedro:          'ee000001-0000-0000-0000-000000000005',
    sofia:          'ee000001-0000-0000-0000-000000000006',
    roberto:        'ee000001-0000-0000-0000-000000000007',
    anaTorres:      'ee000001-0000-0000-0000-000000000008',
    elena:          'ee000001-0000-0000-0000-000000000009',
    miguelOrtega:   'ee000001-0000-0000-0000-000000000010',
    familiaRamirez: 'ee000001-0000-0000-0000-000000000011',
    abcConstruction:'ee000001-0000-0000-0000-000000000012',
  }
};

// ============================================================
// Helpers
// ============================================================

const log = (icon, ...args) => console.log(icon, ...args);
const ok  = (msg) => log('✓', msg);
const err = (msg) => log('✗', msg);

const monthsAgo = (n, day = 15, hour = 14) => {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - n);
  d.setUTCDate(day);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
};

const cents = (dollars) => Math.round(dollars * 100);

// ============================================================
// Reset (--reset only)
// ============================================================

async function reset() {
  log('🗑️ ', 'Eliminando datos previos de la iglesia demo...');

  // Order matters: leaf tables first
  const tables = [
    'receipt_deliveries',
    'contribution_receipts',
    'church_receipt_sequences',
    'donations',
    'recurring_donation_profiles',
    'campaigns',
    'funds',
    'person_followups',
    'household_members',
    'households',
    'person_tag_assignments',
    'person_tags',
    'people',
    'service_times',
    'portal_settings',
    'audit_logs',
    'church_invitations',
    'church_users',
  ];

  for (const t of tables) {
    const { error } = await supabase.from(t).delete().eq('church_id', ID.church);
    if (error && error.code !== '42P01') err(`  ${t}: ${error.message}`);
  }

  // Drop church last
  await supabase.from('churches').delete().eq('id', ID.church);

  // Auth users
  const emails = ['miguel@casaderestauracion.org', 'maria@casaderestauracion.org', 'ana@casaderestauracion.org'];
  for (const email of emails) {
    const { data } = await supabase.auth.admin.listUsers();
    const u = data?.users.find(u => u.email === email);
    if (u) {
      await supabase.auth.admin.deleteUser(u.id);
      ok(`  user ${email} eliminado`);
    }
  }

  ok('Reset completado');
}

// ============================================================
// Step 1: Church
// ============================================================

async function seedChurch() {
  log('⛪', 'Creando iglesia...');

  const { error } = await supabase.from('churches').upsert({
    id: ID.church,
    legal_name: 'Iglesia Casa de Restauración Inc.',
    public_name: 'Casa de Restauración',
    slug: 'casa-de-restauracion',
    ein: '86-2143598',
    address: {
      street: '2310 SW 27th Ave',
      city: 'Miami',
      state: 'FL',
      zip: '33145',
      country: 'US'
    },
    phone: '(305) 555-0100',
    email: 'admin@casaderestauracion.org',
    pastor_name: 'Miguel Ángel Rodríguez',
    treasurer_name: 'María López',
    primary_color: '#8A6A4A',
    timezone: 'America/New_York',
    locale: 'es',
    receipt_authorized_rep: 'Miguel Ángel Rodríguez · Pastor Principal',
    receipt_default_message: 'Gracias por tu generosidad. Que Dios multiplique cada semilla sembrada en este ministerio.',
    receipt_include_signature: true,
    plan: 'ministerio',
    plan_status: 'active',
  }, { onConflict: 'id' });

  if (error) throw new Error(`church: ${error.message}`);
  ok(`Iglesia creada: Casa de Restauración (${ID.church})`);
}

// ============================================================
// Step 2: Users (auth + church_users)
// ============================================================

async function seedUsers() {
  log('👥', 'Creando usuarios auth...');

  const users = [
    { email: 'miguel@casaderestauracion.org', name: 'Miguel Ángel Rodríguez', role: 'admin' },
    { email: 'maria@casaderestauracion.org',  name: 'María López',           role: 'treasurer' },
    { email: 'ana@casaderestauracion.org',    name: 'Ana Rivera',            role: 'secretary' },
  ];

  const createdUsers = {};

  for (const u of users) {
    // Check if user exists
    const { data: existing } = await supabase.auth.admin.listUsers();
    let user = existing?.users.find(x => x.email === u.email);

    if (!user) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: TEMP_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: u.name,
          must_change_password: true
        }
      });
      if (error) throw new Error(`auth.${u.email}: ${error.message}`);
      user = data.user;
      ok(`  created auth user: ${u.email}`);
    } else {
      ok(`  user exists: ${u.email}`);
    }

    createdUsers[u.role] = user.id;

    // Link to church
    const { error: linkErr } = await supabase
      .from('church_users')
      .upsert({
        church_id: ID.church,
        user_id: user.id,
        email_snapshot: u.email,
        full_name: u.name,
        role: u.role,
        is_active: true,
        joined_at: new Date().toISOString(),
      }, { onConflict: 'church_id,user_id' });

    if (linkErr) throw new Error(`church_users.${u.email}: ${linkErr.message}`);
  }

  ok(`3 usuarios + church_users links creados. Password temporal: ${TEMP_PASSWORD}`);
  return createdUsers;
}

// ============================================================
// Step 3: Funds
// ============================================================

async function seedFunds() {
  log('💰', 'Creando fondos...');

  const funds = [
    { id: ID.funds.general,      name: 'Fondo General',     code: 'GENERAL',      sort_order: 1, is_default: true,
      description: 'Fondo principal para gastos operativos y diezmos.' },
    { id: ID.funds.misiones,     name: 'Misiones',          code: 'MISSIONS',     sort_order: 2, is_default: false,
      description: 'Apoyo a misioneros y proyectos misioneros.' },
    { id: ID.funds.construccion, name: 'Construcción',      code: 'CONSTRUCTION', sort_order: 3, is_default: false,
      description: 'Fondo dedicado a la construcción y mejoras de las instalaciones.' },
    { id: ID.funds.ayuda,        name: 'Ayuda Comunitaria', code: 'COMMUNITY',    sort_order: 4, is_default: false,
      description: 'Asistencia a familias necesitadas y proyectos comunitarios.' },
  ];

  const { error } = await supabase.from('funds').upsert(
    funds.map(f => ({ ...f, church_id: ID.church, is_active: true })),
    { onConflict: 'id' }
  );

  if (error) throw new Error(`funds: ${error.message}`);
  ok(`4 fondos creados`);
}

// ============================================================
// Step 4: Campaigns
// ============================================================

async function seedCampaigns(adminId) {
  log('🎯', 'Creando campañas...');

  const today = new Date();
  const endDate = (months) => {
    const d = new Date(today);
    d.setUTCMonth(d.getUTCMonth() + months);
    return d.toISOString().split('T')[0];
  };

  const campaigns = [
    {
      id: ID.campaigns.construccion,
      name: 'Fondo de construcción',
      slug: 'fondo-construccion',
      description: 'Ampliación del santuario para acomodar a 400 personas. Meta: $50,000.',
      goal_cents: cents(50000),
      fund_id: ID.funds.construccion,
      start_date: '2026-01-01',
      end_date: endDate(6),
      status: 'active',
      is_visible_on_portal: true,
    },
    {
      id: ID.campaigns.misiones2026,
      name: 'Misiones 2026',
      slug: 'misiones-2026',
      description: 'Apoyo a 3 misioneros en Centroamérica durante 2026.',
      goal_cents: cents(12000),
      fund_id: ID.funds.misiones,
      start_date: '2026-01-01',
      end_date: endDate(2),
      status: 'active',
      is_visible_on_portal: true,
    },
    {
      id: ID.campaigns.ayuda,
      name: 'Ayuda comunitaria',
      slug: 'ayuda-comunitaria',
      description: 'Despensas y asistencia a 50 familias necesitadas en Miami.',
      goal_cents: cents(5000),
      fund_id: ID.funds.ayuda,
      start_date: today.toISOString().split('T')[0],
      end_date: endDate(3),
      status: 'active',
      is_visible_on_portal: false,
    },
  ];

  const { error } = await supabase.from('campaigns').upsert(
    campaigns.map(c => ({ ...c, church_id: ID.church, currency: 'USD', created_by: adminId })),
    { onConflict: 'id' }
  );

  if (error) throw new Error(`campaigns: ${error.message}`);
  ok(`3 campañas creadas`);
}

// ============================================================
// Step 5: People
// ============================================================

async function seedPeople(adminId) {
  log('🧑', 'Creando personas...');

  const people = [
    {
      id: ID.people.maria,
      person_type: 'individual', first_name: 'María', last_name: 'González Pérez',
      email: 'maria.gonzalez@gmail.com', phone: '(305) 555-0142',
      status: 'member', joined_at: '2023-03-15',
      last_activity_at: monthsAgo(0, 18),
      pastoral_note: 'Líder de oración. Activa en el ministerio de mujeres.',
    },
    {
      id: ID.people.carlos,
      person_type: 'individual', first_name: 'Carlos', last_name: 'Méndez',
      email: 'cmendez@hotmail.com', phone: '(786) 555-0203',
      status: 'donor', joined_at: '2024-08-20',
      last_activity_at: monthsAgo(0, 22),
    },
    {
      id: ID.people.joseAntonio,
      person_type: 'individual', first_name: 'José Antonio', last_name: 'Vargas',
      email: 'ja.vargas@yahoo.com', phone: '(305) 555-0188',
      status: 'member', joined_at: '2022-11-10',
      last_activity_at: monthsAgo(0, 10),
      pastoral_note: 'Diácono. Casado con Lucía Hernández.',
    },
    {
      id: ID.people.lucia,
      person_type: 'individual', first_name: 'Lucía', last_name: 'Hernández',
      email: 'lucia.h@gmail.com', phone: '(305) 555-0189',
      status: 'member', joined_at: '2022-11-10',
      last_activity_at: monthsAgo(0, 10),
    },
    {
      id: ID.people.pedro,
      person_type: 'individual', first_name: 'Pedro', last_name: 'Castillo',
      email: 'pedro.castillo@outlook.com', phone: '(305) 555-0144',
      status: 'leader', joined_at: '2021-06-01',
      last_activity_at: monthsAgo(0, 25),
      pastoral_note: 'Líder de ministerio de jóvenes.',
    },
    {
      id: ID.people.sofia,
      person_type: 'individual', first_name: 'Sofía', last_name: 'Mendoza',
      email: 'sofia.m@gmail.com', phone: '(786) 555-0301',
      status: 'volunteer', joined_at: '2024-02-14',
      last_activity_at: monthsAgo(1, 5),
    },
    {
      id: ID.people.roberto,
      person_type: 'individual', first_name: 'Roberto', last_name: 'Salinas',
      email: 'r.salinas@gmail.com', phone: '(305) 555-0299',
      status: 'volunteer', joined_at: '2023-09-30',
      last_activity_at: monthsAgo(0, 8),
    },
    {
      id: ID.people.anaTorres,
      person_type: 'individual', first_name: 'Ana', last_name: 'Torres',
      email: 'ana.torres.fl@gmail.com', phone: '(305) 555-0155',
      status: 'donor', joined_at: '2024-06-12',
      last_activity_at: monthsAgo(0, 20),
    },
    {
      id: ID.people.elena,
      person_type: 'individual', first_name: 'Elena', last_name: 'Ramos',
      email: 'elena.ramos@yahoo.com', phone: '(786) 555-0411',
      status: 'visitor', joined_at: '2026-04-10',
      last_activity_at: monthsAgo(0, 3),
      pastoral_note: 'Visita reciente. Invitada por María González.',
      next_followup_at: new Date(Date.now() + 7*86400000).toISOString().split('T')[0],
    },
    {
      id: ID.people.miguelOrtega,
      person_type: 'individual', first_name: 'Miguel', last_name: 'Ortega',
      email: null, phone: '(305) 555-0177',
      status: 'visitor', joined_at: '2026-05-12',
      last_activity_at: monthsAgo(0, 1),
    },
    {
      id: ID.people.familiaRamirez,
      person_type: 'individual', first_name: 'José', last_name: 'Ramírez',
      email: 'familia.ramirez@gmail.com', phone: '(305) 555-0166',
      status: 'inactive', joined_at: '2020-01-15',
      last_activity_at: monthsAgo(8, 20),
      pastoral_note: 'Familia mudada a Tampa. Contacto ocasional.',
    },
    {
      id: ID.people.abcConstruction,
      person_type: 'organization',
      organization_name: 'ABC Construction LLC',
      email: 'contact@abcconstruction.com', phone: '(305) 555-0500',
      status: 'donor', joined_at: '2025-12-01',
      last_activity_at: monthsAgo(1, 10),
      pastoral_note: 'Empresa donante. Donación mayor al fondo de construcción.',
    },
  ];

  const { error } = await supabase.from('people').upsert(
    people.map(p => ({ ...p, church_id: ID.church, created_by: adminId })),
    { onConflict: 'id' }
  );

  if (error) throw new Error(`people: ${error.message}`);
  ok(`${people.length} personas creadas`);
}

// ============================================================
// Step 6: Households
// ============================================================

async function seedHouseholds() {
  log('🏠', 'Creando hogares...');

  const householdId = 'c0000001-0000-0000-0000-000000000001';

  const { error: hErr } = await supabase.from('households').upsert({
    id: householdId,
    church_id: ID.church,
    name: 'Familia Vargas Hernández',
    primary_person_id: ID.people.joseAntonio,
  }, { onConflict: 'id' });
  if (hErr) throw new Error(`households: ${hErr.message}`);

  const members = [
    { household_id: householdId, person_id: ID.people.joseAntonio, relationship: 'head' },
    { household_id: householdId, person_id: ID.people.lucia, relationship: 'spouse' },
  ];

  for (const m of members) {
    const { error } = await supabase.from('household_members').upsert(m, {
      onConflict: 'household_id,person_id'
    });
    if (error) throw new Error(`household_members: ${error.message}`);
  }

  ok('1 hogar + 2 miembros creados');
}

// ============================================================
// Step 7: Person tags
// ============================================================

async function seedTags() {
  log('🏷️ ', 'Creando tags...');

  const tags = [
    { id: 'aa000001-0000-0000-0000-000000000001', name: 'Diezmo recurrente', color: '#4F9D7B' },
    { id: 'aa000001-0000-0000-0000-000000000002', name: 'Líder',             color: '#8A6A4A' },
    { id: 'aa000001-0000-0000-0000-000000000003', name: 'Coro',              color: '#5C7CB0' },
    { id: 'aa000001-0000-0000-0000-000000000004', name: 'Familia',           color: '#C99440' },
    { id: 'aa000001-0000-0000-0000-000000000005', name: 'Misiones',          color: '#1F2B38' },
  ];

  const { error } = await supabase.from('person_tags').upsert(
    tags.map(t => ({ ...t, church_id: ID.church })),
    { onConflict: 'id' }
  );
  if (error) throw new Error(`tags: ${error.message}`);

  // Assignments
  const assignments = [
    { person_id: ID.people.maria, tag_id: 'aa000001-0000-0000-0000-000000000001' },
    { person_id: ID.people.maria, tag_id: 'aa000001-0000-0000-0000-000000000003' },
    { person_id: ID.people.pedro, tag_id: 'aa000001-0000-0000-0000-000000000002' },
    { person_id: ID.people.joseAntonio, tag_id: 'aa000001-0000-0000-0000-000000000004' },
    { person_id: ID.people.lucia, tag_id: 'aa000001-0000-0000-0000-000000000004' },
    { person_id: ID.people.sofia, tag_id: 'aa000001-0000-0000-0000-000000000005' },
  ];

  for (const a of assignments) {
    const { error } = await supabase.from('person_tag_assignments').upsert(a, {
      onConflict: 'person_id,tag_id'
    });
    if (error) throw new Error(`tag_assignment: ${error.message}`);
  }

  ok(`5 tags + ${assignments.length} asignaciones`);
}

// ============================================================
// Step 8: Recurring donation profiles
// ============================================================

async function seedRecurring(adminId) {
  log('🔄', 'Creando perfiles recurrentes...');

  const profiles = [
    {
      id: 'dd000001-0000-0000-0000-000000000001',
      donor_person_id: ID.people.maria,
      amount_cents: cents(250),
      frequency: 'monthly',
      payment_method: 'ach',
      fund_id: ID.funds.general,
      started_at: monthsAgo(8),
      next_charge_date: '2026-06-15',
      status: 'active',
    },
    {
      id: 'dd000001-0000-0000-0000-000000000002',
      donor_person_id: ID.people.pedro,
      amount_cents: cents(500),
      frequency: 'monthly',
      payment_method: 'card',
      fund_id: ID.funds.general,
      started_at: monthsAgo(12),
      next_charge_date: '2026-06-01',
      status: 'active',
    },
    {
      id: 'dd000001-0000-0000-0000-000000000003',
      donor_person_id: ID.people.joseAntonio,
      amount_cents: cents(150),
      frequency: 'monthly',
      payment_method: 'ach',
      fund_id: ID.funds.misiones,
      campaign_id: ID.campaigns.misiones2026,
      started_at: monthsAgo(4),
      next_charge_date: '2026-06-10',
      status: 'active',
    },
  ];

  const { error } = await supabase.from('recurring_donation_profiles').upsert(
    profiles.map(p => ({ ...p, church_id: ID.church, currency: 'USD' })),
    { onConflict: 'id' }
  );
  if (error) throw new Error(`recurring: ${error.message}`);
  ok(`${profiles.length} perfiles recurrentes`);
}

// ============================================================
// Step 9: Donations + Receipts (orchestrated)
// ============================================================

async function seedDonations(adminId) {
  log('💵', 'Creando donaciones + recibos...');

  // Set receipt sequence: start at 1 for current year
  const year = new Date().getFullYear();
  await supabase.from('church_receipt_sequences').upsert({
    church_id: ID.church,
    tax_year: year,
    next_number: 1,
  }, { onConflict: 'church_id,tax_year' });

  // Helper to snapshot a person's name
  const peopleData = {};
  const { data: peopleRows } = await supabase
    .from('people')
    .select('id, first_name, last_name, organization_name, email')
    .eq('church_id', ID.church);
  for (const p of peopleRows) {
    peopleData[p.id] = {
      name: p.organization_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      email: p.email,
    };
  }

  // 25 donations spanning last 8 months
  const donations = [
    // Mes actual — variedad
    { donor: ID.people.maria,      amount: 250,   fund: 'general',     freq: 'monthly',  method: 'ach',    status: 'paid',     date: monthsAgo(0, 1, 14),  rp: 'dd000001-0000-0000-0000-000000000001', genReceipt: true },
    { donor: ID.people.carlos,     amount: 500,   fund: 'general',     freq: 'one_time', method: 'card',   status: 'paid',     date: monthsAgo(0, 3, 10),  genReceipt: true },
    { donor: ID.people.joseAntonio,amount: 150,   fund: 'misiones',    freq: 'monthly',  method: 'ach',    status: 'paid',     date: monthsAgo(0, 5, 16),  rp: 'dd000001-0000-0000-0000-000000000003', genReceipt: true, campaign: 'misiones2026' },
    { donor: ID.people.pedro,      amount: 500,   fund: 'general',     freq: 'monthly',  method: 'card',   status: 'paid',     date: monthsAgo(0, 8, 9),   rp: 'dd000001-0000-0000-0000-000000000002', genReceipt: true },
    { donor: ID.people.anaTorres,  amount: 75,    fund: 'general',     freq: 'one_time', method: 'cash',   status: 'paid',     date: monthsAgo(0, 12, 11), genReceipt: true },
    { donor: ID.people.lucia,      amount: 200,   fund: 'construccion',freq: 'one_time', method: 'check',  status: 'paid',     date: monthsAgo(0, 15, 14), genReceipt: true, campaign: 'construccion', checkNum: '1024' },
    { donor: ID.people.roberto,    amount: 100,   fund: 'general',     freq: 'one_time', method: 'ach',    status: 'paid',     date: monthsAgo(0, 18, 8),  genReceipt: true },
    { donor: ID.people.sofia,      amount: 50,    fund: 'misiones',    freq: 'one_time', method: 'card',   status: 'paid',     date: monthsAgo(0, 21, 19), genReceipt: true, campaign: 'misiones2026' },
    { donor: ID.people.maria,      amount: 100,   fund: 'ayuda',       freq: 'one_time', method: 'cash',   status: 'paid',     date: monthsAgo(0, 22, 12), genReceipt: true },

    // Hace 1 mes
    { donor: ID.people.maria,      amount: 250,   fund: 'general',     freq: 'monthly',  method: 'ach',    status: 'paid',     date: monthsAgo(1, 15, 14), rp: 'dd000001-0000-0000-0000-000000000001', genReceipt: true },
    { donor: ID.people.pedro,      amount: 500,   fund: 'general',     freq: 'monthly',  method: 'card',   status: 'paid',     date: monthsAgo(1, 1, 9),   rp: 'dd000001-0000-0000-0000-000000000002', genReceipt: true },
    { donor: ID.people.joseAntonio,amount: 150,   fund: 'misiones',    freq: 'monthly',  method: 'ach',    status: 'paid',     date: monthsAgo(1, 10, 16), rp: 'dd000001-0000-0000-0000-000000000003', genReceipt: true, campaign: 'misiones2026' },
    { donor: ID.people.abcConstruction, amount: 10000, fund: 'construccion', freq: 'one_time', method: 'check', status: 'paid', date: monthsAgo(1, 10, 11), genReceipt: true, campaign: 'construccion', checkNum: 'ABC-2026-04', notes: 'Donación anual ABC Construction LLC.' },
    { donor: ID.people.elena,      amount: 25,    fund: 'general',     freq: 'one_time', method: 'cash',   status: 'paid',     date: monthsAgo(1, 20, 13), genReceipt: false },

    // Hace 2-3 meses
    { donor: ID.people.maria,      amount: 250,   fund: 'general',     freq: 'monthly',  method: 'ach',    status: 'paid',     date: monthsAgo(2, 15),     rp: 'dd000001-0000-0000-0000-000000000001', genReceipt: true },
    { donor: ID.people.pedro,      amount: 500,   fund: 'general',     freq: 'monthly',  method: 'card',   status: 'paid',     date: monthsAgo(2, 1),      rp: 'dd000001-0000-0000-0000-000000000002', genReceipt: true },
    { donor: ID.people.carlos,     amount: 300,   fund: 'general',     freq: 'one_time', method: 'card',   status: 'paid',     date: monthsAgo(2, 8),      genReceipt: true },
    { donor: ID.people.joseAntonio,amount: 1000,  fund: 'construccion',freq: 'annual',   method: 'check',  status: 'paid',     date: monthsAgo(3, 5),      genReceipt: true, campaign: 'construccion', checkNum: '1021' },
    { donor: ID.people.maria,      amount: 250,   fund: 'general',     freq: 'monthly',  method: 'ach',    status: 'paid',     date: monthsAgo(3, 15),     rp: 'dd000001-0000-0000-0000-000000000001', genReceipt: true },

    // Pendientes / fallidas (estado especial)
    { donor: ID.people.pedro,      amount: 500,   fund: 'general',     freq: 'monthly',  method: 'card',   status: 'pending',  date: monthsAgo(0, 25),     genReceipt: false },
    { donor: ID.people.carlos,     amount: 100,   fund: 'general',     freq: 'one_time', method: 'card',   status: 'failed',   date: monthsAgo(0, 20),     genReceipt: false, notes: 'Tarjeta declinada — intentar otro método.' },
    { donor: ID.people.sofia,      amount: 60,    fund: 'general',     freq: 'one_time', method: 'card',   status: 'refunded', date: monthsAgo(1, 5),      genReceipt: false, notes: 'Donante pidió reembolso por duplicado.' },

    // Más históricas
    { donor: ID.people.maria,      amount: 250,   fund: 'general',     freq: 'monthly',  method: 'ach',    status: 'paid',     date: monthsAgo(4, 15),     rp: 'dd000001-0000-0000-0000-000000000001', genReceipt: true },
    { donor: ID.people.pedro,      amount: 500,   fund: 'general',     freq: 'monthly',  method: 'card',   status: 'paid',     date: monthsAgo(5, 1),      rp: 'dd000001-0000-0000-0000-000000000002', genReceipt: true },
    { donor: ID.people.lucia,      amount: 150,   fund: 'general',     freq: 'one_time', method: 'cash',   status: 'paid',     date: monthsAgo(6, 10),     genReceipt: true },
  ];

  let receiptCounter = 1;
  const receiptIds = [];

  for (const d of donations) {
    const donationId = crypto.randomUUID();
    const personInfo = peopleData[d.donor];

    const donationRow = {
      id: donationId,
      church_id: ID.church,
      donor_person_id: d.donor,
      donor_name_snapshot: personInfo.name,
      donor_email_snapshot: personInfo.email,
      fund_id: ID.funds[d.fund],
      campaign_id: d.campaign ? ID.campaigns[d.campaign] : null,
      recurring_profile_id: d.rp || null,
      amount_cents: cents(d.amount),
      processing_fee_cents: d.method === 'card' || d.method === 'stripe' ? Math.round(cents(d.amount) * 0.029) + 30 : 0,
      payment_method: d.method,
      payment_status: d.status,
      frequency: d.freq,
      donation_date: d.date,
      check_number: d.checkNum || null,
      notes: d.notes || null,
      created_by: adminId,
    };

    const { error: dErr } = await supabase.from('donations').insert(donationRow);
    if (dErr) {
      // Could be duplicate from previous run; ignore
      if (dErr.code !== '23505') throw new Error(`donation: ${dErr.message}`);
    }

    // Generate receipt if applicable
    if (d.genReceipt) {
      const receiptId = crypto.randomUUID();
      const receiptNumber = `${year}-${String(receiptCounter).padStart(6, '0')}`;
      receiptCounter++;
      receiptIds.push({ id: receiptId, number: receiptNumber, donor: d.donor, amount: d.amount, donationId });

      const { error: rErr } = await supabase.from('contribution_receipts').insert({
        id: receiptId,
        church_id: ID.church,
        receipt_number: receiptNumber,
        receipt_type: 'per_donation',
        donation_id: donationId,
        total_amount_cents: cents(d.amount),
        person_id: d.donor,
        person_name_snapshot: personInfo.name,
        person_email_snapshot: personInfo.email,
        status: 'sent',
        created_by: adminId,
      });
      if (rErr && rErr.code !== '23505') throw new Error(`receipt: ${rErr.message}`);
    }
  }

  // Update sequence
  await supabase.from('church_receipt_sequences').upsert({
    church_id: ID.church,
    tax_year: year,
    next_number: receiptCounter,
  }, { onConflict: 'church_id,tax_year' });

  ok(`${donations.length} donaciones + ${receiptIds.length} recibos`);
  return { receiptIds, adminId };
}

// ============================================================
// Step 10: Receipt deliveries (including a resend)
// ============================================================

async function seedDeliveries({ receiptIds, adminId }) {
  log('📬', 'Creando historial de envíos de recibos...');

  let deliveryCount = 0;

  for (const r of receiptIds) {
    // Initial delivery for each receipt
    const { error: e1 } = await supabase.from('receipt_deliveries').insert({
      church_id: ID.church,
      receipt_id: r.id,
      delivery_channel: 'email',
      reason: 'initial',
      status: 'delivered',
      sent_by: adminId,
      sent_at: monthsAgo(0, 22, 16),
      delivered_at: monthsAgo(0, 22, 16),
    });
    if (!e1) deliveryCount++;
  }

  // Pick one receipt to be resent ("Solicitud del contador")
  if (receiptIds.length >= 3) {
    const target = receiptIds[2];
    await supabase.from('receipt_deliveries').insert({
      church_id: ID.church,
      receipt_id: target.id,
      delivery_channel: 'email',
      reason: 'accountant_request',
      reason_notes: 'Solicitado por el contador para la declaración fiscal trimestral.',
      status: 'delivered',
      sent_by: adminId,
      sent_at: monthsAgo(0, 25, 10),
      delivered_at: monthsAgo(0, 25, 10),
    });
    deliveryCount++;
  }

  // Another receipt with email_changed history
  if (receiptIds.length >= 5) {
    const target = receiptIds[4];
    await supabase.from('receipt_deliveries').insert({
      church_id: ID.church,
      receipt_id: target.id,
      delivery_channel: 'email',
      reason: 'email_changed',
      reason_notes: 'Donante reportó cambio de correo. Reenvío al nuevo email.',
      status: 'delivered',
      sent_by: adminId,
      sent_at: monthsAgo(0, 26, 14),
      delivered_at: monthsAgo(0, 26, 14),
    });
    deliveryCount++;
  }

  ok(`${deliveryCount} entregas (incluyendo 2 reenvíos)`);
}

// ============================================================
// Step 11: Service times
// ============================================================

async function seedServiceTimes() {
  log('🕐', 'Creando horarios de servicio...');

  const times = [
    { id: '5e000001-0000-0000-0000-000000000001', day_of_week: 0, start_time: '10:00:00', duration_min: 90, meeting_type: 'Servicio dominical',     location: 'Sede principal', sort_order: 1 },
    { id: '5e000001-0000-0000-0000-000000000002', day_of_week: 0, start_time: '18:00:00', duration_min: 90, meeting_type: 'Servicio bilingüe',      location: 'Sede principal', sort_order: 2 },
    { id: '5e000001-0000-0000-0000-000000000003', day_of_week: 3, start_time: '19:30:00', duration_min: 60, meeting_type: 'Estudio bíblico',        location: 'Online + presencial', sort_order: 3 },
    { id: '5e000001-0000-0000-0000-000000000004', day_of_week: 5, start_time: '19:00:00', duration_min: 90, meeting_type: 'Jóvenes y adolescentes', location: 'Salón de jóvenes', sort_order: 4 },
  ];

  const { error } = await supabase.from('service_times').upsert(
    times.map(t => ({ ...t, church_id: ID.church, address: '2310 SW 27th Ave, Miami FL 33145', is_active: true })),
    { onConflict: 'id' }
  );
  if (error) throw new Error(`service_times: ${error.message}`);
  ok(`${times.length} horarios creados`);
}

// ============================================================
// Step 12: Portal settings (published)
// ============================================================

async function seedPortal(adminId) {
  log('🌐', 'Configurando portal público...');

  const data = {
    identity: {
      logo_url: null,
      public_name: 'Casa de Restauración',
      primary_color: '#8A6A4A',
    },
    hero: {
      title: 'Una casa de fe, restauración y comunidad',
      message: 'Somos una iglesia hispana en Miami donde toda familia encuentra un hogar espiritual. Te invitamos a conocernos y a ser parte de nuestra comunidad.',
      image_url: null,
      cta_text: 'Donar ahora',
    },
    donations: {
      button_text: 'Donar ahora',
      default_fund_id: ID.funds.general,
      show_recurring: true,
      visible_frequencies: ['one_time', 'monthly'],
    },
    contact: {
      address: '2310 SW 27th Ave, Miami FL 33145',
      phone: '(305) 555-0100',
      email: 'hola@casaderestauracion.org',
      map_url: 'https://maps.google.com/?q=2310+SW+27th+Ave+Miami+FL',
      social: {
        facebook: '@casaderestauracion',
        instagram: '@casaderestauracion',
        youtube: '@casaderestauracion',
        whatsapp: '+13055550100',
      },
    },
  };

  const { error } = await supabase.from('portal_settings').upsert({
    church_id: ID.church,
    publish_status: 'published',
    draft_data: data,
    published_data: data,
    published_at: monthsAgo(1, 20),
    published_by: adminId,
    draft_updated_at: monthsAgo(1, 20),
    draft_updated_by: adminId,
  }, { onConflict: 'church_id' });

  if (error) throw new Error(`portal: ${error.message}`);
  ok('Portal configurado y publicado');
}

// ============================================================
// Step 13: Followups (pastoral notes)
// ============================================================

async function seedFollowups(adminId) {
  log('📝', 'Creando seguimientos pastorales...');

  const followups = [
    {
      person_id: ID.people.elena,
      followup_type: 'visit',
      title: 'Bienvenida — primera visita',
      body: 'Visitó por primera vez el domingo. Vino invitada por María González. Mostrar interés en conocer el grupo de mujeres.',
      occurred_at: monthsAgo(0, 3),
      next_action_at: new Date(Date.now() + 7*86400000).toISOString().split('T')[0],
      is_private: false,
    },
    {
      person_id: ID.people.familiaRamirez,
      followup_type: 'call',
      title: 'Llamada — bienestar',
      body: 'Llamada de seguimiento. Familia se mudó a Tampa. Pidió oración por adaptación.',
      occurred_at: monthsAgo(7, 15),
      is_private: true,
    },
    {
      person_id: ID.people.maria,
      followup_type: 'note',
      title: 'Reconocimiento de servicio',
      body: 'Excelente liderazgo en el último retiro de mujeres. Considerar para coordinación 2027.',
      occurred_at: monthsAgo(1, 20),
      is_private: true,
    },
  ];

  for (const f of followups) {
    const { error } = await supabase.from('person_followups').insert({
      ...f,
      church_id: ID.church,
      created_by: adminId,
    });
    if (error && error.code !== '23505') throw new Error(`followup: ${error.message}`);
  }
  ok(`${followups.length} seguimientos pastorales`);
}

// ============================================================
// Main
// ============================================================

async function main() {
  const t0 = Date.now();
  log('🌱', `Sembrando datos${RESET ? ' (con reset previo)' : ''}...\n`);

  try {
    if (RESET) {
      await reset();
      log('');
    }

    await seedChurch();
    const users = await seedUsers();
    const adminId = users.admin;
    await seedFunds();
    await seedCampaigns(adminId);
    await seedPeople(adminId);
    await seedHouseholds();
    await seedTags();
    await seedRecurring(adminId);
    const { receiptIds } = await seedDonations(adminId);
    await seedDeliveries({ receiptIds, adminId });
    await seedServiceTimes();
    await seedPortal(adminId);
    await seedFollowups(adminId);

    const t1 = Date.now();
    log('');
    log('🎉', `Seed completo en ${((t1-t0)/1000).toFixed(1)}s`);
    log('');
    log('🔑', `Logins (password temporal: ${TEMP_PASSWORD}):`);
    log('  ', '  miguel@casaderestauracion.org  (admin)');
    log('  ', '  maria@casaderestauracion.org   (treasurer)');
    log('  ', '  ana@casaderestauracion.org     (secretary)');
    log('');
  } catch (e) {
    err('Falló:');
    console.error(e);
    process.exit(1);
  }
}

main();
