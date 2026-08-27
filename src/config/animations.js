/**
 * src/config/animations.js — Système Global d'Animations Framer Motion
 * 
 * Permet de basculer instantanément la physique et le comportement de tout le site
 * (pages, cartes du feed, modales) en modifiant simplement ACTIVE_ANIMATION_INDEX.
 */

// Index du preset actif (0 à 5)
// 0: "Smooth Fade" | 1: "Spring Bounce" | 2: "3D Flip" | 3: "Scale & Blur" | 4: "Slide Strike" | 5: "Liquid Elastic"
export const ACTIVE_ANIMATION_INDEX = 0;

export const ANIMATION_PRESETS = [
  // 0: "Smooth Fade" (Fondu classique, fluide et élégant)
  {
    name: 'Smooth Fade',
    page: {
      initial: { opacity: 0, y: 14 },
      animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
      exit: { opacity: 0, y: -10, transition: { duration: 0.18, ease: 'easeOut' } },
    },
    card: {
      initial: { opacity: 0, y: 22 },
      animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
    },
    modal: {
      initial: { opacity: 0, scale: 0.96, y: 12 },
      animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } },
      exit: { opacity: 0, scale: 0.96, y: 10, transition: { duration: 0.18, ease: 'easeIn' } },
    },
  },

  // 1: "Spring Bounce" (Effet élastique et rebond punchy)
  {
    name: 'Spring Bounce',
    page: {
      initial: { opacity: 0, y: 30, scale: 0.98 },
      animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 24 } },
      exit: { opacity: 0, y: -20, scale: 0.98, transition: { duration: 0.15 } },
    },
    card: {
      initial: { opacity: 0, y: 40, scale: 0.94 },
      animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 280, damping: 20 } },
    },
    modal: {
      initial: { opacity: 0, scale: 0.85, y: 30 },
      animate: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 25 } },
      exit: { opacity: 0, scale: 0.88, y: 20, transition: { duration: 0.18 } },
    },
  },

  // 2: "3D Flip" (Rotation 3D spatiale spectaculaire)
  {
    name: '3D Flip',
    page: {
      initial: { opacity: 0, rotateX: -12, y: 20, transformPerspective: 1000 },
      animate: { opacity: 1, rotateX: 0, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
      exit: { opacity: 0, rotateX: 8, y: -15, transition: { duration: 0.2 } },
    },
    card: {
      initial: { opacity: 0, rotateY: 15, scale: 0.96, transformPerspective: 800 },
      animate: { opacity: 1, rotateY: 0, scale: 1, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } },
    },
    modal: {
      initial: { opacity: 0, rotateX: 18, scale: 0.92, transformPerspective: 1000 },
      animate: { opacity: 1, rotateX: 0, scale: 1, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
      exit: { opacity: 0, rotateX: -12, scale: 0.94, transition: { duration: 0.18 } },
    },
  },

  // 3: "Scale & Blur" (Ultra-premium Apple-like avec zoom et défloutage)
  {
    name: 'Scale & Blur',
    page: {
      initial: { opacity: 0, scale: 1.03, filter: 'blur(8px)' },
      animate: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
      exit: { opacity: 0, scale: 0.98, filter: 'blur(6px)', transition: { duration: 0.2 } },
    },
    card: {
      initial: { opacity: 0, scale: 0.92, filter: 'blur(6px)' },
      animate: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] } },
    },
    modal: {
      initial: { opacity: 0, scale: 1.08, filter: 'blur(12px)' },
      animate: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
      exit: { opacity: 0, scale: 0.96, filter: 'blur(8px)', transition: { duration: 0.18 } },
    },
  },

  // 4: "Slide Strike" (Entrée latérale nette et cinématique)
  {
    name: 'Slide Strike',
    page: {
      initial: { opacity: 0, x: 40 },
      animate: { opacity: 1, x: 0, transition: { duration: 0.28, ease: [0.25, 1, 0.5, 1] } },
      exit: { opacity: 0, x: -30, transition: { duration: 0.18 } },
    },
    card: {
      initial: { opacity: 0, x: -30 },
      animate: { opacity: 1, x: 0, transition: { duration: 0.32, ease: [0.25, 1, 0.5, 1] } },
    },
    modal: {
      initial: { opacity: 0, y: 50, scale: 0.97 },
      animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.26, ease: [0.25, 1, 0.5, 1] } },
      exit: { opacity: 0, y: 30, scale: 0.97, transition: { duration: 0.18 } },
    },
  },

  // 5: "Liquid Elastic" (Expansion liquide douce)
  {
    name: 'Liquid Elastic',
    page: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1, transition: { duration: 0.34, ease: [0.34, 1.56, 0.64, 1] } },
      exit: { opacity: 0, scale: 0.97, transition: { duration: 0.18 } },
    },
    card: {
      initial: { opacity: 0, scale: 0.88, y: 20 },
      animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.38, ease: [0.34, 1.56, 0.64, 1] } },
    },
    modal: {
      initial: { opacity: 0, scale: 0.8, y: 25 },
      animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.32, ease: [0.34, 1.56, 0.64, 1] } },
      exit: { opacity: 0, scale: 0.88, y: 15, transition: { duration: 0.18 } },
    },
  },
];

/**
 * Retourne la configuration d'animation active pour un type donné ('page', 'card', 'modal').
 * @param {'page' | 'card' | 'modal'} type
 * @returns {object}
 */
export function getActiveAnimation(type) {
  const safeIndex = (typeof ACTIVE_ANIMATION_INDEX === 'number' && ACTIVE_ANIMATION_INDEX >= 0 && ACTIVE_ANIMATION_INDEX < ANIMATION_PRESETS.length)
    ? ACTIVE_ANIMATION_INDEX
    : 0;
  const activePreset = ANIMATION_PRESETS[safeIndex] || ANIMATION_PRESETS[0];
  return activePreset[type] || activePreset.page;
}
