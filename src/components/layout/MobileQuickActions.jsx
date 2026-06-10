import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CreditCard, FileText, MessageCircle, Receipt, Search, Zap, X } from 'lucide-react';
import { mobileQuickActions } from '../../data/dentalOperations';

const iconMap = {
  Search,
  Appointment: Calendar,
  Invoice: Receipt,
  Payment: CreditCard,
  Note: FileText,
  WhatsApp: MessageCircle,
};

export default function MobileQuickActions() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed right-4 bottom-[72px] z-50 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-teal-600 to-indigo-600 text-white shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
        aria-label="Toggle quick actions"
      >
        {isOpen ? (
          <X className="h-5 w-5 transition-transform duration-200 rotate-90" />
        ) : (
          <Zap className="h-5 w-5 fill-current animate-pulse" />
        )}
      </button>

      {/* Backdrop (dismiss actions panel when clicking outside) */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-slate-950/20 backdrop-blur-[1px]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Quick Actions Panel */}
      <div
        className={`md:hidden fixed inset-x-3 bottom-[74px] z-40 rounded-2xl border border-white/70 bg-white/95 p-3.5 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95 transition-all duration-300 origin-bottom-right ${
          isOpen
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        }`}
      >
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/5">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            data-global-search
            className="w-full bg-transparent text-sm font-medium text-gray-800 outline-none placeholder:text-gray-400 dark:text-white"
            placeholder="Search patient no, phone, name..."
          />
        </div>
        <div className="grid grid-cols-6 gap-1">
          {mobileQuickActions.map((action) => {
            const Icon = iconMap[action.label] || Search;
            return (
              <Link
                key={action.label}
                to={action.to}
                onClick={() => setIsOpen(false)}
                className="flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-lg text-[9px] font-bold text-gray-600 transition-colors hover:bg-teal-50 hover:text-teal-700 dark:text-gray-300 dark:hover:bg-white/10"
              >
                <Icon className="h-4 w-4" />
                <span className="leading-none">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

