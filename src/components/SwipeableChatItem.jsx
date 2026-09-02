import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Pin, Trash2, PinOff } from 'lucide-react';
import { hapticLight, hapticError, hapticSuccess } from '../utils/haptics';
import { playPop } from '../services/audioService';

/**
 * SwipeableChatItem.jsx
 * Composant de gesture tactile iOS/Android avec Framer Motion :
 * - Drag horizontal fluide avec contraintes et résistance élastique
 * - Révélation d'actions rapides : Épingler (Bleu) & Supprimer (Rouge)
 * - Déclenchement automatique au swipe long (> 120px) avec animation de rétractation de hauteur
 */
export function SwipeableChatItem({
  chat,
  isPinned = false,
  onTogglePin,
  onDelete,
  children,
}) {
  const x = useMotionValue(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const hasTriggeredSwipeHaptic = useRef(false);
  const hasTriggeredRevealHaptic = useRef(false);

  // Transformations d'opacité et de couleur d'arrière-plan dynamiques
  const actionsOpacity = useTransform(x, [-140, -40, 0], [1, 0.8, 0]);
  const deleteScale = useTransform(x, [-160, -120, -60], [1.2, 1.1, 0.9]);
  const pinScale = useTransform(x, [-120, -60, 0], [1, 0.9, 0.7]);

  const handleDrag = (event, info) => {
    // Révélation des actions (-50px)
    if (info.offset.x < -50 && !hasTriggeredRevealHaptic.current) {
      hapticLight();
      hasTriggeredRevealHaptic.current = true;
    } else if (info.offset.x >= -50 && hasTriggeredRevealHaptic.current) {
      hasTriggeredRevealHaptic.current = false;
    }

    // Seuil de suppression rapide (-120px)
    if (info.offset.x < -120) {
      if (!hasTriggeredSwipeHaptic.current) {
        hapticError();
        hasTriggeredSwipeHaptic.current = true;
      }
    } else {
      hasTriggeredSwipeHaptic.current = false;
    }
  };

  const handleDragEnd = (event, info) => {
    // Swipe long automatique
    if (info.offset.x < -120) {
      triggerDelete();
    }
  };

  const triggerDelete = () => {
    setIsDeleting(true);
    hapticError();
    if (typeof onDelete === 'function') {
      // Petite latence pour laisser l'animation de swipe se lancer
      setTimeout(() => {
        onDelete(chat);
      }, 180);
    }
  };

  const triggerPin = (e) => {
    e.stopPropagation();
    hapticSuccess();
    playPop();
    if (typeof onTogglePin === 'function') {
      onTogglePin(chat);
    }
  };

  return (
    <AnimatePresence>
      {!isDeleting && (
        <motion.div
          layout
          initial={{ opacity: 1, height: 'auto' }}
          exit={{
            opacity: 0,
            height: 0,
            marginBottom: 0,
            transition: { duration: 0.25, ease: [0.32, 0.72, 0, 1] },
          }}
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '16px',
            marginBottom: '4px',
            touchAction: 'pan-y',
          }}
          className="swipeable-chat-item-wrapper"
        >
          {/* FOND D'ACTIONS RÉVÉLÉES AU GLISSEMENT */}
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'stretch',
              opacity: actionsOpacity,
              zIndex: 1,
              borderRadius: '16px',
              overflow: 'hidden',
            }}
          >
            {/* BOUTON ÉPINGLER (BLEU) */}
            <motion.button
              type="button"
              onClick={triggerPin}
              style={{
                scale: pinScale,
                width: '68px',
                border: 'none',
                background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                color: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer',
                fontSize: '10.5px',
                fontWeight: '700',
                padding: '0 4px',
                userSelect: 'none',
              }}
              title={isPinned ? 'Désépingler la conversation' : 'Épingler la conversation'}
            >
              {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
              <span>{isPinned ? 'Détacher' : 'Épingler'}</span>
            </motion.button>

            {/* BOUTON SUPPRIMER (ROUGE) */}
            <motion.button
              type="button"
              onClick={triggerDelete}
              style={{
                scale: deleteScale,
                width: '68px',
                border: 'none',
                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                color: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer',
                fontSize: '10.5px',
                fontWeight: '700',
                padding: '0 4px',
                userSelect: 'none',
              }}
              title="Supprimer la conversation"
            >
              <Trash2 size={16} />
              <span>Supprimer</span>
            </motion.button>
          </motion.div>

          {/* ITEM DE CONVERSATION EN PREMIER PLAN AVEC GESTURE HORIZONTAL */}
          <motion.div
            drag="x"
            dragConstraints={{ left: -136, right: 0 }}
            dragElastic={0.15}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            style={{
              x,
              position: 'relative',
              zIndex: 2,
              backgroundColor: 'var(--bg-card)',
              borderRadius: '16px',
            }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SwipeableChatItem;
