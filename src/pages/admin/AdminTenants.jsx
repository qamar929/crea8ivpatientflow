import { useEffect, useState } from 'react';
import { Loader2, PlayCircle, PauseCircle, CalendarPlus, Globe, ShieldCheck, Plus, Pencil, Trash2 } from 'lucide-react';
import { fetchApi } from '../../config/api';
import Modal from '../../components/ui/Modal';
import ColorPicker from '../../components/ui/ColorPicker';

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

export default function AdminTenants() {
  const [tenants, setTenants] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editTenant, setEditTenant] = useState(null);
  const [deleteTenant, setDeleteTenant] = useState(null);

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
    if (!window.confirm(`Confirm SSL is issued for ${t.customDomain} and mark it Connected? The clinic's portal will go live on this domain.`)) return;
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
            {tenants.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No clinics yet. Click “New Clinic” to add one.</td></tr>
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
                  <div className="flex items-center justify-end gap-3 flex-wrap">
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
                        {t.domainStatus === 'awaiting_ssl' && (
                          <button onClick={() => markConnected(t)} title="Mark SSL active / Connected" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700">
                            <ShieldCheck className="w-4 h-4" /> Activate SSL
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
