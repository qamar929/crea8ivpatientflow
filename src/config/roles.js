export const ROLES = {
  owner: 'owner',
  receptionist: 'receptionist',
  staff: 'staff',
};

export const ROLE_LABELS = {
  owner: 'Owner',
  receptionist: 'Receptionist',
  staff: 'Staff',
};

export const ROLE_ACCESS = {
  owner: [
    'dashboard',
    'reception',
    'appointments',
    'clients',
    'clinical',
    'staff',
    'services',
    'financials',
    'packages',
    'invoices',
    'inventory',
    'gallery',
    'feedback',
    'marketing',
    'whatsapp',
    'ai',
    'meta-leads',
    'imports',
    'reports',
    'branches',
    'audit',
    'support',
    'settings',
  ],
  receptionist: ['dashboard', 'reception', 'appointments', 'clients', 'invoices', 'packages', 'whatsapp', 'reports'],
  staff: ['dashboard', 'clinical', 'appointments', 'clients', 'gallery', 'feedback'],
};

export function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase();
  if (['owner', 'admin', 'administrator', 'superadmin', 'super_admin'].includes(value)) return ROLES.owner;
  if (['reception', 'receptionist', 'frontdesk', 'front-desk', 'front_desk'].includes(value)) return ROLES.receptionist;
  if (['staff', 'doctor', 'dentist', 'assistant', 'dental assistant', 'clinical'].includes(value)) return ROLES.staff;
  return ROLES.owner;
}

export function getCurrentUser() {
  const fallback = {
    name: 'Smile Expert Owner',
    email: 'owner@thesmileexpert.com',
    role: ROLES.owner,
  };
  try {
    const user = JSON.parse(localStorage.getItem('clinic_user') || 'null') || fallback;
    const normalizedRole = normalizeRole(user.role || user.userRole || user.type);
    return { ...fallback, ...user, role: normalizedRole };
  } catch (_) {
    return fallback;
  }
}

export function getCurrentRole() {
  return normalizeRole(getCurrentUser().role);
}

export function canAccessPath(pathname, role = getCurrentRole()) {
  const segment = pathname.split('/').filter(Boolean)[0] || 'dashboard';
  return ROLE_ACCESS[normalizeRole(role)]?.includes(segment) || false;
}

export function getRoleHome(role = getCurrentRole()) {
  return '/dashboard';
}

export function isOwner(role = getCurrentRole()) {
  return normalizeRole(role) === ROLES.owner;
}

export function isReceptionist(role = getCurrentRole()) {
  return normalizeRole(role) === ROLES.receptionist;
}

export function isStaff(role = getCurrentRole()) {
  return normalizeRole(role) === ROLES.staff;
}
