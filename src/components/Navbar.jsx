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
      backgroundColor: darkMode ? 'rgba(26, 23, 21, 0.92)' : 'rgba(250, 247, 242, 0.92)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderBottom: darkMode ? '1px solid rgba(232, 221, 211, 0.12)' : '1px solid rgba(232, 221, 211, 0.9)',
      padding: '14px 20px',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      boxShadow: darkMode ? '0 4px 20px rgba(0,0,0,0.45)' : '0 4px 20px rgba(61,53,48,0.04)'
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
          <h1 className="font-editorial-heading" style={{ fontSize: '24px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#1A1512', margin: 0, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>Troco</h1>
          <p className="logo-slogan" style={{ fontSize: '10.5px', color: darkMode ? '#D4C5B5' : '#6B5E54', margin: 0, whiteSpace: 'nowrap' }}>{t('slogan')}</p>
        </button>
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
          <button
            onClick={() => setIsCreditModalOpen(true)}
            className="premium-button balance-badge"
            style={{
              border: darkMode ? '1px solid rgba(198,125,91,0.4)' : '1px solid #C67D5B',
              borderRadius: '999px',
              padding: '6px 12px',
              backgroundColor: darkMode ? '#231E1B' : '#F5EAE4',
              color: darkMode ? '#FAF7F2' : '#A8644A',
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
              boxShadow: '0 2px 8px rgba(198,125,91,0.15)'
            }}
          >
            <Coins size={13} color="#C67D5B" style={{ flexShrink: 0 }} />
            <AnimatedEuroBalance value={profile.euroBalance} prefix="€ " suffix="" style={{ fontSize: '11px', fontWeight: '800', whiteSpace: 'nowrap' }} />
          </button>
          <button
            onClick={() => setIsCreditModalOpen(true)}
            className="premium-button balance-badge"
            style={{
              border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3',
              borderRadius: '999px',
              padding: '6px 12px',
              backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
              color: darkMode ? '#FAF7F2' : '#3D3530',
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
              boxShadow: '0 2px 8px rgba(61,53,48,0.05)'
            }}
          >
            <Clock size={13} color="#C67D5B" style={{ flexShrink: 0 }} />
            <AnimatedTokenBalance value={profile.trocoTokens} formatFn={(v) => formatTokenCount(v, currentLang)} style={{ fontSize: '11px', fontWeight: '800', whiteSpace: 'nowrap' }} />
          </button>
          <button
            onClick={toggleDarkMode}
            title={darkMode ? "Activer le mode clair" : "Activer le mode sombre"}
            className="premium-button darkmode-btn"
            style={{
              border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
              color: darkMode ? '#FDE68A' : '#C67D5B',
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
              border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3',
              borderRadius: '20px',
              padding: '6px 12px',
              backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
              color: darkMode ? '#FAF7F2' : '#3D3530',
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
            <Globe size={13} color="#C67D5B" style={{ flexShrink: 0 }} />
            <span>
              {currentLang === 'FR' ? '🇫🇷 FR' : currentLang === 'EN' ? '🇬🇧 EN' : currentLang === 'ES' ? '🇪🇸 ES' : currentLang === 'IT' ? '🇮🇹 IT' : currentLang === 'DE' ? '🇩🇪 DE' : currentLang === 'JA' ? '🇯🇵 JA' : '🇨🇳 ZH'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
