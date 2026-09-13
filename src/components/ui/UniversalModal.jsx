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

const MAX_WIDTHS = {
  sm: '384px',
  md: '448px',
  lg: '680px',
  xl: '896px',
  '2xl': '1152px',
  full: '100%',
};

export function UniversalModal({
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

  const resolvedMaxWidth = typeof maxWidth === 'number'
    ? `${maxWidth}px`
    : MAX_WIDTHS[maxWidth] || maxWidth;

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget && closeOnBackdrop) {
      onClose?.();
    }
  };

  return createPortal(
    <div
      onClick={handleBackdropClick}
      className={`fixed inset-0 z-[99999] flex items-center justify-center ${overlayClassName}`.trim()}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: 'max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))',
        ...overlayStyle,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabelledBy ? undefined : ariaLabel}
        aria-labelledby={ariaLabelledBy}
        tabIndex={-1}
        className={`relative w-full max-h-[90dvh] flex flex-col rounded-2xl shadow-2xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-color)] ${contentClassName}`.trim()}
        onClick={(event) => event.stopPropagation()}
        style={{
          maxWidth: resolvedMaxWidth,
          ...contentStyle,
        }}
      >
        {title && (
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
            <h2 className="text-lg font-semibold text-[var(--text-main)]">{title}</h2>
            {showCloseButton && onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label={closeButtonLabel}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-subtle)] transition"
              >
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
            className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-subtle)] transition"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-4">
          {children}
        </div>
        {footer && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-[var(--border-color)]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default UniversalModal;
