import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Loader2, TrendingUp, Building2, Users, Receipt, CalendarClock, AlertCircle, Plus, ChevronRight, Bell,
} from 'lucide-react';
import { fetchApi } from '../../config/api';

const pkr = (n) => 'PKR ' + Number(n || 0).toLocaleString('en-PK');

function StatCard({ icon: Icon, label, value, tone = 'indigo' }) {
  const tones = {
    indigo: 'from-orange-600 to-orange-500',
    teal: 'from-teal-600 to-emerald-600',
    amber: 'from-amber-500 to-orange-500',
    rose: 'from-rose-500 to-pink-600',
  };
  return (
    <div className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] backdrop-blur p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br ${tones[tone]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-black text-gray-950 dark:text-white">{value}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchApi('/admin/stats').then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
        <AlertCircle className="w-4 h-4" /> {error}
      </div>
    );
  }
  if (!stats) {
    return <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading platform stats...</div>;
  }

  const c = stats.clinicCounts || {};
  const expiringCount = (stats.expiringSoon || []).length;
  const attention = [
    stats.paymentsAwaitingReview > 0 && { label: `${stats.paymentsAwaitingReview} payment${stats.paymentsAwaitingReview === 1 ? '' : 's'} to review`, to: '/admin/payments' },
    expiringCount > 0 && { label: `${expiringCount} subscription${expiringCount === 1 ? '' : 's'} expiring soon`, to: '/admin/tenants' },
    c.suspended > 0 && { label: `${c.suspended} suspended clinic${c.suspended === 1 ? '' : 's'}`, to: '/admin/tenants' },
    stats.openLeads > 0 && { label: `${stats.openLeads} open lead${stats.openLeads === 1 ? '' : 's'}`, to: '/admin/leads' },
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-950 dark:text-white">Platform Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Revenue and tenant health at a glance.</p>
        </div>
        <Link to="/admin/tenants" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold shadow-sm transition-colors">
          <Plus className="w-4 h-4" /> New Clinic
        </Link>
      </div>

      {attention.length > 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-black text-amber-800 dark:text-amber-300">Needs attention</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {attention.map((a) => (
              <button key={a.label} onClick={() => navigate(a.to)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/80 dark:bg-white/10 text-xs font-bold text-amber-800 dark:text-amber-200 hover:bg-white">
                {a.label} <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={TrendingUp} label="Monthly Recurring Revenue" value={pkr(stats.mrrPKR)} tone="indigo" />
        <StatCard icon={Building2} label="Active Clinics" value={(c.active || 0) + (c.trial || 0)} tone="teal" />
        <StatCard icon={Users} label="Open Leads" value={stats.openLeads || 0} tone="amber" />
        <StatCard icon={Receipt} label="Payments to Review" value={stats.paymentsAwaitingReview || 0} tone="rose" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] backdrop-blur p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-black text-gray-900 dark:text-white">Expiring within 30 days</h2>
          </div>
          {(stats.expiringSoon || []).length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No subscriptions expiring soon.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-white/5">
              {stats.expiringSoon.map((s) => (
                <li key={s.clinicId}>
                  <button onClick={() => navigate('/admin/tenants')} className="w-full py-2.5 flex items-center justify-between text-left group">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-orange-600">{s.name}</span>
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-600">{String(s.expiresAt).slice(0, 10)} <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" /></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] backdrop-blur p-5">
          <h2 className="text-sm font-black text-gray-900 dark:text-white mb-4">Clinic status breakdown</h2>
          <div className="space-y-2.5">
            {[
              ['active', 'Active', 'bg-emerald-500'],
              ['trial', 'Trial', 'bg-sky-500'],
              ['grace', 'Grace period', 'bg-amber-500'],
              ['suspended', 'Suspended', 'bg-rose-500'],
              ['pending', 'Pending activation', 'bg-gray-400'],
            ].map(([key, label, dot]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <span className={`w-2 h-2 rounded-full ${dot}`} /> {label}
                </span>
                <span className="text-sm font-black text-gray-900 dark:text-white">{c[key] || 0}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 text-xs text-gray-400">
            {stats.newLeadsThisMonth || 0} new registration{stats.newLeadsThisMonth === 1 ? '' : 's'} this month
          </p>
        </div>
      </div>
    </div>
  );
}
