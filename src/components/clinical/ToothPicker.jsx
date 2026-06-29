import clsx from 'clsx';

// FDI / ISO 3950 adult dentition. Top arch left→right as the clinician views it:
// upper-right quadrant (18→11) then upper-left (21→28); lower mirrors below.
const UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

// Clickable dental chart. Sets the tooth number (FDI) for the selected procedure.
export default function ToothPicker({ value, onChange }) {
  const Tooth = ({ n }) => {
    const selected = String(value) === String(n);
    return (
      <button
        type="button"
        title={`Tooth ${n}`}
        onClick={() => onChange(selected ? '' : String(n))}
        className={clsx(
          'h-7 w-7 shrink-0 rounded-md border text-[10px] font-bold transition-colors',
          selected
            ? 'border-transparent bg-[var(--primary)] text-white shadow'
            : 'border-gray-200 bg-white text-gray-500 hover:border-[var(--primary)] hover:text-[var(--primary)] dark:border-white/10 dark:bg-slate-900 dark:text-gray-400'
        )}
      >
        {n}
      </button>
    );
  };

  const Row = ({ teeth }) => (
    <div className="flex items-center justify-center gap-1">
      {teeth.slice(0, 8).map((n) => <Tooth key={n} n={n} />)}
      <div className="mx-1 h-6 w-px bg-gray-200 dark:bg-white/10" />
      {teeth.slice(8).map((n) => <Tooth key={n} n={n} />)}
    </div>
  );

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Select tooth (FDI chart)</p>
        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-300">{value ? `Tooth ${value}` : 'None selected'}</p>
      </div>
      <div className="overflow-x-auto">
        <div className="mx-auto w-max space-y-1.5">
          <Row teeth={UPPER} />
          <div className="h-px bg-gray-200 dark:bg-white/10" />
          <Row teeth={LOWER} />
        </div>
      </div>
    </div>
  );
}
