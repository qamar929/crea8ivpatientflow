import { useEffect, useState } from 'react';
import { Edit2, Loader2, Megaphone, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchApi } from '../config/api';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';

const emptyForm = { name: '', type: 'whatsapp', trigger: 'manual', subject: '', body: '', status: 'draft' };

export default function Marketing() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [enabled, setEnabled] = useState(true);
  const [lockMessage, setLockMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/campaigns');
      if (Array.isArray(data)) {
        setCampaigns(data);
        setEnabled(true);
        setLockMessage('');
      } else {
        setCampaigns(data.campaigns || []);
        setEnabled(data.enabled !== false);
        setLockMessage(data.message || '');
      }
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { setForm(editTarget ? { ...emptyForm, ...editTarget } : emptyForm); }, [editTarget, showForm]);

  const save = async () => {
    if (!enabled) return alert(lockMessage || 'Contact Support to activate Marketing Growth.');
    if (!form.name.trim()) return alert('Campaign name is required.');
    if (editTarget) await fetchApi(`/campaigns/${editTarget.id}`, { method: 'PUT', body: JSON.stringify(form) });
    else await fetchApi('/campaigns', { method: 'POST', body: JSON.stringify(form) });
    setShowForm(false); setEditTarget(null); await load();
  };

  const remove = async (campaign) => {
    if (!enabled) return alert(lockMessage || 'Contact Support to activate Marketing Growth.');
    if (!confirm(`Delete ${campaign.name}?`)) return;
    await fetchApi(`/campaigns/${campaign.id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-xl font-bold text-gray-900 dark:text-white">Marketing Campaigns</h1><p className="mt-1 text-sm text-gray-500">Live campaign CRUD. For WhatsApp automation use the engagement center.</p></div>
        <div className="flex gap-2"><Link to="/whatsapp"><Button variant="secondary" disabled={!enabled}><Megaphone className="h-4 w-4" /> WhatsApp Center</Button></Link><Button disabled={!enabled} onClick={() => { setEditTarget(null); setShowForm(true); }}><Plus className="h-4 w-4" /> New Campaign</Button></div>
      </div>
      {!enabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {lockMessage || 'Contact Support to activate Marketing Growth.'}
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        {loading ? <div className="flex justify-center gap-2 py-16 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>{['Name', 'Type', 'Trigger', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-50">
              {campaigns.map(c => <tr key={c.id}><td className="px-4 py-3 font-bold">{c.name}</td><td className="px-4 py-3">{c.type}</td><td className="px-4 py-3">{c.trigger}</td><td className="px-4 py-3"><Badge label={c.status} variant={c.status === 'completed' ? 'active' : 'pending'} /></td><td className="px-4 py-3"><div className="flex gap-1"><button disabled={!enabled} onClick={() => { setEditTarget(c); setShowForm(true); }} className="rounded-lg p-2 text-gray-400 hover:bg-teal-50 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-40"><Edit2 className="h-4 w-4" /></button><button disabled={!enabled} onClick={() => remove(c)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}
              {campaigns.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-sm text-gray-400">No campaigns yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditTarget(null); }} title={editTarget ? 'Edit Campaign' : 'New Campaign'} size="lg">
        <div className="space-y-4">
          <input className="premium-input w-full rounded-lg px-3 py-2 text-sm" placeholder="Campaign name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-3"><select className="premium-input rounded-lg px-3 py-2 text-sm" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select><input className="premium-input rounded-lg px-3 py-2 text-sm" placeholder="Trigger" value={form.trigger} onChange={e => setForm({ ...form, trigger: e.target.value })} /><select className="premium-input rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option>draft</option><option>active</option><option>paused</option></select></div>
          <input className="premium-input w-full rounded-lg px-3 py-2 text-sm" placeholder="Subject" value={form.subject || ''} onChange={e => setForm({ ...form, subject: e.target.value })} />
          <textarea className="premium-input w-full rounded-lg px-3 py-2 text-sm" rows={5} placeholder="Message body" value={form.body || ''} onChange={e => setForm({ ...form, body: e.target.value })} />
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={save}>Save</Button></div>
        </div>
      </Modal>
    </div>
  );
}
