import clsx from 'clsx';

export default function StatCard({ title, value, change, changeLabel, icon: Icon, iconColor, iconBg, prefix = '' }) {
  const isPositive = parseFloat(change) >= 0;

  return (
    <div className="luxury-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <div
          className="brand-mark w-10 h-10"
          style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{prefix}{value}</p>
        {change !== undefined && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <span
              className={clsx(
                'text-xs font-semibold px-1.5 py-0.5 rounded-full',
                isPositive
                  ? 'bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-100/80 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
              )}
            >
              {isPositive ? '↑' : '↓'} {Math.abs(change)}%
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{changeLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
