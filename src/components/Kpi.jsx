import { Icon } from './Icon.jsx';
import { CountUp } from './CountUp.jsx';

// Shared KPI tile for the dashboards. Numeric values animate (count-up); while
// loading it shows a shimmer skeleton. `format` maps the animated number to a
// display string (e.g. money). String values (names) render as-is.
export function Kpi({ icon, label, value, format, loading = false, trend, trendLabel, sub }) {
  const isNum = typeof value === 'number' && Number.isFinite(value);
  return (
    <div className="kpi">
      <div className="kpi-label"><Icon name={icon} /> {label}</div>
      <div className="kpi-value">
        {loading
          ? <span className="skeleton skeleton-kpi" aria-hidden="true" />
          : isNum
            ? <CountUp value={value} format={format || ((n) => String(Math.round(n)))} />
            : (value ?? '—')}
      </div>
      {!loading && (trend != null || trendLabel || sub) && (
        <div className="kpi-meta">
          {trend != null && (
            <span className={`kpi-trend ${trend >= 0 ? 'up' : 'down'}`}>
              <Icon name={trend >= 0 ? 'arrowUp' : 'arrowDown'} size={10} /> {trend >= 0 ? '+' : ''}{trend}%
            </span>
          )}
          {trendLabel && <span>{trendLabel}</span>}
          {sub && (typeof sub === 'string' ? <span className="muted">{sub}</span> : sub)}
        </div>
      )}
    </div>
  );
}

// Shimmer block to stand in for a chart while its data loads.
export function ChartSkeleton({ height = 220 }) {
  return <div className="skeleton" style={{ height, borderRadius: 12 }} aria-hidden="true" />;
}
