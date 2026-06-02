export function Placeholder({ title, fase }) {
  return (
    <div className="page">
      <div className="card card-pad" style={{ textAlign: 'center', padding: '56px 24px' }}>
        <h2 style={{ margin: '0 0 8px' }}>{title}</h2>
        <p style={{ color: 'var(--muted)', margin: 0 }}>Módulo en construcción — llega en {fase}.</p>
      </div>
    </div>
  );
}
