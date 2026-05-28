// Reusable skeleton blocks for loading states.

export function Skeleton({ width = '100%', height = 16, radius = 6, style = {} }) {
  return (
    <div
      className="sk"
      style={{
        width,
        height,
        borderRadius: radius,
        background: 'linear-gradient(90deg, #EEF0F3 25%, #E5E8EC 50%, #EEF0F3 75%)',
        backgroundSize: '200% 100%',
        animation: 'sk-shimmer 1.4s linear infinite',
        ...style,
      }}
    />
  );
}

export function SkeletonRow({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '14px 12px' }}><Skeleton height={14} /></td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ rows = 5, cols = 6 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} cols={cols} />)}
    </tbody>
  );
}

export function SkeletonCard({ height = 120 }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <Skeleton height={12} width="40%" style={{ marginBottom: 12 }} />
      <Skeleton height={28} width="60%" style={{ marginBottom: 8 }} />
      <Skeleton height={12} width="80%" />
    </div>
  );
}
