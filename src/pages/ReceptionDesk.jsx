import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarCheck, Clock, CreditCard, Loader2, MessageCircle, Receipt, Search, Send, WalletCards } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { fetchApi } from '../config/api';

const money = (value = 0) => `PKR ${Number(value || 0).toLocaleString()}`;

function DeskCard({ icon: Icon, label, value, tone = 'text-gray-950' }) {
  return (
    <div className="luxury-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
          <p className={`mt-1 text-xl font-black ${tone}`}>{value}</p>
        </div>
        <div className="rounded-lg bg-teal-50 p-2 text-teal-700"><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  );
}

export default function ReceptionDesk() {
  const [appointments, setAppointments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchApi('/appointments'), fetchApi('/invoices'), fetchApi('/clients')])
      .then(([apptRows, invoiceRows, clientRows]) => {
        setAppointments(Array.isArray(apptRows) ? apptRows : []);
        setInvoices(Array.isArray(invoiceRows) ? invoiceRows : []);
        setClients(Array.isArray(clientRows) ? clientRows : (clientRows.clients || []));
      })
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todayAppointments = appointments.filter(appointment => appointment.date === today);
  const filteredAppointments = todayAppointments.filter(appointment => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [appointment.client?.name, appointment.clientName, appointment.service?.name, appointment.serviceName, appointment.staff?.name, appointment.staffName]
      .some(value => String(value || '').toLowerCase().includes(q));
  });
  const todayInvoices = invoices.filter(invoice => String(invoice.createdAt || '').slice(0, 10) === today);
  const cashReceived = todayInvoices.filter(invoice => invoice.status === 'paid' && invoice.paymentMethod === 'Cash').reduce((sum, invoice) => sum + Number(invoice.amountPaid || 0), 0);
  const cardBankReceived = todayInvoices.filter(invoice => ['Card', 'Bank Transfer', 'JazzCash', 'EasyPaisa'].includes(invoice.paymentMethod)).reduce((sum, invoice) => sum + Number(invoice.amountPaid || 0), 0);
  const duePatients = useMemo(() => clients.filter(client => Number(client.outstandingBalance || 0) > 0).slice(0, 5), [clients]);

  if (loading) {
    return <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading reception desk...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-950 dark:text-white">Reception Desk</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Same-day appointments, invoice preparation, patient search, and cash handover.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm"><Send className="h-4 w-4" /> Send Owner Close</Button>
          <Link to="/appointments"><Button size="sm"><CalendarCheck className="h-4 w-4" /> New Appointment</Button></Link>
        </div>
      </div>

      <div className="rounded-lg border border-teal-100 bg-teal-50/80 p-4">
        <p className="text-sm font-bold text-teal-950">Restricted Reception View</p>
        <p className="mt-1 text-xs text-teal-700">Reception data is now live. Fake cash drawer, fake queues, and demo collected amount have been removed.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {[
          ['Book Appointment', 'Create and manage live clinic appointments', '/appointments'],
          ['Create Invoice', 'Prepare patient bill from live services', '/invoices'],
          ['Patient Search', 'Find patient profile and dues', '/clients'],
          ['WhatsApp', 'Send reminders and confirmations', '/whatsapp'],
        ].map(([label, helper, to]) => (
          <Link key={label} to={to} className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg dark:border-white/10 dark:bg-slate-900">
            <p className="text-sm font-black text-gray-950 dark:text-white">{label}</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">{helper}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DeskCard icon={CalendarCheck} label="Today's Appointments" value={todayAppointments.length} />
        <DeskCard icon={Receipt} label="Bills To Prepare" value={todayAppointments.filter(a => a.status !== 'completed').length} />
        <DeskCard icon={WalletCards} label="Cash Received Today" value={money(cashReceived)} tone="text-teal-700" />
        <DeskCard icon={CreditCard} label="Card/Bank Received" value={money(cardBankReceived)} tone="text-[var(--primary)]" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="luxury-card p-5 xl:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-950 dark:text-white">Today's Chair Schedule</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Quick check-in, invoice, and WhatsApp actions.</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} className="premium-input w-full rounded-lg py-2 pl-9 pr-3 text-sm sm:w-72" placeholder="Search patient, treatment, doctor..." />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-[10px] uppercase tracking-wider text-gray-400">
                  <th className="py-3 font-semibold">Time</th>
                  <th className="py-3 font-semibold">Patient</th>
                  <th className="py-3 font-semibold">Treatment</th>
                  <th className="py-3 font-semibold">Doctor</th>
                  <th className="py-3 font-semibold">Status</th>
                  <th className="py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredAppointments.map(appointment => (
                  <tr key={appointment.id}>
                    <td className="py-3 font-bold text-gray-900">{appointment.startTime}</td>
                    <td className="py-3"><p className="font-semibold text-gray-900">{appointment.client?.name || appointment.clientName || 'Patient'}</p></td>
                    <td className="py-3 text-gray-600">{appointment.service?.name || appointment.serviceName || 'Treatment'}</td>
                    <td className="py-3 text-gray-600">{appointment.staff?.name || appointment.staffName || 'Doctor'}</td>
                    <td className="py-3"><Badge label={appointment.status} variant={appointment.status} /></td>
                    <td className="py-3">
                      <div className="flex justify-end gap-2">
                        <Link to="/invoices"><Button variant="secondary" size="sm">Invoice</Button></Link>
                        <Link to="/whatsapp"><Button variant="ghost" size="sm"><MessageCircle className="h-4 w-4" /> WhatsApp</Button></Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredAppointments.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-sm text-gray-400">No appointments today.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
              <div>
                <p className="text-sm font-bold text-amber-950">Reception Safety</p>
                <p className="mt-1 text-xs text-amber-700">Old dues and invoices are calculated from live patient balances only.</p>
              </div>
            </div>
          </div>

          <div className="luxury-card p-5">
            <h2 className="text-sm font-bold text-gray-950 dark:text-white">Old Dues Queue</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Shown while billing so old balances are not missed.</p>
            <div className="mt-4 space-y-3">
              {duePatients.map(patient => (
                <div key={patient.id} className="rounded-lg bg-gray-50 p-3 dark:bg-white/5">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-xs font-bold text-gray-950 dark:text-white">{patient.name}</p><p className="text-[11px] font-semibold text-teal-700">{patient.patientNo}</p></div>
                    <p className="text-xs font-black text-rose-600">{money(patient.outstandingBalance)}</p>
                  </div>
                </div>
              ))}
              {duePatients.length === 0 && <p className="py-8 text-center text-sm text-gray-400">No outstanding dues.</p>}
            </div>
          </div>

          <div className="luxury-card p-5">
            <h2 className="text-sm font-bold text-gray-950 dark:text-white">Cash Handover</h2>
            <div className="mt-4 rounded-lg bg-slate-950 p-4 text-white">
              <div className="flex items-center justify-between"><span className="text-xs text-white/60">Owner handover</span><Clock className="h-4 w-4 text-white/60" /></div>
              <p className="mt-1 text-2xl font-black">{money(cashReceived)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
