import { useEffect, useMemo, useState } from 'react';
import { Activity, Calendar, CheckCircle2, ClipboardEdit, Loader2, Stethoscope, UserRound } from 'lucide-react';
import { fetchApi } from '../config/api';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

const money = (value) => `PKR ${Number(value || 0).toLocaleString()}`;

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="luxury-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{label}</p>
          <p className="mt-1 text-2xl font-black text-gray-950 dark:text-white">{value}</p>
        </div>
        <div className="rounded-lg bg-teal-50 p-2 text-teal-700"><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  );
}

export default function ClinicalWorkspace() {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetchApi('/appointments').catch(() => []),
      fetchApi('/clients').catch(() => ({ clients: [] })),
      fetchApi('/staff').catch(() => []),
      fetchApi('/services').catch(() => []),
    ]).then(([appt, clientData, staffData, serviceData]) => {
      setAppointments(Array.isArray(appt) ? appt : []);
      setClients(Array.isArray(clientData) ? clientData : (clientData.clients || []));
      setStaff(Array.isArray(staffData) ? staffData : []);
      setServices(Array.isArray(serviceData) ? serviceData : []);
    }).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const clinical = useMemo(() => {
    const activeAppts = appointments.filter((a) => a.status !== 'cancelled');
    return {
      today: activeAppts.filter((a) => a.date === today).length,
      completed: activeAppts.filter((a) => a.status === 'completed').length,
      activePatients: clients.filter((c) => c.status === 'active').length,
      activeStaff: staff.filter((s) => s.status === 'active').length,
      plannedRevenue: activeAppts.reduce((sum, a) => sum + Number(a.price || 0), 0),
    };
  }, [appointments, clients, staff, today]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-950 dark:text-white">Clinical Workspace</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Live clinical workload, treatment appointments, staff capacity and service coverage.</p>
          {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm"><ClipboardEdit className="h-4 w-4" /> Add Clinical Note</Button>
          <Button size="sm"><CheckCircle2 className="h-4 w-4" /> Mark Treatment Complete</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Appointments Today" value={clinical.today} icon={Calendar} />
        <Stat label="Active Patients" value={clinical.activePatients} icon={UserRound} />
        <Stat label="Clinical Staff" value={clinical.activeStaff} icon={Stethoscope} />
        <Stat label="Completed Cases" value={clinical.completed} icon={CheckCircle2} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="luxury-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-950 dark:text-white">Treatment Appointments</h2>
              <p className="text-xs text-gray-500">Real appointments from the portal database.</p>
            </div>
            <Badge label={money(clinical.plannedRevenue)} variant="active" />
          </div>
          <div className="mt-4 space-y-2">
            {appointments.slice(0, 12).map((appt) => (
              <div key={appt.id} className="rounded-xl bg-gray-50 p-3 dark:bg-white/5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-gray-950 dark:text-white">{appt.client?.name || 'Patient'}</p>
                    <p className="text-xs text-gray-500">{appt.service?.name || 'Treatment'} · {appt.staff?.name || 'Clinical staff'} · {appt.date} {appt.startTime}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {appt.status && <Badge label={appt.status} variant={appt.status} />}
                    <span className="text-xs font-black text-gray-950 dark:text-white">{money(appt.price)}</span>
                  </div>
                </div>
              </div>
            ))}
            {appointments.length === 0 && <p className="py-10 text-center text-sm text-gray-400">No clinical appointments yet. Add patients, staff and services, then book the first appointment.</p>}
          </div>
        </div>

        <div className="space-y-5">
          <div className="luxury-card p-5">
            <h2 className="text-sm font-bold text-gray-950 dark:text-white">Clinical Staff</h2>
            <div className="mt-4 space-y-2">
              {staff.slice(0, 8).map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3 dark:bg-white/5">
                  <div>
                    <p className="text-xs font-black text-gray-950 dark:text-white">{member.name}</p>
                    <p className="text-[11px] text-gray-500">{member.role} · {member.specialty || 'general'}</p>
                  </div>
                  {member.status && <Badge label={member.status} variant={member.status} />}
                </div>
              ))}
              {staff.length === 0 && <p className="text-sm text-gray-400">No staff added yet.</p>}
            </div>
          </div>

          <div className="luxury-card p-5">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-teal-700" />
              <h2 className="text-sm font-bold text-gray-950 dark:text-white">Service Coverage</h2>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {services.slice(0, 16).map((service) => (
                <span key={service.id} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">{service.name}</span>
              ))}
              {services.length === 0 && <p className="text-sm text-gray-400">No services added yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
