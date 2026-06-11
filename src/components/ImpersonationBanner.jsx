import { ShieldAlert, LogOut } from 'lucide-react';
import { isImpersonating, impersonatingClinicName, exitImpersonation } from '../config/impersonation';

// Sticky banner shown across the clinic portal whenever a superadmin is
// "managing" a clinic. Makes the borrowed session obvious and offers a
// one-click return to the platform admin.
export default function ImpersonationBanner() {
  if (!isImpersonating()) return null;
  const name = impersonatingClinicName();

  const exit = () => {
    exitImpersonation();
    // Full reload so every provider/store re-reads the restored superadmin
    // session cleanly, then land back on the clinics list.
    window.location.assign(import.meta.env.BASE_URL + 'admin/tenants');
  };

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-amber-500 text-amber-950 text-sm font-semibold shadow-sm">
      <span className="flex items-center gap-2 min-w-0">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span className="truncate">
          Managing <b>{name}</b> as superadmin — changes you make here affect this clinic.
        </span>
      </span>
      <button
        onClick={exit}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950/90 hover:bg-amber-950 text-amber-50 text-xs font-bold shrink-0 transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" /> Exit to admin
      </button>
    </div>
  );
}
