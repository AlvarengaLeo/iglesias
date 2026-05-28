import { supabase } from '../lib/supabase.js';

export const FOLLOWUP_TYPE_LABEL = {
  call:    'Llamada',
  visit:   'Visita',
  message: 'Mensaje',
  note:    'Nota',
  prayer:  'Oración',
  other:   'Otro',
};

export const FOLLOWUP_TYPE_ICON = {
  call:    'phone',
  visit:   'user',
  message: 'mail',
  note:    'fileText',
  prayer:  'sparkle',
  other:   'info',
};

export const FOLLOWUP_TYPE_TONE = {
  call:    'coffee',
  visit:   'navy',
  message: 'success',
  note:    'muted',
  prayer:  'coffee',
  other:   'muted',
};

// List followups for a person, ordered by date desc.
export async function listFollowupsByPerson(personId) {
  const { data, error } = await supabase
    .from('person_followups')
    .select('id, followup_type, occurred_at, next_action_at, title, body, is_private, created_at, created_by')
    .eq('person_id', personId)
    .order('occurred_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Create a new followup. occurred_at defaults to now.
export async function createFollowup(churchId, personId, payload, createdByUserId) {
  const row = {
    church_id: churchId,
    person_id: personId,
    followup_type: payload.followup_type || 'note',
    occurred_at: payload.occurred_at || new Date().toISOString(),
    next_action_at: payload.next_action_at || null,
    title: payload.title?.trim() || null,
    body: payload.body?.trim() || null,
    is_private: payload.is_private ?? true,
    created_by: createdByUserId,
  };

  if (!row.title) {
    throw new Error('Followup requiere un título.');
  }

  const { data, error } = await supabase
    .from('person_followups')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}
