import { supabase } from '../lib/supabase.js';

// Status values (UI label → DB value). Keep in sync with people.status CHECK constraint.
export const STATUS_TO_DB = {
  'Todos':       null,        // no filter
  'Miembros':    'member',
  'Visitantes':  'visitor',
  'Donantes':    'donor',
  'Servidores':  'volunteer',
  'Líderes':     'leader',
  'Inactivos':   'inactive',
};

export const STATUS_TO_UI = {
  member:    'Miembro',
  visitor:   'Visitante',
  donor:     'Donante',
  volunteer: 'Servidor',
  leader:    'Líder',
  inactive:  'Inactivo',
};

export const STATUS_TONE = {
  member:    'navy',
  visitor:   'info',
  donor:     'coffee',
  volunteer: 'success',
  leader:    'coffee',
  inactive:  'muted',
};

// Compute display name and initials for a person (works for individual + organization).
export function personDisplayName(p) {
  if (!p) return '';
  if (p.person_type === 'organization') return p.organization_name || '';
  return [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
}

export function personInitials(p) {
  if (!p) return '··';
  if (p.person_type === 'organization') {
    return (p.organization_name || '')
      .split(/\s+/).filter(Boolean).slice(0, 2)
      .map((w) => w[0].toUpperCase()).join('') || '··';
  }
  const f = (p.first_name || '').trim()[0] || '';
  const l = (p.last_name || '').trim()[0] || '';
  return (f + l).toUpperCase() || '··';
}

// =====================================================
// listPeople — main table query
// =====================================================
export async function listPeople(churchId, { search, status, limit = 200 } = {}) {
  let q = supabase
    .from('people')
    .select(`
      id, person_type, first_name, last_name, organization_name,
      email, phone, status, joined_at, last_activity_at, next_followup_at,
      pastoral_note, created_at,
      tag_assignments:person_tag_assignments (
        tag:person_tags ( id, name, color )
      )
    `)
    .eq('church_id', churchId)
    .is('deleted_at', null)
    .order('last_activity_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (status && status !== 'all') {
    q = q.eq('status', status);
  }

  if (search?.trim()) {
    const term = search.trim().replace(/[%_]/g, '\\$&');
    const esc = `%${term}%`;
    q = q.or(
      `first_name.ilike.${esc},last_name.ilike.${esc},organization_name.ilike.${esc},email.ilike.${esc},phone.ilike.${esc}`
    );
  }

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

// =====================================================
// getPersonDetail — single round-trip for drawer
// =====================================================
export async function getPersonDetail(personId) {
  // 1. Persona with tags
  const { data: person, error: pErr } = await supabase
    .from('people')
    .select(`
      *,
      tag_assignments:person_tag_assignments (
        tag:person_tags ( id, name, color )
      )
    `)
    .eq('id', personId)
    .is('deleted_at', null)
    .single();
  if (pErr) throw pErr;

  // 2. Household (via household_members lookup)
  const { data: householdRow } = await supabase
    .from('household_members')
    .select('relationship, household:households(id, name, primary_person_id)')
    .eq('person_id', personId)
    .maybeSingle();

  let household = null;
  let householdMembers = [];
  if (householdRow?.household?.id) {
    household = householdRow.household;
    const { data: members } = await supabase
      .from('household_members')
      .select(`
        relationship,
        person:people ( id, person_type, first_name, last_name, organization_name, status )
      `)
      .eq('household_id', household.id);
    householdMembers = members || [];
  }

  // 3. Recent donations
  const { data: donations } = await supabase
    .from('donations')
    .select(`
      id, amount_cents, payment_method, payment_status, frequency, donation_date,
      fund:funds ( id, name ),
      campaign:campaigns ( id, name )
    `)
    .eq('donor_person_id', personId)
    .is('deleted_at', null)
    .order('donation_date', { ascending: false })
    .limit(20);

  // 4. Followups
  const { data: followups } = await supabase
    .from('person_followups')
    .select('id, followup_type, occurred_at, next_action_at, title, body, is_private, created_by')
    .eq('person_id', personId)
    .order('occurred_at', { ascending: false });

  // 5. Aggregates
  const yearStart = new Date(new Date().getUTCFullYear(), 0, 1).toISOString();
  const paidThisYear = (donations || [])
    .filter((d) => d.payment_status === 'paid' && d.donation_date >= yearStart)
    .reduce((s, d) => s + Number(d.amount_cents || 0), 0);

  // 6. Active recurring profile (if any)
  const { data: recurring } = await supabase
    .from('recurring_donation_profiles')
    .select('id, amount_cents, frequency, next_charge_date, status')
    .eq('donor_person_id', personId)
    .eq('status', 'active')
    .maybeSingle();

  // 7. Receipt count
  const { count: receiptCount } = await supabase
    .from('contribution_receipts')
    .select('id', { count: 'exact', head: true })
    .eq('person_id', personId);

  return {
    person,
    household,
    householdMembers,
    donations: donations || [],
    followups: followups || [],
    recurring: recurring || null,
    aggregates: {
      paidThisYearCents: paidThisYear,
      donationCount: (donations || []).length,
      receiptCount: receiptCount || 0,
      lastDonation: donations?.[0] || null,
    },
  };
}

// =====================================================
// createPerson
// =====================================================
export async function createPerson(churchId, payload, createdByUserId) {
  const row = {
    church_id: churchId,
    person_type: payload.person_type || 'individual',
    first_name: payload.first_name?.trim() || null,
    last_name: payload.last_name?.trim() || null,
    organization_name: payload.organization_name?.trim() || null,
    email: payload.email?.trim() || null,
    phone: payload.phone?.trim() || null,
    status: payload.status || 'visitor',
    pastoral_note: payload.pastoral_note?.trim() || null,
    joined_at: payload.joined_at || new Date().toISOString().split('T')[0],
    created_by: createdByUserId,
  };

  const { data, error } = await supabase
    .from('people')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// =====================================================
// updatePerson — partial update
// =====================================================
export async function updatePerson(personId, patch) {
  // Strip undefined and trim strings
  const clean = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    clean[k] = typeof v === 'string' ? v.trim() || null : v;
  }
  clean.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('people')
    .update(clean)
    .eq('id', personId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// =====================================================
// softDeletePerson (sets deleted_at)
// =====================================================
export async function softDeletePerson(personId) {
  const { data, error } = await supabase
    .from('people')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', personId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
