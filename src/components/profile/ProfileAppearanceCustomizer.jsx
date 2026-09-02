import React from 'react';
import { Type, Palette, Check, Sparkles } from 'lucide-react';

export const PROFILE_FONTS = [
  { id: 'Inter', name: 'Inter', category: 'Moderne & Neutre', font: "'Inter', sans-serif" },
  { id: 'Playfair Display', name: 'Playfair Display', category: 'Élégant & Éditorial', font: "'Playfair Display', serif" },
  { id: 'Roboto', name: 'Roboto', category: 'Épuré & Universel', font: "'Roboto', sans-serif" },
  { id: 'Montserrat', name: 'Montserrat', category: 'Géométrique & Audacieux', font: "'Montserrat', sans-serif" },
  { id: 'Poppins', name: 'Poppins', category: 'Rond & Chaleureux', font: "'Poppins', sans-serif" },
  { id: 'Space Grotesk', name: 'Space Grotesk', category: 'Tech & Futuriste', font: "'Space Grotesk', sans-serif" },
  { id: 'Caveat', name: 'Caveat', category: 'Manuscrit & Créatif', font: "'Caveat', cursive" },
  { id: 'Lora', name: 'Lora', category: 'Littéraire & Poétique', font: "'Lora', serif" },
  { id: 'Outfit', name: 'Outfit', category: 'Design & Tendance', font: "'Outfit', sans-serif" },
  { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans', category: 'Startup & Pro', font: "'Plus Jakarta Sans', sans-serif" },
];

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

export default function ProfileAppearanceCustomizer({
  customFont = 'Inter',
  customThemeColor = '#C67D5B',
  onFontChange,
  onColorChange,
}) {
  const currentFont = customFont || 'Inter';
  const currentColor = customThemeColor || '#C67D5B';
  const selectedFontObj = PROFILE_FONTS.find(f => f.id === currentFont) || PROFILE_FONTS[0];

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
      gap: '14px',
    }}>
      {/* EN-TÊTE SECTION */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            backgroundColor: currentColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF',
            transition: 'background-color 0.2s ease'
          }}>
            <Palette size={16} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main, #1F2937)' }}>
            Apparence & Ambiance de mon Profil Public
          </span>
        </div>

        {/* APERÇU MINIATURE EN DIRECT */}
        <div style={{
          padding: '4px 12px',
          borderRadius: '999px',
          backgroundColor: currentColor,
          color: '#FFFFFF',
          fontSize: '11px',
          fontWeight: '800',
          fontFamily: selectedFontObj.font,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <Sparkles size={12} />
          <span>Aperçu : {selectedFontObj.name}</span>
        </div>
      </div>

      {/* SÉLECTEUR DE COULEURS D'ACCENTUATION */}
      <div>
        <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary, #6B7280)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>
          Thème & Couleur d'accentuation
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {PROFILE_THEME_COLORS.map((tc) => {
            const isSelected = currentColor.toLowerCase() === tc.id.toLowerCase();
            return (
              <button
                key={tc.id}
                type="button"
                onClick={() => onColorChange && onColorChange(tc.id)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: tc.color,
                  border: isSelected ? '3px solid var(--text-main, #1F2937)' : '2px solid transparent',
                  cursor: 'pointer',
                  transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                  boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 6px rgba(0,0,0,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  transition: 'transform 0.15s ease, border-color 0.15s ease'
                }}
                title={tc.name}
              >
                {isSelected && <Check size={16} strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* SÉLECTEUR DE POLICES GOOGLE FONTS */}
      <div>
        <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary, #6B7280)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>
          Typographie du Profil Public (8+ Polices)
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
          {PROFILE_FONTS.map((f) => {
            const isSelected = currentFont === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onFontChange && onFontChange(f.id)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '12px',
                  border: isSelected ? `2px solid ${currentColor}` : '1px solid var(--border-color, rgba(0,0,0,0.12))',
                  backgroundColor: isSelected ? 'var(--bg-card, #FFFFFF)' : 'rgba(255, 255, 255, 0.5)',
                  color: isSelected ? currentColor : 'var(--text-main, #1F2937)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  fontFamily: f.font,
                  boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  transform: isSelected ? 'translateY(-1px)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: '700', lineHeight: 1.2 }}>
                  {f.name}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary, #6B7280)', fontFamily: "'Inter', sans-serif" }}>
                  {f.category}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}