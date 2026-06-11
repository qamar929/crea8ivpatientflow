import { useEffect, useMemo, useState } from 'react';
import { Loader2, PlayCircle, PauseCircle, CalendarPlus, Globe, ShieldCheck, Plus, Pencil, Trash2, LogIn, Search, Copy, Check, X, Users as UsersIcon, Building2, CreditCard, Clock } from 'lucide-react';
import { fetchApi } from '../../config/api';
import Modal from '../../components/ui/Modal';
import ColorPicker from '../../components/ui/ColorPicker';
import { enterImpersonation } from '../../config/impersonation';

// Days until a date (negative = already past). Null-safe.
function daysLeft(date) {
  if (!date) return null;
  const ms = new Date(String(date).replace(' ', 'T')).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

// Small coloured pill summarising how long is left on a subscription.
function ExpiryBadge({ date, status }) {
  if (!date) return <span className="text-gray-400">—</span>;
  const d = daysLeft(date);
  const ymd = String(date).slice(0, 10);
  let tone = 'text-gray-500';
  let note = '';
  if (d < 0) { tone = 'text-rose-600 font-bold'; note = `expired ${Math.abs(d)}d ago`; }
  else if (d <= 7) { tone = 'text-rose-600 font-bold'; note = `${d}d left`; }
  else if (d <= 30) { tone = 'text-amber-600 font-semibold'; note = `${d}d left`; }
  else { note = `${d}d left`; }
  return (
    <span className="whitespace-nowrap">
      <span className="text-gray-600 dark:text-gray-300">{ymd}</span>
      <span className={`block text-[11px] ${tone}`}>{note}</span>
    </span>
  );
}

const DOMAIN_STATUS = {
  pending: 'text-amber-600',
  dns_verified: 'text-sky-600',
  awaiting_ssl: 'text-indigo-600',
  connected: 'text-emerald-600',
  failed: 'text-rose-600',
};

const STATUS_STYLES = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  trial: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  grace: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  suspended: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  pending: 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400',
};

const CLINIC_TYPES = ['dental', 'aesthetic', 'general', 'clinic', 'spa', 'salon'];

const field = 'w-full border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-900 dark:text-gray-100';
const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'trial', label: 'Trial' },
  { key: 'grace', label: 'Grace' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'pending', label: 'Pending' },
  { key: 'expiring', label: 'Expiring ≤30d' },
];

export default function AdminTenants() {
  const [tenants, setTenants] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editTenant, setEditTenant] = useState(null);
  const [deleteTenant, setDeleteTenant] = useState(null);
  const [drawerId, setDrawerId] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [copiedId, setCopiedId] = useState('');

  const load = () => fetchApi('/admin/tenants').then(setTenants).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c = { all: tenants?.length || 0, expiring: 0 };
    (tenants || []).forEach((t) => {
      c[t.status] = (c[t.status] || 0) + 1;
      const d = daysLeft(t.subscriptionExpiresAt);
      if (d !== null && d >= 0 && d <= 30) c.expiring += 1;
    });
    return c;
  }, [tenants]);

  const filtered = useMemo(() => {
    let list = tenants || [];
    if (filter === 'expiring') {
      list = list.filter((t) => { const d = daysLeft(t.subscriptionExpiresAt); return d !== null && d >= 0 && d <= 30; });
    } else if (filter !== 'all') {
      list = list.filter((t) => t.status === filter);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((t) =>
        [t.name, t.slug, t.customDomain, t.clinicType].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
      );
    }
    return list;
  }, [tenants, filter, query]);

  const manage = (t) => {
    if (!window.confirm(`Open ${t.name}'s portal as superadmin?\n\nYou'll be signed in as its owner to manage staff, services, branding and settings. A banner lets you exit back to admin anytime.`)) return;
    run(t.id, async () => {
      const res = await fetchApi(`/admin/tenants/${t.id}/impersonate`, { method: 'POST' });
      enterImpersonation({ accessToken: res.accessToken, refreshToken: res.refreshToken, user: res.user, clinicName: res.clinic?.name || t.name });
      window.location.assign(import.meta.env.BASE_URL + 'dashboard');
    });
  };

  const copyLoginLink = async (t) => {
    const base = t.customDomain ? `https://${t.customDomain}` : (window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, ''));
    const url = `${base}/login`;
    try { await navigator.clipboard.writeText(url); setCopiedId(t.id); setTimeout(() => setCopiedId(''), 1500); }
    catch (_) { window.prompt('Copy this login link:', url); }
  };

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
    const reason = window.prompt(`Deactivate "${t.name}"? Enter a reason:`, 'Subscription unpaid');
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
    if (!window.confirm(`Mark ${t.customDomain} as connected?\n\nOnly do this AFTER you have:\n1. Pointed its DNS to the server\n2. Issued an SSL certificate in hosting\n3. Deployed the portal to its folder\n\nThis flips the platform record to "connected".`)) return;
    run(t.id, () => fetchApi(`/admin/tenants/${t.id}/domain/ssl`, { method: 'PUT', body: JSON.stringify({ action: 'connect' }) }));
  };

  if (!tenants) {
    return <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading clinics...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-950 dark:text-white">Clinics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create, edit, activate, deactivate, or remove any tenant on the platform.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> New Clinic
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

      {/* Search + status filter tabs */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            data-global-search
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clinics by name, domain, type…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filter === f.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'}`}
            >
              {f.label}{counts[f.key] ? <span className="ml-1 opacity-70">{counts[f.key]}</span> : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
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
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">{tenants.length === 0 ? 'No clinics yet. Click “New Clinic” to add one.' : 'No clinics match this filter.'}</td></tr>
            )}
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <button onClick={() => setDrawerId(t.id)} className="text-left group">
                    <p className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 group-hover:underline">{t.name}</p>
                  </button>
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
                <td className="px-4 py-3">
                  <ExpiryBadge date={t.subscriptionExpiresAt} status={t.status} />
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{t.userCount}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{t.patientCount}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3 flex-wrap">
                    {busy === t.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    ) : (
                      <>
                        <button onClick={() => manage(t)} title="Sign in to this clinic's portal as superadmin" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700">
                          <LogIn className="w-4 h-4" /> Manage
                        </button>
                        <button onClick={() => copyLoginLink(t)} title="Copy this clinic's login link" className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-indigo-600">
                          {copiedId === t.id ? <><Check className="w-4 h-4 text-emerald-600" /> Copied</> : <><Copy className="w-4 h-4" /> Link</>}
                        </button>
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
                          <button onClick={() => suspend(t)} title="Deactivate access" className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700">
                            <PauseCircle className="w-4 h-4" /> Deactivate
                          </button>
                        )}
                        <button onClick={() => setEditTenant(t)} title="Edit clinic details" className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-indigo-600">
                          <Pencil className="w-4 h-4" /> Edit
                        </button>
                        <button onClick={() => setDomain(t)} title="Set white-label domain" className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-indigo-600">
                          <Globe className="w-4 h-4" /> Domain
                        </button>
                        {t.customDomain && t.domainStatus && !['none', 'connected'].includes(t.domainStatus) && (
                          <button onClick={() => markConnected(t)} title="Mark domain live/connected (after its DNS + SSL are set up in hosting)" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700">
                            <ShieldCheck className="w-4 h-4" /> Activate Domain
                          </button>
                        )}
                        <button onClick={() => setDeleteTenant(t)} title="Delete clinic permanently" className="inline-flex items-center gap-1 text-xs font-bold text-rose-500 hover:text-rose-700">
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateClinicModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
      {editTenant && (
        <EditClinicModal
          tenant={editTenant}
          onClose={() => setEditTenant(null)}
          onSaved={() => { setEditTenant(null); load(); }}
        />
      )}
      {deleteTenant && (
        <DeleteClinicModal
          tenant={deleteTenant}
          onClose={() => setDeleteTenant(null)}
          onDeleted={() => { setDeleteTenant(null); load(); }}
        />
      )}
      {drawerId && (
        <TenantDrawer
          id={drawerId}
          onClose={() => setDrawerId(null)}
          onManage={(t) => { setDrawerId(null); manage(t); }}
          onEdit={(t) => { setDrawerId(null); setEditTenant(t); }}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Slide-over detail panel: owner(s), domain/SSL, subscription, usage counts.
function TenantDrawer({ id, onClose, onManage, onEdit }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setData(null); setErr('');
    fetchApi(`/admin/tenants/${id}`).then(setData).catch((e) => setErr(e.message));
  }, [id]);

  const owner = data?.users?.find((u) => u.role === 'owner') || data?.users?.[0];
  const expiry = data?.subscriptions?.find((s) => s.status === 'active')?.expiresAt;

  const Row = ({ label, children }) => (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 dark:border-white/5 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 dark:text-gray-100 text-right break-words">{children}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-white/10">
          <h2 className="text-lg font-black text-gray-900 dark:text-white truncate">{data?.name || 'Clinic'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500"><X className="w-5 h-5" /></button>
        </div>

        {err && <div className="m-5 rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}
        {!data && !err && <div className="flex items-center justify-center gap-2 py-20 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}

        {data && (
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: UsersIcon, label: 'Patients', value: data.patientCount ?? (data.clients ?? '—') },
                { icon: Building2, label: 'Users', value: data.users?.length ?? '—' },
                { icon: CreditCard, label: 'Status', value: data.status },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-gray-200/70 dark:border-white/10 p-3 text-center">
                  <s.icon className="w-4 h-4 mx-auto text-indigo-500" />
                  <p className="text-sm font-black text-gray-900 dark:text-white mt-1 capitalize">{s.value}</p>
                  <p className="text-[11px] text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>

            <section className="rounded-xl border border-gray-200/70 dark:border-white/10 px-4 py-2">
              <Row label="Type">{data.clinicType || '—'}</Row>
              <Row label="Email">{data.email || '—'}</Row>
              <Row label="Phone">{data.phone || '—'}</Row>
              <Row label="Owner">{owner ? <>{owner.name}<span className="block text-xs text-gray-400">{owner.email}</span></> : 'No owner'}</Row>
              <Row label="Domain">{data.customDomain ? <>{data.customDomain}<span className="block text-xs text-gray-400">{data.domainStatus} · SSL {data.sslStatus || 'n/a'}</span></> : 'Platform subdomain'}</Row>
              <Row label="Subscription">{expiry ? <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-gray-400" /><ExpiryBadge date={expiry} status={data.status} /></span> : '—'}</Row>
              <Row label="Created">{data.createdAt ? String(data.createdAt).slice(0, 10) : '—'}</Row>
            </section>

            {data.users?.length > 0 && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Team ({data.users.length})</h3>
                <div className="space-y-1">
                  {data.users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5">
                      <span className="text-gray-800 dark:text-gray-100">{u.name} <span className="text-xs text-gray-400">· {u.role}</span></span>
                      <span className="text-[11px] text-gray-400">{u.lastLogin ? `seen ${String(u.lastLogin).slice(0, 10)}` : 'never'}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => onManage({ id: data.id, name: data.name })} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold">
                <LogIn className="w-4 h-4" /> Manage clinic
              </button>
              <button onClick={() => onEdit(data)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5">
                <Pencil className="w-4 h-4" /> Edit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
function CreateClinicModal({ onClose, onCreated }) {
  const [f, setF] = useState({
    name: '', email: '', phone: '', clinicType: 'dental', address: '',
    status: 'trial', trialDays: 14, customDomain: '',
    primaryColor: '#0f766e', secondaryColor: '#14b8a6',
    ownerName: '', ownerEmail: '', ownerPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setErr(''); setSaving(true);
    try {
      const body = {
        name: f.name, email: f.email, phone: f.phone, clinicType: f.clinicType, address: f.address,
        status: f.status, trialDays: Number(f.trialDays) || 14,
        customDomain: f.customDomain, primaryColor: f.primaryColor, secondaryColor: f.secondaryColor,
        owner: { name: f.ownerName, email: f.ownerEmail || f.email, password: f.ownerPassword },
      };
      const res = await fetchApi('/admin/tenants', { method: 'POST', body: JSON.stringify(body) });
      window.alert(res.message || 'Clinic created.');
      onCreated();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="New Clinic" size="lg">
      <div className="space-y-5">
        {err && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}

        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Clinic details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><label className={labelCls}>Clinic name *</label><input className={field} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="The Smile Experts" /></div>
            <div><label className={labelCls}>Clinic email</label><input className={field} value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="hello@clinic.com" /></div>
            <div><label className={labelCls}>Phone</label><input className={field} value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+92 300 ..." /></div>
            <div><label className={labelCls}>Type</label>
              <select className={field} value={f.clinicType} onChange={(e) => set('clinicType', e.target.value)}>
                {CLINIC_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Custom domain (optional)</label><input className={field} value={f.customDomain} onChange={(e) => set('customDomain', e.target.value)} placeholder="portal.clinic.com" /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Address</label><input className={field} value={f.address} onChange={(e) => set('address', e.target.value)} /></div>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Initial owner account</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>Owner name</label><input className={field} value={f.ownerName} onChange={(e) => set('ownerName', e.target.value)} placeholder="Dr. Name" /></div>
            <div><label className={labelCls}>Owner login email *</label><input className={field} value={f.ownerEmail} onChange={(e) => set('ownerEmail', e.target.value)} placeholder="owner@clinic.com" /></div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Initial password</label>
              <input className={field} type="text" value={f.ownerPassword} onChange={(e) => set('ownerPassword', e.target.value)} placeholder="Leave blank to email a set-password invite" />
              <p className="text-[11px] text-gray-400 mt-1">Set a password so the owner can log in immediately (min 8 chars), or leave blank to email them a secure set-password link.</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Activation & branding</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>Initial status</label>
              <select className={field} value={f.status} onChange={(e) => set('status', e.target.value)}>
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            {f.status === 'trial' && (
              <div><label className={labelCls}>Trial days</label><input className={field} type="number" min="1" value={f.trialDays} onChange={(e) => set('trialDays', e.target.value)} /></div>
            )}
          </div>
          <ColorPicker label="Primary color" value={f.primaryColor} onChange={(v) => set('primaryColor', v)} />
          <ColorPicker label="Accent color" value={f.secondaryColor} onChange={(v) => set('secondaryColor', v)} />
        </section>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:hover:bg-white/10">Cancel</button>
          <button onClick={submit} disabled={saving || !f.name || !(f.ownerEmail || f.email)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create clinic
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ----------------------------------------------------------------------
function EditClinicModal({ tenant, onClose, onSaved }) {
  const [f, setF] = useState({
    name: tenant.name || '', email: tenant.email || '', phone: tenant.phone || '',
    clinicType: tenant.clinicType || 'dental', address: tenant.address || '',
    primaryColor: tenant.primaryColor || '#0f766e', secondaryColor: tenant.secondaryColor || '#14b8a6',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setErr(''); setSaving(true);
    try {
      await fetchApi(`/admin/tenants/${tenant.id}`, { method: 'PUT', body: JSON.stringify(f) });
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Edit — ${tenant.name}`} size="lg">
      <div className="space-y-5">
        {err && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2"><label className={labelCls}>Clinic name</label><input className={field} value={f.name} onChange={(e) => set('name', e.target.value)} /></div>
          <div><label className={labelCls}>Clinic email</label><input className={field} value={f.email} onChange={(e) => set('email', e.target.value)} /></div>
          <div><label className={labelCls}>Phone</label><input className={field} value={f.phone} onChange={(e) => set('phone', e.target.value)} /></div>
          <div><label className={labelCls}>Type</label>
            <select className={field} value={f.clinicType} onChange={(e) => set('clinicType', e.target.value)}>
              {CLINIC_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2"><label className={labelCls}>Address</label><input className={field} value={f.address} onChange={(e) => set('address', e.target.value)} /></div>
        </div>
        <ColorPicker label="Primary color" value={f.primaryColor} onChange={(v) => set('primaryColor', v)} />
        <ColorPicker label="Accent color" value={f.secondaryColor} onChange={(v) => set('secondaryColor', v)} />
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:hover:bg-white/10">Cancel</button>
          <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save changes
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ----------------------------------------------------------------------
function DeleteClinicModal({ tenant, onClose, onDeleted }) {
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr(''); setSaving(true);
    try {
      await fetchApi(`/admin/tenants/${tenant.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Delete clinic permanently" size="md">
      <div className="space-y-4">
        {err && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}
        <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-3 py-3 text-sm">
          This permanently deletes <b>{tenant.name}</b> and <b>all</b> of its data — patients, appointments, invoices, staff, and users. This cannot be undone.
        </div>
        <div>
          <label className={labelCls}>Type the clinic name to confirm</label>
          <input className={field} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={tenant.name} />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:hover:bg-white/10">Cancel</button>
          <button onClick={submit} disabled={saving || confirm !== tenant.name} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-bold">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Delete permanently
          </button>
        </div>
      </div>
    </Modal>
  );
}
