import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, ShieldCheck, CreditCard } from 'lucide-react';

export default function CheckoutModal({
  isOpen,
  session,
  onCancel,
  onConfirm,
  isProcessing = false,
  paymentStatus = 'idle',
}) {
  const [selectedMethod, setSelectedMethod] = useState('card');

  if (!isOpen || !session) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isProcessing) {
      onCancel();
    }
  };

  const title = session.title || session.label || 'Finaliser la transaction';
  const amountDisplay = session.amountTtc !== undefined
    ? `${session.amountTtc.toFixed(2)} €`
    : session.tokensPurchased
      ? `${session.tokensPurchased} Jetons`
      : session.tokensRequired
        ? `${session.tokensRequired} Jetons`
        : session.euroRequired
          ? `${session.euroRequired.toFixed(2)} €`
          : '0.00 €';

  return (
    <AnimatePresence>
      <div
        className="checkout-modal-overlay"
        onClick={handleBackdropClick}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="checkout-modal-content"
          style={{
            backgroundColor: 'var(--bg-card, #1f2937)',
            color: 'var(--text-main, #f9fafb)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '460px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={22} color="#10b981" />
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>Paiement Sécurisé</h3>
            </div>
            {/* "X" CANCEL BUTTON — PURE UI DISMISSAL, ZERO FINANCIAL SIDE-EFFECT */}
            <button
              type="button"
              id="checkout-modal-close-btn"
              onClick={onCancel}
              disabled={isProcessing}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                color: '#9ca3af',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s ease',
              }}
              aria-label="Annuler le paiement"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '24px' }}>
            {paymentStatus === 'success' ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle2 size={54} color="#10b981" style={{ margin: '0 auto 16px' }} />
                <h4 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 700 }}>
                  Paiement Confirmé !
                </h4>
                <p style={{ margin: 0, color: '#9ca3af', fontSize: '14px' }}>
                  Votre transaction a été validée avec succès.
                </p>
              </div>
            ) : paymentStatus === 'failed' ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <AlertCircle size={54} color="#ef4444" style={{ margin: '0 auto 16px' }} />
                <h4 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 700 }}>
                  Échec de la transaction
                </h4>
                <p style={{ margin: 0, color: '#9ca3af', fontSize: '14px' }}>
                  Une erreur est survenue lors de l'opération. Aucun débit n'a été effectué.
                </p>
              </div>
            ) : (
              <>
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    padding: '16px',
                    borderRadius: '16px',
                    marginBottom: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '4px' }}>
                    Détail de la commande
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                    {title}
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>
                    {amountDisplay}
                  </div>
                </div>

                {/* Mode Selector */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '8px' }}>
                    Moyen de paiement
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('card')}
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        border: selectedMethod === 'card' ? '2px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: selectedMethod === 'card' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                        color: '#f9fafb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '13px',
                      }}
                    >
                      <CreditCard size={16} /> Carte Bancaire
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('mock')}
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        border: selectedMethod === 'mock' ? '2px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: selectedMethod === 'mock' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                        color: '#f9fafb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '13px',
                      }}
                    >
                      ⚡ Mock Provider
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={isProcessing}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '14px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#f9fafb',
                      fontWeight: 600,
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Annuler
                  </button>

                  <button
                    type="button"
                    id="checkout-modal-confirm-btn"
                    onClick={() => onConfirm({ paymentMethod: selectedMethod === 'mock' ? 'Mock Provider' : 'Carte Bancaire' })}
                    disabled={isProcessing}
                    style={{
                      flex: 1.5,
                      padding: '12px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      color: '#ffffff',
                      fontWeight: 700,
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {isProcessing ? 'Traitement sécurisé...' : `Confirmer & Payer (${amountDisplay})`}
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
