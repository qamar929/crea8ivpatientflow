// Superadmin "Manage clinic" (impersonation) session handling.
//
// The clinic portal is driven entirely by these localStorage keys:
//   clinic_auth / clinic_token / clinic_refresh / clinic_user
// To "step into" a clinic we stash the superadmin's own session under backup
// keys, swap in the clinic-owner session, and flag that we're impersonating.
// Exiting restores the stashed superadmin session.

const SESSION_KEYS = ['clinic_auth', 'clinic_token', 'clinic_refresh', 'clinic_user'];
const BACKUP_PREFIX = 'pf_admin_return__';
const FLAG_KEY = 'pf_impersonating'; // holds the clinic name while active

export function isImpersonating() {
  return !!localStorage.getItem(FLAG_KEY);
}

export function impersonatingClinicName() {
  return localStorage.getItem(FLAG_KEY) || '';
}

// Save the current (superadmin) session, then install the clinic session.
export function enterImpersonation({ accessToken, refreshToken, user, clinicName }) {
  // Don't nest: if already impersonating, keep the original superadmin backup.
  if (!isImpersonating()) {
    SESSION_KEYS.forEach((k) => {
      const v = localStorage.getItem(k);
      if (v !== null) localStorage.setItem(BACKUP_PREFIX + k, v);
    });
  }
  localStorage.setItem('clinic_auth', 'true');
  localStorage.setItem('clinic_token', accessToken);
  localStorage.setItem('clinic_refresh', refreshToken);
  localStorage.setItem('clinic_user', JSON.stringify(user));
  localStorage.setItem(FLAG_KEY, clinicName || 'clinic');
}

// Restore the superadmin session and drop the impersonation flag.
export function exitImpersonation() {
  SESSION_KEYS.forEach((k) => {
    const backupKey = BACKUP_PREFIX + k;
    const v = localStorage.getItem(backupKey);
    if (v !== null) {
      localStorage.setItem(k, v);
      localStorage.removeItem(backupKey);
    } else {
      localStorage.removeItem(k);
    }
  });
  localStorage.removeItem(FLAG_KEY);
}
