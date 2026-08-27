import React, { useRef, useEffect, useCallback } from 'react';
import { Search, Globe, MessageSquare, PlusCircle, User } from 'lucide-react';

export const AppBottomNav = React.memo(({
  isMobile = false,
  activeTab = 'feed',
  selectedChat = null,
  selectedListing = null,
  darkMode = false,
  switchTab = () => {},
  t = (k) => k,
  unreadCount = 0,
  currentLang = 'FR',
  onPostClick = null,
  setSelectedChat = () => {},
  setPostStep = () => {},
  setPostDraft = () => {},
  defaultPostDraft = null,
  setPublishMessage = () => {},
  setIsEditingListing = () => {},
}) => {
  const bottomNavRef = useRef(null);

  // Navigation "Scrubbing" iOS stricte sur la barre de navigation inférieure
  useEffect(() => {
    const navEl = bottomNavRef.current;
    if (!navEl) return;

    let isTouchingNav = false;

    const handleTouchStart = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      isTouchingNav = true;
      const touch = e.touches[0];
      const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
      const tabBtn = targetEl?.closest?.('[data-tab]');
      if (tabBtn) {
        const targetTab = tabBtn.getAttribute('data-tab');
        if (targetTab && targetTab !== activeTab) {
          switchTab(targetTab);
        }
      }
    };

    const handleTouchMove = (e) => {
      if (!isTouchingNav || !e.touches || e.touches.length === 0) return;
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
      const tabBtn = targetEl?.closest?.('[data-tab]');
      if (tabBtn) {
        const targetTab = tabBtn.getAttribute('data-tab');
        if (targetTab && targetTab !== activeTab) {
          switchTab(targetTab);
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(10); } catch (_) { }
          }
        }
      }
    };

    const handleTouchEnd = () => {
      isTouchingNav = false;
    };

    navEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    navEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    navEl.addEventListener('touchend', handleTouchEnd, { passive: true });
    navEl.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      navEl.removeEventListener('touchstart', handleTouchStart);
      navEl.removeEventListener('touchmove', handleTouchMove);
      navEl.removeEventListener('touchend', handleTouchEnd);
      navEl.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [activeTab, switchTab]);

  const handlePostButtonClick = useCallback(() => {
    if (typeof onPostClick === 'function') {
      onPostClick();
      return;
    }
    setSelectedChat?.(null);
    if (activeTab === 'post') {
      setPostStep?.(1);
      if (defaultPostDraft) setPostDraft?.(defaultPostDraft);
      setPublishMessage?.('');
      setIsEditingListing?.(false);
    } else {
      switchTab?.('post');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, onPostClick, switchTab, defaultPostDraft]);

  const isHidden = (isMobile && activeTab === 'chat' && Boolean(selectedChat)) || Boolean(selectedListing);

  return (
    <nav
      ref={bottomNavRef}
      aria-label="Navigation principale mobile"
      style={{
        display: isHidden ? 'none' : 'block',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: darkMode ? 'rgba(24, 21, 19, 0.65)' : 'rgba(250, 247, 242, 0.55)',
        backdropFilter: 'blur(24px) saturate(190%)',
        WebkitBackdropFilter: 'blur(24px) saturate(190%)',
        border: 'none',
        borderTop: 'none',
        padding: '10px 16px max(10px, env(safe-area-inset-bottom, 10px))',
        zIndex: 99999,
        boxShadow: 'none',
        transition: 'background-color 0.3s ease',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <div
        style={{
          maxWidth: '680px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          willChange: 'transform',
        }}
      >
        {/* 1. EXPLORER (FEED) */}
        <button
          type="button"
          data-tab="feed"
          onClick={() => switchTab?.('feed')}
          style={{
            border: 'none',
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            color: activeTab === 'feed' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px 14px',
            position: 'relative',
            transition: 'transform 0.3s var(--ease-monopo), color 0.2s ease',
            transform: activeTab === 'feed' ? 'scale(1.06)' : 'scale(1)',
            outline: 'none',
          }}
        >
          <Search
            size={22}
            color={activeTab === 'feed' ? 'var(--accent-primary)' : 'var(--text-secondary)'}
            strokeWidth={activeTab === 'feed' ? 2.3 : 1.8}
          />
          <span
            style={{
              fontSize: '11px',
              fontWeight: activeTab === 'feed' ? '700' : '500',
              letterSpacing: '0.01em',
              color: activeTab === 'feed' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          >
            {typeof t === 'function' ? t('explorer') : 'Explorer'}
          </span>
        </button>

        {/* 2. COMMUNAUTÉ & TROCO LIVE */}
        <button
          type="button"
          data-tab="community"
          onClick={() => switchTab?.('community')}
          style={{
            border: 'none',
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            color: activeTab === 'community' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px 14px',
            position: 'relative',
            transition: 'transform 0.3s var(--ease-monopo), color 0.2s ease',
            transform: activeTab === 'community' ? 'scale(1.06)' : 'scale(1)',
            outline: 'none',
          }}
        >
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <Globe
              size={22}
              color={activeTab === 'community' ? 'var(--accent-primary)' : 'var(--text-secondary)'}
              strokeWidth={activeTab === 'community' ? 2.3 : 1.8}
            />
            <span
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-4px',
                width: '7px',
                height: '7px',
                backgroundColor: '#EF4444',
                borderRadius: '50%',
                boxShadow: '0 0 6px #EF4444',
                animation: 'pulse 1.8s infinite',
              }}
            />
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: activeTab === 'community' ? '700' : '500',
              letterSpacing: '0.01em',
              color: activeTab === 'community' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          >
            Communauté
          </span>
        </button>

        {/* 3. MESSAGES */}
        <button
          type="button"
          data-tab="chat"
          onClick={() => switchTab?.('chat')}
          style={{
            border: 'none',
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            color: activeTab === 'chat' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px 14px',
            position: 'relative',
            transition: 'transform 0.3s var(--ease-monopo), color 0.2s ease',
            transform: activeTab === 'chat' ? 'scale(1.06)' : 'scale(1)',
            outline: 'none',
          }}
        >
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <MessageSquare
              size={22}
              color={activeTab === 'chat' ? 'var(--accent-primary)' : 'var(--text-secondary)'}
              strokeWidth={activeTab === 'chat' ? 2.3 : 1.8}
            />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-7px',
                  right: '-11px',
                  minWidth: '17px',
                  height: '17px',
                  backgroundColor: darkMode ? '#FAF7F2' : '#2D2825',
                  color: darkMode ? '#1A1715' : '#FFFFFF',
                  fontSize: '9px',
                  fontWeight: '900',
                  borderRadius: '999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                  letterSpacing: '-0.3px',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: activeTab === 'chat' ? '700' : '500',
              letterSpacing: '0.01em',
              color: activeTab === 'chat' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          >
            {typeof t === 'function' ? t('messages') : 'Messages'}
          </span>
        </button>

        {/* 4. DÉPOSER */}
        <button
          type="button"
          data-tab="post"
          onClick={handlePostButtonClick}
          style={{
            border: 'none',
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            color: activeTab === 'post' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px 14px',
            transition: 'transform 0.3s var(--ease-monopo), color 0.2s ease',
            transform: activeTab === 'post' ? 'scale(1.06)' : 'scale(1)',
            outline: 'none',
          }}
        >
          <PlusCircle
            size={23}
            color={activeTab === 'post' ? 'var(--accent-primary)' : 'var(--text-secondary)'}
            strokeWidth={activeTab === 'post' ? 2.3 : 1.8}
          />
          <span
            style={{
              fontSize: '11px',
              fontWeight: activeTab === 'post' ? '700' : '500',
              letterSpacing: '0.01em',
              color: activeTab === 'post' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          >
            {currentLang === 'FR' ? 'Déposer' : (typeof t === 'function' ? t('post') : 'Déposer')}
          </span>
        </button>

        {/* 5. PROFIL */}
        <button
          type="button"
          data-tab="profile"
          onClick={() => switchTab?.('profile')}
          style={{
            border: 'none',
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            color: activeTab === 'profile' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px 14px',
            transition: 'transform 0.3s var(--ease-monopo), color 0.2s ease',
            transform: activeTab === 'profile' ? 'scale(1.06)' : 'scale(1)',
            outline: 'none',
          }}
        >
          <User
            size={22}
            color={activeTab === 'profile' ? 'var(--accent-primary)' : 'var(--text-secondary)'}
            strokeWidth={activeTab === 'profile' ? 2.3 : 1.8}
          />
          <span
            style={{
              fontSize: '11px',
              fontWeight: activeTab === 'profile' ? '700' : '500',
              letterSpacing: '0.01em',
              color: activeTab === 'profile' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          >
            {typeof t === 'function' ? t('profile') : 'Profil'}
          </span>
        </button>
      </div>
    </nav>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.activeTab === nextProps.activeTab &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.darkMode === nextProps.darkMode &&
    prevProps.currentLang === nextProps.currentLang &&
    prevProps.unreadCount === nextProps.unreadCount &&
    prevProps.selectedChat?.id === nextProps.selectedChat?.id &&
    Boolean(prevProps.selectedListing) === Boolean(nextProps.selectedListing) &&
    prevProps.switchTab === nextProps.switchTab &&
    prevProps.onPostClick === nextProps.onPostClick
  );
});

export default AppBottomNav;
