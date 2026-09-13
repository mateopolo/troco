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
  footer,
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
    <>
      <div
        className="modal-backdrop"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        className={`universal-modal-layer ${overlayClassName}`.trim()}
        onClick={handleBackdropClick}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          pointerEvents: 'none',
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
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxSizing: 'border-box',
            pointerEvents: 'auto',
            ...contentStyle,
          }}
        >
          {title && (
            <div className="universal-modal-header">
              <h2>{title}</h2>
              {showCloseButton && onClose && (
                <button type="button" onClick={onClose} aria-label={closeButtonLabel}>
                  <X size={18} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
          {!title && showCloseButton && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={closeButtonLabel}
              className="universal-modal-close"
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
          <div className="modal-content">
            {children}
          </div>
          {footer && <div className="universal-modal-footer">{footer}</div>}
        </div>
      </div>
    </>
  );

  return createPortal(overlay, document.body);
}

export { UniversalModal };
