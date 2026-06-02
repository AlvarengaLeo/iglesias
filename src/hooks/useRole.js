import { useChurch } from '../contexts/ChurchContext.jsx';

// Matriz de permisos. Mantener sincronizada con DATABASE_DESIGN.md §6.3.
const PERMISSIONS = {
  'people.write':         ['admin', 'pastor', 'secretary'],
  'people.notes.private': ['admin', 'pastor'],
  'funds.write':          ['admin', 'treasurer'],
  'campaigns.write':      ['admin', 'pastor', 'treasurer', 'secretary'],
  'donations.create':     ['admin', 'pastor', 'treasurer'],
  'donations.edit':       ['admin', 'treasurer'],
  'recurring.write':      ['admin', 'pastor', 'treasurer'],
  'receipts.create':      ['admin', 'pastor', 'treasurer', 'secretary'],
  'receipts.resend':      ['admin', 'pastor', 'treasurer', 'secretary'],
  'portal.write':         ['admin', 'pastor', 'secretary'],
  'portal.publish':       ['admin', 'pastor', 'secretary'],
  'content.write':        ['admin', 'pastor', 'secretary'],
  'service_times.write':  ['admin', 'pastor', 'secretary'],
  'church.edit':          ['admin', 'pastor'],
  'users.manage':         ['admin'],
  'stripe.config':        ['admin', 'treasurer'],
  'reports.export':       ['admin', 'pastor', 'treasurer'],

  // Módulo Equipos (Teams). Solo UX; el límite real es RLS.
  'equipos.view':         ['admin', 'pastor', 'secretary', 'leader', 'servidor'],
  'services.write':       ['admin', 'pastor', 'secretary'],
  'teams.manage':         ['admin', 'pastor', 'secretary'],
  'teams.assign':         ['admin', 'pastor', 'secretary', 'leader'],
  'assignments.respond':  ['admin', 'pastor', 'secretary', 'leader', 'servidor'],
  'chat.use':             ['admin', 'pastor', 'secretary', 'leader', 'servidor'],
  'chat.moderate':        ['admin', 'pastor', 'leader'],
};

export function useRole() {
  const { role } = useChurch();

  const can = (action) => {
    const allowed = PERMISSIONS[action];
    if (!allowed) {
      console.warn(`useRole.can(): permiso desconocido "${action}"`);
      return false;
    }
    return role && allowed.includes(role);
  };

  const isAdmin = role === 'admin';
  const isPastor = role === 'pastor';
  const isTreasurer = role === 'treasurer';
  const isSecretary = role === 'secretary';
  const isLeader = role === 'leader';
  const isServidor = role === 'servidor';
  // "manager" = staff que gestiona Equipos (crea servicios/equipos/asigna).
  const isServingManager = ['admin', 'pastor', 'secretary'].includes(role);

  return { role, can, isAdmin, isPastor, isTreasurer, isSecretary, isLeader, isServidor, isServingManager };
}
