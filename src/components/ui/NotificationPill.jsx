import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Coins, Handshake, Bell, X, ChevronRight } from 'lucide-react';
import notificationService from '../../services/notificationService';
import { hapticSuccess } from '../../utils/haptics';

/**
 * NotificationPill.jsx
 * Composant de notifications interactif façon "Dynamic Island" Apple-grade :
 * - Effet d'apparition en chute avec rebond élastique (Spring)
 * - Glassmorphism sombre ultra-profond avec lueur ambiante
 * - Rendu de l'avatar expéditeur ou icône thématique
 * - Ligne de texte tronquée (truncate)
 * - Clic direct pour redirection immédiate vers le chat / deal / annonce
 */
export function NotificationPill() {
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((current) => {
      setNotification(current);
    });

    // Écoute également les CustomEvent 'troco:notify'
    const handleCustomNotify = (e) => {
      if (e.detail) {
        notificationService.show(e.detail);
      }
    };
    window.addEventListener('troco:notify', handleCustomNotify);

    return () => {
      unsubscribe();
      window.removeEventListener('troco:notify', handleCustomNotify);
    };
  }, []);

  const handleClick = (e) => {
    e.stopPropagation();
    if (!notification) return;

    hapticSuccess();

    if (typeof notification.onClick === 'function') {
      notification.onClick(notification.data);
    } else if (notification.data?.chatId) {
      window.dispatchEvent(new CustomEvent('troco:open_chat', { detail: notification.data }));
    } else if (notification.data?.listingId) {
      window.dispatchEvent(new CustomEvent('troco:open_listing', { detail: notification.data }));
    }

    notificationService.dismiss();
  };

  const handleClose = (e) => {
    e.stopPropagation();
    notificationService.dismiss();
  };

  const renderIconOrAvatar = () => {
    if (notification.avatar) {
      if (typeof notification.avatar === 'string' && (notification.avatar.startsWith('http') || notification.avatar.startsWith('data:'))) {
        return (
          <img
            src={notification.avatar}
            alt={notification.title || 'Expéditeur'}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '1.5px solid rgba(255, 255, 255, 0.2)',
              flexShrink: 0,
            }}
          />
        );
      }
      return (
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #C67D5B 0%, #D97706 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: '800',
            flexShrink: 0,
            border: '1.5px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          {String(notification.avatar).slice(0, 1).toUpperCase()}
        </div>
      );
    }

    switch (notification.icon) {
      case 'deal':
        return (
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.25)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Handshake size={16} />
          </div>
        );
      case 'token':
        return (
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(245, 158, 11, 0.25)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Coins size={16} />
          </div>
        );
      case 'chat':
        return (
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.25)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MessageSquare size={16} />
          </div>
        );
      default:
        return (
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(198, 125, 91, 0.25)', color: '#C67D5B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bell size={16} />
          </div>
        );
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 'env(safe-area-inset-top, 8px)',
        left: 0,
        right: 0,
        zIndex: 999999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '8px 16px',
        pointerEvents: 'none',
      }}
      className="top-safe-area dynamic-island-container"
    >
      <AnimatePresence>
        {notification && (
          <motion.div
            key={notification.id}
            initial={{ y: -50, scale: 0.8, opacity: 0 }}
            animate={{
              y: 10,
              scale: 1,
              opacity: 1,
              transition: {
                type: 'spring',
                stiffness: 420,
                damping: 24,
                mass: 0.8,
              },
            }}
            exit={{
              y: -50,
              scale: 0.8,
              opacity: 0,
              transition: { duration: 0.22, ease: 'easeOut' },
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            drag="y"
            dragConstraints={{ top: -80, bottom: 0 }}
            onDragEnd={(e, info) => {
              if (info.offset.y < -30) {
                notificationService.dismiss();
              }
            }}
            onClick={handleClick}
            style={{
              pointerEvents: 'auto',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 14px 8px 10px',
              borderRadius: '999px',
              maxWidth: 'min(92vw, 420px)',
              width: '100%',
              backgroundColor: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(20px) saturate(190%)',
              WebkitBackdropFilter: 'blur(20px) saturate(190%)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
              color: '#F8FAFC',
              userSelect: 'none',
              touchAction: 'pan-y',
            }}
            className="dynamic-island-pill"
          >
            {/* AVATAR OU ICÔNE */}
            {renderIconOrAvatar()}

            {/* CONTENU TEXTE AVEC TRUNCATE */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: '800',
                    color: '#FFFFFF',
                    letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  className="truncate"
                >
                  {notification.title}
                </span>
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: '700',
                    color: 'rgba(255, 255, 255, 0.5)',
                    flexShrink: 0,
                  }}
                >
                  maintenant
                </span>
              </div>

              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: '500',
                  color: 'rgba(241, 245, 249, 0.82)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: '1.3',
                }}
                className="truncate"
                title={notification.message}
              >
                {notification.message}
              </div>
            </div>

            {/* ACTION RAPIDE ET FERMETURE */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255, 255, 255, 0.7)',
                }}
              >
                <ChevronRight size={12} strokeWidth={2.5} />
              </div>

              <button
                type="button"
                onClick={handleClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.45)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'color 0.15s ease',
                }}
                title="Fermer"
              >
                <X size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NotificationPill;
