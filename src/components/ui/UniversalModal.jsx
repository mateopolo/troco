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

const BOTTOM_NAV_HEIGHT = 80;

export default function UniversalModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-2xl',
  closeOnBackdrop = true,
  closeOnEscape = true,
  ariaLabel = 'Fenêtre modale',
  ariaLabelledBy,
  showCloseButton = true,
  closeButtonLabel = 'Fermer',
  contentStyle,
  contentClassName = '',
  overlayStyle,
  overlayClassName = '',
  header,
  disableSafeArea = false,
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

  const MAX_WIDTHS = {
    'max-w-sm': '384px',
    'max-w-md': '448px',
    'max-w-lg': '512px',
    'max-w-xl': '576px',
    'max-w-2xl': '672px',
    'max-w-3xl': '768px',
    'max-w-4xl': '896px',
    'max-w-5xl': '1024px',
    'max-w-6xl': '1152px',
    'max-w-7xl': '1280px',
    'max-w-full': '100%',
  };

  const resolvedMaxWidth = typeof maxWidth === 'number'
    ? `${maxWidth}px`
    : MAX_WIDTHS[maxWidth] || maxWidth;

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget && closeOnBackdrop) {
      onClose?.();
    }
  };

  const safeAreaBottom = disableSafeArea ? '0px' : 'env(safe-area-inset-bottom, 0px)';

  return createPortal(
    <div
      className={`universal-modal-overlay ${overlayClassName}`}
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        paddingBottom: `calc(16px + ${BOTTOM_NAV_HEIGHT}px + ${safeAreaBottom})`,
        ...overlayStyle,
      }}
    >
      <div
        className="universal-modal-backdrop"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        tabIndex={-1}
        className={`universal-modal-content ${contentClassName}`}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: resolvedMaxWidth,
          maxHeight: '100%',
          backgroundColor: 'var(--bg-primary, #ffffff)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          ...contentStyle,
        }}
      >
        {header ? (
          <div
            className="universal-modal-header"
            style={{
              flexShrink: 0,
              minHeight: 0,
            }}
          >
            {header}
          </div>
        ) : null}

        {title && !header ? (
          <div
            className="universal-modal-title-bar"
            style={{
              flexShrink: 0,
              minHeight: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-color, rgba(0,0,0,0.08))',
            }}
          >
            <h2
              id={ariaLabelledBy}
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--text-main, inherit)',
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </h2>
            {showCloseButton && onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label={closeButtonLabel}
                style={{
                  border: 'none',
                  background: 'transparent',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary, inherit)',
                  flexShrink: 0,
                }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        ) : null}

        {!title && !header && showCloseButton && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={closeButtonLabel}
            className="universal-modal-close"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              zIndex: 10,
              border: 'none',
              background: 'transparent',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary, inherit)',
            }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}

        <div
          className="modal-content"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {children}
        </div>

        {footer && (
          <div
            className="universal-modal-footer"
            style={{
              flexShrink: 0,
              minHeight: 0,
              borderTop: '1px solid var(--border-color, rgba(0,0,0,0.08))',
              padding: '16px 24px',
              paddingBottom: `calc(16px + ${safeAreaBottom})`,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
