import { useEffect, useState } from 'react';
import { Loader2, Plus, X, Send, ArrowLeft, MessageSquare, LifeBuoy } from 'lucide-react';
import { fetchApi } from '../config/api';

const STATUS_STYLES = {
  open: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  in_progress: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  waiting: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  closed: 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400',
};

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40';

export default function Support() {
  const [tickets, setTickets] = useState(null);
  const [active, setActive] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ subject: '', priority: 'normal', message: '' });
  const [reply, setReply] = useState('');

  const load = () => fetchApi('/support/tickets').then(setTickets).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const openTicket = async (id) => {
    setError('');
    try { setActive(await fetchApi(`/support/tickets/${id}`)); }
    catch (e) { setError(e.message); }
  };

  const createTicket = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetchApi('/support/tickets', { method: 'POST', body: JSON.stringify(form) });
      setForm({ subject: '', priority: 'normal', message: '' });
      setShowNew(false);
      await load();
      await openTicket(res.id);
    } catch (e2) { setError(e2.message); } finally { setBusy(false); }
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await fetchApi(`/support/tickets/${active.id}/reply`, { method: 'POST', body: JSON.stringify({ message: reply }) });
      setReply('');
      await openTicket(active.id);
    } catch (e2) { setError(e2.message); } finally { setBusy(false); }
  };

  if (!tickets) {
    return <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading support...</div>;
  }

  // Thread view
  if (active) {
    return (
      <div className="space-y-5 max-w-3xl">
        <button onClick={() => { setActive(null); load(); }} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:opacity-80">
          <ArrowLeft className="w-4 h-4" /> Back to tickets
        </button>
        <div className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-black text-gray-950 dark:text-white">{active.subject}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{active.priority} priority</p>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${STATUS_STYLES[active.status]}`}>{active.status.replace('_',' ')}</span>
          </div>
          <div className="mt-5 space-y-3">
            {active.messages.map((m) => (
              <div key={m.id} className={`flex ${m.senderType === 'clinic' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.senderType === 'clinic'
                    ? 'bg-[var(--primary)] text-white rounded-br-sm'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-bl-sm'
                }`}>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className={`text-[10px] mt-1 ${m.senderType === 'clinic' ? 'text-white/70' : 'text-gray-400'}`}>
                    {m.senderType === 'clinic' ? 'You' : 'Support'} · {String(m.createdAt).slice(0, 16).replace('T', ' ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {active.status !== 'closed' && (
            <form onSubmit={sendReply} className="mt-5 flex gap-2">
              <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply..." className={inputCls} />
              <button disabled={busy} className="inline-flex items-center gap-2 bg-[var(--primary)] hover:opacity-90 disabled:opacity-60 text-white text-sm font-bold px-5 rounded-xl">
                <Send className="w-4 h-4" /> Send
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-950 dark:text-white">Support</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Message the Crea8iv PatientFlow team. We reply here and on WhatsApp.</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="inline-flex items-center gap-2 bg-[var(--primary)] hover:opacity-90 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg">
          {showNew ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showNew ? 'Cancel' : 'New Ticket'}
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

      {showNew && (
        <form onSubmit={createTicket} className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input required placeholder="Subject *" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={`${inputCls} sm:col-span-2`} />
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputCls}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <textarea required rows={4} placeholder="Describe your issue or question..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={inputCls} />
          <button disabled={busy} className="inline-flex items-center gap-2 bg-[var(--primary)] hover:opacity-90 disabled:opacity-60 text-white text-sm font-bold px-5 py-2.5 rounded-xl">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Submit Ticket
          </button>
        </form>
      )}

      <div className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] divide-y divide-gray-100 dark:divide-white/5">
        {tickets.length === 0 && (
          <div className="px-4 py-12 text-center">
            <LifeBuoy className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No tickets yet. Open one and our team will get back to you.</p>
          </div>
        )}
        {tickets.map((t) => (
          <button key={t.id} onClick={() => openTicket(t.id)} className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-400 shrink-0" />
                <p className="font-bold text-gray-900 dark:text-white truncate">{t.subject}</p>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{t.lastMessage}</p>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${STATUS_STYLES[t.status]}`}>{t.status.replace('_',' ')}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
