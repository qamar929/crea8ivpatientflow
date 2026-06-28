import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { getCurrentRole } from '../../config/roles';
import { WHATS_NEW, getSeenIds, markAllSeen, unseenCount } from '../../config/whatsNew';

const tagStyle = {
  New: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  AI: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  Improved: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
};

// Owner/manager "What's New" — shows a badge for unseen feature announcements
// and clears it once opened. Purpose: keep the owner up to date with new updates.
export default function WhatsNew() {
  const role = getCurrentRole();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const ref = useRef(null);

  useEffect(() => { setUnseen(unseenCount()); }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!['owner', 'manager'].includes(role)) return null;

  const seenIds = getSeenIds();

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unseen > 0) { markAllSeen(); setUnseen(0); } // viewing = "explored" → badge vanishes
  };

  const go = (href) => { setOpen(false); if (href) navigate(href); };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative p-2 rounded-lg hover:bg-white dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors shadow-sm border border-transparent hover:border-gray-200/60"
        title="What's new"
      >
        <Sparkles className="w-5 h-5" />
        {unseen > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 text-white text-[9px] font-bold rounded-full flex items-center justify-center bg-orange-500 animate-pulse">
            {unseen > 9 ? '9+' : unseen}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-[calc(100vw-2rem)] sm:w-[26rem] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 shadow-2xl rounded-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200/50 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-orange-500/10 to-transparent">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">What's New</span>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"><X className="w-4 h-4" /></button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto divide-y divide-gray-100/70 dark:divide-white/5">
            {WHATS_NEW.map((a) => {
              const isNew = !seenIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => go(a.href)}
                  className="group w-full px-4 py-3 text-left hover:bg-gray-50/90 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tagStyle[a.tag] || tagStyle.New}`}>{a.tag || 'New'}</span>
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{a.title}</p>
                    </div>
                    {isNew && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-500" />}
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-gray-500 dark:text-gray-400">{a.body}</p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-gray-400">{a.date}</span>
                    {a.href && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity">Explore <ArrowRight className="w-3 h-3" /></span>}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="border-t border-gray-200/50 dark:border-white/10 bg-gray-50/80 px-4 py-2 text-[10px] font-medium text-gray-400 dark:bg-white/5 dark:text-gray-500">
            You're all caught up. New updates appear here automatically.
          </div>
        </div>
      )}
    </div>
  );
}
