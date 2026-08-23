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
  profile = {},
  currentLang = 'FR',
  t = (k) => k,
  formatTokenCount = (n) => `${n} jetons`,
  darkMode = false,
}) {
  if (!isOpen) return null;

  const euroBalance = Number(profile.euroBalance) || 0;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(61, 53, 48, 0.72)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 50 }}>
      <div style={{ backgroundColor: darkMode ? '#231E1B' : '#FAF7F2', borderRadius: '24px', width: '100%', maxWidth: '560px', padding: '24px', boxShadow: darkMode ? '0 24px 60px rgba(0,0,0,0.8)' : '0 24px 60px rgba(61,53,48,0.20)', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', backgroundColor: darkMode ? 'rgba(232,221,211,0.1)' : '#F5EAE4', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
          <X size={16} />
        </button>

        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#C67D5B', fontWeight: '700', marginBottom: '6px' }}>
            <Coins size={18} />
            <span>{t('wallet')}</span>
          </div>
          <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{t('manageWalletSub')}</h3>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>{t('walletNotice')}</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button onClick={() => setWalletTab('cash')} style={{ flex: 1, border: walletTab === 'cash' ? '2px solid #C67D5B' : (darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3'), borderRadius: '14px', padding: '10px', backgroundColor: walletTab === 'cash' ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : (darkMode ? '#1A1715' : '#FFF'), color: walletTab === 'cash' ? (darkMode ? '#FAF7F2' : '#A8644A') : (darkMode ? '#D4C5B5' : '#6B5E54'), fontWeight: '700', cursor: 'pointer' }}>
            {t('rechargeCash')}
          </button>
          <button onClick={() => setWalletTab('tokens')} style={{ flex: 1, border: walletTab === 'tokens' ? '2px solid #C67D5B' : (darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3'), borderRadius: '14px', padding: '10px', backgroundColor: walletTab === 'tokens' ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : (darkMode ? '#1A1715' : '#FFF'), color: walletTab === 'tokens' ? (darkMode ? '#FAF7F2' : '#A8644A') : (darkMode ? '#D4C5B5' : '#6B5E54'), fontWeight: '700', cursor: 'pointer' }}>
            {t('buyTokens')}
          </button>
        </div>

        {walletTab === 'cash' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[10, 20, 50].map(amount => (
                <button key={amount} onClick={() => setWalletAmount(amount)} style={{ border: walletAmount === amount ? '2px solid #C67D5B' : (darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3'), borderRadius: '999px', padding: '8px 16px', backgroundColor: walletAmount === amount ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : (darkMode ? '#1A1715' : '#FFF'), color: walletAmount === amount ? (darkMode ? '#FAF7F2' : '#A8644A') : (darkMode ? '#FAF7F2' : '#3D3530'), fontWeight: '800', cursor: 'pointer' }}>
                  {amount}€
                </button>
              ))}
            </div>
            <div style={{ border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3', borderRadius: '16px', padding: '14px', backgroundColor: darkMode ? '#1A1715' : '#FFF' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>{t('customAmount')}</label>
              <input type="number" min="1" value={walletAmount} onChange={(e) => setWalletAmount(Number(e.target.value))} style={{ width: '100%', marginTop: '8px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '12px', padding: '10px 12px', backgroundColor: darkMode ? '#231E1B' : '#FAF7F2', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }} />
            </div>
            <button
              onClick={() => {
                onClose();
                openCheckout({ mode: 'wallet-cash', amount: walletAmount, label: 'Rechargement du solde Euro' });
              }}
              className="premium-button"
              style={{ width: '100%', border: 'none', borderRadius: '14px', padding: '12px', background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', color: '#FFFFFF', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 8px 20px rgba(198,125,91,0.25)' }}
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
              const isInsufficient = euroBalance < pack.euros;
              return (
                <div key={pack.titleKey} style={{ border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3', borderRadius: '16px', padding: '14px', backgroundColor: darkMode ? '#1A1715' : '#FFF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontWeight: '700', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{titleText}</div>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#C67D5B' }}>{pack.euros}€</span>
                  </div>
                  <p style={{ margin: '0 0 10px', fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54', lineHeight: 1.5 }}>{t('tokenPackSub')}</p>
                  {isInsufficient && (
                    <div style={{ fontSize: '12px', color: '#EF4444', fontWeight: '600', marginBottom: '8px', padding: '8px 10px', backgroundColor: '#FEF2F2', borderRadius: '10px', border: '1px solid #FECACA' }}>
                      ⚠️ Solde insuffisant ({euroBalance.toFixed(2)}€ disponibles sur {pack.euros}€ requis) — Recharge ton solde Euro d'abord.
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
                      background: isInsufficient ? (darkMode ? '#3D3530' : '#D4C5B5') : 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)',
                      color: '#FFFFFF',
                      fontWeight: '800',
                      cursor: isInsufficient ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      opacity: isInsufficient ? 0.6 : 1,
                      boxShadow: isInsufficient ? 'none' : '0 6px 16px rgba(198,125,91,0.25)'
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
