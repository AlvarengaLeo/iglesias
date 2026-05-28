import { supabase } from '../lib/supabase.js';

// Get household and members for a given person.
// Returns null if person isn't in any household.
export async function getHouseholdForPerson(personId) {
  const { data: row, error } = await supabase
    .from('household_members')
    .select('relationship, household:households(id, name, primary_person_id)')
    .eq('person_id', personId)
    .maybeSingle();

  if (error) throw error;
  if (!row?.household?.id) return null;

  const { data: members, error: mErr } = await supabase
    .from('household_members')
    .select(`
      relationship,
      person:people ( id, person_type, first_name, last_name, organization_name, status )
    `)
    .eq('household_id', row.household.id);
  if (mErr) throw mErr;

  return {
    household: row.household,
    members: members || [],
  };
}

// List all households for the church (lectura, sin CRUD UI en Fase 6).
export async function listHouseholds(churchId) {
  const { data, error } = await supabase
    .from('households')
    .select('id, name, primary_person_id, created_at')
    .eq('church_id', churchId)
    .is('deleted_at', null)
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}
