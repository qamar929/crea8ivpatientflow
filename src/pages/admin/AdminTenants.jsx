import { useEffect, useState } from 'react';
import { Loader2, PlayCircle, PauseCircle, CalendarPlus, Globe, ShieldCheck } from 'lucide-react';

const DOMAIN_STATUS = {
  pending: 'text-amber-600',
  dns_verified: 'text-sky-600',
  awaiting_ssl: 'text-indigo-600',
  connected: 'text-emerald-600',
  failed: 'text-rose-600',
};
import { fetchApi } from '../../config/api';

const STATUS_STYLES = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  trial: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  grace: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  suspended: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  pending: 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400',
};

export default function AdminTenants() {
  const [tenants, setTenants] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = () => fetchApi('/admin/tenants').then(setTenants).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const run = async (id, fn) => {
    setBusy(id);
    setError('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const activate = (t) => {
    const cycle = window.prompt('Billing cycle: type "monthly" (PKR 30,000) or "annual" (PKR 240,000)', 'monthly');
    if (!cycle || !['monthly', 'annual'].includes(cycle)) return;
    run(t.id, () => fetchApi(`/admin/tenants/${t.id}/activate`, { method: 'POST', body: JSON.stringify({ billingCycle: cycle }) }));
  };

  const suspend = (t) => {
    const reason = window.prompt(`Suspend "${t.name}"? Enter a reason:`, 'Subscription unpaid');
    if (reason === null) return;
    run(t.id, () => fetchApi(`/admin/tenants/${t.id}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) }));
  };

  const extend = (t) => {
    const months = parseInt(window.prompt('Extend by how many months?', '1'), 10);
    if (!months || months < 1) return;
    run(t.id, () => fetchApi(`/admin/tenants/${t.id}/extend`, { method: 'POST', body: JSON.stringify({ months }) }));
  };

  const setDomain = (t) => {
    const customDomain = window.prompt(
      `White-label domain for "${t.name}" (e.g. portal.theirclinic.com). Leave blank to remove.`,
      t.customDomain || ''
    );
    if (customDomain === null) return;
    run(t.id, () => fetchApi(`/admin/tenants/${t.id}/domain`, { method: 'PUT', body: JSON.stringify({ customDomain }) }));
  };

  const markConnected = (t) => {
    if (!window.confirm(`Confirm SSL is issued for ${t.customDomain} and mark it Connected? The clinic's portal will go live on this domain.`)) return;
    run(t.id, () => fetchApi(`/admin/tenants/${t.id}/domain/ssl`, { method: 'PUT', body: JSON.stringify({ action: 'connect' }) }));
  };

  if (!tenants) {
    return <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading clinics...</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-950 dark:text-white">Clinics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Every tenant on the platform — activate, suspend, or extend.</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

      <div className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-white/5">
              <th className="px-4 py-3">Clinic</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Subscription ends</th>
              <th className="px-4 py-3">Users</th>
              <th className="px-4 py-3">Patients</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5">
            {tenants.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No clinics yet.</td></tr>
            )}
            {tenants.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3">
                  <p className="font-bold text-gray-900 dark:text-white">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.slug ? `${t.slug} · ` : ''}{t.clinicType}</p>
                  {t.customDomain && (
                    <p className="text-[11px] font-semibold mt-0.5 flex items-center gap-1">
                      <Globe className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-500">{t.customDomain}</span>
                      {t.domainStatus && t.domainStatus !== 'none' && (
                        <span className={DOMAIN_STATUS[t.domainStatus] || 'text-gray-400'}>· {t.domainStatus.replace('_', ' ')}</span>
                      )}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${STATUS_STYLES[t.status] || ''}`}>
                    {t.status}
                  </span>
                  {t.status === 'suspended' && t.suspensionReason && (
                    <p className="text-[10px] text-gray-400 mt-1 max-w-[180px] truncate">{t.suspensionReason}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {t.subscriptionExpiresAt ? String(t.subscriptionExpiresAt).slice(0, 10) : '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{t.userCount}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{t.patientCount}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    {busy === t.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    ) : (
                      <>
                        {(t.status === 'pending' || t.status === 'suspended' || t.status === 'grace') && (
                          <button onClick={() => activate(t)} title="Activate (new subscription)" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700">
                            <PlayCircle className="w-4 h-4" /> Activate
                          </button>
                        )}
                        {t.subscriptionExpiresAt && t.status !== 'pending' && (
                          <button onClick={() => extend(t)} title="Extend subscription" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700">
                            <CalendarPlus className="w-4 h-4" /> Extend
                          </button>
                        )}
                        {(t.status === 'active' || t.status === 'trial' || t.status === 'grace') && (
                          <button onClick={() => suspend(t)} title="Suspend access" className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700">
                            <PauseCircle className="w-4 h-4" /> Suspend
                          </button>
                        )}
                        <button onClick={() => setDomain(t)} title="Set white-label domain" className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-indigo-600">
                          <Globe className="w-4 h-4" /> Domain
                        </button>
                        {t.domainStatus === 'awaiting_ssl' && (
                          <button onClick={() => markConnected(t)} title="Mark SSL active / Connected" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700">
                            <ShieldCheck className="w-4 h-4" /> Activate SSL
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
