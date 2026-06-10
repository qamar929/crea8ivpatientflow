import { X, Printer, CheckCircle, QrCode } from 'lucide-react';
import { useEffect } from 'react';

// Generate a deterministic fake QR pattern from a string seed
function FakeQR({ seed = 'QR', size = 140 }) {
  const cells = 21;
  const cellSize = size / cells;
  // Deterministic "random" from seed
  const hash = (str) => {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
    return Math.abs(h);
  };
  const grid = Array.from({ length: cells }, (_, row) =>
    Array.from({ length: cells }, (_, col) => {
      // Always fill corners (finder patterns)
      if (
        (row < 8 && col < 8) ||
        (row < 8 && col >= cells - 8) ||
        (row >= cells - 8 && col < 8)
      ) {
        const isEdge =
          row === 0 || row === 7 || col === 0 || col === 7 ||
          (row === cells - 8 || row === cells - 1 || col === 0 || col === 7);
        const inner = row >= 2 && row <= 4 && col >= 2 && col <= 4;
        const innerBR = row >= 2 && row <= 4 && col >= cells - 6 && col <= cells - 4;
        const innerBL = row >= cells - 6 && row <= cells - 4 && col >= 2 && col <= 4;
        if (inner || innerBR || innerBL) return true;
        if (row === 0 || row === 6 || col === 0 || col === 6) return true;
        if (row === cells - 8 || row === cells - 1) return true;
        return false;
      }
      return (hash(seed + row * cells + col) % 3) !== 0;
    })
  );

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {grid.map((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize - 0.5}
              height={cellSize - 0.5}
              fill="#1e293b"
            />
          ) : null
        )
      )}
    </svg>
  );
}

export default function QRCheckin({ appointment, isOpen, onClose, onCheckin }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen || !appointment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-900">QR Check-in</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-5">
          {/* QR Code */}
          <div className="p-4 bg-white border-2 border-gray-200 rounded-xl shadow-sm">
            <FakeQR seed={appointment.id || appointment.clientName} size={160} />
          </div>

          {/* Appointment details */}
          <div className="w-full bg-gray-50 rounded-xl p-4 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-medium">Client</span>
              <span className="font-semibold text-gray-900">{appointment.clientName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-medium">Service</span>
              <span className="font-semibold text-gray-900 text-right max-w-[55%] truncate">{appointment.service}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-medium">Time</span>
              <span className="font-semibold text-gray-900">{appointment.startTime}</span>
            </div>
            {appointment.room && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Room</span>
                <span className="font-semibold text-indigo-600">{appointment.room}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="w-full flex gap-3">
            <button
              onClick={() => window.print()}
              className="flex-1 flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print QR
            </button>
            <button
              onClick={() => { onCheckin && onCheckin(appointment); onClose(); }}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Check In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
