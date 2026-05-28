/* global React, Icon */
// Shared components: Sidebar, Topbar, Badges, Toast container, Charts

const {
  useState,
  useEffect,
  useRef
} = React;

// ============== SIDEBAR ==============
const Sidebar = ({
  current,
  onNavigate,
  mobileOpen = false,
  onMobileClose
}) => {
  const items = [{
    id: 'inicio',
    label: 'Inicio',
    icon: 'home'
  }, {
    id: 'personas',
    label: 'Personas',
    icon: 'users'
  }, {
    id: 'donaciones',
    label: 'Donaciones',
    icon: 'handHeart'
  }, {
    id: 'portal',
    label: 'Portal',
    icon: 'globe'
  }, {
    id: 'reportes',
    label: 'Reportes',
    icon: 'barChart'
  }, {
    id: 'configuracion',
    label: 'Configuración',
    icon: 'settings'
  }];
  return /*#__PURE__*/React.createElement("aside", {
    className: `sidebar ${mobileOpen ? 'sidebar-mobile-open' : ''}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "sidebar-brand"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sidebar-brand-logo"
  }, "CR"), /*#__PURE__*/React.createElement("div", {
    className: "sidebar-brand-text"
  }, /*#__PURE__*/React.createElement("strong", null, "Casa de Restauraci\xF3n"), /*#__PURE__*/React.createElement("span", null, "Plan Ministerio \xB7 Activo")), /*#__PURE__*/React.createElement("button", {
    className: "sidebar-close",
    onClick: onMobileClose,
    "aria-label": "Cerrar men\xFA"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "sidebar-section-label"
  }, "Men\xFA principal"), items.map(it => /*#__PURE__*/React.createElement("button", {
    key: it.id,
    className: `nav-item ${current === it.id ? 'active' : ''}`,
    onClick: () => onNavigate(it.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: it.icon
  }), it.label, it.id === 'donaciones' && current !== 'donaciones' && /*#__PURE__*/React.createElement("span", {
    className: "nav-item-badge"
  }, "3"))), /*#__PURE__*/React.createElement("div", {
    className: "sidebar-foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sidebar-foot-title"
  }, "\xBFNecesitas ayuda?"), /*#__PURE__*/React.createElement("div", {
    className: "sidebar-foot-text"
  }, "Habla con nuestro equipo o consulta la gu\xEDa pastoral."), /*#__PURE__*/React.createElement("button", null, "Contactar soporte")));
};

// ============== TOPBAR ==============
const Topbar = ({
  title,
  subtitle,
  onMenuClick
}) => {
  const [userOpen, setUserOpen] = useState(false);
  return /*#__PURE__*/React.createElement("header", {
    className: "topbar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "topbar-menu-btn",
    onClick: onMenuClick,
    "aria-label": "Abrir men\xFA"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "menu",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    className: "topbar-title"
  }, /*#__PURE__*/React.createElement("h1", null, title), subtitle && /*#__PURE__*/React.createElement("span", null, subtitle)), /*#__PURE__*/React.createElement("div", {
    className: "topbar-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "topbar-church"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ch-mark"
  }, "CR"), /*#__PURE__*/React.createElement("div", {
    className: "ch-name"
  }, "Iglesia Casa de Restauraci\xF3n"), /*#__PURE__*/React.createElement(Icon, {
    name: "chevronDown",
    size: 14
  })), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    title: "Notificaciones"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell"
  }), /*#__PURE__*/React.createElement("span", {
    className: "dot"
  })), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    title: "Ayuda"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "help"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "topbar-user",
    onClick: () => setUserOpen(o => !o)
  }, /*#__PURE__*/React.createElement("div", {
    className: "avatar"
  }, "PM"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "name"
  }, "Pastor Miguel"), /*#__PURE__*/React.createElement("span", {
    className: "role"
  }, "Admin \xB7 Pastor")), /*#__PURE__*/React.createElement(Icon, {
    name: "chevronDown",
    size: 14
  })), userOpen && /*#__PURE__*/React.createElement("div", {
    className: "dropdown",
    onMouseLeave: () => setUserOpen(false)
  }, /*#__PURE__*/React.createElement("button", {
    className: "dropdown-item"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user"
  }), "Mi perfil"), /*#__PURE__*/React.createElement("button", {
    className: "dropdown-item"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "settings"
  }), "Preferencias"), /*#__PURE__*/React.createElement("button", {
    className: "dropdown-item"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "book"
  }), "Centro de ayuda"), /*#__PURE__*/React.createElement("div", {
    className: "dropdown-sep"
  }), /*#__PURE__*/React.createElement("button", {
    className: "dropdown-item"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "logOut"
  }), "Cerrar sesi\xF3n")))));
};

// ============== BADGE ==============
const Badge = ({
  tone = 'muted',
  dot = false,
  children,
  icon
}) => /*#__PURE__*/React.createElement("span", {
  className: `badge badge-${tone} ${dot ? 'dot' : ''}`
}, icon && /*#__PURE__*/React.createElement(Icon, {
  name: icon,
  size: 11
}), children);

// ============== TOAST ==============
const Toast = ({
  icon = 'check',
  title,
  sub,
  tone = 'success'
}) => /*#__PURE__*/React.createElement("div", {
  className: `toast ${tone}`
}, /*#__PURE__*/React.createElement("div", {
  className: "toast-icon"
}, /*#__PURE__*/React.createElement(Icon, {
  name: icon
})), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  className: "title"
}, title), sub && /*#__PURE__*/React.createElement("div", {
  className: "sub"
}, sub)));

// ============== CHARTS (SVG, hand-rolled) ==============

const formatMoney = n => '$' + n.toLocaleString('en-US');

// Line chart with hover tooltip
const LineChart = ({
  data,
  height = 220,
  accent = '#8A6A4A',
  selectedIndex = null,
  onSelect
}) => {
  const containerRef = useRef(null);
  const [hover, setHover] = useState(selectedIndex);
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      setW(entries[0].contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);
  const padding = {
    top: 24,
    right: 16,
    bottom: 36,
    left: 44
  };
  const innerW = w - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(...data.map(d => d.value));
  const min = 0;
  const xStep = innerW / (data.length - 1 || 1);
  const yScale = v => innerH - (v - min) / (max - min || 1) * innerH;
  const points = data.map((d, i) => ({
    x: padding.left + i * xStep,
    y: padding.top + yScale(d.value),
    ...d
  }));

  // Smooth curve using catmull-rom -> bezier approximation? Use simple straight line for clarity.
  const pathStr = points.map((p, i) => i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(' ');
  const areaStr = pathStr + ` L ${points[points.length - 1].x} ${padding.top + innerH} L ${padding.left} ${padding.top + innerH} Z`;

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    y: padding.top + innerH - t * innerH,
    label: Math.round(min + t * (max - min))
  }));
  const activeIdx = hover ?? selectedIndex;
  const active = activeIdx != null ? points[activeIdx] : null;
  return /*#__PURE__*/React.createElement("div", {
    ref: containerRef,
    style: {
      position: 'relative',
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    className: "chart-svg",
    width: w,
    height: height
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "line-gradient",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: accent,
    stopOpacity: "0.18"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: accent,
    stopOpacity: "0"
  }))), yTicks.map((t, i) => /*#__PURE__*/React.createElement("g", {
    key: i
  }, /*#__PURE__*/React.createElement("line", {
    x1: padding.left,
    y1: t.y,
    x2: w - padding.right,
    y2: t.y,
    stroke: "#EEF0F3",
    strokeDasharray: i === 0 ? '0' : '0'
  }), /*#__PURE__*/React.createElement("text", {
    x: padding.left - 8,
    y: t.y + 4,
    textAnchor: "end",
    fontSize: "10",
    fill: "#8A95A0"
  }, "$", t.label.toLocaleString()))), points.map((p, i) => /*#__PURE__*/React.createElement("text", {
    key: i,
    x: p.x,
    y: height - 14,
    textAnchor: "middle",
    fontSize: "11",
    fill: "#66727D",
    fontWeight: "500"
  }, p.label)), /*#__PURE__*/React.createElement("path", {
    d: areaStr,
    fill: "url(#line-gradient)"
  }), /*#__PURE__*/React.createElement("path", {
    d: pathStr,
    fill: "none",
    stroke: accent,
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }), points.map((p, i) => /*#__PURE__*/React.createElement("g", {
    key: i
  }, /*#__PURE__*/React.createElement("circle", {
    cx: p.x,
    cy: p.y,
    r: activeIdx === i ? 5 : 3.5,
    fill: accent,
    stroke: "#fff",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("rect", {
    x: p.x - xStep / 2,
    y: padding.top,
    width: xStep,
    height: innerH,
    fill: "transparent",
    onMouseEnter: () => setHover(i),
    onMouseLeave: () => setHover(null),
    onClick: () => onSelect?.(i),
    style: {
      cursor: 'pointer'
    }
  }))), active && /*#__PURE__*/React.createElement("line", {
    x1: active.x,
    y1: padding.top,
    x2: active.x,
    y2: padding.top + innerH,
    stroke: "#1F2B38",
    strokeDasharray: "3 3",
    strokeOpacity: "0.3"
  })), active && /*#__PURE__*/React.createElement("div", {
    className: "chart-tooltip",
    style: {
      left: active.x - 60,
      top: active.y - 50
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "tt-label"
  }, active.label), /*#__PURE__*/React.createElement("div", {
    className: "tt-val"
  }, formatMoney(active.value), " recibidos")));
};

// Bar chart
const BarChart = ({
  data,
  height = 220,
  accent = '#1F2B38',
  highlightIndex = null
}) => {
  const containerRef = useRef(null);
  const [hover, setHover] = useState(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => setW(entries[0].contentRect.width));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);
  const padding = {
    top: 16,
    right: 12,
    bottom: 36,
    left: 44
  };
  const innerW = w - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(...data.map(d => d.value)) * 1.1;
  const barGap = 0.35;
  const barW = innerW / data.length * (1 - barGap);
  const yTicks = [0, 0.5, 1].map(t => ({
    y: padding.top + innerH - t * innerH,
    label: Math.round(t * max)
  }));
  return /*#__PURE__*/React.createElement("div", {
    ref: containerRef,
    style: {
      position: 'relative',
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    className: "chart-svg",
    width: w,
    height: height
  }, yTicks.map((t, i) => /*#__PURE__*/React.createElement("g", {
    key: i
  }, /*#__PURE__*/React.createElement("line", {
    x1: padding.left,
    y1: t.y,
    x2: w - padding.right,
    y2: t.y,
    stroke: "#EEF0F3"
  }), /*#__PURE__*/React.createElement("text", {
    x: padding.left - 8,
    y: t.y + 4,
    textAnchor: "end",
    fontSize: "10",
    fill: "#8A95A0"
  }, "$", t.label.toLocaleString()))), data.map((d, i) => {
    const x = padding.left + innerW / data.length * i + (innerW / data.length - barW) / 2;
    const h = d.value / max * innerH;
    const y = padding.top + innerH - h;
    const isHover = hover === i;
    const isHighlight = highlightIndex === i || isHover;
    return /*#__PURE__*/React.createElement("g", {
      key: i
    }, /*#__PURE__*/React.createElement("rect", {
      x: x,
      y: y,
      width: barW,
      height: h,
      rx: "6",
      fill: isHighlight ? '#8A6A4A' : accent,
      opacity: hover != null && !isHover ? 0.55 : 1,
      onMouseEnter: () => setHover(i),
      onMouseLeave: () => setHover(null),
      style: {
        cursor: 'pointer',
        transition: 'opacity 0.15s'
      }
    }), /*#__PURE__*/React.createElement("text", {
      x: x + barW / 2,
      y: height - 14,
      textAnchor: "middle",
      fontSize: "11",
      fill: "#66727D",
      fontWeight: "500"
    }, d.label));
  })), hover != null && (() => {
    const d = data[hover];
    const x = padding.left + innerW / data.length * hover + innerW / data.length / 2;
    const h = d.value / max * innerH;
    const y = padding.top + innerH - h;
    return /*#__PURE__*/React.createElement("div", {
      className: "chart-tooltip",
      style: {
        left: x - 60,
        top: y - 50
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "tt-label"
    }, d.label), /*#__PURE__*/React.createElement("div", {
      className: "tt-val"
    }, formatMoney(d.value)));
  })());
};

// Donut chart
const DonutChart = ({
  data,
  size = 200,
  total,
  label = 'Total'
}) => {
  const [hover, setHover] = useState(null);
  const r = size / 2;
  const innerR = r * 0.65;
  const sum = total || data.reduce((s, d) => s + d.value, 0);
  let cumulative = 0;
  const slices = data.map(d => {
    const start = cumulative / sum;
    cumulative += d.value;
    const end = cumulative / sum;
    return {
      ...d,
      start,
      end
    };
  });
  const polar = a => [Math.cos((a - 0.25) * 2 * Math.PI) * r + r, Math.sin((a - 0.25) * 2 * Math.PI) * r + r];
  const polarInner = a => [Math.cos((a - 0.25) * 2 * Math.PI) * innerR + r, Math.sin((a - 0.25) * 2 * Math.PI) * innerR + r];
  const arc = (s, e) => {
    const [x1, y1] = polar(s);
    const [x2, y2] = polar(e);
    const [x3, y3] = polarInner(e);
    const [x4, y4] = polarInner(s);
    const large = e - s > 0.5 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${large} 0 ${x4} ${y4} Z`;
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 24,
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: size,
      height: size,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size
  }, slices.map((s, i) => /*#__PURE__*/React.createElement("path", {
    key: i,
    d: arc(s.start, s.end),
    fill: s.color,
    opacity: hover != null && hover !== i ? 0.45 : 1,
    onMouseEnter: () => setHover(i),
    onMouseLeave: () => setHover(null),
    style: {
      transition: 'opacity 0.15s',
      cursor: 'pointer'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none'
    }
  }, hover != null ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--muted)'
    }
  }, data[hover].label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 700
    }
  }, Math.round(data[hover].value / sum * 100), "%"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--muted)'
    }
  }, formatMoney(data[hover].value))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--muted)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 700
    }
  }, formatMoney(sum))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      flex: 1
    }
  }, data.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    onMouseEnter: () => setHover(i),
    onMouseLeave: () => setHover(null),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '6px 8px',
      borderRadius: 8,
      background: hover === i ? 'var(--bg-2)' : 'transparent',
      transition: 'background 0.15s',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: 3,
      background: d.color,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 13
    }
  }, d.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--muted)',
      fontFeatureSettings: '"tnum"'
    }
  }, Math.round(d.value / sum * 100), "%")))));
};

// Horizontal bar (for top campaigns)
const HBarChart = ({
  data,
  color = '#8A6A4A'
}) => {
  const max = Math.max(...data.map(d => d.value));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, data.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 600
    }
  }, d.label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--muted)',
      fontFeatureSettings: '"tnum"'
    }
  }, formatMoney(d.value))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8,
      background: 'var(--bg-2)',
      borderRadius: 999,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${d.value / max * 100}%`,
      height: '100%',
      background: color,
      borderRadius: 999
    }
  })))));
};

// Sparkline (small)
const Sparkline = ({
  data,
  color = '#8A6A4A',
  width = 80,
  height = 28
}) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${height - (v - min) / (max - min || 1) * height}`).join(' ');
  return /*#__PURE__*/React.createElement("svg", {
    width: width,
    height: height,
    style: {
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("polyline", {
    points: pts,
    fill: "none",
    stroke: color,
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }));
};
Object.assign(window, {
  Sidebar,
  Topbar,
  Badge,
  Toast,
  LineChart,
  BarChart,
  DonutChart,
  HBarChart,
  Sparkline,
  formatMoney
});