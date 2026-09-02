import React from 'react';
import { X, Check, ShieldCheck, Lock, CreditCard, Coins } from 'lucide-react';
import { hapticSuccess, hapticLight } from '../utils/haptics';

export default function CheckoutModal({
  checkout,
  setCheckout,
  closeCheckout,
  handleConfirmPayment,
  paymentMethods = [
    { key: 'applePay', label: 'Apple Pay', sub: 'Paiement instantané et sécurisé', icon: <span style={{ backgroundColor: '#000000', color: '#FFF', borderRadius: '7px', padding: '3px 8px', fontSize: '12px', fontWeight: '800', fontStyle: 'italic' }}> Pay</span> },
    { key: 'card', label: 'Carte bancaire', sub: 'Visa • Mastercard • Amex', icon: <CreditCard size={18} color="#04265A" /> },
    { key: 'troco', label: 'Solde Troco / Virement', sub: 'Utiliser mes jetons ou virement SEPA', icon: <Coins size={18} color="#04265A" /> },
  ],
  t,
  darkMode
}) {
  if (!checkout.open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(2,6,23,0.55)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', zIndex: 75
    }}>
      <div style={{
        width: '100%', maxWidth: '460px',
        backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderRadius: '28px', padding: '24px',
        boxShadow: '0 30px 80px rgba(2,6,23,0.30)',
        border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.8)',
        position: 'relative'
      }}>
        {checkout.step === 'success' ? (
          <div style={{ textAlign: 'center', padding: '18px 8px' }}>
            <div style={{
              width: '76px', height: '76px', borderRadius: '50%',
              backgroundColor: '#D1FAE5', color: '#059669', margin: '0 auto 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'popIn 0.5s cubic-bezier(0.22,1,0.36,1) both'
            }}>
              <Check size={36} strokeWidth={3} />
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: '19px', fontWeight: '800', color: darkMode ? '#FFF' : '#111827', lineHeight: 1.4 }}>
              {t('transactionSuccess') || 'Paiement Réussi !'}
            </h3>
            <p style={{ margin: '0 0 6px', fontSize: '13px', color: darkMode ? '#94A3B8' : '#64748B' }}>
              {checkout.label}
            </p>
            <p style={{ margin: '0 0 20px', fontSize: '22px', fontWeight: '800', color: darkMode ? '#60A5FA' : '#04265A' }}>
              {(checkout.amount || 0).toFixed(2)} €
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: '#059669', fontWeight: '700', marginBottom: '18px' }}>
              <ShieldCheck size={14} /> {t('encryptedPayment') || 'Transaction sécurisée et chiffrée'}
            </div>
            <button
              onClick={closeCheckout}
              className="premium-button"
              style={{
                width: '100%', border: 'none', borderRadius: '16px', padding: '14px',
                backgroundColor: darkMode ? '#60A5FA' : '#04265A', color: '#FFF',
                fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 22px rgba(4,38,90,0.25)'
              }}
            >
              {t('doneButton') || 'Terminé'}
            </button>
          </div>
        ) : checkout.step === 'processing' ? (
          <div style={{ textAlign: 'center', padding: '34px 8px' }}>
            <div style={{
              width: '46px', height: '46px', margin: '0 auto 20px',
              border: '3px solid rgba(4,38,90,0.18)', borderTopColor: darkMode ? '#60A5FA' : '#04265A',
              borderRadius: '50%', animation: 'spin 0.8s linear infinite'
            }} />
            <div style={{ fontWeight: '800', color: darkMode ? '#FFF' : '#111827', fontSize: '15px' }}>
              {t('transactionProcessing') || 'Traitement sécurisé en cours...'}
            </div>
            <p style={{ fontSize: '12px', color: darkMode ? '#94A3B8' : '#64748B', marginTop: '8px' }}>
              {t('secureBankConnection') || 'Connexion aux serveurs bancaires chiffrés...'}
            </p>
          </div>
        ) : (
          <>
            <button
              onClick={closeCheckout}
              style={{
                position: 'absolute', top: '16px', right: '16px', border: 'none',
                backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
                color: darkMode ? '#FFF' : '#374151', width: '34px', height: '34px',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Lock size={16} color={darkMode ? '#60A5FA' : '#04265A'} />
              <span style={{ fontSize: '12px', fontWeight: '800', color: darkMode ? '#60A5FA' : '#04265A', letterSpacing: '0.04em' }}>
                {t('securePaymentHeader') || 'PAIEMENT SÉCURISÉ'}
              </span>
            </div>

            <h3 style={{ margin: '0 0 16px', fontSize: '19px', fontWeight: '800', color: darkMode ? '#FFF' : '#111827' }}>
              {checkout.label || 'Paiement'}
            </h3>

            <div style={{
              border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0',
              borderRadius: '16px', padding: '14px',
              backgroundColor: darkMode ? 'rgba(15,23,42,0.5)' : '#F8FAFC',
              marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '13px', color: darkMode ? '#94A3B8' : '#64748B' }}>
                {t('amountToPay') || 'Montant total :'}
              </span>
              <span style={{ fontSize: '22px', fontWeight: '800', color: darkMode ? '#FFF' : '#111827' }}>
                {(checkout.amount || 0).toFixed(2)} €
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {paymentMethods.map(method => (
                <button
                  key={method.key}
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setCheckout(prev => ({ ...prev, method: method.key }));
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    border: checkout.method === method.key ? (darkMode ? '1.5px solid #60A5FA' : '1.5px solid #04265A') : (darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0'),
                    borderRadius: '14px', padding: '12px 14px',
                    backgroundColor: checkout.method === method.key ? (darkMode ? 'rgba(4,38,90,0.5)' : '#EFF6FF') : (darkMode ? 'rgba(15,23,42,0.4)' : '#FFFFFF'),
                    cursor: 'pointer', textAlign: 'left'
                  }}
                >
                  {method.icon}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: darkMode ? '#FFF' : '#111827' }}>{method.label}</div>
                    <div style={{ fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B' }}>{method.sub}</div>
                  </div>
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    border: checkout.method === method.key ? (darkMode ? '5px solid #60A5FA' : '5px solid #04265A') : '1.5px solid #D1D5DB'
                  }} />
                </button>
              ))}
            </div>

            {checkout.method === 'card' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', padding: '12px', borderRadius: '14px', backgroundColor: darkMode ? 'rgba(15,23,42,0.6)' : '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <input placeholder="1234 5678 9012 3456" style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '10px', fontSize: '13px', backgroundColor: '#FFF' }} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input placeholder="MM/AA" style={{ flex: 1, padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '10px', fontSize: '13px', backgroundColor: '#FFF' }} />
                  <input placeholder="CVC" style={{ flex: 1, padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '10px', fontSize: '13px', backgroundColor: '#FFF' }} />
                </div>
              </div>
            )}

            {checkout.method === 'troco' && (
              <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '14px', backgroundColor: '#FFF7ED', border: '1px solid #FDE68A', fontSize: '12px', color: '#92400E', lineHeight: 1.6 }}>
                💡 Recharge depuis ton solde Troco ou par virement SEPA. Tes jetons seront convertis automatiquement si le solde est insuffisant.
              </div>
            )}

            <button
              onClick={() => {
                hapticSuccess();
                if (typeof handleConfirmPayment === 'function') {
                  handleConfirmPayment();
                }
              }}
              className="premium-button"
              style={{
                width: '100%', border: 'none', borderRadius: '16px', padding: '14px',
                backgroundColor: darkMode ? '#60A5FA' : '#04265A', color: '#FFF',
                fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 22px rgba(4,38,90,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <Lock size={15} /> Payer {(checkout.amount || 0).toFixed(2)} €
            </button>
          </>
        )}
      </div>
    </div>
  );
}
