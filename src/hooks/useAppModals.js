import { useUIStore } from '../stores';

/**
 * Custom hook wrapping useUIStore for easy modal state consumption in App.js and other components.
 */
export const useAppModals = () => {
  const ui = useUIStore();

  return {
    ...ui,
    openListing: (listing) => ui.setSelectedListing(listing),
    closeListing: () => ui.setSelectedListing(null),
    openPublicUser: (user) => ui.setSelectedPublicUser(user),
    closePublicUser: () => ui.setSelectedPublicUser(null),
    openPayment: (mode = 'pack-tokens', payload = null) => {
      ui.setPaymentModalConfig({ mode, payload });
      ui.setIsPaymentModalOpen(true);
    },
    closePayment: () => ui.setIsPaymentModalOpen(false),
    openWhiteboard: (boardId = null) => ui.setIsWhiteboardOpen(true, boardId),
    closeWhiteboard: () => ui.setIsWhiteboardOpen(false, null),
  };
};

export default useAppModals;
