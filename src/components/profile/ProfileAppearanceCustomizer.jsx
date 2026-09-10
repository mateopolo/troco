import React, { useState, useMemo, useEffect } from 'react';
import {
  Palette, Check, Sparkles, Shuffle, Pipette, Droplets,
  Layers, Wand2, Type, RotateCcw, History
} from 'lucide-react';

/* ============================================================
   🎨 COLOR UTILITIES — the infinite engine
============================================================ */
export const isGradient = (v) => typeof v === 'string' && v.startsWith('linear-gradient');
export const buildGradient = (from, to, angle = 135) => `linear-gradient(${angle}deg, ${from}, ${to})`;
export const accentBackground = (v) =>
  isGradient(v) ? { backgroundImage: v } : { backgroundColor: v };

export function normalizeHex(hex) {
  if (!hex) return '#C67D5B';
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return ('#' + h).toUpperCase();
}

export function hexToHsl(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalizeHex(hex));
  if (!m) return { h: 20, s: 45, l: 56 };
  let r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = x => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`.toUpperCase();
}

export function readableTextOn(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalizeHex(hex));
  if (!m) return '#FFFFFF';
  const lum = (0.299 * parseInt(m[1], 16) + 0.587 * parseInt(m[2], 16) + 0.114 * parseInt(m[3], 16)) / 255;
  return lum > 0.62 ? '#1F2937' : '#FFFFFF';
}

export function parseGradient(v) {
  if (!isGradient(v)) return null;
  const m = /linear-gradient\((\d+)deg,\s*(#[0-9a-fA-F]{3,6}),\s*(#[0-9a-fA-F]{3,6})\)/.exec(v);
  return m ? { angle: +m[1], from: normalizeHex(m[2]), to: normalizeHex(m[3]) } : null;
}

export function getHarmonies(h, s, l) {
  return [
    { name: 'Complémentaire', colors: [hslToHex(h, s, l), hslToHex((h + 180) % 360, s, l)] },
    { name: 'Analogue', colors: [hslToHex((h + 330) % 360, s, l), hslToHex(h, s, l), hslToHex((h + 30) % 360, s, l)] },
    { name: 'Triadique', colors: [hslToHex(h, s, l), hslToHex((h + 120) % 360, s, l), hslToHex((h + 240) % 360, s, l)] },
    { name: 'Nuancier', colors: [hslToHex(h, s, Math.max(15, l - 20)), hslToHex(h, s, l), hslToHex(h, s, Math.min(90, l + 20))] },
  ];
}

/* ============================================================
   🏷️ COLOR NAMES MAP (Pour accessibilité, test suites et tooltips)
============================================================ */
export const COLOR_NAMES = {
  '#C67D5B': 'Troco Rust (Défaut)',
  '#2563EB': 'Ocean Blue',
  '#059669': 'Emerald',
  '#7C3AED': 'Amethyst',
  '#DB2777': 'Rose',
  '#D97706': 'Amber Gold',
  '#0D9488': 'Cyber Teal',
  '#334155': 'Slate Dark',
};

/* Retro-compatibilité avec les tests et composants existants */
export const PROFILE_THEME_COLORS = [
  { id: '#C67D5B', name: 'Troco Rust (Défaut)', color: '#C67D5B', bgSubtle: 'rgba(198, 125, 91, 0.12)' },
  { id: '#2563EB', name: 'Ocean Blue', color: '#2563EB', bgSubtle: 'rgba(37, 99, 235, 0.12)' },
  { id: '#059669', name: 'Emerald', color: '#059669', bgSubtle: 'rgba(5, 150, 105, 0.12)' },
  { id: '#7C3AED', name: 'Amethyst', color: '#7C3AED', bgSubtle: 'rgba(124, 58, 237, 0.12)' },
  { id: '#DB2777', name: 'Rose', color: '#DB2777', bgSubtle: 'rgba(219, 39, 119, 0.12)' },
  { id: '#D97706', name: 'Amber Gold', color: '#D97706', bgSubtle: 'rgba(217, 119, 6, 0.12)' },
  { id: '#0D9488', name: 'Cyber Teal', color: '#0D9488', bgSubtle: 'rgba(13, 148, 136, 0.12)' },
  { id: '#334155', name: 'Slate Dark', color: '#334155', bgSubtle: 'rgba(51, 65, 85, 0.12)' },
];

/* ============================================================
   🔤 FONTS — 23 typographies, categorized
============================================================ */
export const FONT_CATEGORIES = ['Toutes', 'Sans-serif', 'Serif', 'Display', 'Manuscrit', 'Mono'];

export const PROFILE_FONTS = [
  { id: 'Inter', name: 'Inter', category: 'Sans-serif', vibe: 'Moderne & Neutre', font: "'Inter', sans-serif" },
  { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans', category: 'Sans-serif', vibe: 'Startup & Pro', font: "'Plus Jakarta Sans', sans-serif" },
  { id: 'Outfit', name: 'Outfit', category: 'Sans-serif', vibe: 'Design & Tendance', font: "'Outfit', sans-serif" },
  { id: 'Poppins', name: 'Poppins', category: 'Sans-serif', vibe: 'Rond & Chaleureux', font: "'Poppins', sans-serif" },
  { id: 'Montserrat', name: 'Montserrat', category: 'Sans-serif', vibe: 'Géométrique & Audacieux', font: "'Montserrat', sans-serif" },
  { id: 'Space Grotesk', name: 'Space Grotesk', category: 'Sans-serif', vibe: 'Tech & Futuriste', font: "'Space Grotesk', sans-serif" },
  { id: 'Roboto', name: 'Roboto', category: 'Sans-serif', vibe: 'Épuré & Universel', font: "'Roboto', sans-serif" },
  { id: 'Nunito', name: 'Nunito', category: 'Sans-serif', vibe: 'Doux & Amical', font: "'Nunito', sans-serif" },
  { id: 'DM Sans', name: 'DM Sans', category: 'Sans-serif', vibe: 'Minimal & Chic', font: "'DM Sans', sans-serif" },
  { id: 'Sora', name: 'Sora', category: 'Sans-serif', vibe: 'Digital & Net', font: "'Sora', sans-serif" },
  { id: 'Playfair Display', name: 'Playfair Display', category: 'Serif', vibe: 'Élégant & Éditorial', font: "'Playfair Display', serif" },
  { id: 'Lora', name: 'Lora', category: 'Serif', vibe: 'Littéraire & Poétique', font: "'Lora', serif" },
  { id: 'Merriweather', name: 'Merriweather', category: 'Serif', vibe: 'Classique & Fiable', font: "'Merriweather', serif" },
  { id: 'Cormorant Garamond', name: 'Cormorant', category: 'Serif', vibe: 'Luxe & Raffinement', font: "'Cormorant Garamond', serif" },
  { id: 'Bebas Neue', name: 'Bebas Neue', category: 'Display', vibe: 'Impact & Affiche', font: "'Bebas Neue', sans-serif" },
  { id: 'Archivo Black', name: 'Archivo Black', category: 'Display', vibe: 'Bold & Brutal', font: "'Archivo Black', sans-serif" },
  { id: 'Unbounded', name: 'Unbounded', category: 'Display', vibe: 'Cosmique & Large', font: "'Unbounded', sans-serif" },
  { id: 'Syne', name: 'Syne', category: 'Display', vibe: 'Arty & Décalé', font: "'Syne', sans-serif" },
  { id: 'Caveat', name: 'Caveat', category: 'Manuscrit', vibe: 'Manuscrit & Créatif', font: "'Caveat', cursive" },
  { id: 'Pacifico', name: 'Pacifico', category: 'Manuscrit', vibe: 'Surf & Rétro', font: "'Pacifico', cursive" },
  { id: 'Dancing Script', name: 'Dancing Script', category: 'Manuscrit', vibe: 'Romantique & Fluide', font: "'Dancing Script', cursive" },
  { id: 'JetBrains Mono', name: 'JetBrains Mono', category: 'Mono', vibe: 'Code & Précision', font: "'JetBrains Mono', monospace" },
  { id: 'Space Mono', name: 'Space Mono', category: 'Mono', vibe: 'Terminal & Brut', font: "'Space Mono', monospace" },
];

/* ============================================================
   🌈 MOOD PALETTES — curated universes
============================================================ */
export const MOOD_PALETTES = [
  { id: 'signature', name: 'Signatures', emoji: '⭐', colors: ['#C67D5B', '#2563EB', '#059669', '#7C3AED', '#DB2777', '#D97706', '#0D9488', '#334155'] },
  { id: 'sunset', name: 'Coucher de soleil', emoji: '🌇', colors: ['#FF6B6B', '#FF8E53', '#E94560', '#C72C41', '#F9844A', '#F3722C', '#D90368', '#FF5E78'] },
  { id: 'ocean', name: 'Océan & Glace', emoji: '🌊', colors: ['#0077B6', '#00B4D8', '#48CAE4', '#4361EE', '#3A0CA3', '#0466C8', '#168AAD', '#1D3557'] },
  { id: 'forest', name: 'Forêt & Nature', emoji: '🌿', colors: ['#2D6A4F', '#40916C', '#52B788', '#606C38', '#7F4F24', '#95D5B2', '#1B4332', '#A7C957'] },
  { id: 'neon', name: 'Néon & Cyber', emoji: '⚡', colors: ['#FF206E', '#41EAD4', '#00F5D4', '#9B5DE5', '#F15BB5', '#00BBF9', '#FEE440', '#B5179E'] },
  { id: 'pastel', name: 'Pastel & Doux', emoji: '🍬', colors: ['#F4ACB7', '#FFC8DD', '#BDE0FE', '#A2D2FF', '#CDB4DB', '#B9FBC0', '#FDFFB6', '#FFD6A5'] },
  { id: 'earth', name: 'Terre & Minéral', emoji: '🏜️', colors: ['#582F0E', '#7F4F24', '#936639', '#A68A64', '#B6AD90', '#656D4A', '#A44A3F', '#CB793A'] },
  { id: 'mono', name: 'Monochrome', emoji: '🖤', colors: ['#111827', '#1F2937', '#374151', '#4B5563', '#6B7280', '#9CA3AF', '#0F0F0F', '#475569'] },
];

/* ============================================================
   🌄 GRADIENT PRESETS
============================================================ */
export const GRADIENT_PRESETS = [
  { id: 'aurore', name: 'Aurore Boréale', from: '#43E97B', to: '#38F9D7', angle: 135 },
  { id: 'lava', name: 'Lava Flow', from: '#FF416C', to: '#FF4B2B', angle: 135 },
  { id: 'nebula', name: 'Nébuleuse', from: '#8E2DE2', to: '#4A00E0', angle: 135 },
  { id: 'synthwave', name: 'Synthwave', from: '#F953C6', to: '#B91D73', angle: 135 },
  { id: 'golden', name: 'Golden Hour', from: '#F7971E', to: '#FFD200', angle: 135 },
  { id: 'deepsea', name: 'Deep Sea', from: '#1A2980', to: '#26D0CE', angle: 135 },
  { id: 'peach', name: 'Pêche Melba', from: '#FF9A8B', to: '#FF6A88', angle: 135 },
  { id: 'emerald', name: 'Émeraude', from: '#11998E', to: '#38EF7D', angle: 135 },
  { id: 'midnight', name: 'Minuit', from: '#232526', to: '#414345', angle: 135 },
  { id: 'cotton', name: 'Barbe à Papa', from: '#A18CD1', to: '#FBC2EB', angle: 135 },
  { id: 'crepuscule', name: 'Crépuscule', from: '#FA709A', to: '#FEE140', angle: 135 },
  { id: 'cyberpunk', name: 'Cyberpunk', from: '#FCEE21', to: '#009245', angle: 135 },
];

/* ============================================================
   ✨ AMBIENCES — one-click font + color combos
============================================================ */
export const AMBIENCES = [
  { name: 'Startup Pro', font: 'Plus Jakarta Sans', color: '#2563EB' },
  { name: 'Éditorial Luxe', font: 'Playfair Display', color: '#1F2937' },
  { name: 'Créatif Libre', font: 'Caveat', color: '#DB2777' },
  { name: 'Cyber Néon', font: 'Space Grotesk', color: buildGradient('#8E2DE2', '#4A00E0', 135) },
  { name: 'Nature Calme', font: 'Lora', color: '#2D6A4F' },
  { name: 'Bold Studio', font: 'Archivo Black', color: buildGradient('#FF416C', '#FF4B2B', 135) },
];

const RECENT_KEY = 'profile_recent_colors_v1';
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* ============================================================
   🧩 COMPOSANT PRINCIPAL
============================================================ */
export default function ProfileAppearanceCustomizer({
  customFont = 'Inter',
  customThemeColor = '#C67D5B',
  onFontChange,
  onColorChange,
  previewName = 'Alex Rivera',
  previewHandle = '@alex.rivera',
}) {
  const currentFont = customFont || 'Inter';
  const currentColor = customThemeColor || '#C67D5B';
  const gradientMode = isGradient(currentColor);
  const selectedFontObj = PROFILE_FONTS.find(f => f.id === currentFont) || PROFILE_FONTS[0];

  const [mode, setMode] = useState(gradientMode ? 'gradient' : 'solid');
  const [paletteTab, setPaletteTab] = useState('signature');
  const [fontFilter, setFontFilter] = useState('Toutes');
  const [recentColors, setRecentColors] = useState(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch (_) { return []; }
  });

  /* ---- Solid color lab state ---- */
  const solidHex = gradientMode ? '#C67D5B' : normalizeHex(currentColor);
  const hsl = useMemo(() => hexToHsl(solidHex), [solidHex]);
  const [hexDraft, setHexDraft] = useState(solidHex);
  useEffect(() => { setHexDraft(solidHex); }, [solidHex]);
  const harmonies = useMemo(() => getHarmonies(hsl.h, hsl.s, hsl.l), [hsl]);

  /* ---- Gradient state ---- */
  const parsed = parseGradient(currentColor);
  const gFrom = parsed?.from || '#8E2DE2';
  const gTo = parsed?.to || '#4A00E0';
  const gAngle = parsed?.angle ?? 135;

  /* ---- Emit + history ---- */
  const pushRecent = (c) => {
    setRecentColors(prev => {
      const next = [c, ...prev.filter(x => x !== c)].slice(0, 10);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch (_) {}
      return next;
    });
  };
  const emitColor = (c) => {
    if (typeof onColorChange === 'function') onColorChange(c);
    pushRecent(c);
  };
  const emitSolidHsl = (h, s, l) => emitColor(hslToHex(h, s, l));

  /* ---- Shuffle: teleport to another dimension ---- */
  const shuffleAll = () => {
    if (typeof onFontChange === 'function') onFontChange(rand(PROFILE_FONTS).id);
    if (Math.random() > 0.5) {
      const g = rand(GRADIENT_PRESETS);
      emitColor(buildGradient(g.from, g.to, Math.floor(Math.random() * 8) * 45));
    } else {
      emitColor(hslToHex(Math.floor(Math.random() * 360), 55 + Math.floor(Math.random() * 40), 40 + Math.floor(Math.random() * 25)));
    }
  };

  const applyAmbience = (a) => {
    if (typeof onFontChange === 'function') onFontChange(a.font);
    emitColor(a.color);
  };

  const filteredFonts = fontFilter === 'Toutes' ? PROFILE_FONTS : PROFILE_FONTS.filter(f => f.category === fontFilter);
  const activePalette = MOOD_PALETTES.find(p => p.id === paletteTab) || MOOD_PALETTES[0];
  const previewTextColor = gradientMode ? '#FFFFFF' : readableTextOn(solidHex);

  /* ---- Shared micro-styles ---- */
  const labelStyle = {
    fontSize: '11px',
    fontWeight: '800',
    color: 'var(--text-secondary, #6B7280)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  };

  const chipStyle = (active) => ({
    padding: '5px 11px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: '700',
    border: active ? 'none' : '1px solid var(--border-color, rgba(0,0,0,0.12))',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    ...(active
      ? { ...accentBackground(currentColor), color: previewTextColor }
      : { backgroundColor: 'rgba(255,255,255,0.6)', color: 'var(--text-main, #1F2937)' }),
  });

  const renderSwatch = (color, size = 32) => {
    const isSelected = !gradientMode && normalizeHex(currentColor) === normalizeHex(color);
    const swatchTitle = COLOR_NAMES[normalizeHex(color)] || color;

    return (
      <button
        key={color}
        type="button"
        onClick={() => emitColor(normalizeHex(color))}
        title={swatchTitle}
        aria-label={swatchTitle}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: color,
          border: isSelected ? '3px solid var(--text-main, #1F2937)' : '2px solid rgba(255,255,255,0.7)',
          boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.25)' : '0 2px 6px rgba(0,0,0,0.10)',
          transform: isSelected ? 'scale(1.15)' : 'scale(1)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: readableTextOn(color),
          transition: 'transform 0.15s ease, border-color 0.15s ease',
          flexShrink: 0,
        }}
      >
        {isSelected && <Check size={15} strokeWidth={3.5} />}
      </button>
    );
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-subtle, #F7F5F0)',
      borderRadius: '20px',
      padding: '16px 18px',
      border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
      marginTop: '10px',
      marginBottom: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
    }}>
      {/* Slider styling (scoped) */}
      <style>{`
        .pac-slider { -webkit-appearance:none; appearance:none; width:100%; height:12px; border-radius:999px; outline:none; cursor:pointer; }
        .pac-slider::-webkit-slider-thumb { -webkit-appearance:none; width:18px; height:18px; border-radius:50%; background:#fff; border:3px solid #1F2937; box-shadow:0 2px 6px rgba(0,0,0,.3); cursor:grab; }
        .pac-slider::-moz-range-thumb { width:16px; height:16px; border-radius:50%; background:#fff; border:3px solid #1F2937; box-shadow:0 2px 6px rgba(0,0,0,.3); cursor:grab; }
      `}</style>

      {/* ══════════ HEADER ══════════ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '9px',
            color: previewTextColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.25s ease',
            ...accentBackground(currentColor),
          }}>
            <Palette size={16} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main, #1F2937)' }}>
            Apparence & Ambiance de mon Profil Public
          </span>
        </div>
        <button
          type="button"
          onClick={shuffleAll}
          title="Surprends-moi !"
          aria-label="Surprends-moi !"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '999px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: '800',
            color: previewTextColor,
            ...accentBackground(currentColor),
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            transition: 'transform 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Shuffle size={12} /> Surprends-moi
        </button>
      </div>

      {/* ══════════ LIVE MINI-PROFILE PREVIEW ══════════ */}
      <div style={{
        borderRadius: '16px',
        padding: '18px 16px',
        backgroundColor: 'var(--bg-card, #FFFFFF)',
        border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
        fontFamily: selectedFontObj.font,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.25s ease',
      }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          ...accentBackground(currentColor),
          color: previewTextColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          fontWeight: '800',
          boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
        }}>
          {previewName.charAt(0)}
        </div>
        <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main, #1F2937)' }}>{previewName}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary, #6B7280)' }}>{previewHandle}</div>
        <div style={{
          marginTop: '8px',
          padding: '8px 22px',
          borderRadius: '999px',
          ...accentBackground(currentColor),
          color: previewTextColor,
          fontSize: '12px',
          fontWeight: '800',
          boxShadow: '0 3px 10px rgba(0,0,0,0.15)',
        }}>
          Me contacter
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', width: '100%', maxWidth: '220px' }}>
          {[0.9, 0.65, 0.4].map((o, i) => (
            <div key={i} style={{
              flex: 1,
              height: '26px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: '700',
              ...(isGradient(currentColor)
                ? { backgroundImage: currentColor, opacity: o, color: '#FFF' }
                : { backgroundColor: currentColor, opacity: o, color: previewTextColor }),
            }}>
              Lien {i + 1}
            </div>
          ))}
        </div>
        <div style={{ fontSize: '9px', color: 'var(--text-secondary, #9CA3AF)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: "'Inter', sans-serif" }}>
          <Sparkles size={9} /> Aperçu en direct — {selectedFontObj.name}
        </div>
      </div>

      {/* ══════════ AMBIENCES (one-click combos) ══════════ */}
      <div>
        <label style={labelStyle}><Wand2 size={12} /> Ambiances instantanées</label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {AMBIENCES.map(a => (
            <button
              key={a.name}
              type="button"
              onClick={() => applyAmbience(a)}
              style={{
                padding: '6px 12px',
                borderRadius: '10px',
                cursor: 'pointer',
                border: '1px solid var(--border-color, rgba(0,0,0,0.12))',
                backgroundColor: 'var(--bg-card, #FFFFFF)',
                fontSize: '11px',
                fontWeight: '700',
                color: 'var(--text-main, #1F2937)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', ...accentBackground(a.color), flexShrink: 0 }} />
              {a.name}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════ MODE TABS: SOLID / GRADIENT (THÈME & COULEURS) ══════════ */}
      <div>
        <label style={labelStyle}>
          <Droplets size={12} /> Thème & Couleur d'accentuation
        </label>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          {[{ id: 'solid', label: 'Couleur unie', icon: Droplets }, { id: 'gradient', label: 'Dégradé', icon: Layers }].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setMode(t.id);
                if (t.id === 'gradient' && !gradientMode) emitColor(buildGradient(solidHex, hslToHex((hsl.h + 60) % 360, hsl.s, hsl.l), 135));
                if (t.id === 'solid' && gradientMode) emitColor(gFrom);
              }}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: '800',
                transition: 'all 0.15s ease',
                border: mode === t.id ? 'none' : '1px solid var(--border-color, rgba(0,0,0,0.12))',
                ...(mode === t.id
                  ? { ...accentBackground(currentColor), color: previewTextColor }
                  : { backgroundColor: 'rgba(255,255,255,0.6)', color: 'var(--text-secondary, #6B7280)' }),
              }}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* ──────────── SOLID MODE ──────────── */}
        {mode === 'solid' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* COLOR LAB — infinite HSL */}
            <div style={{
              padding: '12px',
              borderRadius: '14px',
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: solidHex,
                  boxShadow: '0 3px 10px rgba(0,0,0,0.2)',
                  flexShrink: 0,
                  transition: 'background-color 0.15s ease'
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main, #1F2937)' }}>Laboratoire de couleur ∞</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary, #6B7280)' }}>16,7 millions de possibilités</div>
                </div>
                <label
                  title="Pipette de couleur"
                  aria-label="Pipette de couleur"
                  style={{
                    position: 'relative',
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color, rgba(0,0,0,0.12))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    backgroundColor: 'rgba(0,0,0,0.03)'
                  }}
                >
                  <Pipette size={15} color="var(--text-main, #1F2937)" />
                  <input
                    type="color"
                    value={solidHex}
                    onChange={e => emitColor(normalizeHex(e.target.value))}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                  />
                </label>
                <input
                  value={hexDraft}
                  onChange={e => {
                    setHexDraft(e.target.value);
                    if (/^#?[0-9a-fA-F]{6}$/.test(e.target.value.trim())) emitColor(normalizeHex(e.target.value.trim()));
                  }}
                  spellCheck={false}
                  aria-label="Code hexadécimal de couleur"
                  style={{
                    width: '82px',
                    padding: '7px 8px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    border: '1px solid var(--border-color, rgba(0,0,0,0.15))',
                    fontFamily: "'JetBrains Mono', monospace",
                    backgroundColor: 'rgba(0,0,0,0.03)',
                    color: 'var(--text-main, #1F2937)',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Hue */}
              <input
                className="pac-slider"
                type="range"
                min="0"
                max="360"
                value={hsl.h}
                aria-label="Teinte (Hue)"
                onChange={e => emitSolidHsl(+e.target.value, hsl.s, hsl.l)}
                style={{ background: 'linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)' }}
              />
              {/* Saturation */}
              <input
                className="pac-slider"
                type="range"
                min="0"
                max="100"
                value={hsl.s}
                aria-label="Saturation"
                onChange={e => emitSolidHsl(hsl.h, +e.target.value, hsl.l)}
                style={{ background: `linear-gradient(90deg, ${hslToHex(hsl.h, 0, hsl.l)}, ${hslToHex(hsl.h, 100, hsl.l)})` }}
              />
              {/* Lightness */}
              <input
                className="pac-slider"
                type="range"
                min="5"
                max="95"
                value={hsl.l}
                aria-label="Luminosité (Lightness)"
                onChange={e => emitSolidHsl(hsl.h, hsl.s, +e.target.value)}
                style={{ background: `linear-gradient(90deg, #000, ${hslToHex(hsl.h, hsl.s, 50)}, #fff)` }}
              />

              {/* Harmonies */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
                {harmonies.map(harm => (
                  <div key={harm.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary, #6B7280)', width: '92px', flexShrink: 0 }}>
                      {harm.name}
                    </span>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {harm.colors.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => emitColor(c)}
                          title={c}
                          aria-label={`Couleur harmonie ${c}`}
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '7px',
                            backgroundColor: c,
                            border: '2px solid rgba(255,255,255,0.8)',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                            cursor: 'pointer',
                            transition: 'transform 0.12s ease'
                          }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MOOD PALETTES */}
            <div>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {MOOD_PALETTES.map(p => (
                  <button key={p.id} type="button" onClick={() => setPaletteTab(p.id)} style={chipStyle(paletteTab === p.id)}>
                    {p.emoji} {p.name}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {activePalette.colors.map(c => renderSwatch(c))}
              </div>
            </div>

            {/* RECENT */}
            {recentColors.length > 0 && (
              <div>
                <label style={labelStyle}><History size={12} /> Récents</label>
                <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                  {recentColors.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => emitColor(c)}
                      title={c}
                      aria-label={`Couleur récente ${c}`}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '8px',
                        ...accentBackground(c),
                        border: '2px solid rgba(255,255,255,0.8)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ──────────── GRADIENT MODE ──────────── */}
        {mode === 'gradient' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              padding: '12px',
              borderRadius: '14px',
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              {/* Live gradient bar */}
              <div style={{
                height: '34px',
                borderRadius: '10px',
                backgroundImage: buildGradient(gFrom, gTo, gAngle),
                boxShadow: '0 3px 10px rgba(0,0,0,0.15)'
              }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {[['Départ', gFrom, v => emitColor(buildGradient(v, gTo, gAngle))], ['Arrivée', gTo, v => emitColor(buildGradient(gFrom, v, gAngle))]].map(([lbl, val, fn]) => (
                  <label key={lbl} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <span style={{
                      position: 'relative',
                      width: '30px',
                      height: '30px',
                      borderRadius: '9px',
                      backgroundColor: val,
                      border: '2px solid rgba(255,255,255,0.8)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                      overflow: 'hidden'
                    }}>
                      <input
                        type="color"
                        value={val}
                        aria-label={`Couleur dégradé ${lbl}`}
                        onChange={e => fn(normalizeHex(e.target.value))}
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                      />
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary, #6B7280)' }}>{lbl}</span>
                  </label>
                ))}
                <div style={{ flex: 1, minWidth: '120px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RotateCcw size={13} color="var(--text-secondary, #6B7280)" />
                  <input
                    className="pac-slider"
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    value={gAngle}
                    aria-label="Angle du dégradé"
                    onChange={e => emitColor(buildGradient(gFrom, gTo, +e.target.value))}
                    style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.15), rgba(0,0,0,0.4))' }}
                  />
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main, #1F2937)', width: '38px' }}>{gAngle}°</span>
                </div>
              </div>
            </div>

            {/* Gradient gallery */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
              {GRADIENT_PRESETS.map(g => {
                const css = buildGradient(g.from, g.to, g.angle);
                const isSel = currentColor === css;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => emitColor(css)}
                    title={g.name}
                    aria-label={`Dégradé ${g.name}`}
                    style={{
                      height: '52px',
                      borderRadius: '12px',
                      backgroundImage: css,
                      cursor: 'pointer',
                      border: isSel ? '3px solid var(--text-main, #1F2937)' : '2px solid rgba(255,255,255,0.6)',
                      boxShadow: isSel ? '0 4px 14px rgba(0,0,0,0.25)' : '0 2px 6px rgba(0,0,0,0.10)',
                      color: '#FFF',
                      fontSize: '10px',
                      fontWeight: '800',
                      textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      paddingBottom: '6px',
                      transform: isSel ? 'scale(1.04)' : 'scale(1)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isSel && <Check size={12} strokeWidth={4} style={{ marginRight: '3px' }} />}
                    {g.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ══════════ TYPOGRAPHY ══════════ */}
      <div>
        <label style={labelStyle}>
          <Type size={12} /> Typographie du Profil Public ({PROFILE_FONTS.length} polices)
        </label>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {FONT_CATEGORIES.map(c => (
            <button key={c} type="button" onClick={() => setFontFilter(c)} style={chipStyle(fontFilter === c)}>
              {c}
            </button>
          ))}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '8px',
          maxHeight: '260px',
          overflowY: 'auto',
          paddingRight: '4px'
        }}>
          {filteredFonts.map(f => {
            const isSelected = currentFont === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onFontChange && onFontChange(f.id)}
                title={f.name}
                aria-label={`Police ${f.name}`}
                style={{
                  padding: '8px 10px',
                  borderRadius: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: isSelected ? '2px solid transparent' : '1px solid var(--border-color, rgba(0,0,0,0.12))',
                  ...(isSelected
                    ? { ...accentBackground(currentColor), color: previewTextColor }
                    : { backgroundColor: 'rgba(255,255,255,0.5)', color: 'var(--text-main, #1F2937)' }),
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  fontFamily: f.font,
                  boxShadow: isSelected ? '0 3px 10px rgba(0,0,0,0.15)' : 'none',
                  transform: isSelected ? 'translateY(-1px)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: '700', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {f.name} {isSelected && <Check size={13} strokeWidth={3.5} />}
                </span>
                <span style={{ fontSize: '10px', opacity: 0.75, fontFamily: "'Inter', sans-serif" }}>{f.vibe}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}