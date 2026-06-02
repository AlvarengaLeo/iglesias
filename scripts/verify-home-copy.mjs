// E2E verification for FASE 20: proves that a NEW top-level key in
// portal_settings.published_data (`home`) passes through the public RPC
// `rpc_public_portal_by_slug` untouched — i.e. the home-copy feature needs no
// migration. Writes a test value, reads it back via the RPC, then restores the
// original published_data exactly (non-destructive).
//
// Run: node --env-file=.env.local scripts/verify-home-copy.mjs [slug]

import { createClient } from '@supabase/supabase-js';

const SLUG = process.argv[2] || 'casa-de-restauracion';
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const db = createClient(url, key, { auth: { persistSession: false } });

const { data: church } = await db.from('churches').select('id, public_name').eq('slug', SLUG).single();
if (!church) { console.error('Church not found for slug:', SLUG); process.exit(1); }

const { data: ps } = await db.from('portal_settings').select('published_data').eq('church_id', church.id).single();
const origPub = ps?.published_data || {};

const TEST = 'E2E_VERIFY_HOME_LIFE_TITLE';
const testPub = {
  ...origPub,
  home: { ...(origPub.home || {}), life: { ...((origPub.home || {}).life || {}), title: TEST } },
};

let pass = false;
try {
  // 1) Simulate "publish" by writing published_data directly (what rpc_publish_portal does).
  const { error: upErr } = await db.from('portal_settings').update({ published_data: testPub }).eq('church_id', church.id);
  if (upErr) throw new Error('write: ' + upErr.message);

  // 2) Read it back through the ACTUAL public RPC the portal calls.
  const { data: rpc, error: rpcErr } = await db.rpc('rpc_public_portal_by_slug', { p_slug: SLUG });
  if (rpcErr) throw new Error('rpc: ' + rpcErr.message);

  const got = rpc?.portal?.published_data?.home?.life?.title;
  console.log('RPC returned portal.published_data.home.life.title =', JSON.stringify(got));
  pass = got === TEST;
} finally {
  // 3) Restore the original published_data exactly (no test residue).
  await db.from('portal_settings').update({ published_data: origPub }).eq('church_id', church.id);
  const { data: rpc2 } = await db.rpc('rpc_public_portal_by_slug', { p_slug: SLUG });
  console.log('After restore, published_data.home =', JSON.stringify(rpc2?.portal?.published_data?.home ?? null));
}

console.log(pass
  ? 'PASS ✅  A new published_data.home key passes through the public RPC (no migration needed).'
  : 'FAIL ❌  The key did NOT survive the RPC — investigate.');
process.exit(pass ? 0 : 1);
