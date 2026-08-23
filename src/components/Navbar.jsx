import React from 'react';
import { Coins, Clock, Sun, Moon, Globe } from 'lucide-react';

export default function Navbar({
  darkMode,
  toggleDarkMode,
  setActiveTab,
  setSelectedListing,
  setSelectedChat,
  callState,
  endCall,
  setIsCreditModalOpen,
  setIsLangModalOpen,
  profile,
  currentLang,
  t,
  formatTokenCount,
  AnimatedEuroBalance,
  AnimatedTokenBalance,
}) {
  return (
    <header style={{
      backgroundColor: 'var(--bg-glass)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderBottom: '1px solid var(--border-color)',
      padding: '14px 20px',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      boxShadow: 'var(--shadow-card)'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* LOGO TROCO CLICKABLE -> RETOUR ACCUEIL */}
        <button
          onClick={() => {
            setActiveTab('feed');
            setSelectedListing(null);
            setSelectedChat(null);
            if (callState && callState.active) endCall();
          }}
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: '12px', textAlign: 'left', flexShrink: 0 }}
        >
          <h1 className="font-editorial-heading" style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>Troco</h1>
          <p className="logo-slogan" style={{ fontSize: '10.5px', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'nowrap' }}>{t('slogan')}</p>
        </button>
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
          <button
            onClick={() => setIsCreditModalOpen(true)}
            className="premium-button balance-badge"
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: '999px',
              padding: '6px 12px',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--accent-primary)',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              position: 'relative',
              overflow: 'visible',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <Coins size={13} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
            <AnimatedEuroBalance value={profile.euroBalance} prefix="€ " suffix="" style={{ fontSize: '11px', fontWeight: '800', whiteSpace: 'nowrap' }} />
          </button>
          <button
            onClick={() => setIsCreditModalOpen(true)}
            className="premium-button balance-badge"
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: '999px',
              padding: '6px 12px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              position: 'relative',
              overflow: 'visible',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <Clock size={13} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
            <AnimatedTokenBalance value={profile.trocoTokens} formatFn={(v) => formatTokenCount(v, currentLang)} style={{ fontSize: '11px', fontWeight: '800', whiteSpace: 'nowrap' }} />
          </button>
          <button
            onClick={toggleDarkMode}
            title={darkMode ? "Activer le mode clair" : "Activer le mode sombre"}
            className="premium-button darkmode-btn"
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--accent-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={() => setIsLangModalOpen(true)}
            className="premium-button lang-btn"
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '6px 12px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <Globe size={13} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
            <span>
              {currentLang === 'FR' ? '🇫🇷 FR' : currentLang === 'EN' ? '🇬🇧 EN' : currentLang === 'ES' ? '🇪🇸 ES' : currentLang === 'IT' ? '🇮🇹 IT' : currentLang === 'DE' ? '🇩🇪 DE' : currentLang === 'JA' ? '🇯🇵 JA' : '🇨🇳 ZH'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}

