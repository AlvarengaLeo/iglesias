import { useEb } from '../contexts/EbContext.jsx';

// Matriz de permisos del staff interno de EB Connect (espejo de useRole del CRM).
// Roles: super_admin, sales, support, billing, tech, viewer.
const PERMISSIONS = {
  'churches.view':    ['super_admin', 'sales', 'support', 'billing', 'tech', 'viewer'],
  'churches.edit':    ['super_admin', 'support'],
  'churches.suspend': ['super_admin'],
  'church.raw_data':  ['super_admin'],
  'leads.view':       ['super_admin', 'sales', 'viewer'],
  'leads.write':      ['super_admin', 'sales'],
  'leads.convert':    ['super_admin', 'sales'],
  'billing.view':     ['super_admin', 'billing', 'viewer'],
  'billing.manage':   ['super_admin', 'billing'],
  'support.view':     ['super_admin', 'support', 'viewer'],
  'support.manage':   ['super_admin', 'support'],
  'staff.manage':     ['super_admin'],
  'config.manage':    ['super_admin', 'tech'],
  'audit.view':       ['super_admin', 'tech'],
};

export function useEbRole() {
  const { role } = useEb();
  const can = (action) => {
    const allowed = PERMISSIONS[action];
    if (!allowed) { console.warn(`useEbRole.can(): permiso desconocido "${action}"`); return false; }
    return !!(role && allowed.includes(role));
  };
  return { role, can, isSuperAdmin: role === 'super_admin' };
}
