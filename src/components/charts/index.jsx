import { useState, useEffect, useRef } from 'react';
import { CountUp } from '../CountUp.jsx';

const formatMoney = (n) => '$' + n.toLocaleString('en-US');

// =========================================================
// LineChart
// =========================================================
export function LineChart({ data, height = 220, accent = '#2348C4', selectedIndex = null, onSelect }) {
  const containerRef = useRef(null);
  const [hover, setHover] = useState(selectedIndex);
  const [w, setW] = useState(600);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      // Ignorar ancho 0 (pantalla oculta por keep-alive): conserva el último
      // ancho válido para que el gráfico se vea correcto al volver, sin flash.
      const cw = entries[0].contentRect.width;
      if (cw > 0) setW(cw);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const padding = { top: 24, right: 16, bottom: 36, left: 44 };
  const innerW = w - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const max = Math.max(...data.map((d) => d.value));
  const min = 0;
  const xStep = innerW / (data.length - 1 || 1);
  const yScale = (v) => innerH - ((v - min) / (max - min || 1)) * innerH;

  const points = data.map((d, i) => ({
    x: padding.left + i * xStep,
    y: padding.top + yScale(d.value),
    ...d,
  }));

  const pathStr = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ');
  const areaStr =
    pathStr +
    ` L ${points[points.length - 1].x} ${padding.top + innerH} L ${padding.left} ${
      padding.top + innerH
    } Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: padding.top + innerH - t * innerH,
    label: Math.round(min + t * (max - min)),
  }));

  const activeIdx = hover ?? selectedIndex;
  const active = activeIdx != null ? points[activeIdx] : null;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <svg className="chart-svg" width={w} height={height}>
        <defs>
          <linearGradient id="line-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.18" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={padding.left} y1={t.y} x2={w - padding.right} y2={t.y} stroke="#EEF0F3" />
            <text x={padding.left - 8} y={t.y + 4} textAnchor="end" fontSize="10" fill="#8A95A0">
              ${t.label.toLocaleString()}
            </text>
          </g>
        ))}
        {points.map((p, i) => (
          <text key={i} x={p.x} y={height - 14} textAnchor="middle" fontSize="11" fill="#66727D" fontWeight="500">
            {p.label}
          </text>
        ))}
        <path className="ch-fade" style={{ animationDelay: '.2s' }} d={areaStr} fill="url(#line-gradient)" />
        <path className="ch-draw" pathLength="1" d={pathStr} fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle className="ch-fade" style={{ animationDelay: `${0.85 + i * 0.05}s` }} cx={p.x} cy={p.y} r={activeIdx === i ? 5 : 3.5} fill={accent} stroke="#fff" strokeWidth="2" />
            <rect
              x={p.x - xStep / 2}
              y={padding.top}
              width={xStep}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelect?.(i)}
              style={{ cursor: 'pointer' }}
            />
          </g>
        ))}
        {active && (
          <line
            x1={active.x}
            y1={padding.top}
            x2={active.x}
            y2={padding.top + innerH}
            stroke="#16307F"
            strokeDasharray="3 3"
            strokeOpacity="0.3"
          />
        )}
      </svg>
      {active && (
        <div className="chart-tooltip" style={{ left: active.x - 60, top: active.y - 50 }}>
          <div className="tt-label">{active.label}</div>
          <div className="tt-val">{formatMoney(active.value)} recibidos</div>
        </div>
      )}
    </div>
  );
}

// =========================================================
// BarChart
// =========================================================
export function BarChart({ data, height = 220, accent = '#16307F', highlightIndex = null }) {
  const containerRef = useRef(null);
  const [hover, setHover] = useState(null);
  const [w, setW] = useState(600);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0].contentRect.width;
      if (cw > 0) setW(cw);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const padding = { top: 16, right: 12, bottom: 36, left: 44 };
  const innerW = w - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(...data.map((d) => d.value)) * 1.1;
  const barGap = 0.35;
  const barW = (innerW / data.length) * (1 - barGap);

  const yTicks = [0, 0.5, 1].map((t) => ({
    y: padding.top + innerH - t * innerH,
    label: Math.round(t * max),
  }));

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <svg className="chart-svg" width={w} height={height}>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={padding.left} y1={t.y} x2={w - padding.right} y2={t.y} stroke="#EEF0F3" />
            <text x={padding.left - 8} y={t.y + 4} textAnchor="end" fontSize="10" fill="#8A95A0">
              ${t.label.toLocaleString()}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = padding.left + (innerW / data.length) * i + (innerW / data.length - barW) / 2;
          const h = (d.value / max) * innerH;
          const y = padding.top + innerH - h;
          const isHover = hover === i;
          const isHighlight = highlightIndex === i || isHover;
          return (
            <g key={i}>
              <rect
                className="ch-bar"
                x={x}
                y={y}
                width={barW}
                height={h}
                rx="6"
                fill={isHighlight ? '#2348C4' : accent}
                opacity={hover != null && !isHover ? 0.55 : 1}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: 'pointer', transition: 'opacity 0.15s', animationDelay: `${i * 0.06}s` }}
              />
              <text x={x + barW / 2} y={height - 14} textAnchor="middle" fontSize="11" fill="#66727D" fontWeight="500">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {hover != null &&
        (() => {
          const d = data[hover];
          const x = padding.left + (innerW / data.length) * hover + (innerW / data.length) / 2;
          const h = (d.value / max) * innerH;
          const y = padding.top + innerH - h;
          return (
            <div className="chart-tooltip" style={{ left: x - 60, top: y - 50 }}>
              <div className="tt-label">{d.label}</div>
              <div className="tt-val">{formatMoney(d.value)}</div>
            </div>
          );
        })()}
    </div>
  );
}

// =========================================================
// DonutChart
// =========================================================
export function DonutChart({ data, size = 200, total, label = 'Total' }) {
  const [hover, setHover] = useState(null);
  const r = size / 2;
  const innerR = r * 0.65;
  const sum = total || data.reduce((s, d) => s + d.value, 0);
  let cumulative = 0;
  const slices = data.map((d) => {
    const start = cumulative / sum;
    cumulative += d.value;
    const end = cumulative / sum;
    return { ...d, start, end };
  });
  const polar = (a) => [
    Math.cos((a - 0.25) * 2 * Math.PI) * r + r,
    Math.sin((a - 0.25) * 2 * Math.PI) * r + r,
  ];
  const polarInner = (a) => [
    Math.cos((a - 0.25) * 2 * Math.PI) * innerR + r,
    Math.sin((a - 0.25) * 2 * Math.PI) * innerR + r,
  ];

  const arc = (s, e) => {
    const [x1, y1] = polar(s);
    const [x2, y2] = polar(e);
    const [x3, y3] = polarInner(e);
    const [x4, y4] = polarInner(s);
    const large = e - s > 0.5 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${large} 0 ${x4} ${y4} Z`;
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, width: '100%' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size}>
          <g className="ch-zoom">
            {slices.map((s, i) => (
              <path
                key={i}
                d={arc(s.start, s.end)}
                fill={s.color}
                opacity={hover != null && hover !== i ? 0.45 : 1}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                style={{ transition: 'opacity 0.15s', cursor: 'pointer' }}
              />
            ))}
          </g>
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {hover != null ? (
            <>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{data[hover].label}</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{Math.round((data[hover].value / sum) * 100)}%</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{formatMoney(data[hover].value)}</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}><CountUp value={sum} format={formatMoney} /></div>
            </>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {data.map((d, i) => (
          <div
            key={i}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 8px',
              borderRadius: 8,
              background: hover === i ? 'var(--bg-2)' : 'transparent',
              transition: 'background 0.15s',
              cursor: 'pointer',
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }}></span>
            <div style={{ flex: 1, fontSize: 13 }}>{d.label}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontFeatureSettings: '"tnum"' }}>
              {Math.round((d.value / sum) * 100)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =========================================================
// HBarChart
// =========================================================
export function HBarChart({ data, color = '#2348C4' }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{d.label}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontFeatureSettings: '"tnum"' }}>
              {formatMoney(d.value)}
            </span>
          </div>
          <div style={{ height: 8, background: 'var(--bg-2)', borderRadius: 999, overflow: 'hidden' }}>
            <div className="ch-bar-h" style={{ width: `${(d.value / max) * 100}%`, height: '100%', background: color, borderRadius: 999, animationDelay: `${i * 0.08}s` }}></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// =========================================================
// Sparkline
// =========================================================
export function Sparkline({ data, color = '#2348C4', width = 80, height = 28 }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const step = width / (data.length - 1);
  const pts = data
    .map((v, i) => `${i * step},${height - ((v - min) / (max - min || 1)) * height}`)
    .join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// =========================================================
// StackedBars — interactive stacked bar chart (BI widgets)
// data: [{ label, values: { [key]: number } }]
// series: [{ key, label, color }]
// =========================================================
export function StackedBars({ data, series, height = 210, format = (v) => v }) {
  const containerRef = useRef(null);
  const [hover, setHover] = useState(null);
  const [w, setW] = useState(480);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0].contentRect.width;
      if (cw > 0) setW(cw);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const padding = { top: 14, right: 12, bottom: 30, left: 46 };
  const innerW = w - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const totals = data.map((d) => series.reduce((s, se) => s + (d.values[se.key] || 0), 0));
  const max = Math.max(1, ...totals) * 1.12;
  const slot = innerW / (data.length || 1);
  const barW = Math.min(40, slot * 0.58);
  const yTicks = [0, 0.5, 1].map((t) => ({ y: padding.top + innerH - t * innerH, label: format(Math.round(t * max)) }));

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <svg className="chart-svg" width={w} height={height}>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={padding.left} y1={t.y} x2={w - padding.right} y2={t.y} stroke="#EEF0F3" />
            <text x={padding.left - 8} y={t.y + 4} textAnchor="end" fontSize="10" fill="#8A95A0">{t.label}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = padding.left + slot * i + slot / 2;
          const x = cx - barW / 2;
          const isDim = hover != null && hover !== i;
          let yCursor = padding.top + innerH;
          const lastNonZero = [...series].reverse().find((se) => (d.values[se.key] || 0) > 0)?.key;
          return (
            <g key={i}>
              <g className="ch-bar" style={{ animationDelay: `${i * 0.06}s` }}>
                {series.map((se) => {
                  const v = d.values[se.key] || 0;
                  const h = (v / max) * innerH;
                  yCursor -= h;
                  return (
                    <rect key={se.key} x={x} y={yCursor} width={barW} height={Math.max(0, h)}
                      rx={se.key === lastNonZero ? 5 : 0} fill={se.color}
                      opacity={isDim ? 0.45 : 1} style={{ transition: 'opacity 0.15s' }} />
                  );
                })}
              </g>
              <rect x={padding.left + slot * i} y={padding.top} width={slot} height={innerH} fill="transparent"
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }} />
              <text x={cx} y={height - 10} textAnchor="middle" fontSize="11" fill="#66727D" fontWeight="500">{d.label}</text>
            </g>
          );
        })}
      </svg>
      {hover != null && (() => {
        const d = data[hover];
        const cx = padding.left + slot * hover + slot / 2;
        const total = series.reduce((s, se) => s + (d.values[se.key] || 0), 0);
        return (
          <div className="chart-tooltip" style={{ left: Math.max(4, Math.min(cx - 75, w - 154)), top: 2, width: 150 }}>
            <div className="tt-label" style={{ marginBottom: 4 }}>{d.label}</div>
            {series.map((se) => (
              <div key={se.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, padding: '1px 0' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: se.color }} />{se.label}
                </span>
                <b>{format(d.values[se.key] || 0)}</b>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, paddingTop: 4, marginTop: 3, borderTop: '1px solid rgba(255,255,255,0.18)', opacity: 0.85 }}>
              <span>Total</span><b>{format(total)}</b>
            </div>
          </div>
        );
      })()}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 6 }}>
        {series.map((se) => (
          <span key={se.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: se.color }} />{se.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export { formatMoney };
