// Default editorial copy for the public homepage sections.
//
// Single source of truth shared by the public renderer
// (src/public/HomePage.jsx — used as the fallback) and the CRM editor
// (src/screens/Portal.jsx → HomeTextsEditor — used as the input placeholders),
// so the two can never drift. Editable overrides live in
// published_data.home.<group>.<field>; an empty/blank field falls back here.

export const HOME_COPY_DEFAULTS = {
  welcome: {
    eyebrow: 'Welcome',
  },
  life: {
    eyebrow: 'Life Together',
    title: 'This is what a Sunday feels like',
    lead: 'Worship, kids laughing in the hallways, tables full after service. Real people, real life — together.',
  },
  plan: {
    eyebrow: 'Plan Your Visit',
    title: 'Everything you need for your first Sunday',
    lead: "No pressure, no awkwardness — just a warm welcome waiting. Here's the lay of the land.",
    when_title: 'When We Gather',
    where_title: 'Where to Find Us',
    where_note: 'Free parking on-site, with greeters at the door.',
    expect_title: 'What to Expect',
    expect_body: 'Come as you are — jeans are perfectly welcome. Expect heartfelt bilingual worship, a hopeful message, and people genuinely glad you came. Services run about 90 minutes.',
  },
  message: {
    eyebrow: 'Latest Message',
    title: 'Catch up on Sunday, wherever you are',
    lead: 'Missed a week or exploring from home? Press play and join us.',
  },
  events: {
    eyebrow: 'Calendar',
    title: 'Upcoming Events',
  },
  ministries: {
    eyebrow: 'Get Involved',
    title: 'Ministries & Projects',
  },
  campaigns: {
    eyebrow: 'Generosity',
    title: 'Active Campaigns',
    sub: 'Support the goals of our community.',
  },
  podcast: {
    eyebrow: 'Listen',
    title: 'From the Podcast',
  },
  give: {
    eyebrow: 'Generosity',
    title: 'Be Part of the Work',
    text: 'Every gift fuels worship, outreach, and a community that keeps changing lives. Join the work — your generosity makes it possible.',
    cta: 'Give Now',
  },
  contact: {
    eyebrow: 'Contact',
    title: 'Visit Us',
    sub: "We're here for you.",
  },
};

// Deep-merge (per group, per field) the saved home copy over the defaults so the
// renderer always receives a fully-populated object. A field that is missing,
// not a string, or blank falls back to its default — so clearing an input in the
// editor restores the original copy on the public site.
export function mergeHomeCopy(home) {
  const saved = home && typeof home === 'object' ? home : {};
  const out = {};
  for (const group of Object.keys(HOME_COPY_DEFAULTS)) {
    const defaults = HOME_COPY_DEFAULTS[group];
    const savedGroup = saved[group] && typeof saved[group] === 'object' ? saved[group] : {};
    out[group] = {};
    for (const key of Object.keys(defaults)) {
      const v = savedGroup[key];
      out[group][key] = (typeof v === 'string' && v.trim() !== '') ? v : defaults[key];
    }
  }
  return out;
}
