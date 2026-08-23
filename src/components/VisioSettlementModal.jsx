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
    if (onTransferTokens) {
      onTransferTokens({
        tokens: selectedTokens,
        insurance: includeInsurance,
        duration: callDuration,
      });
    }
    setIsTransferred(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 5000,
        backgroundColor: 'rgba(61, 53, 48, 0.72)',
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
          backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
          borderRadius: '28px',
          padding: '28px 24px',
          boxShadow: darkMode
            ? '0 25px 60px rgba(0,0,0,0.8), 0 0 40px rgba(198,125,91,0.2)'
            : '0 25px 60px rgba(61,53,48,0.25)',
          border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
          color: darkMode ? '#FAF7F2' : '#3D3530',
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
            backgroundColor: darkMode ? 'rgba(232,221,211,0.1)' : '#F5EAE4',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            color: darkMode ? '#FAF7F2' : '#3D3530',
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
            background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(198,125,91,0.35)',
          }}
        >
          <HeartHandshake size={32} />
        </div>

        <h3 className="font-editorial-heading" style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
          Session terminée avec succès !
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54', lineHeight: 1.5 }}>
          Rétribuez <strong>{partnerName}</strong> pour son temps et ses conseils en Jetons Troco.
        </p>

        {/* BILAN DE TEMPS ET ÉQUIVALENCE JETONS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            backgroundColor: darkMode ? '#1A1715' : '#F5EAE4',
            borderRadius: '20px',
            padding: '16px',
            marginBottom: '20px',
            border: darkMode ? '1px solid rgba(232,221,211,0.1)' : '1px solid #E8DDD3',
          }}
        >
          <div style={{ textAlign: 'center', borderRight: darkMode ? '1px solid rgba(232,221,211,0.1)' : '1px solid #E8DDD3', paddingRight: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: darkMode ? '#D4C5B5' : '#6B5E54', textTransform: 'uppercase' }}>
              <Clock size={12} color="#C67D5B" /> Durée d'appel
            </div>
            <div style={{ fontSize: '19px', fontWeight: '900', color: darkMode ? '#FAF7F2' : '#3D3530', marginTop: '4px' }}>
              {formattedTime}
            </div>
          </div>

          <div style={{ textAlign: 'center', paddingLeft: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: '#D97706', textTransform: 'uppercase' }}>
              <Coins size={12} /> Équivalent Jetons
            </div>
            <div style={{ fontSize: '19px', fontWeight: '900', color: '#D97706', marginTop: '4px' }}>
              {calculatedTokens} Jeton{calculatedTokens > 1 ? 's' : ''} 🪙
            </div>
          </div>
        </div>

        {/* SÉLECTEUR DE JETONS À TRANSFÉRER */}
        <div style={{ textAlign: 'left', marginBottom: '18px' }}>
          <label style={{ fontSize: '12px', fontWeight: '800', color: darkMode ? '#FAF7F2' : '#3D3530', display: 'block', marginBottom: '8px' }}>
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
                  border: selectedTokens === num ? '2px solid #C67D5B' : (darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3'),
                  backgroundColor: selectedTokens === num ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : (darkMode ? '#1A1715' : '#FFF'),
                  color: selectedTokens === num ? (darkMode ? '#FAF7F2' : '#A8644A') : (darkMode ? '#D4C5B5' : '#6B5E54'),
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
            backgroundColor: darkMode ? '#1A1715' : '#F5F0E8',
            borderRadius: '16px',
            padding: '12px 14px',
            marginBottom: '20px',
            textAlign: 'left',
            border: darkMode ? '1px solid rgba(232,221,211,0.08)' : '1px solid #E8DDD3',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ color: darkMode ? '#D4C5B5' : '#6B5E54' }}>Frais de service & plateforme Troco :</span>
            <span style={{ fontWeight: '800', color: '#7A8F6A' }}>0,00 € (100% Gratuit)</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '8px' }}>
            <span style={{ color: darkMode ? '#D4C5B5' : '#6B5E54' }}>Transfert de Jetons solidaire :</span>
            <span style={{ fontWeight: '800', color: '#D97706' }}>-{selectedTokens} Jeton{selectedTokens > 1 ? 's' : ''}</span>
          </div>

          {/* OPTION MICRO-ASSURANCE OPTIONNELLE */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              borderRadius: '10px',
              backgroundColor: includeInsurance ? (darkMode ? 'rgba(156,175,136,0.2)' : '#EBF0E6') : 'transparent',
              border: includeInsurance ? '1px solid #9CAF88' : (darkMode ? '1px solid rgba(232,221,211,0.08)' : '1px solid rgba(0,0,0,0.06)'),
              cursor: 'pointer',
              marginTop: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={includeInsurance}
                onChange={(e) => setIncludeInsurance(e.target.checked)}
                style={{ accentColor: '#C67D5B', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontSize: '12px', fontWeight: '800', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
                  🛡️ Option Sérénité & Assurance
                </div>
                <div style={{ fontSize: '10px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>
                  Protection du matériel & garantie d'engagement
                </div>
              </div>
            </div>
            <span style={{ fontSize: '12px', fontWeight: '800', color: includeInsurance ? '#7A8F6A' : (darkMode ? '#D4C5B5' : '#6B5E54') }}>
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
            background: currentUserTokens < selectedTokens ? (darkMode ? '#3D3530' : '#E8DDD3') : (isTransferred ? 'linear-gradient(135deg, #9CAF88 0%, #7A8F6A 100%)' : 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)'),
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
            boxShadow: currentUserTokens < selectedTokens ? 'none' : '0 10px 24px rgba(198,125,91,0.3)',
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
              color: darkMode ? '#D4C5B5' : '#6B5E54',
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
