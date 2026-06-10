import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Download, Edit2, Eye, Loader2, MessageCircle, Plus, Receipt, RefreshCcw, Search, Trash2, Undo2, UserRound } from 'lucide-react';
import { API_URL, fetchApi } from '../config/api';
import { useClinic } from '../context/ClinicContext';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ClinicLogoMark from '../components/branding/ClinicLogoMark';
import { isReceptionist } from '../config/roles';

const statusVariant = { paid: 'paid', pending: 'pending', partial: 'pending', refunded: 'refunded' };
const money = (value = 0) => `PKR ${Math.round(Number(value || 0)).toLocaleString()}`;
const emptyItem = { description: '', qty: 1, unitPrice: 0 };
const emptyInvoice = {
  clientId: '',
  appointmentId: '',
  items: [emptyItem],
  discount: 0,
  tax: 0,
  amountPaid: 0,
  paymentMethod: 'Cash',
  notes: '',
  dueDate: '',
};

const normalizeItems = (items = []) => items.length ? items.map(item => ({
  description: item.description || item.name || '',
  qty: Number(item.qty || 1),
  unitPrice: Number(item.unitPrice || item.price || 0),
})) : [emptyItem];

const totalsFromForm = (form, selectedClient, editing = false) => {
  const subtotal = form.items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.unitPrice || 0), 0);
  const discountAmt = subtotal * Number(form.discount || 0) / 100;
  const taxAmt = (subtotal - discountAmt) * Number(form.tax || 0) / 100;
  const total = subtotal - discountAmt + taxAmt;
  const previousBalance = editing ? Number(form.previousBalance || 0) : Number(selectedClient?.outstandingBalance || 0);
  const grandTotal = total + previousBalance;
  const balanceDue = Math.max(0, grandTotal - Number(form.amountPaid || 0));
  return { subtotal, discountAmt, taxAmt, total, previousBalance, grandTotal, balanceDue };
};

function InvoiceFormModal({ isOpen, onClose, onSave, invoice, clients, services, appointments, saving }) {
  const [form, setForm] = useState(emptyInvoice);

  useEffect(() => {
    if (!invoice) {
      setForm(emptyInvoice);
      return;
    }
    const subtotal = Number(invoice.subtotal || 0);
    const discountBase = subtotal || 1;
    const taxBase = Math.max(1, subtotal - Number(invoice.discount || 0));
    setForm({
      clientId: invoice.clientId || '',
      appointmentId: invoice.appointmentId || '',
      items: normalizeItems(invoice.items),
      discount: subtotal ? Number(((Number(invoice.discount || 0) / discountBase) * 100).toFixed(2)) : 0,
      tax: subtotal ? Number(((Number(invoice.tax || 0) / taxBase) * 100).toFixed(2)) : 0,
      amountPaid: Number(invoice.amountPaid || 0),
      paymentMethod: invoice.paymentMethod || 'Cash',
      notes: invoice.notes || '',
      dueDate: invoice.dueDate || '',
      previousBalance: Number(invoice.previousBalance || 0),
    });
  }, [invoice, isOpen]);

  const selectedClient = clients.find(client => client.id === form.clientId);
  const selectedAppointment = appointments.find(appt => appt.id === form.appointmentId);
  const totals = totalsFromForm(form, selectedClient, Boolean(invoice));
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const updateItem = (idx, key, value) => setForm(current => ({ ...current, items: current.items.map((item, i) => i === idx ? { ...item, [key]: value } : item) }));
  const addItem = () => setForm(current => ({ ...current, items: [...current.items, emptyItem] }));
  const removeItem = (idx) => setForm(current => ({ ...current, items: current.items.filter((_, i) => i !== idx) }));

  const selectService = (idx, serviceId) => {
    const service = services.find(row => row.id === serviceId);
    if (!service) return updateItem(idx, 'description', '');
    setForm(current => ({
      ...current,
      items: current.items.map((item, i) => i === idx ? { ...item, description: service.name, unitPrice: Number(service.price || 0) } : item),
    }));
  };

  const submit = () => {
    if (!form.clientId) return alert('Patient is required.');
    const items = normalizeItems(form.items).filter(item => item.description && item.unitPrice >= 0);
    if (!items.length) return alert('At least one invoice item is required.');
    onSave({
      clientId: form.clientId,
      appointmentId: form.appointmentId || null,
      items,
      discount: Number(form.discount || 0),
      tax: Number(form.tax || 0),
      amountPaid: Number(form.amountPaid || 0),
      paymentMethod: form.paymentMethod,
      notes: form.notes,
      dueDate: form.dueDate || null,
      previousBalance: Number(form.previousBalance || 0),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={invoice ? `Edit ${invoice.invoiceNo}` : 'New Invoice'} size="xl">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-200">
            Patient
            <select className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900" value={form.clientId} onChange={e => set('clientId', e.target.value)}>
              <option value="">Select patient</option>
              {clients.map(client => <option key={client.id} value={client.id}>{client.patientNo ? `${client.patientNo} · ` : ''}{client.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-200">
            Appointment
            <select className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900" value={form.appointmentId} onChange={e => set('appointmentId', e.target.value)}>
              <option value="">No appointment link</option>
              {appointments.map(appt => <option key={appt.id} value={appt.id}>{appt.date} · {appt.client?.name || appt.clientName || 'Patient'} · {appt.service?.name || appt.serviceName || 'Service'}</option>)}
            </select>
          </label>
        </div>

        {selectedClient && (
          <div className="grid gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs sm:grid-cols-4">
            <div><p className="font-bold uppercase text-amber-700">Patient</p><p className="mt-1 font-black text-gray-900">{selectedClient.patientNo || selectedClient.name}</p></div>
            <div><p className="font-bold uppercase text-amber-700">Current Due</p><p className="mt-1 font-black text-amber-800">{money(selectedClient.outstandingBalance)}</p></div>
            <div><p className="font-bold uppercase text-amber-700">Latest Invoice</p><p className="mt-1 font-black text-gray-900">{selectedClient.latestInvoiceNo || 'None'}</p></div>
            <div><p className="font-bold uppercase text-amber-700">Linked Visit</p><p className="mt-1 font-black text-gray-900">{selectedAppointment?.date || 'Manual bill'}</p></div>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-200">Line Items</label>
            <button onClick={addItem} className="flex items-center gap-1 text-xs font-bold text-[var(--primary)]"><Plus className="h-3.5 w-3.5" /> Add Item</button>
          </div>
          <div className="space-y-2">
            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 items-center gap-2">
                <select className="col-span-5 rounded-lg border border-gray-200 px-2 py-2 text-xs dark:border-white/10 dark:bg-slate-900" value="" onChange={e => selectService(idx, e.target.value)}>
                  <option value="">{item.description || 'Select service...'}</option>
                  {services.map(service => <option key={service.id} value={service.id}>{service.name} · {money(service.price)}</option>)}
                </select>
                <input className="col-span-3 rounded-lg border border-gray-200 px-2 py-2 text-xs dark:border-white/10 dark:bg-slate-900" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Description" />
                <input type="number" min="1" className="col-span-1 rounded-lg border border-gray-200 px-2 py-2 text-xs dark:border-white/10 dark:bg-slate-900" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} />
                <input type="number" min="0" className="col-span-2 rounded-lg border border-gray-200 px-2 py-2 text-xs dark:border-white/10 dark:bg-slate-900" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', e.target.value)} />
                <button onClick={() => removeItem(idx)} disabled={form.items.length === 1} className="col-span-1 rounded-lg p-2 text-red-400 hover:bg-red-50 disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-200">Discount %<input type="number" min="0" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900" value={form.discount} onChange={e => set('discount', e.target.value)} /></label>
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-200">Tax %<input type="number" min="0" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900" value={form.tax} onChange={e => set('tax', e.target.value)} /></label>
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-200">Paid Now<input type="number" min="0" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900" value={form.amountPaid} onChange={e => set('amountPaid', e.target.value)} /></label>
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-200">Method<select className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900" value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}><option>Cash</option><option>Card</option><option>Bank Transfer</option><option>JazzCash</option><option>EasyPaisa</option></select></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-200">Due Date<input type="date" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900" value={form.dueDate || ''} onChange={e => set('dueDate', e.target.value)} /></label>
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-200">Notes<input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes" /></label>
        </div>

        <div className="rounded-xl bg-gray-50 p-4 text-sm dark:bg-white/5">
          <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
          <div className="flex justify-between text-green-600"><span>Discount</span><span>- {money(totals.discountAmt)}</span></div>
          <div className="flex justify-between text-gray-600"><span>Tax</span><span>+ {money(totals.taxAmt)}</span></div>
          <div className="flex justify-between text-amber-700"><span>Previous due included</span><span>+ {money(totals.previousBalance)}</span></div>
          <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-base font-black text-gray-900 dark:text-white"><span>Grand Total</span><span>{money(totals.grandTotal)}</span></div>
          <div className="flex justify-between text-red-600"><span>Balance Due</span><span>{money(totals.balanceDue)}</span></div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{invoice ? 'Save Invoice' : 'Create Invoice'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function InvoiceDetailModal({ invoice, isOpen, onClose, onMarkPaid, onRefund, onDownload }) {
  const { clinicInfo } = useClinic();
  if (!invoice) return null;
  const sendWhatsapp = () => {
    const phone = (invoice.client?.phone || '').replace(/\D/g, '');
    if (!phone) return alert('No WhatsApp number found for this patient.');
    const message = `Hi ${invoice.client?.name || 'Patient'}, your invoice ${invoice.invoiceNo} from ${clinicInfo.name} is ${money(invoice.grandTotal)}. Paid: ${money(invoice.amountPaid)}. Balance: ${money(invoice.balanceDue)}.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invoice Detail" size="lg">
      <div className="space-y-6 printable-invoice">
        <div className="flex items-start justify-between">
          <div>
            <ClinicLogoMark logo={clinicInfo.logo} alt={`${clinicInfo.name} logo`} className="mb-2 flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl" textClassName="text-white font-bold text-sm" style={{ background: 'var(--primary)' }} />
            <p className="font-bold text-gray-900 dark:text-white">{clinicInfo.name}</p>
            <p className="text-xs text-gray-500">{clinicInfo.address}</p>
            <p className="text-xs text-gray-500">{clinicInfo.phone} · {clinicInfo.email}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-gray-900 dark:text-white">INVOICE</p>
            <p className="mt-1 font-mono text-sm font-bold text-[var(--primary)]">{invoice.invoiceNo}</p>
            <p className="mt-1 text-xs text-gray-500">Date: {String(invoice.createdAt || '').slice(0, 10)}</p>
            <div className="mt-2"><Badge label={invoice.status} variant={statusVariant[invoice.status]} /></div>
          </div>
        </div>
        <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Bill To</p>
          <p className="font-semibold text-gray-900 dark:text-white">{invoice.client?.name || 'Unknown patient'}</p>
          <p className="text-xs text-gray-500">{invoice.client?.phone || 'No phone'}</p>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 dark:border-white/10"><th className="py-2 text-left text-xs text-gray-500">Description</th><th className="py-2 text-center text-xs text-gray-500">Qty</th><th className="py-2 text-right text-xs text-gray-500">Rate</th><th className="py-2 text-right text-xs text-gray-500">Amount</th></tr></thead>
          <tbody>
            {normalizeItems(invoice.items).map((item, idx) => <tr key={idx} className="border-b border-gray-50 dark:border-white/5"><td className="py-2.5">{item.description}</td><td className="py-2.5 text-center">{item.qty}</td><td className="py-2.5 text-right">{money(item.unitPrice)}</td><td className="py-2.5 text-right font-semibold">{money(item.qty * item.unitPrice)}</td></tr>)}
          </tbody>
        </table>
        <div className="space-y-2 border-t border-gray-100 pt-4 dark:border-white/10">
          <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{money(invoice.subtotal)}</span></div>
          <div className="flex justify-between text-sm text-green-600"><span>Discount</span><span>- {money(invoice.discount)}</span></div>
          <div className="flex justify-between text-sm text-gray-600"><span>Tax</span><span>+ {money(invoice.tax)}</span></div>
          <div className="flex justify-between text-sm text-amber-700"><span>Previous due</span><span>+ {money(invoice.previousBalance)}</span></div>
          <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-black text-gray-950 dark:text-white"><span>Grand Total</span><span>{money(invoice.grandTotal)}</span></div>
          <div className="flex justify-between text-sm text-green-700"><span>Amount paid</span><span>{money(invoice.amountPaid)}</span></div>
          <div className="flex justify-between text-sm font-bold text-red-600"><span>Balance due</span><span>{money(invoice.balanceDue)}</span></div>
        </div>
        {invoice.notes && <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-700">{invoice.notes}</div>}
        <div className="flex flex-wrap gap-2 no-print">
          <Button variant="secondary" onClick={() => window.print()}>Print</Button>
          <Button variant="secondary" onClick={() => onDownload(invoice)}><Download className="h-4 w-4" /> PDF</Button>
          {invoice.status !== 'paid' && invoice.status !== 'refunded' && <Button onClick={() => onMarkPaid(invoice)}><CheckCircle className="h-4 w-4" /> Mark Paid</Button>}
          {invoice.status === 'paid' && <Button variant="secondary" onClick={() => onRefund(invoice)}><Undo2 className="h-4 w-4" /> Refund</Button>}
          <Button variant="secondary" onClick={sendWhatsapp}><MessageCircle className="h-4 w-4" /> WhatsApp</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function Invoices() {
  const receptionist = isReceptionist();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editInvoice, setEditInvoice] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invoiceRows, clientRows, serviceRows, appointmentRows] = await Promise.all([
        fetchApi('/invoices'),
        fetchApi('/clients'),
        fetchApi('/services'),
        fetchApi('/appointments'),
      ]);
      setInvoices(invoiceRows);
      setClients(Array.isArray(clientRows) ? clientRows : (clientRows.clients || []));
      setServices(serviceRows);
      setAppointments(appointmentRows);
    } catch (err) {
      alert(err.message || 'Invoices could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const visibleInvoices = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return receptionist ? invoices.filter(inv => String(inv.createdAt || '').slice(0, 10) === today) : invoices;
  }, [invoices, receptionist]);

  const filtered = visibleInvoices.filter(inv => {
    const query = search.trim().toLowerCase();
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    if (!query) return true;
    return [inv.invoiceNo, inv.client?.name, inv.client?.phone].some(value => String(value || '').toLowerCase().includes(query));
  });

  const stats = useMemo(() => ({
    invoiced: visibleInvoices.reduce((sum, inv) => sum + Number(inv.grandTotal || inv.total || 0), 0),
    paid: visibleInvoices.reduce((sum, inv) => sum + Number(inv.amountPaid || 0), 0),
    balance: visibleInvoices.reduce((sum, inv) => sum + Number(inv.balanceDue || 0), 0),
    patientDues: clients.reduce((sum, client) => sum + Number(client.outstandingBalance || 0), 0),
  }), [visibleInvoices, clients]);

  const saveInvoice = async (payload) => {
    setSaving(true);
    try {
      if (editInvoice) {
        await fetchApi(`/invoices/${editInvoice.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await fetchApi('/invoices', { method: 'POST', body: JSON.stringify(payload) });
      }
      setShowForm(false);
      setEditInvoice(null);
      await loadData();
    } catch (err) {
      alert(err.message || 'Invoice could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async (invoice) => {
    try {
      await fetchApi(`/invoices/${invoice.id}/paid`, { method: 'PUT', body: JSON.stringify({ paymentMethod: invoice.paymentMethod || 'Cash' }) });
      setSelectedInvoice(null);
      await loadData();
    } catch (err) {
      alert(err.message || 'Invoice could not be marked paid.');
    }
  };

  const refundInvoice = async (invoice) => {
    if (!confirm(`Refund ${invoice.invoiceNo}?`)) return;
    try {
      await fetchApi(`/invoices/${invoice.id}/refund`, { method: 'PUT', body: JSON.stringify({}) });
      setSelectedInvoice(null);
      await loadData();
    } catch (err) {
      alert(err.message || 'Invoice could not be refunded.');
    }
  };

  const deleteInvoice = async (invoice) => {
    if (!confirm(`Delete invoice ${invoice.invoiceNo}? Patient balances will be recalculated.`)) return;
    try {
      await fetchApi(`/invoices/${invoice.id}`, { method: 'DELETE' });
      await loadData();
    } catch (err) {
      alert(err.message || 'Invoice could not be deleted.');
    }
  };

  const downloadPdf = async (invoice) => {
    try {
      const token = localStorage.getItem('clinic_token');
      const response = await fetch(`${API_URL}/invoices/${invoice.id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('PDF could not be downloaded.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoiceNo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'PDF could not be downloaded.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Invoices & Billing</h1>
          <p className="mt-0.5 text-sm text-gray-500">{receptionist ? 'Reception mode: today invoices only.' : 'Live invoices, payments, refunds, PDFs, and patient balances.'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadData}><RefreshCcw className="h-4 w-4" /> Refresh</Button>
          <Button onClick={() => { setEditInvoice(null); setShowForm(true); }}><Plus className="h-4 w-4" /> New Invoice</Button>
        </div>
      </div>

      {!receptionist && (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[
            ['Total Invoiced', stats.invoiced],
            ['Paid', stats.paid],
            ['Balance Due', stats.balance],
            ['Patient Dues', stats.patientDues],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p><Receipt className="h-4 w-4 text-[var(--primary)]" /></div>
              <p className="text-xl font-black text-gray-900 dark:text-white">{money(value)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm dark:border-white/10 dark:bg-slate-900" placeholder="Search invoice, patient, phone..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {['all', 'paid', 'partial', 'pending', 'refunded'].map(status => (
            <button key={status} onClick={() => setStatusFilter(status)} className={`rounded-lg border px-3 py-2 text-xs font-medium capitalize ${statusFilter === status ? 'border-transparent bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white' : 'border-gray-200 text-gray-600 dark:border-white/10 dark:text-gray-300'}`}>{status}</button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading invoices...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center"><Receipt className="mx-auto mb-3 h-10 w-10 text-gray-300" /><p className="text-sm font-semibold text-gray-700 dark:text-gray-200">No invoices found</p><p className="mt-1 text-xs text-gray-400">Create a real invoice. Demo invoice mode has been removed.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5"><tr>{['Invoice #', 'Date', 'Patient', 'Items', 'Grand Total', 'Paid', 'Balance', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-[var(--primary)]">{inv.invoiceNo}</td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">{String(inv.createdAt || '').slice(0, 10)}</td>
                    <td className="px-4 py-3.5"><p className="text-xs font-semibold text-gray-900 dark:text-white">{inv.client?.name || 'Unknown'}</p><p className="text-[10px] text-gray-500">{inv.client?.phone || ''}</p></td>
                    <td className="max-w-[180px] truncate px-4 py-3.5 text-xs text-gray-600">{normalizeItems(inv.items).map(item => item.description).join(', ')}</td>
                    <td className="px-4 py-3.5 text-xs font-bold text-gray-900 dark:text-white">{money(inv.grandTotal)}</td>
                    <td className="px-4 py-3.5 text-xs text-green-700">{money(inv.amountPaid)}</td>
                    <td className="px-4 py-3.5 text-xs font-bold text-red-600">{money(inv.balanceDue)}</td>
                    <td className="px-4 py-3.5"><Badge label={inv.status} variant={statusVariant[inv.status]} /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelectedInvoice(inv)} className="rounded-lg p-1.5 text-gray-400 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]" title="View"><Eye className="h-3.5 w-3.5" /></button>
                        <button onClick={() => { setEditInvoice(inv); setShowForm(true); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600" title="Edit"><Edit2 className="h-3.5 w-3.5" /></button>
                        {inv.status !== 'paid' && inv.status !== 'refunded' && <button onClick={() => markPaid(inv)} className="rounded-lg p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600" title="Mark paid"><CheckCircle className="h-3.5 w-3.5" /></button>}
                        <button onClick={() => downloadPdf(inv)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="PDF"><Download className="h-3.5 w-3.5" /></button>
                        <button onClick={() => deleteInvoice(inv)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InvoiceFormModal isOpen={showForm} onClose={() => { setShowForm(false); setEditInvoice(null); }} onSave={saveInvoice} invoice={editInvoice} clients={clients} services={services} appointments={appointments} saving={saving} />
      <InvoiceDetailModal invoice={selectedInvoice} isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} onMarkPaid={markPaid} onRefund={refundInvoice} onDownload={downloadPdf} />
    </div>
  );
}
