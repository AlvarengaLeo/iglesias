// Create (or ensure) an EB Connect internal staff user.
//   node --env-file=.env.local scripts/create-eb-staff.mjs <email> <password> [role] [fullName]
// role defaults to super_admin.
import { createClient } from '@supabase/supabase-js';

const [, , email, password, role = 'super_admin', fullName = 'EB Staff'] = process.argv;
if (!email || !password) { console.error('Usage: create-eb-staff.mjs <email> <password> [role] [fullName]'); process.exit(1); }
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// 1) Find or create the auth user.
let userId;
const { data: created, error: cErr } = await db.auth.admin.createUser({ email, password, email_confirm: true });
if (cErr) {
  if (/already|exists|registered/i.test(cErr.message)) {
    // find existing by listing (small projects) — paginate if needed
    let page = 1; let found = null;
    while (!found && page <= 20) {
      const { data: list } = await db.auth.admin.listUsers({ page, perPage: 200 });
      found = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!list.users.length) break;
      page++;
    }
    if (!found) { console.error('User exists but not found via listUsers'); process.exit(1); }
    userId = found.id;
    await db.auth.admin.updateUserById(userId, { password, email_confirm: true });
    console.log('Auth user existed; password reset:', email);
  } else { console.error(cErr.message); process.exit(1); }
} else {
  userId = created.user.id;
  console.log('Auth user created:', email);
}

// 2) Upsert eb_users row.
const { error: upErr } = await db.from('eb_users')
  .upsert({ user_id: userId, email_snapshot: email, full_name: fullName, role, is_active: true }, { onConflict: 'user_id' });
if (upErr) { console.error('eb_users upsert:', upErr.message); process.exit(1); }
console.log(`eb_users ready → ${email} as ${role}`);
