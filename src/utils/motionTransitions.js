/**
 * motionTransitions.js
 * Standardisation des transitions globales Framer Motion (Fade + Scale)
 */

export const pageTransitionVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 }
};

export const pageTransitionConfig = {
  duration: 0.2,
  ease: "easeOut"
};

export default {
  pageTransitionVariants,
  pageTransitionConfig
};
