import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, MessageSquare, PlusCircle, User } from 'lucide-react';
import { hapticLight } from '../../utils/haptics';

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
  const containerRef = useRef(null);

  // État de glissement tactile (Scrubbing / Loupe fluide)
  const [isDragging, setIsDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [hoveredTabId, setHoveredTabId] = useState(activeTab);
  const [tabWidth, setTabWidth] = useState(0);
  const pointerStartRef = useRef({ x: 0, y: 0, time: 0 });
  const isPointerDownRef = useRef(false);

  const tabs = useMemo(() => [
    {
      id: 'feed',
      label: typeof t === 'function' ? t('explorer') : 'Explorer',
      Icon: Search,
      strokeWidth: 2.1,
    },
    {
      id: 'community',
      label: typeof t === 'function' ? t('community') || 'Communauté' : 'Communauté',
      Icon: Globe,
      strokeWidth: 2.1,
      hasBadge: true,
      badgeType: 'pulse',
    },
    {
      id: 'chat',
      label: typeof t === 'function' ? t('messages') : 'Messages',
      Icon: MessageSquare,
      strokeWidth: 2.1,
      hasBadge: unreadCount > 0,
      badgeType: 'count',
      badgeValue: unreadCount > 9 ? '9+' : unreadCount,
    },
    {
      id: 'post',
      label: currentLang === 'FR' ? 'Déposer' : (typeof t === 'function' ? t('post') : 'Déposer'),
      Icon: PlusCircle,
      strokeWidth: 2.1,
      isSpecialAction: true,
    },
    {
      id: 'profile',
      label: typeof t === 'function' ? t('profile') : 'Profil',
      Icon: User,
      strokeWidth: 2.1,
    },
  ], [t, unreadCount, currentLang]);

  const activeIndex = useMemo(() => {
    const idx = tabs.findIndex(tab => tab.id === activeTab);
    return idx >= 0 ? idx : 0;
  }, [tabs, activeTab]);

  // Recalcul de la géométrie des onglets
  const updateGeometry = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const calculatedWidth = rect.width / tabs.length;
      setTabWidth(calculatedWidth);
    }
  }, [tabs.length]);

  useEffect(() => {
    updateGeometry();
    window.addEventListener('resize', updateGeometry);
    return () => window.removeEventListener('resize', updateGeometry);
  }, [updateGeometry]);

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
  }, [activeTab, onPostClick, switchTab, setSelectedChat, setPostStep, defaultPostDraft, setPostDraft, setPublishMessage, setIsEditingListing]);

  const executeTabAction = useCallback((tabId) => {
    if (tabId === 'post') {
      handlePostButtonClick();
    } else {
      switchTab?.(tabId);
    }
    hapticLight();
  }, [handlePostButtonClick, switchTab]);

  // Calcul de l'onglet cible selon la position X
  const getTabFromX = useCallback((clientX) => {
    if (!containerRef.current) return activeTab;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const rawIndex = Math.floor((relativeX / rect.width) * tabs.length);
    const clampedIndex = Math.max(0, Math.min(tabs.length - 1, rawIndex));
    return tabs[clampedIndex].id;
  }, [tabs, activeTab]);

  // Événements Pointer (Pointer API universelle tactile + souris)
  const handlePointerDown = useCallback((e) => {
    isPointerDownRef.current = true;
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };

    updateGeometry();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    setDragX(relativeX);

    const targetTabId = getTabFromX(e.clientX);
    setHoveredTabId(targetTabId);
    setIsDragging(true);

    if (e.target.setPointerCapture && e.pointerId) {
      try {
        e.target.setPointerCapture(e.pointerId);
      } catch (_) { }
    }
  }, [updateGeometry, getTabFromX]);

  const handlePointerMove = useCallback((e) => {
    if (!isPointerDownRef.current) return;

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    setDragX(relativeX);

    const targetTabId = getTabFromX(e.clientX);
    if (targetTabId !== hoveredTabId) {
      setHoveredTabId(targetTabId);
      hapticLight();
    }
  }, [hoveredTabId, getTabFromX]);

  const handlePointerUp = useCallback((e) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    setIsDragging(false);

    const targetTabId = getTabFromX(e.clientX);
    executeTabAction(targetTabId);

    if (e.target.releasePointerCapture && e.pointerId) {
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch (_) { }
    }
  }, [getTabFromX, executeTabAction]);

  const handlePointerCancel = useCallback((e) => {
    isPointerDownRef.current = false;
    setIsDragging(false);
    setHoveredTabId(activeTab);

    if (e.target?.releasePointerCapture && e.pointerId) {
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch (_) { }
    }
  }, [activeTab]);

  const isHidden = (isMobile && activeTab === 'chat' && Boolean(selectedChat)) || Boolean(selectedListing);

  // Position calculée de la loupe en mode libre ou snap
  const lensX = useMemo(() => {
    if (!tabWidth) return 0;
    if (isDragging) {
      return Math.max(0, Math.min((tabs.length - 1) * tabWidth, dragX - tabWidth / 2));
    }
    return activeIndex * tabWidth;
  }, [isDragging, dragX, tabWidth, tabs.length, activeIndex]);

  return (
    <nav
      ref={bottomNavRef}
      aria-label="Navigation principale mobile"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
      style={{
        display: isHidden ? 'none' : 'block',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: darkMode ? 'rgba(24, 21, 19, 0.72)' : 'rgba(250, 247, 242, 0.68)',
        backdropFilter: 'blur(28px) saturate(200%)',
        WebkitBackdropFilter: 'blur(28px) saturate(200%)',
        borderTop: darkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)',
        padding: '8px 12px max(8px, env(safe-area-inset-bottom, 8px))',
        zIndex: 99999,
        boxShadow: darkMode ? '0 -10px 30px rgba(0, 0, 0, 0.45)' : '0 -10px 30px rgba(0, 0, 0, 0.05)',
        transition: 'background-color 0.3s ease, border-color 0.3s ease',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        cursor: 'pointer',
      }}
    >
      <div
        ref={containerRef}
        style={{
          maxWidth: '640px',
          margin: '0 auto',
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '56px',
        }}
      >
        {/* LA LOUPE FLUIDE EN VERRE DÉPOLI (APPLE GLASSMORPHISM SCRUBBING LENS) */}
        <AnimatePresence>
          {tabWidth > 0 && (
            <motion.div
              layoutId="bottomNavScrubbingLens"
              initial={false}
              animate={{
                x: lensX,
                scale: isDragging ? 1.06 : 1,
                opacity: 1,
              }}
              transition={{
                type: 'spring',
                stiffness: isDragging ? 550 : 420,
                damping: isDragging ? 36 : 30,
                mass: 0.6,
              }}
              style={{
                position: 'absolute',
                left: 0,
                top: '4px',
                bottom: '4px',
                width: `${tabWidth}px`,
                borderRadius: '9999px',
                background: darkMode
                  ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.06) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.45) 100%)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: darkMode ? '1px solid rgba(255, 255, 255, 0.22)' : '1px solid rgba(255, 255, 255, 0.85)',
                boxShadow: darkMode
                  ? '0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.35)'
                  : '0 8px 24px rgba(198, 125, 91, 0.18), inset 0 1px 2px rgba(255, 255, 255, 0.95)',
                zIndex: 0,
                pointerEvents: 'none',
              }}
            />
          )}
        </AnimatePresence>

        {/* ONGLETS DE NAVIGATION */}
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isHovered = isDragging && hoveredTabId === tab.id;
          const isHighlighted = isDragging ? isHovered : isActive;
          const IconComponent = tab.Icon;

          return (
            <div
              key={tab.id}
              data-tab={tab.id}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                height: '100%',
                position: 'relative',
                zIndex: 1,
                pointerEvents: 'none', // Évite d'intercepter les coordonnées pointer du conteneur nav
                transition: 'transform 0.2s var(--ease-monopo)',
                transform: isHighlighted ? 'scale(1.08)' : 'scale(1)',
              }}
            >
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconComponent
                  size={tab.id === 'post' ? 24 : 22}
                  color={isHighlighted ? 'var(--accent-primary, #C67D5B)' : 'var(--text-secondary, #8C827A)'}
                  strokeWidth={isHighlighted ? 2.4 : tab.strokeWidth}
                  style={{
                    transition: 'color 0.2s ease, stroke-width 0.2s ease',
                  }}
                />

                {/* BADGE PULSE (COMMUNAUTÉ) */}
                {tab.hasBadge && tab.badgeType === 'pulse' && (
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
                )}

                {/* BADGE COMPTEUR (MESSAGES) */}
                {tab.hasBadge && tab.badgeType === 'count' && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-6px',
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
                    {tab.badgeValue}
                  </span>
                )}
              </div>

              <span
                style={{
                  fontSize: '11px',
                  fontWeight: isHighlighted ? '800' : '600',
                  letterSpacing: '0.01em',
                  color: isHighlighted ? 'var(--accent-primary, #C67D5B)' : 'var(--text-secondary, #8C827A)',
                  transition: 'color 0.2s ease, font-weight 0.2s ease',
                }}
              >
                {tab.label}
              </span>
            </div>
          );
        })}
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
