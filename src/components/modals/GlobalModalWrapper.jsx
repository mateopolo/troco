// src/components/modals/GlobalModalWrapper.jsx
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Universal modal wrapper ensuring:
 * - Single direct portal to document.body
 * - Clean z-index stack (100000)
 * - Backdrop click to close
 * - ESC key handling
 * - Body scroll lock without layout shift
 * - Single scrollbar container
 */
export default function GlobalModalWrapper({
  isOpen,
  onClose,
  children,
  zIndex = 100000,
  maxWidth = '560px',
  ariaLabel = 'Modal',
  className = '',
  backdropClassName = '',
  containerStyle = {},
  disableBackdropClick = false,
}) {
  const containerRef = useRef(null);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen]);

  // Escape key listener
  useEffect(() => {
    if (!isOpen || !onClose) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (disableBackdropClick) return;
    if (e.target === e.currentTarget && onClose) {
      e.stopPropagation();
      onClose();
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={handleBackdropClick}
      className={`fixed inset-0 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm pointer-events-auto transition-opacity duration-200 ${backdropClassName}`}
      style={{
        zIndex,
        boxSizing: 'border-box',
      }}
    >
      <div
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-h-[92vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl transition-all transform duration-200 border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] ${className}`}
        style={{
          maxWidth,
          boxSizing: 'border-box',
          ...containerStyle,
        }}
      >
        {children}
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
