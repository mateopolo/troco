import { useState, useEffect, useCallback, useRef } from 'react';
import { useUIStore } from '../stores';

/**
 * Hook centralisant la navigation par onglets, l'historique popstate (back button Android/iOS),
 * et la synchronisation fluide des transitions.
 */
export const useAppNavigation = () => {
  const [activeTab, setActiveTab] = useState('feed');
  const ui = useUIStore();

  // 1. Défilement instantané vers le haut à chaque changement d'onglet
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

  // 2. Gestion de l'historique pour la touche retour physique Android / swipe back iOS
  useEffect(() => {
    const handlePopState = () => {
      // Fermeture hiérarchique des modales ouvertes via le store UI
      if (ui.selectedListing) {
        ui.setSelectedListing(null);
        return;
      }
      if (ui.selectedPublicUser) {
        ui.setSelectedPublicUser(null);
        return;
      }
      if (ui.isEditingProfile) {
        ui.setIsEditingProfile(false);
        return;
      }
      if (ui.isFilterDrawerOpen) {
        ui.setIsFilterDrawerOpen(false);
        return;
      }
      if (ui.isCategoryModalOpen) {
        ui.setIsCategoryModalOpen(false);
        return;
      }
      if (ui.isBoostModalOpen) {
        ui.setIsBoostModalOpen(false);
        return;
      }
      if (ui.isPrivacyCenterOpen) {
        ui.setIsPrivacyCenterOpen(false);
        return;
      }
      if (ui.isCguViewerOpen) {
        ui.setIsCguViewerOpen(false);
        return;
      }
      if (ui.isKycModalOpen) {
        ui.setIsKycModalOpen(false);
        return;
      }
      if (ui.isAdminPanelOpen) {
        ui.setIsAdminPanelOpen(false);
        return;
      }
      if (ui.isLangModalOpen) {
        ui.setIsLangModalOpen(false);
        return;
      }
      if (ui.isReportModalOpen) {
        ui.setIsReportModalOpen(false);
        return;
      }
      if (ui.isTransactionsModalOpen) {
        ui.setIsTransactionsModalOpen(false);
        return;
      }
      if (ui.isPaymentModalOpen) {
        ui.setIsPaymentModalOpen(false);
        return;
      }
      if (ui.isOnboardingOpen) {
        ui.setIsOnboardingOpen(false);
        return;
      }
      if (ui.isWhiteboardOpen) {
        ui.setIsWhiteboardOpen(false);
        return;
      }

      // Si aucune modale n'est ouverte mais qu'on n'est pas sur le Feed, retour au Feed
      if (activeTab !== 'feed') {
        setActiveTab('feed');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [ui, activeTab]);

  const wasModalOpenRef = useRef(false);

  // 3. Synchronisation de l'historique : pushState UNIQUE au moment où une modale s'ouvre (immunisé contre rotation / resize)
  useEffect(() => {
    const isNowOpen = typeof ui.hasAnyModalOpen === 'function' ? ui.hasAnyModalOpen() : false;
    if (isNowOpen && !wasModalOpenRef.current && typeof window !== 'undefined' && window.history) {
      window.history.pushState({ modalOpen: true }, '');
    }
    wasModalOpenRef.current = isNowOpen;
  }, [
    ui.selectedListing,
    ui.selectedPublicUser,
    ui.isEditingProfile,
    ui.isFilterDrawerOpen,
    ui.isCategoryModalOpen,
    ui.isBoostModalOpen,
    ui.isPrivacyCenterOpen,
    ui.isCguViewerOpen,
    ui.isKycModalOpen,
    ui.isAdminPanelOpen,
    ui.isLangModalOpen,
    ui.isReportModalOpen,
    ui.isTransactionsModalOpen,
    ui.isPaymentModalOpen,
    ui.isOnboardingOpen,
    ui.isWhiteboardOpen,
  ]);

  const navigateToTab = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  return {
    activeTab,
    setActiveTab,
    navigateToTab,
  };
};

export default useAppNavigation;
