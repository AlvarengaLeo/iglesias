import { useState, useRef, useEffect } from 'react';

// Charts del Backoffice — orientados a CONTEO (los de src/components/charts están
// cableados a formato $ para donaciones). Aquí el `format` es inyectable: por
// defecto entero; para ingresos se pasa money(cents). SVG ligero, hover + click.

const PALETTE = ['#8A6A4A', '#1F2B38', '#5E8B7E', '#C08552', '#9A8C98', '#4A6FA5', '#B5651D'];
const intFmt = (v) => Number(v || 0).toLocaleString('en-US');

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(560);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((e) => setW(e[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// ---- Vertical bars (crecimiento, ingresos) ----
export function EbBars({ data, height = 200, accent = '#8A6A4A', format = intFmt, onSelect }) {
  const [ref, w] = useWidth();
  const [hover, setHover] = useState(null);
  if (!data?.length) return <Empty />;
  const pad = { top: 16, right: 12, bottom: 30, left: 12 };
  const innerW = w - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(...data.map((d) => d.value), 1) * 1.15;
  const slot = innerW / data.length;
  const barW = Math.min(slot * 0.6, 54);
  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <svg width={w} height={height} className="chart-svg">
        {data.map((d, i) => {
          const h = (d.value / max) * innerH;
          const x = pad.left + slot * i + (slot - barW) / 2;
          const y = pad.top + innerH - h;
          const on = hover === i;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={Math.max(h, d.value > 0 ? 2 : 0)} rx="6"
                fill={on ? '#1F2B38' : accent} opacity={hover != null && !on ? 0.5 : 1}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                onClick={() => onSelect?.(i)} style={{ cursor: onSelect ? 'pointer' : 'default', transition: 'opacity .15s,fill .15s' }} />
              <text x={x + barW / 2} y={height - 12} textAnchor="middle" fontSize="11" fill="#66727D" fontWeight="500">{d.label}</text>
            </g>
          );
        })}
      </svg>
      {hover != null && (() => {
        const x = pad.left + slot * hover + slot / 2;
        return (
          <div className="chart-tooltip" style={{ left: Math.max(4, x - 60), top: 0 }}>
            <div className="tt-label">{data[hover].label}</div>
            <div className="tt-val">{format(data[hover].value)}</div>
          </div>
        );
      })()}
    </div>
  );
}

// ---- Donut (estados, planes) ----
export function EbDonut({ data, size = 168, format = intFmt, centerLabel = 'Total', onSelect }) {
  const [hover, setHover] = useState(null);
  const items = (data || []).filter((d) => d.value > 0).map((d, i) => ({ ...d, color: d.color || PALETTE[i % PALETTE.length] }));
  if (!items.length) return <Empty />;
  const r = size / 2, innerR = r * 0.62;
  const sum = items.reduce((s, d) => s + d.value, 0);
  let cum = 0;
  const polar = (a, rad) => [Math.cos((a - 0.25) * 2 * Math.PI) * rad + r, Math.sin((a - 0.25) * 2 * Math.PI) * rad + r];
  const arc = (s, e) => {
    const [x1, y1] = polar(s, r), [x2, y2] = polar(e, r), [x3, y3] = polar(e, innerR), [x4, y4] = polar(s, innerR);
    const large = e - s > 0.5 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${large} 0 ${x4} ${y4} Z`;
  };
  const slices = items.map((d) => { const s = cum / sum; cum += d.value; return { ...d, s, e: cum / sum }; });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, width: '100%', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size}>
          {slices.map((d, i) => (
            <path key={i} d={arc(d.s, d.e)} fill={d.color} opacity={hover != null && hover !== i ? 0.4 : 1}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              onClick={() => onSelect?.(items[i])} style={{ transition: 'opacity .15s', cursor: onSelect ? 'pointer' : 'default' }} />
          ))}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{hover != null ? items[hover].label : centerLabel}</div>
          <div style={{ fontSize: 19, fontWeight: 700 }}>{hover != null ? format(items[hover].value) : format(sum)}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 140 }}>
        {items.map((d, i) => (
          <div key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => onSelect?.(d)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 8px', borderRadius: 8, background: hover === i ? 'var(--bg-2)' : 'transparent', cursor: onSelect ? 'pointer' : 'default', transition: 'background .15s' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 13 }}>{d.label}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontFeatureSettings: '"tnum"' }}>{format(d.value)} · {Math.round((d.value / sum) * 100)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Horizontal bars (embudo, onboarding) ----
export function EbHBars({ data, color = '#8A6A4A', format = intFmt, onSelect }) {
  const items = data || [];
  if (!items.length) return <Empty />;
  const max = Math.max(...items.map((d) => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((d, i) => (
        <div key={i} onClick={() => onSelect?.(d)} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{d.label}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontFeatureSettings: '"tnum"' }}>{format(d.value)}</span>
          </div>
          <div style={{ height: 9, background: 'var(--bg-2)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: '100%', background: d.color || color, borderRadius: 999, transition: 'width .4s' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty() {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120, color: 'var(--muted)', fontSize: 13 }}>Sin datos en el período</div>;
}
