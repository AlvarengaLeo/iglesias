import { useEffect, useRef } from 'react';
import { Icon } from '../Icon.jsx';

/* ─────────────────────────────────────────────────────────────────────────
   "Everything your church needs to grow." — full-width Living Bento.
   High-converting capabilities become large hero/banner tiles, each carrying
   a live product micro-visual; supporting capabilities stay compact. Bars and
   charts fill on scroll-in and replay on hover (see the effect at the bottom).
   The visuals are decorative mockups (aria-hidden) — the real CTAs live in the
   nav, hero and pricing sections.
   ───────────────────────────────────────────────────────────────────────── */

/* ── decorative micro-visuals ─────────────────────────────────────────────*/

function GivingViz() {
  return (
    <div className="eb-c-viz-card eb-c-giving" aria-hidden="true">
      <div className="eb-c-toggle"><span>One-time</span><span className="on">Recurring</span></div>
      <div className="eb-c-amts">
        <span className="eb-c-amt">$25</span>
        <span className="eb-c-amt on">$50</span>
        <span className="eb-c-amt">$100</span>
      </div>
      <div className="eb-c-fauxbtn">Give $50 monthly <span aria-hidden="true">→</span></div>
      <div className="eb-c-giving-foot">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
        Apple Pay · card · bank
      </div>
    </div>
  );
}

function DashboardViz() {
  const bars = [42, 64, 50, 82, 60, 94, 72];
  return (
    <div className="eb-c-dash" aria-hidden="true">
      <div className="eb-c-stats">
        <div className="eb-c-stat"><div className="eb-c-stat-v" style={{ color: 'var(--pp-color)' }}>$48k</div><div className="eb-c-stat-k">This month</div></div>
        <div className="eb-c-stat"><div className="eb-c-stat-v">312</div><div className="eb-c-stat-k">Givers</div></div>
        <div className="eb-c-stat"><div className="eb-c-stat-v" style={{ color: 'var(--eb-green)' }}>+18%</div><div className="eb-c-stat-k">vs last</div></div>
      </div>
      <div className="eb-c-barsrow">
        {bars.map((h, i) => <span key={i} className="eb-c-bb" data-h={h} />)}
      </div>
    </div>
  );
}

function CrmViz() {
  return (
    <div className="eb-c-stack" aria-hidden="true">
      <span className="eb-c-ava" style={{ background: '#2348C4' }}>AM</span>
      <span className="eb-c-ava" style={{ background: 'var(--eb-green)' }}>JR</span>
      <span className="eb-c-ava" style={{ background: '#D9772B' }}>SK</span>
      <span className="eb-c-ava" style={{ background: '#7A5AF0' }}>MT</span>
      <span className="eb-c-chip eb-c-stack-chip">+1,236 people</span>
    </div>
  );
}

function FundsViz() {
  return (
    <div className="eb-c-funds" aria-hidden="true">
      <div className="eb-c-fundrow">
        <div className="eb-c-fundlbl"><span>Building Fund</span><span style={{ color: 'var(--pp-color)', fontWeight: 600 }}>68%</span></div>
        <div className="eb-c-bar"><i data-w="68" /></div>
      </div>
      <div className="eb-c-fundrow">
        <div className="eb-c-fundlbl"><span>Missions trip</span><span style={{ color: 'var(--eb-green)', fontWeight: 600 }}>42%</span></div>
        <div className="eb-c-bar"><i data-w="42" style={{ background: 'var(--eb-green)' }} /></div>
      </div>
    </div>
  );
}

function ReceiptsViz() {
  return (
    <div className="eb-c-viz-card eb-c-receipts" aria-hidden="true">
      <div className="eb-c-docrow"><span>Mar · General</span><b>$150.00</b></div>
      <div className="eb-c-docrow"><span>Jun · Building</span><b>$500.00</b></div>
      <div className="eb-c-docrow eb-c-docrow--total"><span>Deductible</span><b>$770.00</b></div>
    </div>
  );
}

function RolesViz() {
  const roles = [
    { initials: 'EM', name: 'Emma', role: 'Admin', color: '#2348C4', perms: [['Giving', true], ['People', true]] },
    { initials: 'PD', name: 'Pastor David', role: 'Pastor', color: 'var(--eb-green)', perms: [['People', true], ['Finance', false]] },
    { initials: 'TR', name: 'Tom', role: 'Treasurer', color: '#D9772B', perms: [['Finance', true], ['People', false]] },
  ];
  return (
    <div className="eb-c-rolegrid" aria-hidden="true">
      {roles.map((r) => (
        <div className="eb-c-rolecard" key={r.initials}>
          <div className="eb-c-roletop">
            <span className="eb-c-ava eb-c-ava--sm" style={{ background: r.color }}>{r.initials}</span>
            <div><div className="eb-c-rolename">{r.name}</div><div className="eb-c-mini">{r.role}</div></div>
          </div>
          {r.perms.map(([label, on]) => (
            <div className="eb-c-perm" key={label}><span>{label}</span><span className={`eb-c-sw ${on ? 'on' : ''}`}><i /></span></div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SiteViz() {
  return (
    <div className="eb-c-site" aria-hidden="true">
      <div className="eb-c-sitebar">
        <span className="eb-c-mdot" style={{ background: '#ff5f57' }} />
        <span className="eb-c-mdot" style={{ background: '#febc2e' }} />
        <span className="eb-c-mdot" style={{ background: '#28c840' }} />
        <span className="eb-c-u">gracechurch.org</span>
      </div>
      <div className="eb-c-sitehero">
        <div className="eb-c-sitenav"><span className="eb-c-sitebrand">Grace</span><span>About</span><span>Sermons</span><span>Give</span></div>
        <h5>Welcome home.</h5>
        <div className="eb-c-sitesub">Sundays · 9 &amp; 11am</div>
        <div className="eb-c-sitecta">Plan your visit →</div>
      </div>
      <div className="eb-c-siterow">
        <span className="eb-c-chip">Home</span><span className="eb-c-chip">About</span><span className="eb-c-chip">Beliefs</span><span className="eb-c-chip blue">Editable</span>
      </div>
    </div>
  );
}

function SermonsViz() {
  return (
    <div className="eb-c-sermons" aria-hidden="true">
      <div className="eb-c-srow">
        <span className="eb-c-play on"><span className="eb-c-eq"><i /><i /><i /><i /></span></span>
        <div className="eb-c-srow-meta"><div className="eb-c-srow-title">Hope that holds</div><div className="eb-c-mini">Now playing · 32 min</div></div>
      </div>
      <div className="eb-c-srow">
        <span className="eb-c-play"><svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span>
        <div className="eb-c-srow-meta"><div className="eb-c-srow-title">The Good Shepherd</div><div className="eb-c-mini">41 min</div></div>
      </div>
    </div>
  );
}

function CampaignViz() {
  return (
    <div className="eb-c-viz-card eb-c-camp" aria-hidden="true">
      <div className="eb-c-camp-head">
        <div>
          <div className="eb-c-camp-name">New Building Campaign</div>
          <div className="eb-c-camp-amounts"><span className="eb-c-camp-amt">$84,200</span><span className="eb-c-camp-goal">of $120,000 goal</span></div>
        </div>
        <span className="eb-c-chip blue eb-c-camp-pct">70% funded</span>
      </div>
      <div className="eb-c-bar eb-c-bar--lg"><i data-w="70" /></div>
      <div className="eb-c-camp-foot"><span className="eb-c-mini">312 givers so far</span><span className="eb-c-mini eb-c-camp-delta">+$3,400 this week</span></div>
    </div>
  );
}

/* ── capability data ──────────────────────────────────────────────────────*/

const MANAGE = [
  { id: 'giving', span: 7, variant: 'hero', icon: 'handHeart', benefit: 'Give in 3 taps', title: 'Online giving', body: 'Accept one-time and recurring giving online, by fund or campaign. Open 24/7, no Sunday required.', Viz: GivingViz },
  { id: 'dash', span: 5, variant: 'tile', icon: 'dashboards', title: 'Real-time dashboards', body: 'See giving trends, top funds, and recurring givers update live, no spreadsheets.', Viz: DashboardViz },
  { id: 'crm', span: 4, variant: 'tile', icon: 'users', title: 'Member & supporter CRM', body: 'One database for members, visitors, and supporters, with tags, households, and follow-ups.', Viz: CrmViz },
  { id: 'funds', span: 4, variant: 'tile', icon: 'target', title: 'Funds & campaigns', body: 'Organize giving by fund and run campaigns with live progress toward goal.', Viz: FundsViz },
  { id: 'receipts', span: 4, variant: 'tile', icon: 'receipt', title: 'Tax receipts & statements', body: 'Automatic receipts on every contribution, plus year-end statements supporters can file.', Viz: ReceiptsViz },
  { id: 'roles', span: 12, variant: 'banner', icon: 'shield', benefit: 'Right access for everyone', title: 'Team roles & security', body: 'Invite your team with exactly the access they need: admin, pastor, treasurer, and more.', Viz: RolesViz },
];

const ONLINE = [
  { id: 'site', span: 8, variant: 'hero', icon: 'globe', benefit: 'Live in a weekend', title: 'A complete church website', body: 'A beautiful, mobile-ready site with home, about, beliefs, and contact pages, fully editable, no code required.', Viz: SiteViz },
  { id: 'media', span: 4, variant: 'tile', icon: 'mic', title: 'Sermons, events & media', body: 'Publish sermons, events, ministries, podcast, and a photo gallery in minutes.', Viz: SermonsViz },
  { id: 'builtin', span: 12, variant: 'banner', icon: 'heart', benefit: 'Giving on every page', title: 'Giving built right in', body: 'Your site includes online giving with live campaign progress bars, no plugins, no extra fees.', Viz: CampaignViz, cta: 'See it live' },
];

/* ── tile + section ───────────────────────────────────────────────────────*/

function BentoTile({ icon, benefit, title, body, span, variant, Viz, cta, onCta }) {
  return (
    <article className={`eb-c-tile eb-c-tile--${variant} c${span}`}>
      <span className="eb-c-glow" aria-hidden="true" />
      <div className="eb-c-tile-copy">
        {benefit && <span className="eb-c-benefit">{benefit}</span>}
        <span className="eb-c-tile-ico"><Icon name={icon} size={23} /></span>
        <h4>{title}</h4>
        <p>{body}</p>
        {cta && (
          <button type="button" className="eb-c-tile-cta" onClick={onCta}>
            {cta} <Icon name="arrowRight" size={16} />
          </button>
        )}
      </div>
      <div className="eb-c-viz"><Viz /></div>
    </article>
  );
}

export function WhatsIncluded({ onStart }) {
  const ref = useRef(null);

  const handleCta = () => {
    if (typeof onStart === 'function') { onStart(); return; }
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fill progress bars + the dashboard chart when a tile scrolls into view, and
  // replay on hover. Gated behind .pp-animate + reduced-motion; otherwise the
  // visuals are rendered at their final values so nothing is left empty.
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const tiles = Array.from(root.querySelectorAll('.eb-c-tile'));
    const animate = document.documentElement.classList.contains('pp-animate')
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const setFinal = (t) => {
      t.querySelectorAll('.eb-c-bar > i[data-w]').forEach((i) => { i.style.transition = 'none'; i.style.width = `${i.dataset.w}%`; });
      t.querySelectorAll('.eb-c-bb[data-h]').forEach((b) => { b.style.transition = 'none'; b.style.height = `${b.dataset.h}%`; });
    };
    const fill = (t) => {
      t.querySelectorAll('.eb-c-bar > i[data-w]').forEach((i) => { i.style.transition = 'width 1.1s cubic-bezier(.2,.8,.2,1)'; i.style.width = `${i.dataset.w}%`; });
      t.querySelectorAll('.eb-c-bb[data-h]').forEach((b, k) => { b.style.transition = `height .8s cubic-bezier(.2,.8,.2,1) ${k * 0.05}s`; b.style.height = `${b.dataset.h}%`; });
    };
    const reset = (t) => {
      t.querySelectorAll('.eb-c-bar > i[data-w]').forEach((i) => { i.style.transition = 'none'; i.style.width = '0'; });
      t.querySelectorAll('.eb-c-bb[data-h]').forEach((b) => { b.style.transition = 'none'; b.style.height = '0'; });
    };

    if (!animate) { tiles.forEach(setFinal); return undefined; }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { fill(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.35 });
    tiles.forEach((t) => io.observe(t));

    const onEnter = (e) => {
      const t = e.currentTarget;
      reset(t);
      requestAnimationFrame(() => requestAnimationFrame(() => fill(t)));
    };
    tiles.forEach((t) => t.addEventListener('mouseenter', onEnter));

    return () => {
      io.disconnect();
      tiles.forEach((t) => t.removeEventListener('mouseenter', onEnter));
    };
  }, []);

  return (
    <section className="eb-c-section eb-c-included" id="included" ref={ref}>
      <div className="eb-c-container">
        <div className="pp-reveal eb-c-included-head">
          <span className="eb-c-eyebrow">One subscription · everything included</span>
          <h2 className="eb-c-h2">Everything your church needs to grow.</h2>
          <p className="eb-c-lead">Two products most churches pay for separately: your management system and your website, together in one plan.</p>
        </div>

        <div className="eb-c-group pp-reveal">
          <div className="eb-c-grouphead">
            <div className="eb-c-grouphead-left">
              <span className="eb-c-kicker">Manage your church</span>
              <span className="eb-c-grouphead-lead">Giving, people, and money, all in one place.</span>
            </div>
            <span className="eb-c-grouphead-count">6 capabilities</span>
          </div>
          <div className="eb-c-bento">
            {MANAGE.map((t) => <BentoTile key={t.id} {...t} onCta={handleCta} />)}
          </div>
        </div>

        <div className="eb-c-group pp-reveal">
          <div className="eb-c-grouphead">
            <div className="eb-c-grouphead-left">
              <span className="eb-c-kicker">Your church online</span>
              <span className="eb-c-grouphead-lead">A public home for your church, with giving built in.</span>
            </div>
            <span className="eb-c-grouphead-count">3 capabilities</span>
          </div>
          <div className="eb-c-bento">
            {ONLINE.map((t) => <BentoTile key={t.id} {...t} onCta={handleCta} />)}
          </div>
        </div>

        <p className="eb-c-included-foot pp-reveal">All of it. One price. <span>No add-ons, no per-feature fees.</span></p>
      </div>
    </section>
  );
}
