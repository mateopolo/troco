import React, { useState } from 'react';
import {
  HeartHandshake, Coins, Clock,
  Sparkles, Check, X
} from 'lucide-react';

export default function VisioSettlementModal({
  isOpen,
  onClose,
  callDuration = 0, // En secondes
  partnerName = 'Partenaire',
  onTransferTokens,
  currentUserTokens = 10,
  darkMode = false,
}) {
  const [selectedTokens, setSelectedTokens] = useState(() => {
    const minutes = Math.ceil(callDuration / 60);
    return Math.max(1, Math.min(5, Math.ceil(minutes / 30)));
  });
  const [includeInsurance, setIncludeInsurance] = useState(false);
  const [isTransferred, setIsTransferred] = useState(false);

  if (!isOpen) return null;

  // Calcul du temps formaté
  const hours = Math.floor(callDuration / 3600);
  const minutes = Math.floor((callDuration % 3600) / 60);
  const seconds = callDuration % 60;
  const formattedTime = hours > 0
    ? `${hours}h ${minutes.toString().padStart(2, '0')}min`
    : `${minutes}min ${seconds.toString().padStart(2, '0')}s`;

  // Équivalence recommandée en jetons (1h = 1 jeton)
  const calculatedTokens = Math.max(1, Math.ceil(callDuration / 3600) || 1);

  const handleConfirmTransfer = () => {
    if (typeof onTransferTokens === 'function') {
      try {
        onTransferTokens({
          tokens: selectedTokens,
          insurance: includeInsurance,
          duration: callDuration,
        });
      } catch (err) {
        console.warn('[VisioSettlement] Error:', err);
      }
    }
    setIsTransferred(true);
    setTimeout(() => {
      onClose?.();
    }, 1500);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000010,
        backgroundColor: 'var(--overlay-bg)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.25s ease-out',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '28px',
          padding: '28px 24px',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-main)',
          textAlign: 'center',
          position: 'relative',
          animation: 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* BOUTON FERMER */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            border: 'none',
            backgroundColor: 'var(--bg-subtle)',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            color: 'var(--text-main)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={16} />
        </button>

        {/* ICÔNE DE FIN DE SESSION */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: 'var(--shadow-accent)',
          }}
        >
          <HeartHandshake size={32} />
        </div>

        <h3 className="font-editorial-heading" style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: '600', color: 'var(--text-main)' }}>
          Session terminée avec succès !
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Rétribuez <strong>{partnerName}</strong> pour son temps et ses conseils en Jetons Troco.
        </p>

        {/* BILAN DE TEMPS ET ÉQUIVALENCE JETONS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: '20px',
            padding: '16px',
            marginBottom: '20px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)', paddingRight: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              <Clock size={12} color="var(--accent-primary)" /> Durée d'appel
            </div>
            <div style={{ fontSize: '19px', fontWeight: '900', color: 'var(--text-main)', marginTop: '4px' }}>
              {formattedTime}
            </div>
          </div>

          <div style={{ textAlign: 'center', paddingLeft: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: 'var(--accent-warning)', textTransform: 'uppercase' }}>
              <Coins size={12} /> Équivalent Jetons
            </div>
            <div style={{ fontSize: '19px', fontWeight: '900', color: 'var(--accent-warning)', marginTop: '4px' }}>
              {calculatedTokens} Jeton{calculatedTokens > 1 ? 's' : ''} 🪙
            </div>
          </div>
        </div>

        {/* SÉLECTEUR DE JETONS À TRANSFÉRER */}
        <div style={{ textAlign: 'left', marginBottom: '18px' }}>
          <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>
            Nombre de Jetons Troco à transférer :
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 2, 3, 4, 5].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => setSelectedTokens(num)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: '12px',
                  border: selectedTokens === num ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  backgroundColor: selectedTokens === num ? 'var(--bg-subtle)' : 'var(--bg-card)',
                  color: selectedTokens === num ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {num} 🪙
              </button>
            ))}
          </div>
        </div>

        {/* STRUCTURE DE FRAIS TRANSPARENTE */}
        <div
          style={{
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: '16px',
            padding: '12px 14px',
            marginBottom: '20px',
            textAlign: 'left',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Frais de service & plateforme Troco :</span>
            <span style={{ fontWeight: '800', color: 'var(--accent-success)' }}>0,00 € (100% Gratuit)</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Transfert de Jetons solidaire :</span>
            <span style={{ fontWeight: '800', color: 'var(--accent-warning)' }}>-{selectedTokens} Jeton{selectedTokens > 1 ? 's' : ''}</span>
          </div>

          {/* OPTION MICRO-ASSURANCE OPTIONNELLE */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              borderRadius: '10px',
              backgroundColor: includeInsurance ? 'var(--bg-card)' : 'transparent',
              border: includeInsurance ? '1px solid var(--accent-success)' : '1px solid var(--border-color)',
              cursor: 'pointer',
              marginTop: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={includeInsurance}
                onChange={(e) => setIncludeInsurance(e.target.checked)}
                style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>
                  🛡️ Option Sérénité & Assurance
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                  Protection du matériel & garantie d'engagement
                </div>
              </div>
            </div>
            <span style={{ fontSize: '12px', fontWeight: '800', color: includeInsurance ? 'var(--accent-success)' : 'var(--text-secondary)' }}>
              +1,99 €
            </span>
          </label>
        </div>

        {/* BOUTON D'ACTION PRINCIPAL */}
        <button
          onClick={handleConfirmTransfer}
          disabled={currentUserTokens < selectedTokens}
          className="premium-button"
          style={{
            width: '100%',
            background: currentUserTokens < selectedTokens ? 'var(--border-color)' : (isTransferred ? 'linear-gradient(135deg, var(--accent-success) 0%, var(--accent-success) 100%)' : 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)'),
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '16px',
            padding: '14px',
            fontWeight: '800',
            fontSize: '14px',
            cursor: currentUserTokens < selectedTokens ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: currentUserTokens < selectedTokens ? 'none' : 'var(--shadow-accent)',
            transition: 'all 0.2s ease',
          }}
        >
          {isTransferred ? (
            <>
              <Check size={18} /> Jetons transférés avec succès !
            </>
          ) : (
            <>
              <Sparkles size={18} /> Transférer {selectedTokens} Jeton{selectedTokens > 1 ? 's' : ''} à {partnerName}
            </>
          )}
        </button>

        {/* LIEN PASSER */}
        {!isTransferred && (
          <button
            onClick={onClose}
            style={{
              marginTop: '10px',
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Clôturer sans transférer de jetons
          </button>
        )}
      </div>
    </div>
  );
}

