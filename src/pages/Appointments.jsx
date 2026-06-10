import { useState, useMemo, useEffect } from 'react';
import { Calendar as CalendarIcon, List, Plus, X, ChevronRight, Pencil, Trash2, Save, Loader2, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { fetchApi } from '../config/api';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';

const localizer = momentLocalizer(moment);

const money = (value) => `PKR ${Number(value || 0).toLocaleString()}`;
const getRegularPrice = (appt) => Number(appt.regularPrice ?? appt.price ?? 0);
const getActualFee = (appt) => Number(appt.actualFee ?? appt.price ?? 0);

const apptClientName = (a) => a.clientName || a.client?.name || '—';
const apptStaffName = (a) => a.staffName || a.staff?.name || '—';
const apptServiceName = (a) => a.service?.name || a.serviceName || (typeof a.service === 'string' ? a.service : '') || a.otherTreatment || '—';

const computeEndTime = (start, durationMins) => {
  if (!start || !durationMins) return start;
  const [h, m] = start.split(':').map(Number);
  const total = h * 60 + m + Number(durationMins);
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
};

function AppointmentDetail({ appt, onClose, onEdit, onDelete, onWhatsApp }) {
  if (!appt) return null;
  const name = apptClientName(appt);
  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-900 shadow-2xl z-40 flex flex-col border-l border-gray-100 dark:border-white/10">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Appointment Details</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold bg-teal-700">
            {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{name}</p>
            {appt.status && <Badge label={appt.status} variant={appt.status} />}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Date', value: appt.date },
            { label: 'Time', value: `${appt.startTime} – ${appt.endTime || ''}` },
            { label: 'Duration', value: appt.duration ? `${appt.duration} min` : '—' },
            { label: 'Room', value: appt.room || '—' },
            { label: 'Regular Price', value: money(getRegularPrice(appt)) },
            { label: 'Actual Fee', value: money(getActualFee(appt)) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 mt-1 capitalize">{value}</p>
            </div>
          ))}
        </div>
        <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Service</p>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{apptServiceName(appt)}</p>
        </div>
        <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Doctor / Staff</p>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{apptStaffName(appt)}</p>
        </div>
        {appt.notes && (
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/30 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-600 mb-1">Notes</p>
            <p className="text-sm text-amber-800 dark:text-amber-200">{appt.notes}</p>
          </div>
        )}
      </div>
      <div className="p-6 border-t border-gray-100 dark:border-white/10 flex gap-2">
        <Button variant="secondary" size="sm" className="justify-center" onClick={() => onWhatsApp(appt)}>
          <MessageCircle className="w-4 h-4" /> WhatsApp
        </Button>
        <Button variant="primary" size="sm" className="flex-1 justify-center" onClick={() => onEdit(appt)}>
          <Pencil className="w-4 h-4" /> Edit
        </Button>
        <Button variant="danger" size="sm" className="flex-1 justify-center" onClick={() => onDelete(appt)}>
          <Trash2 className="w-4 h-4" /> Cancel
        </Button>
      </div>
    </div>
  );
}

const emptyForm = {
  clientId: '', staffId: '', serviceId: '', otherTreatment: '',
  regularPrice: '', actualFee: '',
  date: new Date().toISOString().slice(0, 10),
  startTime: '10:00', duration: 30, room: '', notes: '', status: 'pending',
};

function AppointmentFormModal({ isOpen, onClose, onSave, target, clients, staff, services, saving }) {
  const isEdit = !!target;
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (target) {
      setForm({
        clientId: target.clientId || target.client?.id || '',
        staffId: target.staffId || target.staff?.id || '',
        serviceId: target.serviceId || target.service?.id || '',
        otherTreatment: target.otherTreatment || '',
        regularPrice: target.regularPrice ?? target.price ?? '',
        actualFee: target.actualFee ?? target.price ?? '',
        date: target.date ? String(target.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
        startTime: target.startTime || '10:00',
        duration: target.duration || 30,
        room: target.room || '',
        notes: target.notes || '',
        status: target.status || 'pending',
      });
    } else {
      setForm(emptyForm);
    }
  }, [target, isOpen]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const showOther = form.serviceId === 'other';
  const selectedService = services.find(s => s.id === form.serviceId);

  const selectService = (serviceId) => {
    const service = services.find(s => s.id === serviceId);
    setForm(curr => ({
      ...curr,
      serviceId,
      regularPrice: service ? String(service.price) : curr.regularPrice,
      actualFee: service ? String(service.price) : curr.actualFee,
      duration: service?.duration || curr.duration,
    }));
  };

  const submit = () => {
    if (!form.clientId || !form.staffId || !form.date || !form.startTime) {
      alert('Patient, staff, date and time are required.');
      return;
    }
    const endTime = computeEndTime(form.startTime, form.duration);
    const payload = {
      clientId: form.clientId,
      staffId: form.staffId,
      serviceId: form.serviceId && form.serviceId !== 'other' ? form.serviceId : null,
      otherTreatment: form.serviceId === 'other' ? form.otherTreatment : null,
      date: form.date,
      startTime: form.startTime,
      endTime,
      duration: Number(form.duration),
      room: form.room,
      notes: form.notes,
      status: form.status,
      regularPrice: Number(form.regularPrice) || 0,
      actualFee: Number(form.actualFee) || 0,
      price: Number(form.actualFee) || Number(form.regularPrice) || 0,
    };
    onSave(payload);
  };

  const inputCls = "w-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Appointment' : 'New Appointment'} size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Patient *</label>
          <select className={inputCls} value={form.clientId} onChange={e => set('clientId', e.target.value)}>
            <option value="">Select patient...</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Treatment Service *</label>
          <select className={inputCls} value={form.serviceId} onChange={e => selectService(e.target.value)}>
            <option value="">Select treatment service...</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name} — PKR {Number(s.price).toLocaleString()}</option>)}
            <option value="other">Other treatment</option>
          </select>
        </div>
        {showOther && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Other Treatment Name *</label>
            <input value={form.otherTreatment} onChange={e => set('otherTreatment', e.target.value)} placeholder="Write treatment name..." className={inputCls} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Regular Price</label>
            <input type="number" value={form.regularPrice} onChange={e => set('regularPrice', e.target.value)} placeholder="" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Actual Fee *</label>
            <input type="number" value={form.actualFee} onChange={e => set('actualFee', e.target.value)} placeholder="" className={inputCls} />
          </div>
        </div>
        {(selectedService || showOther) && (
          <div className="rounded-lg border border-teal-100 dark:border-teal-500/30 bg-teal-50 dark:bg-teal-500/10 px-3 py-2 text-xs text-teal-800 dark:text-teal-200">
            Audit reports use the actual fee received. Regular-price accounting still uses service price only.
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Doctor / Staff *</label>
          <select className={inputCls} value={form.staffId} onChange={e => set('staffId', e.target.value)}>
            <option value="">Select staff...</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.name} — {s.role}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Date</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Time</label>
            <input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Duration (min)</label>
            <input type="number" value={form.duration} onChange={e => set('duration', e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Room</label>
            <input value={form.room} onChange={e => set('room', e.target.value)} placeholder="e.g. Operatory 1" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Add any notes..." className={`${inputCls} resize-none`} />
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="primary" className="flex-1 justify-center" onClick={submit} disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Book Appointment'}
          </Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}

function DeleteConfirmModal({ isOpen, onClose, onConfirm, name, deleting }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cancel Appointment" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-700 dark:text-gray-200">
          Cancel appointment for <span className="font-semibold">{name}</span>? This cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Keep</Button>
          <Button variant="danger" onClick={onConfirm} disabled={deleting}>
            <Trash2 className="w-4 h-4" /> {deleting ? 'Cancelling...' : 'Cancel Appointment'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function Appointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadAppointments = async () => {
    try {
      const data = await fetchApi('/appointments');
      setAppointments(Array.isArray(data) ? data : (data.appointments ?? data.data ?? []));
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    }
  };

  const loadAll = async () => {
    try {
      const [appts, c, s, srv] = await Promise.all([
        fetchApi('/appointments').catch(() => []),
        fetchApi('/clients').catch(() => ({ clients: [] })),
        fetchApi('/staff').catch(() => []),
        fetchApi('/services').catch(() => []),
      ]);
      setAppointments(Array.isArray(appts) ? appts : (appts.appointments ?? appts.data ?? []));
      setClients(Array.isArray(c) ? c : (c.clients ?? c.data ?? []));
      setStaff(Array.isArray(s) ? s : (s.staff ?? s.data ?? []));
      setServices(Array.isArray(srv) ? srv : (srv.services ?? srv.data ?? []));
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (editTarget) {
        await fetchApi(`/appointments/${editTarget.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await fetchApi('/appointments', { method: 'POST', body: JSON.stringify(payload) });
      }
      setShowFormModal(false);
      setEditTarget(null);
      setSelectedAppt(null);
      await loadAppointments();
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetchApi(`/appointments/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      setSelectedAppt(null);
      await loadAppointments();
    } catch (err) {
      alert(`Cancel failed: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    return appointments.filter(a => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      return true;
    }).sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.startTime || '').localeCompare(b.startTime || ''));
  }, [appointments, statusFilter]);

  const calendarEvents = useMemo(() => {
    return appointments.map(a => ({
      id: a.id,
      title: `${apptClientName(a)} — ${apptServiceName(a)}`,
      start: new Date(`${a.date}T${a.startTime}`),
      end: new Date(`${a.date}T${a.endTime || a.startTime}`),
      resource: a,
    }));
  }, [appointments]);

  const eventStyleGetter = () => ({
    style: {
      backgroundColor: '#0f766e',
      borderRadius: '6px',
      border: 'none',
      color: 'white',
      fontSize: '11px',
    },
  });

  const columns = [
    { key: 'startTime', label: 'Time', render: (v, r) => <span className="font-mono text-xs font-medium">{r.date} {v}</span> },
    { key: 'client', label: 'Patient', render: (_, r) => <span className="font-medium">{apptClientName(r)}</span> },
    { key: 'service', label: 'Service', render: (_, r) => apptServiceName(r) },
    { key: 'staff', label: 'Staff', render: (_, r) => apptStaffName(r) },
    { key: 'room', label: 'Room' },
    { key: 'status', label: 'Status', render: (v) => v ? <Badge label={v} variant={v} /> : null },
    { key: 'regularPrice', label: 'Regular Price', render: (_, r) => <span className="font-medium">{money(getRegularPrice(r))}</span> },
    { key: 'actualFee', label: 'Actual Fee', render: (_, r) => <span className="font-bold text-teal-700">{money(getActualFee(r))}</span> },
    {
      key: 'id', label: 'Actions', render: (_, r) => (
        <div className="flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); setEditTarget(r); setShowFormModal(true); }}
            className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setSelectedAppt(r); }}
            className="text-indigo-600 hover:text-indigo-800 text-xs font-medium flex items-center gap-1 px-2">
            View <ChevronRight className="w-3 h-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); navigate(`/whatsapp?client=${r.clientId || r.client?.id}`); }}
            className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600">
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-gray-100 dark:bg-white/5 rounded-lg p-0.5">
            <button onClick={() => setView('calendar')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'calendar' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}>
              <CalendarIcon className="w-3.5 h-3.5" /> Calendar
            </button>
            <button onClick={() => setView('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'list' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}>
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white dark:bg-white/5">
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <Button onClick={() => { setEditTarget(null); setShowFormModal(true); }} size="sm">
          <Plus className="w-4 h-4" /> New Appointment
        </Button>
      </div>

      {view === 'calendar' ? (
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4" style={{ height: 620 }}>
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            defaultView="week"
            views={['month', 'week', 'day']}
            step={30}
            timeslots={2}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={(e) => setSelectedAppt(e.resource)}
            style={{ height: '100%' }}
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10">
          <div className="px-5 py-3.5 border-b border-gray-50 dark:border-white/10 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">All Appointments</span>
            <span className="text-xs text-gray-400">{filtered.length} records</span>
          </div>
          <Table columns={columns} data={filtered} onRowClick={(r) => setSelectedAppt(r)} />
        </div>
      )}

      {selectedAppt && (
        <>
          <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setSelectedAppt(null)} />
          <AppointmentDetail
            appt={selectedAppt}
            onClose={() => setSelectedAppt(null)}
            onEdit={(a) => { setEditTarget(a); setShowFormModal(true); }}
            onDelete={(a) => setDeleteTarget(a)}
            onWhatsApp={(a) => navigate(`/whatsapp?client=${a.clientId || a.client?.id}`)}
          />
        </>
      )}

      <AppointmentFormModal
        isOpen={showFormModal}
        onClose={() => { setShowFormModal(false); setEditTarget(null); }}
        onSave={handleSave}
        target={editTarget}
        clients={clients}
        staff={staff}
        services={services}
        saving={saving}
      />
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        name={deleteTarget ? apptClientName(deleteTarget) : ''}
        deleting={deleting}
      />
    </div>
  );
}
