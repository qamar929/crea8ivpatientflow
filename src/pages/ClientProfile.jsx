import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, CreditCard, Loader2, Mail, MessageCircle, Phone, UserRound, FileText, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { fetchApi, API_URL } from '../config/api';

const FILE_BASE = API_URL.replace(/\/api\/v1\/?$/, '');
const fileUrl = (u) => (u && u.startsWith('http') ? u : FILE_BASE + u);

function PatientDocuments({ clientId }) {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = () => fetchApi(`/gallery/${clientId}`).then(setItems).catch((e) => setErr(e.message));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [clientId]);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true); setErr('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('type', 'document');
      fd.append('isPrivate', 'true');
      await fetchApi(`/gallery/${clientId}`, { method: 'POST', body: fd });
      load();
    } catch (e2) { setErr(e2.message || 'Upload failed'); } finally { setBusy(false); }
  };

  const del = async (item) => {
    if (!window.confirm('Delete this file?')) return;
    try { await fetchApi(`/gallery/${item.id}`, { method: 'DELETE' }); load(); }
    catch (e2) { setErr(e2.message); }
  };

  const isPdf = (u) => String(u || '').toLowerCase().endsWith('.pdf');

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-gray-950 dark:text-white">Documents &amp; Files</h3>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload
          <input type="file" accept=".pdf,image/*" className="hidden" onChange={onPick} disabled={busy} />
        </label>
      </div>
      <p className="mt-1 text-[11px] text-gray-400">Consent forms, lab reports, prescriptions, x-rays (PDF or image, max 15 MB).</p>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
      {!items ? (
        <div className="py-6 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-gray-400" /></div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">No documents uploaded yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/5">
              <a href={fileUrl(item.imageUrl)} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-800 hover:text-indigo-600 dark:text-gray-100">
                {isPdf(item.imageUrl) ? <FileText className="h-4 w-4 shrink-0 text-rose-500" /> : <ImageIcon className="h-4 w-4 shrink-0 text-indigo-500" />}
                <span className="truncate">{item.service || item.notes || (isPdf(item.imageUrl) ? 'Document.pdf' : 'Image')}</span>
              </a>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-gray-400">{String(item.createdAt || '').slice(0, 10)}</span>
                <button onClick={() => del(item)} className="rounded p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

const money = (value) => `PKR ${Number(value || 0).toLocaleString()}`;

function InfoCard({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4">
      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{label}</p>
      <p className="mt-1 text-sm font-bold text-gray-950 dark:text-white">{value || '—'}</p>
    </div>
  );
}

const TP_STATUS = {
  planned: { label: 'Planned', cls: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300' },
  in_progress: { label: 'In progress', cls: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-100 text-rose-700' },
};

function TreatmentPlan({ clientId }) {
  const [items, setItems] = useState(null);
  const [form, setForm] = useState({ procedure: '', tooth: '', cost: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => fetchApi(`/clients/${clientId}/treatment-plan`).then(setItems).catch((e) => setErr(e.message));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [clientId]);

  const add = async () => {
    if (!form.procedure.trim()) return;
    setBusy(true); setErr('');
    try {
      await fetchApi(`/clients/${clientId}/treatment-plan`, { method: 'POST', body: JSON.stringify({ procedure: form.procedure, tooth: form.tooth, cost: Number(form.cost) || 0 }) });
      setForm({ procedure: '', tooth: '', cost: '' }); load();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const setStatus = async (item, status) => { try { await fetchApi(`/treatment-plan/${item.id}`, { method: 'PUT', body: JSON.stringify({ status }) }); load(); } catch (e) { setErr(e.message); } };
  const del = async (item) => { if (!window.confirm('Remove this treatment?')) return; try { await fetchApi(`/treatment-plan/${item.id}`, { method: 'DELETE' }); load(); } catch (e) { setErr(e.message); } };

  const total = (items || []).filter((i) => i.status !== 'cancelled').reduce((s, i) => s + Number(i.cost || 0), 0);
  const fld = 'rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-1.5 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300';

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-gray-950 dark:text-white">Treatment Plan</h3>
        {total > 0 && <span className="text-xs font-bold text-gray-500">Plan total: {money(total)}</span>}
      </div>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}

      {!items ? (
        <div className="py-6 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-gray-400" /></div>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((it) => (
            <div key={it.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{it.procedure}{it.tooth ? <span className="text-gray-400 font-normal"> · tooth {it.tooth}</span> : null}</p>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{money(it.cost)}</span>
              <select value={it.status} onChange={(e) => setStatus(it, e.target.value)} className={`${fld} text-xs`}>
                {Object.entries(TP_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <button onClick={() => del(it)} className="rounded p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {items.length === 0 && <p className="py-4 text-center text-sm text-gray-400">No treatments planned yet.</p>}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 dark:border-white/10">
        <input className={`${fld} flex-1 min-w-[140px]`} placeholder="Procedure (e.g. Root canal)" value={form.procedure} onChange={(e) => setForm({ ...form, procedure: e.target.value })} />
        <input className={`${fld} w-24`} placeholder="Tooth" value={form.tooth} onChange={(e) => setForm({ ...form, tooth: e.target.value })} />
        <input className={`${fld} w-28`} type="number" placeholder="Cost" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
        <Button size="sm" onClick={add} disabled={busy || !form.procedure.trim()}>Add</Button>
      </div>
    </div>
  );
}

export default function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchApi(`/clients/${id}`),
      fetchApi(`/clients/${id}/appointments`).catch(() => []),
    ]).then(([clientData, appointmentData]) => {
      if (!alive) return;
      setClient(clientData);
      setAppointments(Array.isArray(appointmentData) ? appointmentData : []);
    }).catch((err) => setError(err.message)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id]);

  const totals = useMemo(() => ({
    visits: appointments.length,
    upcoming: appointments.filter((a) => a.status !== 'cancelled' && a.status !== 'completed' && a.date >= new Date().toISOString().slice(0, 10)).length,
    completed: appointments.filter((a) => a.status === 'completed').length,
  }), [appointments]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;
  if (error || !client) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm font-semibold text-gray-500">{error || 'Patient not found'}</p>
        <Button className="mt-4" onClick={() => navigate('/clients')}>Back to Patients</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button onClick={() => navigate('/clients')} className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Back to Patients
        </button>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate(`/whatsapp?client=${client.id}`)}>
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </Button>
          <Button size="sm" onClick={() => navigate('/appointments')}>
            <Calendar className="h-4 w-4" /> Book Appointment
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-black text-white" style={{ background: client.avatarColor || '#0f766e' }}>
                {client.initials || client.name?.slice(0, 2)?.toUpperCase()}
              </div>
              <h2 className="mt-3 text-lg font-black text-gray-950 dark:text-white">{client.name}</h2>
              <p className="text-xs text-gray-400">{client.patientNo || 'No patient number'}</p>
              <div className="mt-3 flex justify-center">{client.status && <Badge label={client.status} variant={client.status} />}</div>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><Phone className="h-4 w-4 text-gray-400" /> {client.phone || 'No phone'}</p>
              <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><Mail className="h-4 w-4 text-gray-400" /> {client.email || 'No email'}</p>
              <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><UserRound className="h-4 w-4 text-gray-400" /> {client.gender || 'Not specified'}</p>
              <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><CreditCard className="h-4 w-4 text-gray-400" /> Due {money(client.outstandingBalance)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InfoCard label="Total Spent" value={money(client.totalSpent)} />
            <InfoCard label="Loyalty Tier" value={client.loyaltyTier} />
            <InfoCard label="Visits" value={totals.visits} />
            <InfoCard label="Upcoming" value={totals.upcoming} />
          </div>
        </aside>

        <main className="space-y-5">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
            <h3 className="text-sm font-black text-gray-950 dark:text-white">Appointment History</h3>
            <div className="mt-4 space-y-2">
              {appointments.map((appt) => (
                <div key={appt.id} className="flex flex-col gap-2 rounded-xl bg-gray-50 p-3 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-950 dark:text-white">{appt.service?.name || appt.serviceName || 'Appointment'}</p>
                    <p className="text-xs text-gray-500">{appt.date} · {appt.startTime} · {appt.staff?.name || appt.staffName || 'Staff'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {appt.status && <Badge label={appt.status} variant={appt.status} />}
                    <span className="text-xs font-black text-gray-950 dark:text-white">{money(appt.price)}</span>
                  </div>
                </div>
              ))}
              {appointments.length === 0 && <p className="py-8 text-center text-sm text-gray-400">No appointments yet.</p>}
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
            <h3 className="text-sm font-black text-gray-950 dark:text-white">Clinical Notes</h3>
            <p className="mt-2 text-sm text-gray-500">{client.notes || 'No clinical notes recorded yet.'}</p>
          </div>

          <TreatmentPlan clientId={client.id} />

          <PatientDocuments clientId={client.id} />
        </main>
      </div>
    </div>
  );
}
