import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';
import UniversalModal from './UniversalModal';
import modalBackdrop from './modalBackdrop';
import { ConfirmContext } from '../../hooks/useConfirm';
import { useLanguage } from '../../contexts/LanguageContext';

export function ConfirmDialog({
  isOpen: propIsOpen,
  onConfirm: propOnConfirm,
  onCancel: propOnCancel,
  config: propConfig,
}) {
  const context = useContext(ConfirmContext);
  const { t } = useLanguage();

  const isOpen = propIsOpen !== undefined ? propIsOpen : (context?.isOpen ?? false);
  const onConfirm = propOnConfirm || context?.onConfirm || (() => {});
  const onCancel = propOnCancel || context?.onCancel || (() => {});
  const config = propConfig || context?.config || {};

  const {
    title,
    message,
    confirmLabel,
    cancelLabel,
    variant = 'default',
  } = config;

  if (!isOpen) return null;

  const resolvedTitle = title || (
    variant === 'danger'
      ? t('confirm_danger_title', 'Confirmation requise')
      : variant === 'warning'
        ? t('confirm_warning_title', 'Attention')
        : t('confirm_default_title', 'Confirmation')
  );

  const resolvedConfirmLabel = confirmLabel || (
    variant === 'danger'
      ? t('confirm_dialog_delete', t('delete', 'Supprimer'))
      : t('confirmBtn', 'Confirmer')
  );

  const resolvedCancelLabel = cancelLabel || t('cancelBtn', 'Annuler');

  // Variant design tokens
  let iconNode;
  let iconBg;
  let confirmBtnStyle;

  if (variant === 'danger') {
    iconNode = <AlertTriangle size={24} className="text-red-500" />;
    iconBg = 'bg-red-500/10 border-red-500/20 text-red-500';
    confirmBtnStyle = {
      backgroundColor: '#DC2626',
      color: '#FFFFFF',
      boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
    };
  } else if (variant === 'warning') {
    iconNode = <AlertCircle size={24} className="text-amber-500" />;
    iconBg = 'bg-amber-500/10 border-amber-500/20 text-amber-500';
    confirmBtnStyle = {
      backgroundColor: '#D97706',
      color: '#FFFFFF',
      boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)',
    };
  } else {
    iconNode = <HelpCircle size={24} className="text-[#E07A5F]" />;
    iconBg = 'bg-[#E07A5F]/10 border-[#E07A5F]/20 text-[#E07A5F]';
    confirmBtnStyle = {
      backgroundColor: '#E07A5F',
      color: '#FFFFFF',
      boxShadow: '0 4px 14px rgba(224, 122, 95, 0.35)',
    };
  }

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onCancel}
      maxWidth="sm"
      showCloseButton={false}
      closeOnBackdrop={true}
      closeOnEscape={true}
      ariaLabel={resolvedTitle}
      overlayStyle={modalBackdrop.BACKDROP_STYLE}
      contentClassName="p-2 sm:p-4"
    >
      <div className="flex flex-col items-center text-center w-full pt-3 pb-2 px-1">
        {/* Dynamic Icon Badge */}
        <div
          className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-4 transition-transform ${iconBg}`}
          style={{ animation: 'popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
        >
          {iconNode}
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-[var(--text-main)] mb-2 px-2 leading-snug">
          {resolvedTitle}
        </h3>

        {/* Message */}
        {message && (
          <p className="text-sm text-[var(--text-secondary,#6B7280)] mb-6 px-3 whitespace-pre-line leading-relaxed max-w-sm">
            {message}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-150 border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-main)] hover:bg-[var(--bg-card)] active:scale-[0.98] cursor-pointer"
          >
            {resolvedCancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={confirmBtnStyle}
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-150 active:scale-[0.98] cursor-pointer"
          >
            {resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </UniversalModal>
  );
}

ConfirmDialog.propTypes = {
  isOpen: PropTypes.bool,
  onConfirm: PropTypes.func,
  onCancel: PropTypes.func,
  config: PropTypes.shape({
    title: PropTypes.string,
    message: PropTypes.string,
    confirmLabel: PropTypes.string,
    cancelLabel: PropTypes.string,
    variant: PropTypes.oneOf(['danger', 'default', 'warning']),
  }),
};

export default ConfirmDialog;
