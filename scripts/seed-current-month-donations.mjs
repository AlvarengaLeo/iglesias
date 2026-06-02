// Seed paid donations dated in the CURRENT month so the CRM dashboard's
// month-scoped widgets (Donaciones del mes, Distribución por frecuencia,
// Donaciones por fondo, monthly trend) have data. The demo data otherwise
// ends in the previous month, leaving those widgets blank.
// Idempotent: clears prior rows tagged with the marker, then re-inserts.
//   node --env-file=.env.local scripts/seed-current-month-donations.mjs [slug]
import { createClient } from '@supabase/supabase-js';

const SLUG = process.argv[2] || 'casa-de-restauracion';
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing env'); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });

const MARKER = 'seed:dashboard-current-month';

const { data: church } = await db.from('churches').select('id, public_name').eq('slug', SLUG).maybeSingle();
if (!church) { console.error('Church not found:', SLUG); process.exit(1); }
const cid = church.id;
const CREATED_BY = 'c973cf2c-0e07-4b9b-b4f5-d924bc5079bb'; // existing seed admin (matches other demo rows)

const FUNDS = [
  'f0000001-0000-0000-0000-000000000001', // General
  'f0000001-0000-0000-0000-000000000002', // Misiones
  'f0000001-0000-0000-0000-000000000003', // Construcción
  'f0000001-0000-0000-0000-000000000004', // Ayuda Comunitaria
];
const DONORS = [
  ['ee000001-0000-0000-0000-000000000001', 'María González Pérez', 'maria.gonzalez@gmail.com'],
  ['ee000001-0000-0000-0000-000000000003', 'José Antonio Vargas', 'jose.vargas@gmail.com'],
  ['ee000001-0000-0000-0000-000000000004', 'Lucía Hernández', 'lucia.hernandez@gmail.com'],
  ['ee000001-0000-0000-0000-000000000005', 'Pedro Castillo', 'pedro.castillo@gmail.com'],
  ['ee000001-0000-0000-0000-000000000006', 'Sofía Mendoza', 'sofia.mendoza@gmail.com'],
  ['ee000001-0000-0000-0000-000000000007', 'Roberto Salinas', 'roberto.salinas@gmail.com'],
  ['ee000001-0000-0000-0000-000000000008', 'Ana Torres', 'ana.torres@gmail.com'],
];

// [day, fundIdx, frequency, payment_method, donorIdx, amount_cents]
const ENTRIES = [
  [1, 0, 'monthly', 'ach', 0, 25000],
  [1, 1, 'one_time', 'card', 1, 10000],
  [2, 2, 'one_time', 'stripe', 2, 50000],
  [3, 0, 'one_time', 'cash', 3, 5000],
  [4, 0, 'monthly', 'card', 4, 15000],
  [5, 3, 'one_time', 'check', 5, 8000],
  [6, 1, 'monthly', 'ach', 6, 20000],
  [8, 0, 'one_time', 'card', 0, 12000],
  [10, 2, 'one_time', 'stripe', 1, 30000],
  [12, 0, 'one_time', 'cash', 2, 4000],
  [14, 1, 'one_time', 'card', 3, 7500],
  [16, 0, 'monthly', 'ach', 4, 25000],
  [18, 3, 'one_time', 'card', 5, 6000],
  [20, 0, 'annual', 'stripe', 6, 100000],
];

const now = new Date();
const y = now.getFullYear();
const m = now.getMonth();
const today = now.getDate();
console.log('Now:', now.toISOString(), '→ seeding month', `${y}-${String(m + 1).padStart(2, '0')}`);

const fee = (method, cents) => (method === 'card' || method === 'stripe') ? Math.round(cents * 0.029) + 30 : 0;

const rows = ENTRIES.map(([day, fundIdx, frequency, method, donorIdx, cents]) => {
  const d = new Date(y, m, Math.min(day, today), 9 + (day % 9), 0, 0); // clamp to today, vary hour
  const [pid, name, email] = DONORS[donorIdx];
  return {
    church_id: cid,
    donor_person_id: pid,
    donor_name_snapshot: name,
    donor_email_snapshot: email,
    is_anonymous: false,
    fund_id: FUNDS[fundIdx],
    campaign_id: null,
    amount_cents: cents,
    processing_fee_cents: fee(method, cents),
    currency: 'USD',
    payment_method: method,
    payment_status: 'paid',
    frequency,
    donation_date: d.toISOString(),
    internal_notes: MARKER,
    created_by: CREATED_BY,
  };
});

// Idempotent: remove prior seeded rows for this church
const { error: delErr, count: delCount } = await db
  .from('donations').delete({ count: 'exact' })
  .eq('church_id', cid).eq('internal_notes', MARKER);
if (delErr) { console.error('delete error:', delErr.message); process.exit(1); }
console.log('Cleared prior seeded rows:', delCount ?? 0);

const { data: ins, error: insErr } = await db.from('donations').insert(rows).select('id, amount_cents');
if (insErr) { console.error('insert error:', insErr.message); process.exit(1); }
const total = ins.reduce((s, r) => s + r.amount_cents, 0);
console.log(`Inserted ${ins.length} paid donations this month, total $${(total / 100).toFixed(2)}`);
