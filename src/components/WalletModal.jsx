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
    <div
      className="fixed inset-0 z-50 bg-black/90 md:bg-[var(--overlay-bg)] md:backdrop-blur-sm flex items-center justify-center p-5"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
      }}
    >
      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '24px', width: '100%', maxWidth: '560px', padding: '24px', boxShadow: 'var(--shadow-modal)', border: '1px solid var(--border-color)', position: 'relative' }}>
        <button onClick={() => onClose?.()} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', backgroundColor: 'var(--bg-subtle)', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)' }}>
          <X size={16} />
        </button>

        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontWeight: '700', marginBottom: '6px' }}>
            <Coins size={18} />
            <span>{typeof t === 'function' ? t('wallet') : 'Portefeuille'}</span>
          </div>
          <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: 'var(--text-main)' }}>{typeof t === 'function' ? t('manageWalletSub') : 'Gérer mon solde'}</h3>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{typeof t === 'function' ? t('walletNotice') : ''}</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button onClick={() => setWalletTab?.('cash')} style={{ flex: 1, border: walletTab === 'cash' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)', borderRadius: '14px', padding: '10px', backgroundColor: walletTab === 'cash' ? 'var(--bg-subtle)' : 'var(--bg-card)', color: walletTab === 'cash' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer' }}>
            {typeof t === 'function' ? t('rechargeCash') : 'Recharger'}
          </button>
          <button onClick={() => setWalletTab?.('tokens')} style={{ flex: 1, border: walletTab === 'tokens' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)', borderRadius: '14px', padding: '10px', backgroundColor: walletTab === 'tokens' ? 'var(--bg-subtle)' : 'var(--bg-card)', color: walletTab === 'tokens' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer' }}>
            {typeof t === 'function' ? t('buyTokens') : 'Acheter des Jetons'}
          </button>
        </div>

        {walletTab === 'cash' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[10, 20, 50].map(amount => (
                <button key={amount} onClick={() => setWalletAmount?.(amount)} style={{ border: walletAmount === amount ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)', borderRadius: '999px', padding: '8px 16px', backgroundColor: walletAmount === amount ? 'var(--bg-subtle)' : 'var(--bg-card)', color: walletAmount === amount ? 'var(--accent-primary)' : 'var(--text-main)', fontWeight: '800', cursor: 'pointer' }}>
                  {amount}€
                </button>
              ))}
            </div>
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '16px', padding: '14px', backgroundColor: 'var(--bg-subtle)' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>{typeof t === 'function' ? t('customAmount') : 'Montant libre'}</label>
              <input type="number" min="1" value={walletAmount} onChange={(e) => setWalletAmount?.(Number(e.target.value))} style={{ width: '100%', marginTop: '8px', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '10px 12px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }} />
            </div>
            <button
              onClick={() => {
                onClose?.();
                if (typeof openCheckout === 'function') openCheckout({ mode: 'wallet-cash', amount: walletAmount, label: 'Rechargement du solde Euro' });
              }}
              className="premium-button"
              style={{ width: '100%', border: 'none', borderRadius: '14px', padding: '12px', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', color: '#FFFFFF', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: 'var(--shadow-accent)' }}
            >
              <Lock size={14} /> {typeof t === 'function' ? t('rechargeAction') : 'Recharger'} {walletAmount}€ — {typeof t === 'function' ? t('securePaymentHeader') : 'Paiement sécurisé'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { amount: 1, euros: 12, titleKey: 'pack1Token' },
              { amount: 5, euros: 50, titleKey: 'pack5Tokens' }
            ].map(pack => {
              const titleText = typeof t === 'function' ? t(pack.titleKey) : pack.titleKey;
              const tokenText = typeof formatTokenCount === 'function' ? formatTokenCount(pack.amount, currentLang) : `${pack.amount} jetons`;
              const buyBtnText = `${typeof t === 'function' ? t('buyAction') : 'Acheter'} ${tokenText} — ${pack.euros}€`;
              const isInsufficient = euroBalance < pack.euros;
              return (
                <div key={pack.titleKey} style={{ border: '1px solid var(--border-color)', borderRadius: '16px', padding: '14px', backgroundColor: 'var(--bg-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{titleText}</div>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--accent-primary)' }}>{pack.euros}€</span>
                  </div>
                  <p style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{typeof t === 'function' ? t('tokenPackSub') : ''}</p>
                  {isInsufficient && (
                    <div style={{ fontSize: '12px', color: 'var(--accent-danger)', fontWeight: '600', marginBottom: '8px', padding: '8px 10px', backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: '10px', border: '1px solid var(--accent-danger)' }}>
                      ⚠️ Solde insuffisant ({euroBalance.toFixed(2)}€ disponibles sur {pack.euros}€ requis) — Recharge ton solde Euro d'abord.
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (isInsufficient) return;
                      onClose?.();
                      if (typeof openCheckout === 'function') openCheckout({ mode: 'wallet-tokens', amount: pack.euros, label: titleText, payload: { tokenAmount: pack.amount } });
                    }}
                    disabled={isInsufficient}
                    className="premium-button"
                    style={{
                      width: '100%',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '10px',
                      background: isInsufficient ? 'var(--border-color)' : 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                      color: isInsufficient ? 'var(--text-secondary)' : '#FFFFFF',
                      fontWeight: '800',
                      cursor: isInsufficient ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      opacity: isInsufficient ? 0.6 : 1,
                      boxShadow: isInsufficient ? 'none' : 'var(--shadow-accent)'
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

