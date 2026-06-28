import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, DollarSign, Download, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { fetchApi } from '../config/api';
import { useClinic } from '../context/ClinicContext';
import Badge from '../components/ui/Badge';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const money = (value = 0) => `PKR ${Number(value || 0).toLocaleString()}`;
const statusBadge = { paid: 'paid', pending: 'pending', partial: 'pending', refunded: 'refunded' };

function SummaryCard({ label, value, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
        <div className={`rounded-lg p-2 ${iconBg}`}><Icon className={`h-4 w-4 ${iconColor}`} /></div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-gray-400">Live data only</p>
    </div>
  );
}

export default function Financials() {
  const { term } = useClinic();
  const patientLabel = term('patient', 'Patient');
  const serviceLabel = term('service', 'Service');
  const servicesLabel = term('services', 'services');
  const [summary, setSummary] = useState({ totalRevenue: 0, totalExpenses: 0, netProfit: 0, outstandingPayments: 0 });
  const [monthly, setMonthly] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchApi('/financials/summary'),
      fetchApi('/financials/monthly'),
      fetchApi('/financials/transactions'),
    ]).then(([sum, months, txns]) => {
      setSummary(sum || {});
      setMonthly(Array.isArray(months) ? months : []);
      setTransactions(Array.isArray(txns) ? txns : []);
    }).catch(err => {
      alert(err.message || 'Financial data could not be loaded.');
    }).finally(() => setLoading(false));
  }, []);

  const chartData = monthly.length ? monthly : [{ month: 'No revenue', total: 0 }];
  const categoryData = useMemo(() => {
    const grouped = {};
    transactions.forEach(txn => {
      const name = txn.appointment?.service?.name || normalizeItems(txn.items)[0]?.description || 'Manual invoice';
      grouped[name] = (grouped[name] || 0) + Number(txn.total || 0);
    });
    return Object.entries(grouped).map(([name, revenue]) => ({ name, revenue }));
  }, [transactions]);
  const serviceData = categoryData.length ? categoryData : [{ name: `No paid ${servicesLabel} yet`, revenue: 0 }];
  const paidCount = transactions.filter(txn => txn.status === 'paid').length;
  const pendingCount = transactions.filter(txn => txn.status === 'pending' || txn.status === 'partial').length;

  if (loading) {
    return <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading financials...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total Collected" value={money(summary.totalRevenue)} icon={DollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        <SummaryCard label="Total Expenses" value={money(summary.totalExpenses)} icon={TrendingDown} iconBg="bg-red-50" iconColor="text-red-500" />
        <SummaryCard label="Net Profit" value={money(summary.netProfit)} icon={TrendingUp} iconBg="bg-[var(--primary)]/10" iconColor="text-[var(--primary)]" />
        <SummaryCard label="Outstanding" value={money(summary.outstandingPayments)} icon={AlertCircle} iconBg="bg-amber-50" iconColor="text-amber-500" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Revenue Trends</h3>
          <p className="mb-4 mt-0.5 text-xs text-gray-400">Only paid invoices are counted.</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${Number(v || 0) / 1000}k`} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [money(v), 'Revenue']} />
                <Area type="monotone" dataKey="total" stroke="#0f766e" strokeWidth={2.5} fill="#0f766e22" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <h3 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">Current Month</h3>
          <p className="mb-4 text-xs text-gray-400">Zero until real invoices are paid.</p>
          <div className="space-y-2">
            <div className="rounded-lg bg-teal-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Collected</p><p className="mt-1 text-2xl font-black text-teal-950">{money(summary.totalRevenue)}</p></div>
            <div className="rounded-lg bg-gray-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Pending</p><p className="mt-1 text-xl font-black text-gray-950">{money(summary.outstandingPayments)}</p></div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <h3 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">{serviceLabel} Revenue</h3>
        <p className="mb-4 text-xs text-gray-400">Live invoice items. Empty means no collected amount yet.</p>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serviceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${Number(v || 0) / 1000}k`} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [money(v), 'Revenue']} />
              <Bar dataKey="revenue" fill="#0f766e" radius={[6, 6, 0, 0]} maxBarSize={42} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
            <p className="mt-0.5 text-xs text-gray-400">{paidCount} paid · {pendingCount} pending</p>
          </div>
          <button onClick={() => alert('Export will be connected to live CSV in the next reporting phase.')} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['Invoice', 'Date', patientLabel, serviceLabel, 'Amount', 'Status'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {transactions.map(txn => (
                <tr key={txn.id}>
                  <td className="px-4 py-3.5 font-mono text-xs font-bold text-[var(--primary)]">{txn.invoiceNo}</td>
                  <td className="px-4 py-3.5 text-xs text-gray-500">{String(txn.createdAt || '').slice(0, 10)}</td>
                  <td className="px-4 py-3.5 text-xs font-semibold text-gray-900">{txn.client?.name || 'Unknown'}</td>
                  <td className="px-4 py-3.5 max-w-[180px] truncate text-xs text-gray-600">{txn.appointment?.service?.name || normalizeItems(txn.items)[0]?.description || 'Manual invoice'}</td>
                  <td className="px-4 py-3.5 text-xs font-bold text-gray-900">{money(txn.total)}</td>
                  <td className="px-4 py-3.5"><Badge label={txn.status} variant={statusBadge[txn.status] || txn.status} /></td>
                </tr>
              ))}
              {transactions.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">No live transactions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function normalizeItems(items = []) {
  return Array.isArray(items) ? items : [];
}
