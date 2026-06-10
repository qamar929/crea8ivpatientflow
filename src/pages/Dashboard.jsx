import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, Bot, Calendar, Database, Facebook, FileBarChart, Image, Loader2, Megaphone, Package, Receipt, Settings, Shield, Stethoscope, Users, UserCheck, WalletCards } from 'lucide-react';
import { fetchApi } from '../config/api';
import StatCard from '../components/ui/StatCard';
import RevenueChart from '../components/charts/RevenueChart';
import ServiceChart from '../components/charts/ServiceChart';
import Badge from '../components/ui/Badge';

const money = (value = 0) => `PKR ${Number(value || 0).toLocaleString()}`;

const portalModules = [
  { to: '/reception', icon: WalletCards, title: 'Reception Desk', desc: 'Today appointments, invoices, check-in and handover' },
  { to: '/clinical', icon: Stethoscope, title: 'Clinical Workspace', desc: 'Treatment notes and patient clinical workflow' },
  { to: '/clients', icon: Users, title: 'Patients', desc: 'Patient records, history, dues and follow-ups' },
  { to: '/appointments', icon: Calendar, title: 'Appointments', desc: 'Calendar, doctor availability and booking' },
  { to: '/invoices', icon: Receipt, title: 'Invoices & Dues', desc: 'Live billing CRUD, payments, refunds and PDFs' },
  { to: '/staff', icon: UserCheck, title: 'Staff & Doctors', desc: 'Doctor profiles, salaries, commissions and access' },
  { to: '/services', icon: Stethoscope, title: 'Treatment Services', desc: 'Treatment categories, durations and pricing' },
  { to: '/branches', icon: Archive, title: 'Branches', desc: 'Branch CRUD and WhatsApp routing' },
  { to: '/packages', icon: Package, title: 'Packages', desc: 'Clinic plans and bundled services' },
  { to: '/whatsapp', icon: Megaphone, title: 'WhatsApp Center', desc: 'Patient engagement and campaigns' },
  { to: '/ai', icon: Bot, title: 'AI Hub', desc: 'ChatGPT, Gemini, Claude config and failover' },
  { to: '/meta-leads', icon: Facebook, title: 'Meta Lead Center', desc: 'Facebook and Instagram leads to CRM workflow' },
  { to: '/imports', icon: Database, title: 'Import Center', desc: 'CSV, Excel, Google Sheets and CRM migration jobs' },
  { to: '/reports', icon: FileBarChart, title: 'Reports', desc: 'Live reports with zero fake collections' },
  { to: '/gallery', icon: Image, title: 'Gallery', desc: 'Approved public and clinical media' },
  { to: '/audit', icon: Shield, title: 'Security Audit', desc: 'Track portal activity and changes' },
  { to: '/settings', icon: Settings, title: 'Branding Settings', desc: 'Clinic profile, public site and branding' },
];

export default function Dashboard() {
  const [data, setData] = useState({ appointments: [], clients: [], staff: [], services: [], invoices: [], financials: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchApi('/appointments'),
      fetchApi('/clients'),
      fetchApi('/staff'),
      fetchApi('/services'),
      fetchApi('/invoices'),
      fetchApi('/financials/summary'),
    ]).then(([appointments, clients, staff, services, invoices, financials]) => {
      setData({
        appointments: Array.isArray(appointments) ? appointments : [],
        clients: Array.isArray(clients) ? clients : (clients.clients || []),
        staff: Array.isArray(staff) ? staff : [],
        services: Array.isArray(services) ? services : [],
        invoices: Array.isArray(invoices) ? invoices : [],
        financials: financials || {},
      });
    }).finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todayAppts = data.appointments.filter(appt => appt.date === today);
  const activeStaff = data.staff.filter(member => member.status === 'active');
  const pendingInvoices = data.invoices.filter(inv => inv.status === 'pending' || inv.status === 'partial');
  const topStaff = useMemo(() => activeStaff.slice().sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0)).slice(0, 5), [activeStaff]);

  if (loading) {
    return <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading live dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Today's Appointments" value={String(todayAppts.length)} icon={Calendar} />
        <StatCard title="Collected This Month" value={money(data.financials?.totalRevenue)} icon={Receipt} />
        <StatCard title="Active Patients" value={String(data.clients.filter(c => c.status !== 'inactive').length)} icon={Users} />
        <StatCard title="Active Staff" value={String(activeStaff.length)} icon={UserCheck} />
      </div>

      <div className="rounded-xl border border-teal-100 bg-teal-50/80 p-5">
        <h2 className="text-sm font-bold text-teal-950">The Smile Xperts Live Portal</h2>
        <p className="mt-1 text-xs leading-relaxed text-teal-700">
          Demo collections have been removed. Revenue, dues, invoices, appointments and patient counts now come from the database only.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="luxury-card h-72 p-5 lg:col-span-2"><RevenueChart /></div>
        <div className="luxury-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Today's Schedule</h3>
            <span className="rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--primary)]">{todayAppts.length} appts</span>
          </div>
          <div className="max-h-52 space-y-2.5 overflow-y-auto pr-0.5">
            {todayAppts.map(appt => (
              <div key={appt.id} className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-gray-50/80 dark:hover:bg-white/5">
                <div className="w-14 shrink-0 text-xs font-bold text-gray-900">{appt.startTime}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-gray-800">{appt.client?.name || appt.clientName || 'Patient'}</p>
                  <p className="truncate text-[11px] text-gray-500">{appt.service?.name || appt.serviceName || 'Treatment'}</p>
                </div>
                <Badge label={appt.status} variant={appt.status} />
              </div>
            ))}
            {todayAppts.length === 0 && <p className="py-12 text-center text-sm text-gray-400">No appointments today.</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="luxury-card h-64 p-5"><ServiceChart /></div>
        <div className="luxury-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Top Doctors</h3>
          <div className="space-y-3">
            {topStaff.map(member => (
              <div key={member.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-white/5">
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{member.name}</p>
                  <p className="text-[11px] text-gray-500">{member.designation || member.role}</p>
                </div>
                <span className="text-xs font-bold text-amber-600">★ {Number(member.rating || 0).toFixed(1)}</span>
              </div>
            ))}
            {topStaff.length === 0 && <p className="py-10 text-center text-sm text-gray-400">No staff configured.</p>}
          </div>
        </div>
        <div className="luxury-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Billing Snapshot</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Pending invoices</span><b>{pendingInvoices.length}</b></div>
            <div className="flex justify-between"><span className="text-gray-500">Outstanding</span><b>{money(data.financials?.outstandingPayments)}</b></div>
            <div className="flex justify-between"><span className="text-gray-500">Services configured</span><b>{data.services.length}</b></div>
          </div>
        </div>
      </div>

      <div className="luxury-card p-5">
        <h2 className="text-sm font-bold text-gray-950 dark:text-white">Portal Features</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">All modules below are live entry points. CRUD-enabled modules update the database directly.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {portalModules.map(({ to, icon: Icon, title, desc }) => (
            <Link key={to} to={to} className="group rounded-lg border border-gray-100 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-teal-50 p-2 text-teal-700 transition-colors group-hover:bg-teal-700 group-hover:text-white"><Icon className="h-4 w-4" /></div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-gray-950 dark:text-white">{title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
