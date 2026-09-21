import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  Repeat,
  ShieldCheck,
  Coins,
  ChevronRight,
  Sliders,
  Palette,
  Check,
  X,
} from 'lucide-react';
import { useTheme, TYPOGRAPHY_OPTIONS } from '../contexts/ThemeContext';

export default function DesignStudioModal({
  isOpen = false,
  onClose = () => {},
  isMobile = false,
}) {
  const {
    themeId,
    setThemeId,
    applyPresetTheme,
    allThemes,
    customColors,
    setCustomColors,
    typography,
    setTypography,
    typographyOptions,
    baseZoom,
    setBaseZoom,
    borderRadius,
    setBorderRadius,
    brandColor,
    applyBrandColor,
    globalColorAmbiances,
    resetDesignStudio,
  } = useTheme();

  // Gestion de la touche Échap pour fermer la modale
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[var(--bg-card)] text-[var(--text-main)] rounded-3xl shadow-2xl border border-white/10 flex flex-col no-scrollbar animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-main)',
          borderRadius: '24px',
          maxHeight: '90vh',
          maxWidth: '780px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid var(--border-color)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* EN-TÊTE STICKY DE LA MODALE */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            backgroundColor: 'var(--bg-card)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            padding: '16px 22px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h3
                className="font-editorial-heading"
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: '700',
                  color: 'var(--text-main)',
                }}
              >
                Studio de Design & Accessibilité
              </h3>
              <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                Personnalisez les thèmes, ambiances HSL, typographies et formes
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={resetDesignStudio}
              className="premium-button"
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '999px',
                padding: '6px 12px',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="Réinitialiser toutes les personnalisations"
            >
              <Repeat size={12} /> Réinitialiser
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer le studio de design"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* CORPS DU STUDIO DE DESIGN */}
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. CARTE DE PRÉVISUALISATION EN DIRECT */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--border-radius-main, 14px)',
              border: '1.5px solid var(--border-color)',
              padding: '16px',
              boxShadow: 'var(--shadow-card)',
              transition: 'all 0.25s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '4px 10px',
                  borderRadius: 'var(--border-radius-main, 14px)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--accent-primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Sparkles size={12} /> Aperçu Live
              </span>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: '700',
                  color: 'var(--accent-success)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <ShieldCheck size={13} /> Contraste Garanti (WCAG AA)
              </span>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '10px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: 'var(--border-radius-main, 14px)',
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--accent-contrast-text, #FFF)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '900',
                  fontSize: '20px',
                  boxShadow: 'var(--shadow-accent)',
                  flexShrink: 0,
                }}
              >
                🎸
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h5
                  className="font-editorial-heading"
                  style={{
                    margin: 0,
                    fontSize: '15px',
                    fontWeight: '600',
                    color: 'var(--text-main)',
                    fontFamily: 'var(--font-family-main)',
                  }}
                >
                  Cours Particulier de Guitare & MAO
                </h5>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Par Mateo Polo • Paris 11e • 1 Jeton Troco
                </div>
              </div>
            </div>

            <p
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                margin: '0 0 12px',
                lineHeight: 1.45,
                fontFamily: 'var(--font-family-main)',
              }}
            >
              Session d'apprentissage et de mixage studio. Échange contre dépannage informatique ou bricolage.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--border-radius-main, 14px)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '11.5px',
                  fontWeight: '800',
                }}
              >
                <Coins size={13} color="var(--accent-primary)" /> 1 Jeton Troco
              </div>

              <button
                type="button"
                className="premium-button"
                style={{
                  border: 'none',
                  borderRadius: 'var(--border-radius-main, 14px)',
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                  color: 'var(--accent-contrast-text, #FFF)',
                  fontWeight: '800',
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.2s ease',
                }}
              >
                Proposer un Troco <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* 2. SÉLECTION RAPIDE DES AMBIANCES */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
              Thèmes & Ambiances Prédéfinies
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '10px' }}>
              {(allThemes || []).map((tItem) => {
                const isSelected = themeId === tItem.id;
                return (
                  <button
                    key={tItem.id}
                    type="button"
                    onClick={() => (applyPresetTheme ? applyPresetTheme(tItem.id) : setThemeId(tItem.id))}
                    className="premium-button"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '12px 8px',
                      borderRadius: 'var(--border-radius-main, 14px)',
                      border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'var(--bg-subtle)' : 'var(--bg-card)',
                      cursor: 'pointer',
                      boxShadow: isSelected ? 'var(--shadow-accent)' : 'var(--shadow-card)',
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        boxShadow: '0 3px 8px rgba(0,0,0,0.15)',
                        border: '2px solid rgba(255,255,255,0.7)',
                        marginBottom: '6px',
                      }}
                    >
                      {(tItem.previewColors || []).map((col, idx) => (
                        <div key={idx} style={{ flex: 1, backgroundColor: col, height: '100%' }} />
                      ))}
                    </div>

                    <div style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '2px', textAlign: 'center' }}>
                      {tItem.name}
                    </div>
                    <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.2 }}>
                      {tItem.description}
                    </div>

                    {isSelected && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '5px',
                          right: '5px',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--accent-primary)',
                          color: 'var(--accent-contrast-text, #FFFFFF)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '9px',
                          fontWeight: '900',
                        }}
                      >
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. GÉNÉRATEUR MAGIQUE EN 1 CLIC */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--border-radius-main, 14px)',
              padding: '16px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Sparkles size={16} color="var(--accent-primary)" />
              <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>Générateur Magique (1 Clic)</strong>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
              Choisissez une couleur primaire : le moteur HSL calcule automatiquement l'ensemble des teintes harmoniques, contrastes et ombres.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 14px',
                  borderRadius: 'var(--border-radius-main, 14px)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <input
                  type="color"
                  value={brandColor || '#B98B73'}
                  onChange={(e) => applyBrandColor(e.target.value)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: '2px solid var(--border-color)',
                    cursor: 'pointer',
                    backgroundColor: 'transparent',
                    padding: 0,
                  }}
                />
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)' }}>Couleur de Marque</div>
                  <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{brandColor || '#B98B73'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { hex: '#B98B73', label: 'Terracotta' },
                  { hex: '#D6456E', label: 'Sakura' },
                  { hex: '#0D9488', label: 'Émeraude' },
                  { hex: '#2563EB', label: 'Cobalt' },
                  { hex: '#D97706', label: 'Ambre' },
                  { hex: '#7C3AED', label: 'Violet' },
                  { hex: '#111827', label: 'Titanium' },
                ].map((swatch) => (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => applyBrandColor(swatch.hex)}
                    title={swatch.label}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: swatch.hex,
                      border: brandColor === swatch.hex ? '2.5px solid var(--text-main)' : '2px solid rgba(255,255,255,0.8)',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                      transform: brandColor === swatch.hex ? 'scale(1.15)' : 'scale(1)',
                      transition: 'transform 0.15s ease',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 4. CONTRÔLES AVANCÉS & TYPOGRAPHIE */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--border-radius-main, 14px)',
              padding: '18px 20px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            {/* EN-TÊTE DU STUDIO */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={18} color="var(--accent-primary)" />
                <strong style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: '800' }}>
                  Studio Design, Ambiances & Typographie
                </strong>
              </div>
            </div>

            {/* SÉLECTEUR D'AMBIANCE DE COULEURS GLOBALES (ACCENT COLORS) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Palette size={14} color="var(--accent-primary)" />
                <label style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>
                  Ambiance & Couleur d'Accentuation Globale
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                {(globalColorAmbiances || []).map((amb) => {
                  const isActive = (brandColor && (brandColor === amb.id || brandColor.toLowerCase() === amb.color.toLowerCase())) || (!brandColor && amb.isDefault);
                  return (
                    <button
                      key={amb.id}
                      type="button"
                      onClick={() => applyBrandColor(amb.id)}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: amb.color,
                        border: isActive ? '3px solid var(--text-main)' : '2px solid transparent',
                        cursor: 'pointer',
                        transform: isActive ? 'scale(1.15)' : 'scale(1)',
                        boxShadow: isActive ? `0 4px 14px ${amb.color}66` : '0 2px 6px rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        transition: 'all 0.15s ease',
                      }}
                      title={amb.name}
                    >
                      {isActive && <Check size={18} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SÉLECTEUR DE TYPOGRAPHIE (12+ GOOGLE FONTS AVEC RENDU RÉEL) */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>
                  Typographie Globale (12+ Polices Google Fonts)
                </label>
                <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '800', fontFamily: typographyOptions?.[typography]?.fontFamily }}>
                  Actif : {typographyOptions?.[typography]?.name || typography}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '8px',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  paddingRight: '4px',
                }}
              >
                {Object.values(typographyOptions || TYPOGRAPHY_OPTIONS).map((opt) => {
                  const isSelected = typography === opt.id || (!typography && opt.id === 'inter');
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTypography(opt.id)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        backgroundColor: isSelected ? 'var(--bg-subtle)' : 'transparent',
                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-main)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        fontFamily: opt.fontFamily,
                        boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: '700', lineHeight: 1.2 }}>
                        {opt.name}
                      </span>
                      <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif" }}>
                        {opt.category || 'Google Font'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SLIDERS DE ZOOM ET FORMES */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
              {/* CURSEUR DE ZOOM GLOBAL */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--text-main)' }}>
                    Échelle & Zoom d'Affichage
                  </label>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                    {Math.round((baseZoom || 1.0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.90"
                  max="1.10"
                  step="0.02"
                  value={baseZoom || 1.0}
                  onChange={(e) => setBaseZoom(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  <span>Compact (90%)</span>
                  <span>Standard (100%)</span>
                  <span>Grand (110%)</span>
                </div>
              </div>

              {/* CURSEUR DE FORME */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--text-main)' }}>
                    Forme des Boutons & Cartes
                  </label>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                    {borderRadius >= 900 ? 'Pilule (999px • Cartes max 32px)' : `${borderRadius || 14}px`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="32"
                  step="2"
                  value={borderRadius > 32 ? 32 : (borderRadius ?? 14)}
                  onChange={(e) => setBorderRadius(Number(e.target.value))}
                  style={{ width: '100%', marginBottom: '8px' }}
                />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setBorderRadius(0)}
                    className="premium-button"
                    style={{
                      padding: '4px 10px',
                      borderRadius: '0px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: borderRadius === 0 ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                      color: borderRadius === 0 ? 'var(--accent-contrast-text, #FFF)' : 'var(--text-secondary)',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    Carré (0px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBorderRadius(14)}
                    className="premium-button"
                    style={{
                      padding: '4px 10px',
                      borderRadius: '14px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: borderRadius === 14 ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                      color: borderRadius === 14 ? 'var(--accent-contrast-text, #FFF)' : 'var(--text-secondary)',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    Doux (14px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBorderRadius(999)}
                    className="premium-button"
                    style={{
                      padding: '4px 10px',
                      borderRadius: '999px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: borderRadius >= 900 ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                      color: borderRadius >= 900 ? 'var(--accent-contrast-text, #FFF)' : 'var(--text-secondary)',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    Pilule (999px)
                  </button>
                </div>
              </div>
            </div>

            {/* AJUSTEMENT PRÉCIS DES COULEURS */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
                Ajustement Précis des Couleurs
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '10px' }}>
                {/* Fond */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--border-radius-main, 14px)',
                    padding: '10px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <input
                    type="color"
                    value={customColors?.bg || '#FAF7F2'}
                    onChange={(e) => {
                      setCustomColors({ bg: e.target.value });
                      if (themeId !== 'custom') setThemeId('custom');
                    }}
                    style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1.5px solid var(--border-color)', cursor: 'pointer', padding: 0, backgroundColor: 'transparent' }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)' }}>Fond</div>
                    <div style={{ fontSize: '9.5px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{customColors?.bg || '#FAF7F2'}</div>
                  </div>
                </div>

                {/* Cartes */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--border-radius-main, 14px)',
                    padding: '10px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <input
                    type="color"
                    value={customColors?.card || '#FFFFFF'}
                    onChange={(e) => {
                      setCustomColors({ card: e.target.value });
                      if (themeId !== 'custom') setThemeId('custom');
                    }}
                    style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1.5px solid var(--border-color)', cursor: 'pointer', padding: 0, backgroundColor: 'transparent' }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)' }}>Cartes</div>
                    <div style={{ fontSize: '9.5px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{customColors?.card || '#FFFFFF'}</div>
                  </div>
                </div>

                {/* Texte */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--border-radius-main, 14px)',
                    padding: '10px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <input
                    type="color"
                    value={customColors?.text || '#3F4238'}
                    onChange={(e) => {
                      setCustomColors({ text: e.target.value });
                      if (themeId !== 'custom') setThemeId('custom');
                    }}
                    style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1.5px solid var(--border-color)', cursor: 'pointer', padding: 0, backgroundColor: 'transparent' }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)' }}>Texte</div>
                    <div style={{ fontSize: '9.5px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{customColors?.text || '#3F4238'}</div>
                  </div>
                </div>

                {/* Boutons */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--border-radius-main, 14px)',
                    padding: '10px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <input
                    type="color"
                    value={customColors?.primary || '#B98B73'}
                    onChange={(e) => {
                      setCustomColors({ primary: e.target.value });
                      if (themeId !== 'custom') setThemeId('custom');
                    }}
                    style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1.5px solid var(--border-color)', cursor: 'pointer', padding: 0, backgroundColor: 'transparent' }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)' }}>Boutons</div>
                    <div style={{ fontSize: '9.5px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{customColors?.primary || '#B98B73'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
