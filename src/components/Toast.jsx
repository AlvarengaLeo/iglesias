import { Icon } from './Icon.jsx';

export function Toast({ icon = 'check', title, sub, tone = 'success' }) {
  return (
    <div className={`toast ${tone}`}>
      <div className="toast-icon"><Icon name={icon} /></div>
      <div>
        <div className="title">{title}</div>
        {sub && <div className="sub">{sub}</div>}
      </div>
    </div>
  );
}
