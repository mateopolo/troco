import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FOCUSABLE_ELEMENTS = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

let openModalCount = 0;
let previousBodyOverflow = '';

/**
 * Shared modal shell. Content remains responsible for its own visual design,
 * while this component provides a consistent portal, stacking order and a11y.
 */
export default function UniversalModal({
  isOpen,
  onClose,
  children,
  title,
  maxWidth = 'lg',
  ariaLabel = 'Fenêtre modale',
  ariaLabelledBy,
  showCloseButton = true,
  closeButtonLabel = 'Fermer',
  closeOnBackdrop = true,
  closeOnEscape = true,
  contentStyle,
  contentClassName = '',
  overlayStyle,
  overlayClassName = '',
}) {
  const dialogRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;

    previousActiveElement.current = document.activeElement;
    openModalCount += 1;
    if (openModalCount === 1) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    const focusDialog = () => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = dialog.querySelectorAll(FOCUSABLE_ELEMENTS);
      (focusable[0] || dialog).focus();
    };

    const handleKeyDown = (event) => {
      if (closeOnEscape && event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll(FOCUSABLE_ELEMENTS));
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const focusTimer = window.setTimeout(focusDialog, 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
      }
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [closeOnEscape, isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleBackdropClick = (event) => {
    if (closeOnBackdrop && event.target === event.currentTarget) {
      onClose?.();
    }
  };

  const overlay = (
    <div
      className={`universal-modal-overlay ${overlayClassName}`.trim()}
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: 'rgba(15, 23, 42, 0.68)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 16px var(--modal-safe-bottom)',
        overflow: 'auto',
        boxSizing: 'border-box',
        ...overlayStyle,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabelledBy ? undefined : ariaLabel}
        aria-labelledby={ariaLabelledBy}
        tabIndex={-1}
        className={`universal-modal-content ${contentClassName}`.trim()}
        onClick={(event) => event.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : ({
            sm: '384px',
            md: '448px',
            lg: '680px',
            xl: '896px',
            '2xl': '1152px',
            full: '100%',
          }[maxWidth] || maxWidth),
          maxHeight: 'calc(100dvh - 32px)',
          overflowY: 'auto',
          boxSizing: 'border-box',
          ...contentStyle,
        }}
      >
        {title && <h2 className="sr-only">{title}</h2>}
        {showCloseButton && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={closeButtonLabel}
            className="universal-modal-close"
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              zIndex: 2,
              width: '36px',
              height: '36px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.82)',
              color: '#3D3530',
              cursor: 'pointer',
            }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
        {children}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

export { UniversalModal };
