import { useEffect, useState } from 'react';
import { Loader2, MessageSquare, Send, ArrowLeft } from 'lucide-react';
import { fetchApi } from '../../config/api';

const STATUS_STYLES = {
  open: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  in_progress: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  waiting: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  closed: 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400',
};
const PRIORITY_STYLES = {
  urgent: 'text-rose-600',
  high: 'text-orange-600',
  normal: 'text-gray-400',
  low: 'text-gray-400',
};

export default function AdminSupport() {
  const [tickets, setTickets] = useState(null);
  const [active, setActive] = useState(null);
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => fetchApi('/admin/tickets').then(setTickets).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const openTicket = async (id) => {
    setError('');
    try {
      setActive(await fetchApi(`/admin/tickets/${id}`));
    } catch (e) { setError(e.message); }
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    setError('');
    try {
      await fetchApi(`/admin/tickets/${active.id}/reply`, { method: 'POST', body: JSON.stringify({ message: reply }) });
      setReply('');
      await openTicket(active.id);
      await load();
    } catch (e2) { setError(e2.message); } finally { setBusy(false); }
  };

  const setStatus = async (status) => {
    setBusy(true);
    try {
      await fetchApi(`/admin/tickets/${active.id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      await openTicket(active.id);
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  if (!tickets) {
    return <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading tickets...</div>;
  }

  // Thread view
  if (active) {
    return (
      <div className="space-y-5 max-w-3xl">
        <button onClick={() => { setActive(null); load(); }} className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600 hover:opacity-80">
          <ArrowLeft className="w-4 h-4" /> Back to inbox
        </button>

        <div className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-black text-gray-950 dark:text-white">{active.subject}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{active.clinicName} · <span className={PRIORITY_STYLES[active.priority]}>{active.priority} priority</span></p>
            </div>
            <select value={active.status} onChange={(e) => setStatus(e.target.value)} disabled={busy}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border-0 cursor-pointer ${STATUS_STYLES[active.status]}`}>
              {['open','in_progress','waiting','resolved','closed'].map((s) => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>

          <div className="mt-5 space-y-3">
            {active.messages.map((m) => (
              <div key={m.id} className={`flex ${m.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.senderType === 'admin'
                    ? 'bg-orange-600 text-white rounded-br-sm'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-bl-sm'
                }`}>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className={`text-[10px] mt-1 ${m.senderType === 'admin' ? 'text-orange-200' : 'text-gray-400'}`}>
                    {m.senderType === 'admin' ? 'You' : 'Clinic'} · {String(m.createdAt).slice(0, 16).replace('T', ' ')}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <form onSubmit={sendReply} className="mt-5 flex gap-2">
            <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40" />
            <button disabled={busy} className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-sm font-bold px-5 rounded-xl">
              <Send className="w-4 h-4" /> Send
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Inbox list
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-950 dark:text-white">Support Inbox</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Messages from clinics across the platform.</p>
      </div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

      <div className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] divide-y divide-gray-100 dark:divide-white/5">
        {tickets.length === 0 && (
          <p className="px-4 py-10 text-center text-gray-400 text-sm">No support tickets yet.</p>
        )}
        {tickets.map((t) => (
          <button key={t.id} onClick={() => openTicket(t.id)} className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-400 shrink-0" />
                <p className="font-bold text-gray-900 dark:text-white truncate">{t.subject}</p>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{t.clinicName} · {t.lastMessage}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${STATUS_STYLES[t.status]}`}>{t.status.replace('_',' ')}</span>
              <span className="text-xs text-gray-400">{t.messageCount}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
