// "What's New" feature announcements shown to clinic owners/managers.
// Add a new entry at the TOP each time a feature ships. Each unseen entry shows
// a badge; opening the panel marks everything seen (stored in localStorage), so
// the badge clears once the owner has explored the updates.
//
// id MUST be unique & stable (changing it re-shows the item). Newest first.
export const WHATS_NEW = [
  {
    id: 'procedure-status-2026-06-29',
    date: '2026-06-29',
    tag: 'New',
    title: 'Procedure status tracking',
    body: 'Mark each dental procedure as Planned, In progress or Completed — shown as a colour-coded badge in the patient profile.',
    href: '/clients',
  },
  {
    id: 'financials-margins-2026-06-29',
    date: '2026-06-29',
    tag: 'Improved',
    title: 'Procedure profit at a glance',
    body: 'Procedure Cost Tracking now labels the Patient charge / Internal cost fields, shows profit margin % per item and a Revenue / Cost / Profit summary. Add Expense gained a PKR prefix and quick category chips.',
    href: '/financials',
  },
  {
    id: 'financials-expenses-2026-06-28',
    date: '2026-06-28',
    tag: 'New',
    title: 'Financials, Expenses & Profit',
    body: 'Record expenses with receipts, track internal procedure costs per invoice, and see revenue vs gross/net profit, monthly trends and procedure profitability.',
    href: '/financials',
  },
  {
    id: 'dental-procedure-details-2026-06-28',
    date: '2026-06-28',
    tag: 'New',
    title: 'Dental Procedure Details',
    body: 'Capture structured tooth, jaw, material, canal, extraction and follow-up details, plus a full treatment timeline on each patient profile.',
    href: '/clients',
  },
  {
    id: 'invoice-branding-2026-06-24',
    date: '2026-06-24',
    tag: 'New',
    title: 'Invoice payment details & stamp',
    body: 'Add your bank / account details, payment terms and a clinic stamp or signature in Settings — they now appear professionally on every invoice.',
    href: '/settings',
  },
  {
    id: 'ai-receptionist-2026-06-22',
    date: '2026-06-22',
    tag: 'AI',
    title: 'AI Receptionist Builder',
    body: 'On the AppointmentFlow AI plan you can build a WhatsApp receptionist with your own persona, knowledge base and a sandbox to test replies before going live.',
    href: '/ai-receptionist',
  },
];

const SEEN_KEY = 'pf_whatsnew_seen';

export function getSeenIds() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); }
  catch (_) { return []; }
}

export function markAllSeen() {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(WHATS_NEW.map((a) => a.id))); }
  catch (_) { /* ignore */ }
}

export function unseenCount() {
  const seen = getSeenIds();
  return WHATS_NEW.filter((a) => !seen.includes(a.id)).length;
}
