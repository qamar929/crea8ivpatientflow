export const receptionDeskSummary = {
  date: '2026-05-25',
  openingFloat: 15000,
  cashReceived: 84500,
  cardReceived: 40000,
  bankReceived: 22000,
  refunds: 0,
  expenses: 8500,
  handoverToOwner: 91000,
};

export const ownerCommandCenter = [
  { label: 'Today Collections', value: 146500, type: 'money', status: 'On track', detail: 'Cash, card, bank, JazzCash/EasyPaisa combined' },
  { label: 'Pending Dues', value: 133000, type: 'money', status: 'Needs follow-up', detail: '17 patient balances, 5 overdue more than 30 days' },
  { label: 'Clinic Health Score', value: 88, type: 'score', status: 'Healthy', detail: 'Revenue, recalls, no-shows, retention, satisfaction' },
  { label: 'Doctor Payouts', value: 323200, type: 'money', status: 'Review due', detail: 'Commission calculated after received payments only' },
];

export const clinicAlerts = [
  { type: 'stock', level: 'urgent', title: 'Low stock: Composite resin A2', detail: '2 units left. Reorder before evening cases.' },
  { type: 'dues', level: 'warning', title: '5 overdue patient balances', detail: 'Auto WhatsApp reminder list is ready.' },
  { type: 'followup', level: 'warning', title: '7 recall patients due this week', detail: 'Scaling, whitening, and RCT crown follow-ups.' },
  { type: 'safety', level: 'info', title: 'Daily cash close pending', detail: 'Reception handover requires owner approval.' },
];

export const clinicReadinessChecklist = [
  { item: 'Role permissions tested for owner, reception, and staff', done: true },
  { item: 'Universal patient search visible on desktop and mobile', done: true },
  { item: 'Daily backup/export workflow prepared', done: true },
  { item: 'Duplicate patient warning by phone number required on forms', done: true },
  { item: 'Payment mismatch and refund confirmation warnings enabled', done: true },
  { item: 'Hostinger deployment database credentials pending final live values', done: false },
];

export const receptionQuickActions = [
  { label: 'New Patient', helper: 'Create profile + unique TSE number', to: '/clients' },
  { label: 'Book Appointment', helper: 'Chair, doctor, reminder status', to: '/appointments' },
  { label: 'Create Invoice', helper: 'Old dues auto-added', to: '/invoices' },
  { label: 'Receive Payment', helper: 'Cash/card/bank/JazzCash/EasyPaisa', to: '/invoices' },
];

export const nextPatientQueue = [
  { time: '10:00', patient: 'Zain Ahmed', patientNo: 'TSE-0001', treatment: 'Root Canal Treatment', action: 'Check in and prepare invoice' },
  { time: '11:45', patient: 'Farah Siddiqui', patientNo: 'TSE-0002', treatment: 'Teeth Whitening', action: 'Before photo required' },
  { time: '13:30', patient: 'Tariq Hussain', patientNo: 'TSE-0003', treatment: 'Scaling & Polishing', action: 'Collect feedback after visit' },
];

export const chairPrepChecklist = [
  { item: 'Patient identity and consent confirmed', done: true },
  { item: 'Allergy and medical risk flags reviewed', done: true },
  { item: 'X-ray/photos opened for doctor', done: false },
  { item: 'Sterilized tray and material kit ready', done: false },
  { item: 'Aftercare message queued for WhatsApp', done: false },
];

export const mobileQuickActions = [
  { label: 'Search', to: '/clients' },
  { label: 'Appointment', to: '/appointments' },
  { label: 'Invoice', to: '/invoices' },
  { label: 'Payment', to: '/invoices' },
  { label: 'Note', to: '/clinical' },
  { label: 'WhatsApp', to: '/marketing' },
];

export const cashMovements = [
  { id: 'cash-001', time: '09:20', type: 'cash-in', patient: 'Zain Ahmed', ref: 'TSE-2026-0446', amount: 22000, method: 'Cash', handledBy: 'Sana Mir' },
  { id: 'cash-002', time: '11:05', type: 'cash-in', patient: 'Farah Siddiqui', ref: 'TSE-2026-0447', amount: 18000, method: 'Card', handledBy: 'Sana Mir' },
  { id: 'cash-003', time: '13:40', type: 'cash-out', patient: 'Clinic Expense', ref: 'Sterilization supplies', amount: 8500, method: 'Cash', handledBy: 'Sana Mir' },
  { id: 'cash-004', time: '15:10', type: 'cash-in', patient: 'Ayesha Khan', ref: 'TSE-2026-0452', amount: 35000, method: 'Bank', handledBy: 'Sana Mir' },
  { id: 'cash-005', time: '17:30', type: 'handover', patient: 'Owner Desk', ref: 'Daily close', amount: 91000, method: 'Cash', handledBy: 'Sana Mir' },
];

export const dentalChart = [
  { tooth: '11', status: 'Veneer planned', priority: 'high', note: 'Shade B1 mockup approved' },
  { tooth: '12', status: 'Veneer planned', priority: 'high', note: 'Include in smile design set' },
  { tooth: '16', status: 'Root canal done', priority: 'medium', note: 'Crown impression next visit' },
  { tooth: '24', status: 'Composite filling', priority: 'medium', note: 'Review occlusion' },
  { tooth: '36', status: 'Implant planned', priority: 'high', note: 'CBCT reviewed' },
  { tooth: '46', status: 'Scaling recall', priority: 'low', note: '6-month hygiene recall' },
];

export const treatmentPlans = [
  {
    id: 'tp-001',
    patient: 'Ayesha Khan',
    patientNo: 'TSE-0005',
    doctor: 'Dr. Ayesha Siddiqui',
    title: 'Smile Design Veneers',
    stage: 'Mockup approved',
    progress: 45,
    estimate: 220000,
    paid: 55000,
    nextStep: 'Prep appointment and final shade confirmation',
  },
  {
    id: 'tp-002',
    patient: 'Zain Ahmed',
    patientNo: 'TSE-0001',
    doctor: 'Dr. Bilal Khan',
    title: 'Root Canal + Zirconia Crown',
    stage: 'RCT completed',
    progress: 70,
    estimate: 52000,
    paid: 22000,
    nextStep: 'Final crown fitting',
  },
  {
    id: 'tp-003',
    patient: 'Bilal Sheikh',
    patientNo: 'TSE-0008',
    doctor: 'Dr. Hammad Raza',
    title: 'Implant Journey',
    stage: 'Surgical planning',
    progress: 30,
    estimate: 145000,
    paid: 65000,
    nextStep: 'Implant placement date confirmation',
  },
];

export const clinicalNotes = [
  { id: 'note-001', time: '10:30', patient: 'Zain Ahmed', author: 'Dr. Bilal Khan', note: 'Anesthesia effective. Canal shaping completed. No post-op complications expected.', followUp: 'Crown appointment in 7 days' },
  { id: 'note-002', time: '12:50', patient: 'Farah Siddiqui', author: 'Dr. Ayesha Siddiqui', note: 'Whitening completed. Mild sensitivity risk explained.', followUp: 'Avoid tea and coffee for 24 hours' },
  { id: 'note-003', time: '15:40', patient: 'Ayesha Khan', author: 'Dr. Ayesha Siddiqui', note: 'Smile design mockup reviewed with patient. B1 shade selected.', followUp: 'Prep visit next week' },
];

export const reportCards = [
  { label: 'Monthly Dental Revenue', value: 735000, trend: 18.4, type: 'money' },
  { label: 'Pending Patient Dues', value: 133000, trend: -6.5, type: 'money' },
  { label: 'Returning Patients', value: 68, trend: 11.2, type: 'number' },
  { label: 'No-show Rate', value: 4.2, trend: -2.1, type: 'percent' },
];

export const doctorCommissionReport = [
  { doctor: 'Dr. Hammad Raza', revenue: 260000, commissionRate: 35, fixedSalary: 0, payout: 91000, cases: 18 },
  { doctor: 'Dr. Ayesha Siddiqui', revenue: 220000, commissionRate: 30, fixedSalary: 0, payout: 66000, cases: 22 },
  { doctor: 'Dr. Bilal Khan', revenue: 165000, commissionRate: 28, fixedSalary: 0, payout: 46200, cases: 14 },
  { doctor: 'Usman Ali', revenue: 0, commissionRate: 0, fixedSalary: 55000, payout: 55000, cases: 36 },
  { doctor: 'Sana Mir', revenue: 0, commissionRate: 0, fixedSalary: 65000, payout: 65000, cases: 0 },
];

export const reportModules = [
  { name: 'Daily Cash Report', ownerOnly: false, status: 'Ready', detail: 'Cash-in, cash-out, refunds, handover, payment methods' },
  { name: 'Appointment Report', ownerOnly: false, status: 'Ready', detail: 'Confirmed, completed, cancelled, no-show, doctor schedule' },
  { name: 'Revenue Report', ownerOnly: true, status: 'Owner only', detail: 'Monthly revenue, expenses, profit, service split' },
  { name: 'Doctor Commission Report', ownerOnly: true, status: 'Owner only', detail: 'Service-wise commission, salary, payouts' },
  { name: 'Pending Dues Report', ownerOnly: true, status: 'Owner only', detail: 'Old balances, partial payments, aging dues' },
  { name: 'Inventory Expense Report', ownerOnly: true, status: 'Owner only', detail: 'Stock value, reorder alerts, supplier cost' },
  { name: 'Reception Activity Report', ownerOnly: true, status: 'Owner only', detail: 'Invoices created, edits, cash handover, audit actions' },
  { name: 'Audit Log Report', ownerOnly: true, status: 'Owner only', detail: 'Login, create, update, delete, permission events' },
];
