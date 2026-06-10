import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, CreditCard, Loader2, Mail, MessageCircle, Phone, UserRound } from 'lucide-react';
import { fetchApi } from '../config/api';
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
        </main>
      </div>
    </div>
  );
}
