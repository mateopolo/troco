import React from 'react';
import { Coins, X, Lock } from 'lucide-react';

export default function WalletModal({
  isOpen,
  onClose,
  walletTab,
  setWalletTab,
  walletAmount,
  setWalletAmount,
  openCheckout,
  profile,
  currentLang,
  t,
  formatTokenCount,
}) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 50 }}>
      <div style={{ backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderRadius: '24px', width: '100%', maxWidth: '560px', padding: '22px', boxShadow: '0 24px 60px rgba(0,0,0,0.20)', border: '1px solid rgba(255,255,255,0.7)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '14px', right: '14px', border: 'none', backgroundColor: '#F3F4F6', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <X size={16} color="#374151" />
        </button>

        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#04265A', fontWeight: '700', marginBottom: '6px' }}>
            <Coins size={18} />
            <span>{t('wallet')}</span>
          </div>
          <h3 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>{t('manageWalletSub')}</h3>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#6B7280' }}>{t('walletNotice')}</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <button onClick={() => setWalletTab('cash')} style={{ flex: 1, border: walletTab === 'cash' ? '1px solid #04265A' : '1px solid #E5E7EB', borderRadius: '14px', padding: '10px', backgroundColor: walletTab === 'cash' ? '#EFF6FF' : 'rgba(250,250,250,0.8)', color: '#111827', fontWeight: '700', cursor: 'pointer' }}>
            {t('rechargeCash')}
          </button>
          <button onClick={() => setWalletTab('tokens')} style={{ flex: 1, border: walletTab === 'tokens' ? '1px solid #04265A' : '1px solid #E5E7EB', borderRadius: '14px', padding: '10px', backgroundColor: walletTab === 'tokens' ? '#EFF6FF' : 'rgba(250,250,250,0.8)', color: '#111827', fontWeight: '700', cursor: 'pointer' }}>
            {t('buyTokens')}
          </button>
        </div>

        {walletTab === 'cash' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[10, 20, 50].map(amount => (
                <button key={amount} onClick={() => setWalletAmount(amount)} style={{ border: walletAmount === amount ? '1px solid #04265A' : '1px solid #D1D5DB', borderRadius: '999px', padding: '8px 12px', backgroundColor: walletAmount === amount ? '#EFF6FF' : '#FFF', color: '#111827', fontWeight: '700', cursor: 'pointer' }}>
                  {amount}€
                </button>
              ))}
            </div>
            <div style={{ border: '1px solid #E5E7EB', borderRadius: '16px', padding: '14px', backgroundColor: '#F8FAFC' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151' }}>{t('customAmount')}</label>
              <input type="number" min="1" value={walletAmount} onChange={(e) => setWalletAmount(Number(e.target.value))} style={{ width: '100%', marginTop: '8px', border: '1px solid #D1D5DB', borderRadius: '12px', padding: '10px 12px' }} />
            </div>
            <button
              onClick={() => {
                onClose();
                openCheckout({ mode: 'wallet-cash', amount: walletAmount, label: 'Rechargement du solde Euro' });
              }}
              className="premium-button"
              style={{ width: '100%', border: 'none', borderRadius: '14px', padding: '12px', backgroundColor: '#04265A', color: '#FFFFFF', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Lock size={14} /> {t('rechargeAction')} {walletAmount}€ — {t('securePaymentHeader')}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { amount: 1, euros: 12, titleKey: 'pack1Token' },
              { amount: 5, euros: 50, titleKey: 'pack5Tokens' }
            ].map(pack => {
              const titleText = t(pack.titleKey);
              const tokenText = formatTokenCount(pack.amount, currentLang);
              const buyBtnText = `${t('buyAction')} ${tokenText} — ${pack.euros}€`;
              const isInsufficient = profile.euroBalance < pack.euros;
              return (
                <div key={pack.titleKey} style={{ border: '1px solid #E5E7EB', borderRadius: '16px', padding: '14px', backgroundColor: 'rgba(250,250,250,0.8)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontWeight: '700', color: '#111827' }}>{titleText}</div>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#04265A' }}>{pack.euros}€</span>
                  </div>
                  <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#6B7280', lineHeight: 1.5 }}>{t('tokenPackSub')}</p>
                  {isInsufficient && (
                    <div style={{ fontSize: '12px', color: '#EF4444', fontWeight: '600', marginBottom: '8px', padding: '8px 10px', backgroundColor: '#FEF2F2', borderRadius: '10px', border: '1px solid #FECACA' }}>
                      ⚠️ Solde insuffisant ({profile.euroBalance.toFixed(2)}€ disponibles sur {pack.euros}€ requis) — Recharge ton solde Euro d'abord.
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (isInsufficient) return;
                      onClose();
                      openCheckout({ mode: 'wallet-tokens', amount: pack.euros, label: titleText, payload: { tokenAmount: pack.amount } });
                    }}
                    disabled={isInsufficient}
                    className="premium-button"
                    style={{
                      width: '100%',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '10px',
                      backgroundColor: isInsufficient ? '#94A3B8' : '#04265A',
                      color: '#FFFFFF',
                      fontWeight: '700',
                      cursor: isInsufficient ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      opacity: isInsufficient ? 0.6 : 1
                    }}
                  >
                    <Lock size={13} /> {buyBtnText}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
