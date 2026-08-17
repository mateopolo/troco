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
      backgroundColor: darkMode ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderBottom: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(226,232,240,0.7)',
      padding: '14px 20px',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      boxShadow: '0 1px 24px rgba(15,23,42,0.04)'
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
          <h1 style={{ fontSize: '18px', fontWeight: '800', color: darkMode ? '#60A5FA' : '#04265A', margin: 0, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>Troco</h1>
          <p className="logo-slogan" style={{ fontSize: '10px', color: darkMode ? '#94A3B8' : '#6B7280', margin: 0, whiteSpace: 'nowrap' }}>{t('slogan')}</p>
        </button>
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
          <button
            onClick={() => setIsCreditModalOpen(true)}
            className="premium-button balance-badge"
            style={{
              border: 'none',
              borderRadius: '999px',
              padding: '6px 10px',
              backgroundColor: darkMode ? 'rgba(4,38,90,0.45)' : 'rgba(4,38,90,0.08)',
              color: darkMode ? '#93C5FD' : '#04265A',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              position: 'relative',
              overflow: 'visible',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <Coins size={13} style={{ flexShrink: 0 }} />
            <AnimatedEuroBalance value={profile.euroBalance} prefix="€ " suffix="" style={{ fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }} />
          </button>
          <button
            onClick={() => setIsCreditModalOpen(true)}
            className="premium-button balance-badge"
            style={{
              border: 'none',
              borderRadius: '999px',
              padding: '6px 10px',
              backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
              color: darkMode ? '#FFF' : '#111827',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              position: 'relative',
              overflow: 'visible',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <Clock size={13} style={{ flexShrink: 0 }} />
            <AnimatedTokenBalance value={profile.trocoTokens} formatFn={(v) => formatTokenCount(v, currentLang)} style={{ fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }} />
          </button>
          <button
            onClick={toggleDarkMode}
            title={darkMode ? "Activer le mode clair" : "Activer le mode sombre"}
            className="premium-button darkmode-btn"
            style={{
              border: 'none',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              backgroundColor: darkMode ? 'rgba(255,255,255,0.12)' : '#F3F4F6',
              color: darkMode ? '#F59E0B' : '#04265A',
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
              border: 'none',
              borderRadius: '20px',
              padding: '5px 10px',
              backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
              color: darkMode ? '#FFF' : '#111827',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <Globe size={13} color={darkMode ? '#93C5FD' : '#04265A'} style={{ flexShrink: 0 }} />
            <span>
              {currentLang === 'FR' ? '🇫🇷 FR' : currentLang === 'EN' ? '🇬🇧 EN' : currentLang === 'ES' ? '🇪🇸 ES' : currentLang === 'IT' ? '🇮🇹 IT' : currentLang === 'DE' ? '🇩🇪 DE' : currentLang === 'JA' ? '🇯🇵 JA' : '🇨🇳 ZH'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
