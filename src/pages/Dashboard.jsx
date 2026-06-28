import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, Bot, Building2, Calendar, Database, DollarSign, Facebook, FileBarChart, FlaskConical, Image, LifeBuoy, Loader2, Megaphone, MessageCircle, MessageSquare, Package, Receipt, Settings, Shield, Stethoscope, Users, UserCheck, WalletCards } from 'lucide-react';
import { fetchApi } from '../config/api';
import { useClinic } from '../context/ClinicContext';
import StatCard from '../components/ui/StatCard';
import SetupAlert from '../components/dashboard/SetupAlert';
import RevenueChart from '../components/charts/RevenueChart';
import ServiceChart from '../components/charts/ServiceChart';
import Badge from '../components/ui/Badge';
import { canAccessPath, canViewBusinessFinancials, getCurrentRole } from '../config/roles';

const money = (value = 0) => `PKR ${Number(value || 0).toLocaleString()}`;

const iconMap = { Archive, Bot, Building2, Calendar, Database, DollarSign, Facebook, FileBarChart, FlaskConical, Image, LifeBuoy, Megaphone, MessageCircle, MessageSquare, Package, Receipt, Settings, Shield, Stethoscope, Users, UserCheck, WalletCards };

const portalModules = [
  { key: 'reception', to: '/reception' },
  { key: 'clinical', to: '/clinical' },
  { key: 'clients', to: '/clients' },
  { key: 'appointments', to: '/appointments' },
  { key: 'invoices', to: '/invoices' },
  { key: 'staff', to: '/staff' },
  { key: 'services', to: '/services' },
  { key: 'branches', to: '/branches' },
  { key: 'packages', to: '/packages' },
  { key: 'whatsapp', to: '/whatsapp' },
  { key: 'ai', to: '/ai' },
  { key: 'metaLeads', to: '/meta-leads' },
  { key: 'imports', to: '/imports' },
  { key: 'reports', to: '/reports' },
  { key: 'gallery', to: '/gallery' },
  { key: 'audit', to: '/audit' },
  { key: 'settings', to: '/settings' },
];

export default function Dashboard() {
  const { industryTemplate, term } = useClinic();
  const canSeeFinancials = canViewBusinessFinancials();
  const role = getCurrentRole();
  const [data, setData] = useState({ appointments: [], clients: [], staff: [], services: [], invoices: [], financials: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchApi('/appointments').catch(() => []),
      fetchApi('/clients').catch(() => ({ clients: [] })),
      fetchApi('/staff').catch(() => []),
      fetchApi('/services').catch(() => []),
      fetchApi('/invoices').catch(() => []),
      canSeeFinancials ? fetchApi('/financials/summary').catch(() => ({})) : Promise.resolve({}),
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
  }, [canSeeFinancials]);

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
      <SetupAlert />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title={industryTemplate.config.dashboard.todayAppointments} value={String(todayAppts.length)} icon={Calendar} />
        {canSeeFinancials
          ? <StatCard title="Collected This Month" value={money(data.financials?.totalRevenue)} icon={Receipt} />
          : <StatCard title="Pending Invoices" value={String(pendingInvoices.length)} icon={Receipt} />}
        <StatCard title={industryTemplate.config.dashboard.activePatients} value={String(data.clients.filter(c => c.status !== 'inactive').length)} icon={Users} />
        <StatCard title={industryTemplate.config.dashboard.activeStaff} value={String(activeStaff.length)} icon={UserCheck} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="luxury-card h-72 p-5 lg:col-span-2">
          {canSeeFinancials ? (
            <RevenueChart />
          ) : (
            <div className="flex h-full flex-col justify-center text-center">
              <Receipt className="mx-auto h-9 w-9 text-gray-300" />
              <h3 className="mt-3 text-sm font-bold text-gray-900 dark:text-white">Reception Work Queue</h3>
              <p className="mt-1 text-xs text-gray-500">Financial analytics are restricted. Use invoices for billing and payment collection.</p>
            </div>
          )}
        </div>
        <div className="luxury-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{industryTemplate.config.dashboard.scheduleTitle}</h3>
            <span className="rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--primary)]">{todayAppts.length} {term('appointments', 'appointments').toLowerCase()}</span>
          </div>
          <div className="max-h-52 space-y-2.5 overflow-y-auto pr-0.5">
            {todayAppts.map(appt => (
              <div key={appt.id} className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-gray-50/80 dark:hover:bg-white/5">
                <div className="w-14 shrink-0 text-xs font-bold text-gray-900">{appt.startTime}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-gray-800">{appt.client?.name || appt.clientName || term('patient', 'Patient')}</p>
                  <p className="truncate text-[11px] text-gray-500">{appt.service?.name || appt.serviceName || term('treatment', 'Treatment')}</p>
                </div>
                <Badge label={appt.status} variant={appt.status} />
              </div>
            ))}
            {todayAppts.length === 0 && <p className="py-12 text-center text-sm text-gray-400">No {term('appointments', 'appointments').toLowerCase()} today.</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="luxury-card h-64 p-5"><ServiceChart /></div>
        <div className="luxury-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">{industryTemplate.config.dashboard.topStaff}</h3>
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
            {canSeeFinancials
              ? <div className="flex justify-between"><span className="text-gray-500">Outstanding</span><b>{money(data.financials?.outstandingPayments)}</b></div>
              : <div className="flex justify-between"><span className="text-gray-500">Invoices needing payment</span><b>{pendingInvoices.length}</b></div>}
            <div className="flex justify-between"><span className="text-gray-500">{industryTemplate.config.dashboard.servicesConfigured}</span><b>{data.services.length}</b></div>
          </div>
        </div>
      </div>

      <div className="luxury-card p-5">
        <h2 className="text-sm font-bold text-gray-950 dark:text-white">{industryTemplate.config.dashboard.portalFeatures}</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">All modules below are live entry points. CRUD-enabled modules update the database directly.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {portalModules.filter(({ to }) => canAccessPath(to, role)).map(({ key, to }) => {
            const mod = industryTemplate.templateKey === 'healthcare'
              ? (industryTemplate.config.dashboardModules?.[key] || industryTemplate.config.modules?.[key] || {})
              : (industryTemplate.config.modules?.[key] || industryTemplate.config.dashboardModules?.[key] || {});
            const Icon = iconMap[mod.icon] || Settings;
            return (
            <Link key={to} to={to} className="group rounded-lg border border-gray-100 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-teal-50 p-2 text-teal-700 transition-colors group-hover:bg-teal-700 group-hover:text-white"><Icon className="h-4 w-4" /></div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-gray-950 dark:text-white">{mod.label}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{mod.desc}</p>
                </div>
              </div>
            </Link>
          );})}
        </div>
      </div>
    </div>
  );
}
