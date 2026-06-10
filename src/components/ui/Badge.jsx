import clsx from 'clsx';

const variants = {
  confirmed: 'bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  pending: 'bg-amber-100/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  completed: 'bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  cancelled: 'bg-rose-100/80 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
  active: 'bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  inactive: 'bg-gray-100/80 dark:bg-white/5 text-gray-500 dark:text-gray-400',
  'on-leave': 'bg-orange-100/80 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  dental: 'bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  paid: 'bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  refunded: 'bg-gray-100/80 dark:bg-white/5 text-gray-600 dark:text-gray-400',
  Platinum: 'bg-gradient-to-r from-slate-600 to-slate-800 text-white',
  Gold: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white',
  Silver: 'bg-gradient-to-r from-slate-400 to-slate-500 text-white',
  Bronze: 'bg-gradient-to-r from-orange-400 to-orange-500 text-white',
};

export default function Badge({ label, variant, className = '' }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize',
        variants[variant] || 'bg-gray-100/80 dark:bg-white/5 text-gray-600 dark:text-gray-400',
        className
      )}
    >
      {label}
    </span>
  );
}
