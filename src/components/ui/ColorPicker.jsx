import { useState, useEffect } from 'react';

// Shared preset palette (kept in sync with Settings).
export const PRESET_COLORS = [
  { label: 'Clinic Teal', value: '#0f766e' },
  { label: 'Signature Rose', value: '#be3455' },
  { label: 'Medical Blue', value: '#2563eb' },
  { label: 'Forest', value: '#15803d' },
  { label: 'Plum', value: '#7e22ce' },
  { label: 'Graphite', value: '#334155' },
  { label: 'Cyan', value: '#0891b2' },
  { label: 'Coral', value: '#e11d48' },
];

const clampHex = (v) => {
  let h = (v || '').trim();
  if (h && h[0] !== '#') h = '#' + h;
  return h;
};
const isValidHex = (h) => /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(h || '');

const expand3 = (h) => (h.length === 4 ? '#' + [...h.slice(1)].map((c) => c + c).join('') : h);

export const hexToRgb = (hex) => {
  const h = expand3(clampHex(hex));
  if (!isValidHex(h)) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  };
};
export const rgbToHex = ({ r, g, b }) => {
  const c = (n) => Math.max(0, Math.min(255, Math.round(Number(n) || 0))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
};

/**
 * Precise color picker: visual swatch (native picker), editable #hex code,
 * R/G/B numeric inputs, and preset swatches. Calls onChange(hex) with a
 * normalized 6-digit lowercase hex whenever the value is valid.
 */
export default function ColorPicker({ label, value, onChange, presets = PRESET_COLORS }) {
  const normalized = isValidHex(expand3(clampHex(value))) ? expand3(clampHex(value)).toLowerCase() : '#0f766e';
  const [hexText, setHexText] = useState(normalized);
  const rgb = hexToRgb(normalized);

  // Keep the text box in sync when the value changes from outside (presets, RGB).
  useEffect(() => { setHexText(normalized); }, [normalized]);

  const commitHex = (raw) => {
    const h = expand3(clampHex(raw));
    if (isValidHex(h)) onChange(h.toLowerCase());
  };

  const setChannel = (key, raw) => {
    const next = { ...rgb, [key]: raw };
    onChange(rgbToHex(next));
  };

  return (
    <div>
      {label && <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">{label}</label>}

      <div className="flex items-center gap-3 flex-wrap">
        {/* Visual swatch / native picker */}
        <div className="relative">
          <input
            type="color"
            value={normalized}
            onChange={(e) => onChange(e.target.value.toLowerCase())}
            className="w-11 h-11 rounded-lg cursor-pointer border border-gray-200 p-0.5 bg-white"
            title="Pick a color"
          />
        </div>

        {/* Hex #code input */}
        <div>
          <div className="flex items-center rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-300">
            <span className="px-2 text-gray-400 text-sm font-mono select-none">#</span>
            <input
              type="text"
              value={hexText.replace(/^#/, '')}
              onChange={(e) => setHexText('#' + e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6))}
              onBlur={() => commitHex(hexText)}
              onKeyDown={(e) => e.key === 'Enter' && commitHex(hexText)}
              placeholder="0f766e"
              maxLength={6}
              className="w-[88px] py-2 pr-2 text-sm font-mono uppercase bg-transparent focus:outline-none text-gray-800 dark:text-gray-100"
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Hex code</p>
        </div>

        {/* RGB numeric inputs */}
        <div className="flex items-end gap-1.5">
          {['r', 'g', 'b'].map((ch) => (
            <div key={ch}>
              <input
                type="number"
                min="0"
                max="255"
                value={rgb[ch]}
                onChange={(e) => setChannel(ch, e.target.value)}
                className="w-14 py-2 px-2 text-sm text-center rounded-lg border border-gray-200 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-800 dark:text-gray-100"
              />
              <p className="text-[10px] text-gray-400 mt-1 text-center uppercase">{ch}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Preset swatches */}
      {presets?.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mt-3">
          {presets.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => onChange(c.value.toLowerCase())}
              title={c.label}
              className={`w-7 h-7 rounded-lg transition-all ${
                normalized === c.value.toLowerCase()
                  ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                  : 'hover:scale-105'
              }`}
              style={{ background: c.value }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
