import React from 'react';

/**
 * EmptyState.jsx
 * Composant d'état vide Premium & Apple-grade pour Troco :
 * - Conteneur centré et responsive avec fond bluré et bordure soignée
 * - Grande icône semi-transparente avec halo lumineux (glow effect)
 * - Titre engageant (font-editorial-heading)
 * - Description incitative
 * - Bouton d'action principal ou slot personnalisé
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.icon] - Icône ou élément visuel central
 * @param {string|React.ReactNode} props.title - Titre principal
 * @param {string|React.ReactNode} [props.description] - Description explicative
 * @param {React.ReactNode} [props.action] - Bouton d'action principal
 * @param {React.ReactNode} [props.secondaryAction] - Bouton d'action secondaire optionnel
 * @param {string} [props.glowColor='var(--accent-primary, #C67D5B)'] - Couleur du halo lumineux
 * @param {boolean} [props.compact=false] - Mode compact pour espaces réduits
 * @param {string} [props.className=''] - Classes CSS additionnelles
 * @param {Object} [props.style={}] - Styles personnalisés
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  glowColor = 'var(--accent-primary, #C67D5B)',
  compact = false,
  className = '',
  style = {},
  ...rest
}) {
  return (
    <div
      className={`premium-empty-state ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: compact ? '24px 16px' : '48px 24px',
        borderRadius: compact ? '18px' : '28px',
        backgroundColor: 'var(--bg-card, rgba(255, 255, 255, 0.85))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border-color, rgba(0, 0, 0, 0.08))',
        boxShadow: 'var(--shadow-card, 0 12px 32px rgba(0, 0, 0, 0.06))',
        maxWidth: compact ? '360px' : '480px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
        animation: 'fadeSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
      {...rest}
    >
      {/* HALO LUMINEUX D'ARRIÈRE-PLAN (GLOW EFFECT) */}
      <div
        style={{
          position: 'absolute',
          top: compact ? '15%' : '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: compact ? '110px' : '160px',
          height: compact ? '110px' : '160px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          opacity: 0.18,
          filter: 'blur(24px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* CONTENEUR DE L'ICÔNE CENTRALE */}
      {icon && (
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: compact ? '54px' : '72px',
            height: compact ? '54px' : '72px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-subtle, rgba(0, 0, 0, 0.04))',
            border: '1.5px solid var(--border-color, rgba(0, 0, 0, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-primary, #C67D5B)',
            boxShadow: `0 8px 24px rgba(0, 0, 0, 0.06), 0 0 20px ${glowColor}22`,
            marginBottom: compact ? '14px' : '20px',
            transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {icon}
        </div>
      )}

      {/* TITRE PRINCIPAL */}
      {title && (
        <h3
          className="font-editorial-heading"
          style={{
            position: 'relative',
            zIndex: 1,
            margin: compact ? '0 0 6px 0' : '0 0 10px 0',
            fontSize: compact ? '16px' : '20px',
            fontWeight: '700',
            color: 'var(--text-main, #1F2937)',
            lineHeight: 1.35,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h3>
      )}

      {/* DESCRIPTION INCITATIVE */}
      {description && (
        <p
          style={{
            position: 'relative',
            zIndex: 1,
            margin: compact ? '0 0 16px 0' : '0 0 22px 0',
            fontSize: compact ? '12px' : '13.5px',
            color: 'var(--text-secondary, #6B7280)',
            lineHeight: 1.55,
            maxWidth: '380px',
          }}
        >
          {description}
        </p>
      )}

      {/* ACTIONS (BOUTONS) */}
      {(action || secondaryAction) && (
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            width: '100%',
          }}
        >
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
