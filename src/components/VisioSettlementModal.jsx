import React, { useState } from 'react';
import { Clock, Coins, Check, Sparkles, X, ArrowRight, HeartHandshake } from 'lucide-react';

export default function VisioSettlementModal({
  isOpen,
  onClose,
  callDuration = 0,
  partnerName = 'Interlocuteur',
  onTransferTokens,
  darkMode = false,
  currentUserTokens = 10,
}) {
  const [includeInsurance, setIncludeInsurance] = useState(false);
  const [selectedTokens, setSelectedTokens] = useState(1);
  const [isTransferred, setIsTransferred] = useState(false);

  if (!isOpen) return null;

  const hours = Math.floor(callDuration / 3600);
  const minutes = Math.floor((callDuration % 3600) / 60);
  const seconds = callDuration % 60;
  const formattedTime = hours > 0
    ? `${hours}h ${minutes.toString().padStart(2, '0')}min`
    : `${minutes}min ${seconds.toString().padStart(2, '0')}s`;

  const calculatedTokens = Math.max(1, Math.round((callDuration / 3600) * 10) / 10 || 1);

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
      setIsTransferred(false);
      onClose();
    }, 1800);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 5000,
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <div
        style={{
          position: 'relative',
          backgroundColor: darkMode ? '#0F172A' : '#FFFFFF',
          color: darkMode ? '#F8FAFC' : '#0F172A',
          borderRadius: '32px',
          padding: '32px 26px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(96,165,250,0.25)',
          border: darkMode ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid #E2E8F0',
          textAlign: 'center',
          overflow: 'hidden',
          animation: 'scaleUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* BOUTON FERMER */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: darkMode ? '#94A3B8' : '#64748B',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        {/* ICONE D'EN-TÊTE */}
        <div
          style={{
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3B82F6, #1D4ED8, #04265A)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 25px rgba(59,130,246,0.4)',
            margin: '0 auto 16px',
            border: '3px solid #93C5FD',
          }}
        >
          <HeartHandshake size={38} color="#FFF" />
        </div>

        <h2 style={{ fontSize: '22px', fontWeight: '900', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          Bilan de la séance & Rétribution
        </h2>
        <p style={{ fontSize: '13px', color: darkMode ? '#94A3B8' : '#64748B', margin: '0 0 20px' }}>
          Séance terminée avec <strong style={{ color: darkMode ? '#60A5FA' : '#04265A' }}>{partnerName}</strong>
        </p>

        {/* CADRE RECAP DURÉE & JETONS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            backgroundColor: darkMode ? 'rgba(30,41,59,0.7)' : '#F8FAFC',
            borderRadius: '20px',
            padding: '14px',
            border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
            marginBottom: '20px',
          }}
        >
          <div style={{ textAlign: 'center', borderRight: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0', paddingRight: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: darkMode ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
              <Clock size={12} /> Durée de la visio
            </div>
            <div style={{ fontSize: '19px', fontWeight: '900', color: darkMode ? '#F8FAFC' : '#0F172A', marginTop: '4px' }}>
              {formattedTime}
            </div>
          </div>

          <div style={{ textAlign: 'center', paddingLeft: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: '#F59E0B', textTransform: 'uppercase' }}>
              <Coins size={12} /> Équivalent Jetons
            </div>
            <div style={{ fontSize: '19px', fontWeight: '900', color: '#F59E0B', marginTop: '4px' }}>
              {calculatedTokens} Jeton{calculatedTokens > 1 ? 's' : ''} 🪙
            </div>
          </div>
        </div>

        {/* SÉLECTEUR DE JETONS À TRANSFÉRER */}
        <div style={{ textAlign: 'left', marginBottom: '18px' }}>
          <label style={{ fontSize: '12px', fontWeight: '800', color: darkMode ? '#CBD5E1' : '#334155', display: 'block', marginBottom: '8px' }}>
            Nombre de Jetons Troco à transférer :
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 2, 3, 5].map(num => (
              <button
                key={num}
                onClick={() => setSelectedTokens(num)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: '12px',
                  border: selectedTokens === num ? '2px solid #3B82F6' : (darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #CBD5E1'),
                  backgroundColor: selectedTokens === num ? (darkMode ? 'rgba(59,130,246,0.25)' : '#EFF6FF') : (darkMode ? 'rgba(30,41,59,0.5)' : '#FFF'),
                  color: selectedTokens === num ? '#3B82F6' : (darkMode ? '#CBD5E1' : '#475569'),
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
            backgroundColor: darkMode ? 'rgba(15,23,42,0.6)' : '#F1F5F9',
            borderRadius: '16px',
            padding: '12px 14px',
            marginBottom: '20px',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ color: darkMode ? '#94A3B8' : '#64748B' }}>Frais de service & plateforme Troco :</span>
            <span style={{ fontWeight: '800', color: '#10B981' }}>0,00 € (100% Gratuit)</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '8px' }}>
            <span style={{ color: darkMode ? '#94A3B8' : '#64748B' }}>Transfert de Jetons solidaire :</span>
            <span style={{ fontWeight: '800', color: '#F59E0B' }}>-{selectedTokens} Jeton{selectedTokens > 1 ? 's' : ''}</span>
          </div>

          {/* OPTION MICRO-ASSURANCE OPTIONNELLE */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              borderRadius: '10px',
              backgroundColor: includeInsurance ? (darkMode ? 'rgba(16,185,129,0.15)' : '#ECFDF5') : 'transparent',
              border: includeInsurance ? '1px solid #10B981' : (darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)'),
              cursor: 'pointer',
              marginTop: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={includeInsurance}
                onChange={(e) => setIncludeInsurance(e.target.checked)}
                style={{ accentColor: '#10B981', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontSize: '12px', fontWeight: '800', color: darkMode ? '#F8FAFC' : '#0F172A' }}>
                  🛡️ Option Sérénité & Assurance
                </div>
                <div style={{ fontSize: '10px', color: darkMode ? '#94A3B8' : '#64748B' }}>
                  Protection du matériel & garantie d'engagement
                </div>
              </div>
            </div>
            <span style={{ fontSize: '12px', fontWeight: '800', color: includeInsurance ? '#10B981' : (darkMode ? '#94A3B8' : '#64748B') }}>
              +1,99 €
            </span>
          </label>
        </div>

        {/* BOUTON DE CONFIRMATION */}
        <button
          onClick={handleConfirmTransfer}
          disabled={currentUserTokens < selectedTokens}
          style={{
            width: '100%',
            backgroundColor: currentUserTokens < selectedTokens ? '#94A3B8' : (isTransferred ? '#10B981' : '#04265A'),
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '16px',
            padding: '14px 20px',
            fontSize: '14px',
            fontWeight: '800',
            cursor: currentUserTokens < selectedTokens ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 10px 24px rgba(4,38,90,0.3)',
            transition: 'all 0.2s ease',
          }}
        >
          {isTransferred ? (
            <>
              <Check size={18} />
              <span>Jetons transférés avec succès !</span>
            </>
          ) : currentUserTokens < selectedTokens ? (
            <span>Solde insuffisant ({currentUserTokens} jetons disponibles)</span>
          ) : (
            <>
              <Sparkles size={16} color="#FDE68A" />
              <span>Transférer {selectedTokens} Jeton{selectedTokens > 1 ? 's' : ''} à {partnerName}</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>

        <button
          onClick={onClose}
          style={{
            marginTop: '10px',
            background: 'none',
            border: 'none',
            color: darkMode ? '#94A3B8' : '#64748B',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            padding: '6px',
          }}
        >
          Fermer sans transfert
        </button>
      </div>
    </div>
  );
}
