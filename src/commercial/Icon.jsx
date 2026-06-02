// Inline SVG icon set for the commercial site (no emoji). 24x24, stroke.
export function Icon({ name, size = 18, strokeWidth = 1.75 }) {
  const paths = {
    check:    <path d="M20 6 9 17l-5-5" />,
    arrowRight: <path d="M5 12h14M13 5l7 7-7 7" />,
    menu:     <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>,
    close:    <path d="M18 6 6 18M6 6l12 12" />,
    x:        <path d="M18 6 6 18M6 6l12 12" />,
    // product / value icons
    heart:    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z" />,
    handHeart:<><path d="M11 14h2a2 2 0 0 0 2-2 2 2 0 0 0-2-2H9.5a3 3 0 0 0-2.1.9L3 15" /><path d="m7 18 1.4-1.3a3 3 0 0 1 2.1-.9H14c1.5 0 2.8-.6 3.7-1.7l3-3.2a1.7 1.7 0 0 0-2.5-2.3L15 11" /><path d="M2 14v6M16.5 4.5c0-1-.8-1.8-1.8-1.8-.7 0-1.3.4-1.7 1-.4-.6-1-1-1.7-1-1 0-1.8.8-1.8 1.8 0 1.6 2 2.9 3.5 4 1.5-1.1 3.5-2.4 3.5-4z" /></>,
    barChart: <><line x1="6" y1="20" x2="6" y2="12" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="18" y1="20" x2="18" y2="14" /><line x1="3" y1="20" x2="21" y2="20" /></>,
    dashboards: <><line x1="4" y1="20" x2="4" y2="10" /><line x1="9.3" y1="20" x2="9.3" y2="5" /><line x1="14.6" y1="20" x2="14.6" y2="13" /><line x1="20" y1="20" x2="20" y2="8" /></>,
    receipt:  <><path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17l-3-2-2 2-2-2-2 2-2-2-3 2z" /><path d="M9 7h6M9 11h6M9 15h4" /></>,
    globe:    <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" /></>,
    users:    <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" /></>,
    target:   <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></>,
    layers:   <><path d="m12 2 9 5-9 5-9-5 9-5z" /><path d="m3 12 9 5 9-5M3 17l9 5 9-5" /></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
    mic:      <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" /></>,
    image:    <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
    sparkle:  <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />,
    shield:   <path d="M12 2 4 5v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V5l-8-3z" />,
    clock:    <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    bolt:     <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />,
    mail:     <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    spreadsheet: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] || null}
    </svg>
  );
}
