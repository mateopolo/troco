import React, { useState, useEffect } from 'react';
import { Coins, Sparkles, Sun, Moon, Globe } from 'lucide-react';
import TrocoLogo3D from '../common/TrocoLogo3D';
import { AnimatedEuroBalance, AnimatedTokenBalance } from '../AnimatedBalances';
import { formatTokenCount as formatTokenCountUtil } from '../../utils/formatters';

export const AppHeader = React.memo(({
  isMobile = false,
  activeTab = 'feed',
  selectedChat = null,
  callState = {},
  endCall = () => {},
  setActiveTab = () => {},
  setSelectedListing = () => {},
  setSelectedChat = () => {},
  handleOpenPayment = () => {},
  profile = {},
  toggleDarkMode = () => {},
  darkMode = false,
  setIsLangModalOpen = () => {},
  currentLang = 'FR',
  t = (k) => k,
  formatTokenCount = formatTokenCountUtil,
}) => {
  // Condensation et élévation du header supérieur au défilement (Micro-interactions avec RAF)
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let rafId = null;
    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        const scrolled = window.scrollY > 30;
        setIsScrolled(prev => (prev !== scrolled ? scrolled : prev));
        rafId = null;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const handleLogoClick = () => {
    setActiveTab('feed');
    setSelectedListing(null);
    setSelectedChat(null);
    if (callState?.active && typeof endCall === 'function') {
      endCall();
    }
  };

  const isHiddenOnMobileChat = isMobile && activeTab === 'chat' && Boolean(selectedChat);

  return (
    <header
      style={{
        display: isHiddenOnMobileChat ? 'none' : 'block',
        backgroundColor: 'var(--bg-glass)',
        backdropFilter: isScrolled ? 'blur(28px) saturate(200%)' : 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: isScrolled ? 'blur(28px) saturate(200%)' : 'blur(20px) saturate(180%)',
        borderBottom: '1px solid var(--border-color)',
        padding: isScrolled ? '9px 16px' : '12px 16px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        flexShrink: 0,
        boxShadow: isScrolled
          ? 'var(--shadow-card)'
          : '0 1px 24px rgba(0,0,0,0.03)',
        width: '100%',
        boxSizing: 'border-box',
        transition: 'padding 0.3s var(--ease-quiet), background-color 0.3s var(--ease-quiet), box-shadow 0.3s var(--ease-quiet), border-color 0.3s var(--ease-quiet)',
      }}
    >
      <div
        className="header-container"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* LOGO TROCO CLICKABLE -> RETOUR ACCUEIL */}
        <button
          type="button"
          onClick={handleLogoClick}
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: '12px',
            textAlign: 'left',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <TrocoLogo3D size={isScrolled ? 24 : 28} animated={false} />
          <div>
            <h1
              className="font-editorial-heading"
              style={{
                fontSize: isScrolled ? '19px' : '22px',
                fontWeight: '700',
                color: 'var(--text-main)',
                margin: 0,
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
                transition: 'font-size 0.3s var(--ease-quiet)',
              }}
            >
              Troco
            </h1>
            <p
              className="logo-slogan font-editorial"
              style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                fontStyle: 'italic',
                margin: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {t('slogan')}
            </p>
          </div>
        </button>

        {/* ACTIONS HEADER */}
        <div
          className="header-actions"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'nowrap',
          }}
        >
          {/* Solde Euros */}
          <button
            type="button"
            onClick={() => handleOpenPayment('topup-cash')}
            title="Recharger mon solde Euros"
            className="premium-button balance-badge"
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: '999px',
              padding: isScrolled ? '5px 10px' : '6px 12px',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--accent-primary)',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              position: 'relative',
              overflow: 'visible',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'padding 0.3s var(--ease-quiet)',
            }}
          >
            <Coins size={13} style={{ flexShrink: 0 }} />
            <AnimatedEuroBalance
              value={profile?.euroBalance || 0}
              prefix="€ "
              suffix=""
              style={{ fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}
            />
          </button>

          {/* Jetons Troco / Abonnement Troco Plus */}
          <button
            type="button"
            onClick={() => handleOpenPayment('troco-plus')}
            title="S'abonner à Troco Plus"
            className="premium-button balance-badge"
            style={{
              border: '1px solid var(--accent-primary)',
              borderRadius: '999px',
              padding: isScrolled ? '5px 10px' : '6px 12px',
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
              transition: 'padding 0.3s var(--ease-quiet)',
            }}
          >
            <Sparkles size={13} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
            <AnimatedTokenBalance
              value={profile?.trocoTokens || 0}
              formatFn={(v) => (formatTokenCount ? formatTokenCount(v, currentLang) : formatTokenCountUtil(v, currentLang))}
              style={{ fontSize: '11px', fontWeight: '800', whiteSpace: 'nowrap' }}
            />
          </button>

          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleDarkMode}
            title={darkMode ? 'Activer le mode clair' : 'Activer le mode sombre'}
            className="premium-button darkmode-btn"
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: '50%',
              width: isScrolled ? '32px' : '34px',
              height: isScrolled ? '32px' : '34px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s var(--ease-quiet)',
              flexShrink: 0,
            }}
          >
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Language Selector */}
          <button
            type="button"
            onClick={() => setIsLangModalOpen(true)}
            className="premium-button lang-btn"
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: isScrolled ? '4px 9px' : '5px 10px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'padding 0.3s var(--ease-quiet)',
            }}
          >
            <Globe size={13} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
            <span>
              {currentLang === 'FR'
                ? '🇫🇷 FR'
                : currentLang === 'EN'
                ? '🇬🇧 EN'
                : currentLang === 'ES'
                ? '🇪🇸 ES'
                : currentLang === 'IT'
                ? '🇮🇹 IT'
                : currentLang === 'DE'
                ? '🇩🇪 DE'
                : currentLang === 'JA'
                ? '🇯🇵 JA'
                : '🇨🇳 ZH'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.activeTab === nextProps.activeTab &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.darkMode === nextProps.darkMode &&
    prevProps.currentLang === nextProps.currentLang &&
    prevProps.selectedChat?.id === nextProps.selectedChat?.id &&
    prevProps.callState?.active === nextProps.callState?.active &&
    prevProps.profile?.euroBalance === nextProps.profile?.euroBalance &&
    prevProps.profile?.trocoTokens === nextProps.profile?.trocoTokens &&
    prevProps.profile?.name === nextProps.profile?.name
  );
});

export default AppHeader;
