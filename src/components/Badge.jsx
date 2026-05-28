import { Icon } from './Icon.jsx';

export function Badge({ tone = 'muted', dot = false, children, icon }) {
  return (
    <span className={`badge badge-${tone} ${dot ? 'dot' : ''}`}>
      {icon && <Icon name={icon} size={11} />}
      {children}
    </span>
  );
}
