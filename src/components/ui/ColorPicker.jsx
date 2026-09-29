import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Copy, Check, Pipette, X } from 'lucide-react';

export const DESIGN_SYSTEM_PALETTE = [
  { hex: '#C67D5B', name: 'Argile Troco' },
  { hex: '#231E1B', name: 'Anthracite' },
  { hex: '#FAF7F2', name: 'Écru' },
  { hex: '#7A8F6A', name: 'Sauge' },
  { hex: '#A8644A', name: 'Terre Cuite' },
  { hex: '#D4AF37', name: 'Or Monopo' },
  { hex: '#EF4444', name: 'Rouge Corail' },
  { hex: '#3B82F6', name: 'Bleu Azur' },
  { hex: '#8B5CF6', name: 'Violet Néon' },
  { hex: '#10B981', name: 'Émeraude' },
  { hex: '#F59E0B', name: 'Ambre Vif' },
  { hex: '#06B6D4', name: 'Cyan Lagon' },
  { hex: '#EC4899', name: 'Rose Fushia' },
  { hex: '#6366F1', name: 'Indigo Royal' },
  { hex: '#84CC16', name: 'Lime Électrique' },
  { hex: '#14B8A6', name: 'Teal Menthe' },
  { hex: '#F97316', name: 'Orange Solaire' },
  { hex: '#E11D48', name: 'Rose Écarlate' },
  { hex: '#64748B', name: 'Ardoise' },
  { hex: '#000000', name: 'Noir Pur' },
];

const DEFAULT_RECENTS = ['#C67D5B', '#231E1B', '#EF4444', '#3B82F6', '#10B981'];
const RECENT_COLORS_KEY = 'troco_recent_colors';

// Pure color conversion math
export function parseHexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return { r: 198, g: 125, b: 91 };
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  if (c.length !== 6) return { r: 198, g: 125, b: 91 };
  const num = parseInt(c, 16);
  if (isNaN(num)) return { r: 198, g: 125, b: 91 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function formatRgbToHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v || 0)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function parseRgbToHsl(r, g, b) {
  const rNorm = Math.max(0, Math.min(255, r)) / 255;
  const gNorm = Math.max(0, Math.min(255, g)) / 255;
  const bNorm = Math.max(0, Math.min(255, b)) / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
      default: break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function formatHslToHex(h, s, l) {
  const hNorm = ((h % 360) + 360) % 360 / 360;
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const lNorm = Math.max(0, Math.min(100, l)) / 100;

  let r, g, b;
  if (sNorm === 0) {
    r = g = b = lNorm;
  } else {
    const hue2rgb = (p, q, t) => {
      let tNorm = t;
      if (tNorm < 0) tNorm += 1;
      if (tNorm > 1) tNorm -= 1;
      if (tNorm < 1 / 6) return p + (q - p) * 6 * tNorm;
      if (tNorm < 1 / 2) return q;
      if (tNorm < 2 / 3) return p + (q - p) * (2 / 3 - tNorm) * 6;
      return p;
    };
    const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
    const p = 2 * lNorm - q;
    r = hue2rgb(p, q, hNorm + 1 / 3);
    g = hue2rgb(p, q, hNorm);
    b = hue2rgb(p, q, hNorm - 1 / 3);
  }
  return formatRgbToHex(r * 255, g * 255, b * 255);
}

export default function ColorPicker({
  color = '#C67D5B',
  onChange,
  onClose,
  title = 'Sélecteur de couleur',
  showClose = false,
  className = '',
  style = {},
}) {
  const [activeTab, setActiveTab] = useState('HEX'); // 'HEX' | 'RGB' | 'HSL'
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef(null);

  // Normalize initial color
  const normalizedHex = useMemo(() => {
    if (!color || typeof color !== 'string') return '#C67D5B';
    return color.startsWith('#') ? color.toUpperCase() : `#${color}`.toUpperCase();
  }, [color]);

  // Intermediate text input state for HEX
  const [hexInput, setHexInput] = useState(normalizedHex);

  useEffect(() => {
    setHexInput(normalizedHex);
  }, [normalizedHex]);

  // Derived RGB and HSL values
  const rgb = useMemo(() => parseHexToRgb(normalizedHex), [normalizedHex]);
  const hsl = useMemo(() => parseRgbToHsl(rgb.r, rgb.g, rgb.b), [rgb]);

  // Recent colors from localStorage (5 max)
  const [recentColors, setRecentColors] = useState(() => {
    try {
      const saved = localStorage.getItem(RECENT_COLORS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 5);
        }
      }
    } catch (e) {
      // Ignore localStorage failure
    }
    return DEFAULT_RECENTS;
  });

  const commitToRecents = useCallback((hexColor) => {
    if (!hexColor) return;
    const cleanHex = hexColor.toUpperCase();
    setRecentColors((prev) => {
      const filtered = prev.filter((c) => c.toUpperCase() !== cleanHex);
      const updated = [cleanHex, ...filtered].slice(0, 5);
      try {
        localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(updated));
      } catch (e) {
        // Ignore
      }
      return updated;
    });
  }, []);

  const handleColorUpdate = useCallback((newHex, commit = false) => {
    if (!newHex) return;
    const formatted = newHex.startsWith('#') ? newHex.toUpperCase() : `#${newHex}`.toUpperCase();
    if (onChange) {
      onChange(formatted);
    }
    if (commit) {
      commitToRecents(formatted);
    }
  }, [onChange, commitToRecents]);

  const handleHexInputChange = (e) => {
    const val = e.target.value;
    setHexInput(val);
    const clean = val.replace('#', '').trim();
    if (/^[0-9A-Fa-f]{6}$/.test(clean)) {
      handleColorUpdate(`#${clean}`, false);
    }
  };

  const handleHexInputBlur = () => {
    const clean = hexInput.replace('#', '').trim();
    if (/^[0-9A-Fa-f]{3}$/.test(clean)) {
      const full = clean.split('').map(x => x + x).join('');
      handleColorUpdate(`#${full}`, true);
    } else if (/^[0-9A-Fa-f]{6}$/.test(clean)) {
      handleColorUpdate(`#${clean}`, true);
    } else {
      setHexInput(normalizedHex);
    }
  };

  const handleRgbChange = (channel, value) => {
    const num = Math.max(0, Math.min(255, parseInt(value, 10) || 0));
    const nextRgb = { ...rgb, [channel]: num };
    const nextHex = formatRgbToHex(nextRgb.r, nextRgb.g, nextRgb.b);
    handleColorUpdate(nextHex, false);
  };

  const handleHslChange = (channel, value) => {
    const maxVal = channel === 'h' ? 360 : 100;
    const num = Math.max(0, Math.min(maxVal, parseInt(value, 10) || 0));
    const nextHsl = { ...hsl, [channel]: num };
    const nextHex = formatHslToHex(nextHsl.h, nextHsl.s, nextHsl.l);
    handleColorUpdate(nextHex, false);
  };

  const handleCopy = () => {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(normalizedHex);
        setCopied(true);
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
      }
    } catch (e) {
      // Ignore
    }
  };

  // Eyedropper API support
  const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;
  const handleEyeDropper = async () => {
    if (!hasEyeDropper) return;
    try {
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      if (result && result.sRGBHex) {
        handleColorUpdate(result.sRGBHex, true);
      }
    } catch (e) {
      // User cancelled
    }
  };

  // Determine contrast text color for the preview swatch
  const isLight = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000 > 128;
  const contrastText = isLight ? '#1F2937' : '#FFFFFF';

  return (
    <div
      role="region"
      aria-label={title}
      className={`troco-color-picker bg-[#1E1B18] text-[#F3EFEA] border border-white/10 rounded-2xl shadow-2xl p-4 w-full max-w-[320px] select-none ${className}`}
      style={{
        boxSizing: 'border-box',
        fontFamily: 'inherit',
        ...style,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header avec Titre & Bouton Fermer */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#A8998C]">
          {title}
        </span>
        <div className="flex items-center gap-1">
          {hasEyeDropper && (
            <button
              type="button"
              onClick={handleEyeDropper}
              className="p-1.5 rounded-lg text-[#A8998C] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Prélever une couleur à l'écran"
              aria-label="Pipette pour prélever une couleur"
            >
              <Pipette size={14} />
            </button>
          )}
          {showClose && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-[#A8998C] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Fermer le sélecteur de couleur"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* GRAND SWATCH PREVIEW */}
      <div
        className="w-full h-16 rounded-xl mb-3 flex items-center justify-between px-3 relative overflow-hidden transition-all shadow-inner border border-black/20"
        style={{
          backgroundColor: normalizedHex,
        }}
      >
        <span
          className="text-base font-extrabold tracking-wider font-mono drop-shadow-sm select-all"
          style={{ color: contrastText }}
        >
          {normalizedHex}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg backdrop-blur-md transition-all cursor-pointer shadow-sm"
          style={{
            backgroundColor: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)',
            color: contrastText,
          }}
          title="Copier la valeur HEX"
          aria-label="Copier la valeur HEX"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{copied ? 'Copié' : 'Copier'}</span>
        </button>
      </div>

      {/* ONGLETS HEX / RGB / HSL */}
      <div
        role="tablist"
        aria-label="Modes de couleurs"
        className="flex items-center gap-1 p-1 bg-black/30 rounded-xl mb-3 border border-white/5"
      >
        {['HEX', 'RGB', 'HSL'].map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-[#C67D5B] text-white shadow-md'
                : 'text-[#A8998C] hover:text-white hover:bg-white/5'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* CONTENU SELON ONGLETS */}
      <div className="space-y-2.5 mb-4">
        {activeTab === 'HEX' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#A8998C] w-12 font-mono">HEX</span>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={hexInput}
                  onChange={handleHexInputChange}
                  onBlur={handleHexInputBlur}
                  placeholder="#C67D5B"
                  maxLength={7}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#C67D5B] focus:ring-1 focus:ring-[#C67D5B]"
                  aria-label="Code couleur hexadécimal"
                />
              </div>
            </div>

            {/* Sliders R, G, B rapides sous HEX */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-red-400 w-4">R</span>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={rgb.r}
                  onChange={(e) => handleRgbChange('r', e.target.value)}
                  onMouseUp={() => commitToRecents(normalizedHex)}
                  onTouchEnd={() => commitToRecents(normalizedHex)}
                  className="flex-1 accent-[#EF4444] h-1.5 bg-black/40 rounded-lg cursor-pointer"
                  aria-label="Curseur Rouge"
                />
                <span className="text-[10px] font-mono text-[#A8998C] w-7 text-right">{rgb.r}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-green-400 w-4">G</span>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={rgb.g}
                  onChange={(e) => handleRgbChange('g', e.target.value)}
                  onMouseUp={() => commitToRecents(normalizedHex)}
                  onTouchEnd={() => commitToRecents(normalizedHex)}
                  className="flex-1 accent-[#10B981] h-1.5 bg-black/40 rounded-lg cursor-pointer"
                  aria-label="Curseur Vert"
                />
                <span className="text-[10px] font-mono text-[#A8998C] w-7 text-right">{rgb.g}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-blue-400 w-4">B</span>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={rgb.b}
                  onChange={(e) => handleRgbChange('b', e.target.value)}
                  onMouseUp={() => commitToRecents(normalizedHex)}
                  onTouchEnd={() => commitToRecents(normalizedHex)}
                  className="flex-1 accent-[#3B82F6] h-1.5 bg-black/40 rounded-lg cursor-pointer"
                  aria-label="Curseur Bleu"
                />
                <span className="text-[10px] font-mono text-[#A8998C] w-7 text-right">{rgb.b}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'RGB' && (
          <div className="space-y-2">
            {[
              { key: 'r', label: 'R (Rouge)', val: rgb.r, color: '#EF4444' },
              { key: 'g', label: 'G (Vert)', val: rgb.g, color: '#10B981' },
              { key: 'b', label: 'B (Bleu)', val: rgb.b, color: '#3B82F6' },
            ].map(({ key, label, val, color: accentColor }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#A8998C] w-14">{label.slice(0, 1)}</span>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={val}
                  onChange={(e) => handleRgbChange(key, e.target.value)}
                  onMouseUp={() => commitToRecents(normalizedHex)}
                  onTouchEnd={() => commitToRecents(normalizedHex)}
                  className="flex-1 h-1.5 bg-black/40 rounded-lg cursor-pointer"
                  style={{ accentColor }}
                  aria-label={`Curseur ${label}`}
                />
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={val}
                  onChange={(e) => handleRgbChange(key, e.target.value)}
                  onBlur={() => commitToRecents(normalizedHex)}
                  className="w-12 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-xs font-mono text-white text-center focus:outline-none focus:border-[#C67D5B]"
                  aria-label={`Valeur ${label}`}
                />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'HSL' && (
          <div className="space-y-2">
            {/* Hue slider avec dégradé spectral */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#A8998C] w-14">H (0-360)</span>
              <input
                type="range"
                min="0"
                max="360"
                value={hsl.h}
                onChange={(e) => handleHslChange('h', e.target.value)}
                onMouseUp={() => commitToRecents(normalizedHex)}
                onTouchEnd={() => commitToRecents(normalizedHex)}
                className="flex-1 h-2 rounded-lg cursor-pointer appearance-none"
                style={{
                  background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
                }}
                aria-label="Curseur Teinte Hue"
              />
              <input
                type="number"
                min="0"
                max="360"
                value={hsl.h}
                onChange={(e) => handleHslChange('h', e.target.value)}
                onBlur={() => commitToRecents(normalizedHex)}
                className="w-12 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-xs font-mono text-white text-center focus:outline-none focus:border-[#C67D5B]"
                aria-label="Valeur Teinte Hue"
              />
            </div>

            {/* Saturation slider */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#A8998C] w-14">S (%)</span>
              <input
                type="range"
                min="0"
                max="100"
                value={hsl.s}
                onChange={(e) => handleHslChange('s', e.target.value)}
                onMouseUp={() => commitToRecents(normalizedHex)}
                onTouchEnd={() => commitToRecents(normalizedHex)}
                className="flex-1 accent-[#C67D5B] h-1.5 bg-black/40 rounded-lg cursor-pointer"
                aria-label="Curseur Saturation"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={hsl.s}
                onChange={(e) => handleHslChange('s', e.target.value)}
                onBlur={() => commitToRecents(normalizedHex)}
                className="w-12 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-xs font-mono text-white text-center focus:outline-none focus:border-[#C67D5B]"
                aria-label="Valeur Saturation"
              />
            </div>

            {/* Lightness slider */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#A8998C] w-14">L (%)</span>
              <input
                type="range"
                min="0"
                max="100"
                value={hsl.l}
                onChange={(e) => handleHslChange('l', e.target.value)}
                onMouseUp={() => commitToRecents(normalizedHex)}
                onTouchEnd={() => commitToRecents(normalizedHex)}
                className="flex-1 accent-[#C67D5B] h-1.5 bg-black/40 rounded-lg cursor-pointer"
                aria-label="Curseur Luminosité"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={hsl.l}
                onChange={(e) => handleHslChange('l', e.target.value)}
                onBlur={() => commitToRecents(normalizedHex)}
                className="w-12 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-xs font-mono text-white text-center focus:outline-none focus:border-[#C67D5B]"
                aria-label="Valeur Luminosité"
              />
            </div>
          </div>
        )}
      </div>

      {/* 5 COULEURS RÉCENTES */}
      <div className="mb-3">
        <div className="text-[11px] font-bold text-[#A8998C] mb-1.5 flex items-center justify-between">
          <span>Récents (5)</span>
          <span className="text-[10px] opacity-60">Persistant</span>
        </div>
        <div className="flex items-center gap-2">
          {recentColors.map((recentHex, idx) => {
            const isSelected = normalizedHex.toLowerCase() === recentHex.toLowerCase();
            return (
              <button
                key={`recent-${recentHex}-${idx}`}
                type="button"
                onClick={() => handleColorUpdate(recentHex, true)}
                className={`w-7 h-7 rounded-lg transition-transform cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C67D5B] relative ${
                  isSelected ? 'scale-110 shadow-lg ring-2 ring-[#C67D5B]' : 'hover:scale-105'
                }`}
                style={{
                  backgroundColor: recentHex,
                  border: isSelected ? '2px solid #FFFFFF' : '1px solid rgba(255,255,255,0.2)',
                }}
                title={`Couleur récente ${recentHex}`}
                aria-label={`Couleur récente ${recentHex}`}
              />
            );
          })}
        </div>
      </div>

      {/* PALETTE DESIGN SYSTEM (20 COULEURS) */}
      <div>
        <div className="text-[11px] font-bold text-[#A8998C] mb-1.5">
          Palette Système (20)
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {DESIGN_SYSTEM_PALETTE.map((swatch) => {
            const isSelected = normalizedHex.toLowerCase() === swatch.hex.toLowerCase();
            return (
              <button
                key={swatch.hex}
                type="button"
                onClick={() => handleColorUpdate(swatch.hex, true)}
                className={`h-6 rounded-md transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C67D5B] ${
                  isSelected
                    ? 'scale-110 shadow-md ring-2 ring-white z-10'
                    : 'hover:scale-105 opacity-90 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: swatch.hex,
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
                title={`${swatch.name} (${swatch.hex})`}
                aria-label={`${swatch.name} ${swatch.hex}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
