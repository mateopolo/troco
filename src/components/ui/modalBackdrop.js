/**
 * Centralized Modal Backdrop Design System (UX-02)
 * Ensures all modals, drawers, and overlays apply an opaque, deeply blurred backdrop
 * (bg-black/60 + blur 16px) so that background feed content is never visible or readable.
 */

export const BACKDROP_CLASSNAME = 'fixed inset-0 bg-black/60 backdrop-blur-lg';

export const BACKDROP_STYLE = {
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
};

const modalBackdrop = {
  BACKDROP_CLASSNAME,
  BACKDROP_STYLE,
};

export default modalBackdrop;

