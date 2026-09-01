import { create } from 'zustand';

/**
 * Centralized UI Store for all modals, drawers, popovers, and overlays across Troco.
 * Eliminates 60+ useState variables from App.js to prevent cascade re-renders.
 */
export const useUIStore = create((set, get) => ({
  // Listing & User Selection
  selectedListing: null,
  selectedPublicUser: null,
  selectedMapItem: null,
  editingOriginalListing: null,
  isEditingListing: false,
  boostingListing: null,
  boostMessage: '',

  // Filter & Navigation Drawers
  isFilterDrawerOpen: false,
  isCategoryModalOpen: false,
  isLangModalOpen: false,
  viewMode: 'list', // 'list' | 'map'
  formatFilter: 'all',

  // Profile & KYC
  isEditingProfile: false,
  isKycModalOpen: false,
  isOnboardingOpen: false,

  // Admin & Moderation
  isAdminPanelOpen: false,
  isGodModeActive: (() => {
    try {
      return localStorage.getItem('troco_god_mode') === 'true';
    } catch (_) {
      return false;
    }
  })(),
  isReportModalOpen: false,
  reportTarget: { listing: null, user: null },

  // Payments, CGU & Transactions
  isPaymentModalOpen: false,
  paymentModalConfig: { mode: 'pack-tokens', payload: null },
  isTransactionsModalOpen: false,
  isPrivacyCenterOpen: false,
  isCguViewerOpen: false,
  isBoostModalOpen: false,

  // Collaborative Suite & Tools
  isWhiteboardOpen: false,
  activeWhiteboardId: null,
  isSharedDocOpen: false,
  isCloudOfficeOpen: false,
  officeInitialTab: 'docs',
  isCreateProjectGroupOpen: false,
  isProjectRewardsOpen: false,
  isVisioSettlementOpen: false,

  // UI Toasts & Celebrations
  topUpCelebration: null,
  saveMessage: '',

  // Setters & Modal Actions
  setSelectedListing: (selectedListing) => set({ selectedListing }),
  setSelectedPublicUser: (selectedPublicUser) => set({ selectedPublicUser }),
  setSelectedMapItem: (selectedMapItem) => set({ selectedMapItem }),
  setEditingOriginalListing: (editingOriginalListing) => set({ editingOriginalListing }),
  setIsEditingListing: (isEditingListing) => set({ isEditingListing }),
  setBoostingListing: (boostingListing) => set({ boostingListing }),
  setBoostMessage: (boostMessage) => set({ boostMessage }),

  setIsFilterDrawerOpen: (isFilterDrawerOpen) => set({ isFilterDrawerOpen }),
  setIsCategoryModalOpen: (isCategoryModalOpen) => set({ isCategoryModalOpen }),
  setIsLangModalOpen: (isLangModalOpen) => set({ isLangModalOpen }),
  setViewMode: (viewMode) => set({ viewMode }),
  setFormatFilter: (formatFilter) => set({ formatFilter }),

  setIsEditingProfile: (isEditingProfile) => set({ isEditingProfile }),
  setIsKycModalOpen: (isKycModalOpen) => set({ isKycModalOpen }),
  setIsOnboardingOpen: (isOnboardingOpen) => set({ isOnboardingOpen }),

  setIsAdminPanelOpen: (isAdminPanelOpen) => set({ isAdminPanelOpen }),
  setIsGodModeActive: (isGodModeActive) => {
    try {
      localStorage.setItem('troco_god_mode', isGodModeActive ? 'true' : 'false');
    } catch (_) {}
    set({ isGodModeActive });
  },
  setIsReportModalOpen: (isReportModalOpen) => set({ isReportModalOpen }),
  setReportTarget: (reportTarget) => set({ reportTarget }),

  setIsPaymentModalOpen: (isPaymentModalOpen) => set({ isPaymentModalOpen }),
  setPaymentModalConfig: (paymentModalConfig) => set({ paymentModalConfig }),
  setIsTransactionsModalOpen: (isTransactionsModalOpen) => set({ isTransactionsModalOpen }),
  setIsPrivacyCenterOpen: (isPrivacyCenterOpen) => set({ isPrivacyCenterOpen }),
  setIsCguViewerOpen: (isCguViewerOpen) => set({ isCguViewerOpen }),
  setIsBoostModalOpen: (isBoostModalOpen) => set({ isBoostModalOpen }),

  setIsWhiteboardOpen: (isWhiteboardOpen, activeWhiteboardId = null) =>
    set({ isWhiteboardOpen, activeWhiteboardId }),
  setIsSharedDocOpen: (isSharedDocOpen) => set({ isSharedDocOpen }),
  setIsCloudOfficeOpen: (isCloudOfficeOpen, officeInitialTab = 'docs') =>
    set({ isCloudOfficeOpen, officeInitialTab }),
  setIsCreateProjectGroupOpen: (isCreateProjectGroupOpen) => set({ isCreateProjectGroupOpen }),
  setIsProjectRewardsOpen: (isProjectRewardsOpen) => set({ isProjectRewardsOpen }),
  setIsVisioSettlementOpen: (isVisioSettlementOpen) => set({ isVisioSettlementOpen }),

  setTopUpCelebration: (topUpCelebration) => set({ topUpCelebration }),
  setSaveMessage: (saveMessage) => set({ saveMessage }),

  // Helper to close any currently open modal
  closeAllModals: () =>
    set({
      selectedListing: null,
      selectedPublicUser: null,
      isEditingProfile: false,
      isFilterDrawerOpen: false,
      isCategoryModalOpen: false,
      isBoostModalOpen: false,
      isPrivacyCenterOpen: false,
      isCguViewerOpen: false,
      isKycModalOpen: false,
      isAdminPanelOpen: false,
      isLangModalOpen: false,
      isReportModalOpen: false,
      isTransactionsModalOpen: false,
      isPaymentModalOpen: false,
      isOnboardingOpen: false,
      isWhiteboardOpen: false,
      isSharedDocOpen: false,
      isCloudOfficeOpen: false,
      isCreateProjectGroupOpen: false,
      isProjectRewardsOpen: false,
      isVisioSettlementOpen: false,
    }),

  hasAnyModalOpen: () => {
    const s = get();
    return !!(
      s.selectedListing ||
      s.selectedPublicUser ||
      s.isEditingProfile ||
      s.isFilterDrawerOpen ||
      s.isCategoryModalOpen ||
      s.isBoostModalOpen ||
      s.isPrivacyCenterOpen ||
      s.isCguViewerOpen ||
      s.isKycModalOpen ||
      s.isAdminPanelOpen ||
      s.isLangModalOpen ||
      s.isReportModalOpen ||
      s.isTransactionsModalOpen ||
      s.isPaymentModalOpen ||
      s.isOnboardingOpen ||
      s.isWhiteboardOpen ||
      s.isSharedDocOpen ||
      s.isCloudOfficeOpen ||
      s.isCreateProjectGroupOpen ||
      s.isProjectRewardsOpen ||
      s.isVisioSettlementOpen
    );
  },
}));
