import { useCallback } from 'react';
import { useUIStore } from '../stores';

/**
 * useUserReporting - Custom hook to manage user and listing reporting workflows.
 * Centralizes modal open/close states, active targets (listing, user), and report submissions.
 */
export const useUserReporting = (options = {}) => {
  const uiStore = useUIStore();
  const ui = options?.ui || uiStore;

  // Use store setters if available, with fallback to local state
  const isReportModalOpen = options?.isReportModalOpen !== undefined ? options.isReportModalOpen : ui.isReportModalOpen;
  const setIsReportModalOpen = options?.setIsReportModalOpen || ui.setIsReportModalOpen;
  const reportTarget = options?.reportTarget !== undefined ? options.reportTarget : ui.reportTarget;
  const setReportTarget = options?.setReportTarget || ui.setReportTarget;

  const handleOpenReportModal = useCallback((target) => {
    if (target) {
      setReportTarget(target);
    }
    if (typeof setIsReportModalOpen === 'function') {
      setIsReportModalOpen(true);
    }
  }, [setReportTarget, setIsReportModalOpen]);

  const handleCloseReportModal = useCallback(() => {
    if (typeof setIsReportModalOpen === 'function') {
      setIsReportModalOpen(false);
    }
    if (typeof setReportTarget === 'function') {
      setReportTarget({ listing: null, user: null });
    }
  }, [setReportTarget, setIsReportModalOpen]);

  const handleSubmitReport = useCallback(async (reportData) => {
    // Closes modal and resets target after submission
    handleCloseReportModal();
    return true;
  }, [handleCloseReportModal]);

  return {
    isReportModalOpen,
    setIsReportModalOpen,
    reportTarget,
    setReportTarget,
    handleOpenReportModal,
    handleCloseReportModal,
    handleSubmitReport,
  };
};

export default useUserReporting;
