import { supabase } from '../lib/supabase.js';

// List all tags for a church (catalog).
export async function listTags(churchId) {
  const { data, error } = await supabase
    .from('person_tags')
    .select('id, name, color, created_at')
    .eq('church_id', churchId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

// Assign a tag to a person.
export async function assignTag(personId, tagId, assignedByUserId) {
  const { data, error } = await supabase
    .from('person_tag_assignments')
    .insert({
      person_id: personId,
      tag_id: tagId,
      assigned_by: assignedByUserId,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Remove a tag from a person.
export async function unassignTag(personId, tagId) {
  const { error } = await supabase
    .from('person_tag_assignments')
    .delete()
    .eq('person_id', personId)
    .eq('tag_id', tagId);
  if (error) throw error;
  return { ok: true };
}

// Create a new tag (catalog-level).
export async function createTag(churchId, { name, color }) {
  const { data, error } = await supabase
    .from('person_tags')
    .insert({ church_id: churchId, name: name.trim(), color: color || '#8A6A4A' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
