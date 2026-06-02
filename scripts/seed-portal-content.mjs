// Seed demo content for the public portal so the design can be previewed.
// Idempotent: deletes prior demo rows (by exact title/name) for the church, then re-inserts.
// Uses the service_role key (bypasses RLS). Run:
//   node --env-file=.env.local scripts/seed-portal-content.mjs [slug]
//
// Images are placeholder Unsplash URLs and YouTube posters — replace with real
// church media from the CRM (Portal → Sermons/Events/Podcast/Ministries).

import { createClient } from '@supabase/supabase-js';

const SLUG = process.argv[2] || 'casa-de-restauracion';
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const db = createClient(url, key, { auth: { persistSession: false } });

const img = {
  church:  'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=900&q=80',
  youth:   'https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=900&q=80',
  food:    'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=900&q=80',
  couple:  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=900&q=80',
  kids:    'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=900&q=80',
  worship: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=900&q=80',
  missions:'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=900&q=80',
};
const yt = (id) => `https://www.youtube.com/watch?v=${id}`;
const future = (days, h = 10, m = 0) => {
  const d = new Date('2026-05-28T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days); d.setUTCHours(h, m, 0, 0);
  return d.toISOString();
};
const past = (days) => {
  const d = new Date('2026-05-28T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
};

const sermons = [
  { title: 'Walking by Faith', speaker: 'Pastor Miguel Santos', series: 'Faith Over Fear', scripture_reference: 'Hebrews 11:1-6', sermon_date: '2026-05-17', video_url: yt('dy9nwe9_xzw'), duration_seconds: 38 * 60, description: 'Faith is not the absence of fear but trusting God in the middle of it. A look at the heroes of Hebrews 11.', sort_order: 1 },
  { title: 'The Power of Grace', speaker: 'Pastor Miguel Santos', series: 'Faith Over Fear', scripture_reference: 'Ephesians 2:8-10', sermon_date: '2026-05-10', video_url: yt('nQWFzMvCfLE'), duration_seconds: 42 * 60, description: 'Saved by grace through faith — what it means to live as God’s workmanship.', sort_order: 2 },
  { title: 'A Heart of Worship', speaker: 'Guest: David Lopez', series: 'Encounter', scripture_reference: 'Psalm 95:1-7', sermon_date: '2026-05-03', video_url: yt('Sc6SSHuZvQE'), duration_seconds: 35 * 60, description: 'Worship is a lifestyle, not just a Sunday moment.', sort_order: 3 },
];

const events = [
  { title: 'Sunday Worship Service', starts_at: future(3, 10), location: 'Main Campus', category: 'service', is_featured: true, image_url: img.church, description: 'Join us for worship, the Word, and community. Everyone is welcome.', sort_order: 1 },
  { title: 'Youth Night: Ignite', starts_at: future(9, 19), location: 'Youth Hall', category: 'youth', is_featured: false, image_url: img.youth, description: 'An evening of worship, games, and a relevant message for students.', sort_order: 2 },
  { title: 'Community Food Drive', starts_at: future(17, 9), location: 'Parking Lot', category: 'outreach', is_featured: false, registration_url: 'https://example.org/food-drive', image_url: img.food, description: 'Serving our neighbors together. Volunteers and donations welcome.', sort_order: 3 },
  { title: 'Marriage Enrichment Conference', starts_at: future(23, 18), ends_at: future(24, 21), location: 'Fellowship Center', category: 'conference', is_featured: true, image_url: img.couple, description: 'A weekend to strengthen your marriage with biblical principles and practical tools.', sort_order: 4 },
];

const episodes = [
  { title: 'Finding Peace in the Storm', season: 1, episode_number: 3, youtube_url: yt('dy9nwe9_xzw'), published_at: past(8), duration_seconds: 28 * 60, description: 'How to hold on to peace when life gets overwhelming.', sort_order: 1 },
  { title: 'Raising Kids in Faith', season: 1, episode_number: 2, youtube_url: yt('nQWFzMvCfLE'), published_at: past(22), duration_seconds: 33 * 60, description: 'Practical conversations on discipling the next generation at home.', sort_order: 2 },
  { title: 'Welcome to the Journey', season: 1, episode_number: 1, youtube_url: yt('Sc6SSHuZvQE'), published_at: past(36), duration_seconds: 25 * 60, description: 'The story behind our church and what this podcast is all about.', sort_order: 3 },
];

const projects = [
  { name: 'Kids Ministry', category: 'ministry', leader_name: 'Ana Reyes', is_featured: true, image_url: img.kids, description: 'A safe, fun place where children learn about Jesus every Sunday.', sort_order: 1 },
  { name: 'Youth Group', category: 'ministry', leader_name: 'Carlos Mendez', is_featured: false, image_url: img.youth, description: 'Students grades 6-12 growing in faith and friendship.', sort_order: 2 },
  { name: 'Worship Team', category: 'ministry', leader_name: 'David Lopez', is_featured: true, image_url: img.worship, description: 'Leading our church into the presence of God through music.', sort_order: 3 },
  { name: 'Missions: Honduras 2026', category: 'mission', leader_name: 'Pastor Miguel', is_featured: false, link_url: 'https://example.org/missions', image_url: img.missions, description: 'Partnering with local churches to serve communities in Honduras.', sort_order: 4 },
];

async function reseed(table, rows, key, churchId) {
  const titles = rows.map((r) => r[key]);
  await db.from(table).delete().eq('church_id', churchId).in(key, titles);
  const payload = rows.map((r) => ({ ...r, church_id: churchId, is_visible_on_portal: true }));
  const { data, error } = await db.from(table).insert(payload).select('id');
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`  ${table}: ${data.length} rows`);
}

const about = {
  headline: 'Welcome to our church family',
  tagline: 'A place to belong, believe, and become',
  story: 'We are a Spirit-filled, multi-generational community in the heart of the city. What began as a small group praying in a living room has grown into a family of hundreds who gather each week to worship Jesus and serve our neighbors.\n\nWherever you are on your journey of faith, there is a place for you here. Come as you are — you are welcome.',
  mission: 'To lead people into a growing relationship with Jesus Christ and equip them to make a difference in their world.',
  vision: 'A thriving community transformed by the love of God, one family at a time.',
};
const beliefs = {
  intro: 'These are the core truths that shape who we are and how we live.',
  items: [
    { title: 'The Bible', text: 'We believe the Bible is the inspired, infallible Word of God and our final authority for faith and life.' },
    { title: 'One God', text: 'We believe in one God eternally existing in three persons: Father, Son, and Holy Spirit.' },
    { title: 'Salvation by Grace', text: 'We believe salvation is a gift of God received through faith in Jesus Christ, not by works.' },
    { title: 'The Church', text: 'We believe the Church is the body of Christ, called to worship, community, and mission.' },
  ],
};
const media = {
  live_url: 'https://www.youtube.com/@elevationchurch/live',
  gallery: [
    { url: img.church, caption: 'Sunday worship' },
    { url: img.youth, caption: 'Youth night' },
    { url: img.worship, caption: 'Worship team' },
    { url: img.food, caption: 'Serving our city' },
    { url: img.kids, caption: 'Kids ministry' },
    { url: img.couple, caption: 'Marriage conference' },
  ],
};

(async () => {
  const { data: church, error } = await db.from('churches').select('id, public_name').eq('slug', SLUG).single();
  if (error || !church) { console.error('Church not found for slug:', SLUG); process.exit(1); }
  console.log(`Seeding demo content for "${church.public_name}" (${SLUG})…`);

  // Donation targets: default fund + first visible/active campaign (if any).
  let defFund = (await db.from('funds').select('id').eq('church_id', church.id).eq('is_default', true).maybeSingle()).data;
  if (!defFund) defFund = (await db.from('funds').select('id').eq('church_id', church.id).eq('is_active', true).limit(1).maybeSingle()).data;
  const camp = (await db.from('campaigns').select('id').eq('church_id', church.id).eq('is_visible_on_portal', true).eq('status', 'active').limit(1).maybeSingle()).data;
  // Wire "Give" on a couple of demo projects.
  projects.forEach((p) => { p.fund_id = null; p.campaign_id = null; });
  if (defFund) { projects.find((p) => p.name === 'Kids Ministry').fund_id = defFund.id; }
  const missions = projects.find((p) => p.name.startsWith('Missions'));
  if (camp) missions.campaign_id = camp.id; else if (defFund) missions.fund_id = defFund.id;

  await reseed('sermons', sermons, 'title', church.id);
  await reseed('events', events, 'title', church.id);
  await reseed('podcast_episodes', episodes, 'title', church.id);
  await reseed('projects', projects, 'name', church.id);

  // Institutional content lives in portal_settings.published_data (+ draft).
  const { data: ps } = await db.from('portal_settings').select('draft_data, published_data, publish_status').eq('church_id', church.id).single();
  const mergedPub = { ...(ps?.published_data || {}), about, beliefs, media };
  const mergedDraft = { ...(ps?.draft_data || {}), about, beliefs, media };
  const { error: psErr } = await db.from('portal_settings').update({
    draft_data: mergedDraft,
    published_data: mergedPub,
    publish_status: 'published',
    published_at: new Date().toISOString(),
  }).eq('church_id', church.id);
  if (psErr) throw new Error('portal_settings: ' + psErr.message);
  console.log('  portal_settings: about + beliefs + gallery + live URL set & published');

  console.log('Done. Reload the portal: /portal.html?slug=' + SLUG);
})().catch((e) => { console.error(e.message || e); process.exit(1); });
