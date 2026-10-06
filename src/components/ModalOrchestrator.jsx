import React, { Suspense } from 'react';
import AppModalsOrchestrator from './AppModalsOrchestrator';
import ListingDetailModal from './ListingDetailModal';

/**
 * ModalOrchestrator - Centralized modal orchestration layer.
 * Groups and controls application-wide modals, drawers, and full-screen overlays.
 * Unpacks the reactive `ui` store object and delegates rendering to specialized modal trees.
 */
export default function ModalOrchestrator({
  ui = {},
  profile,
  listings = [],
  chatThreads = [],
  userTransactions = [],
  handleOpenPayment,
  handlePaymentSuccess,
  handleAdminDeleteListing,
  handleAdminToggleHideListing,
  handleAdminEditListing,
  darkMode = false,
  currentLang = 'FR',
  t = (k) => k,
  ...restProps
}) {
  // Unpack UI store modal flags and setters with fallbacks to direct props
  const isBoostModalOpen = ui.isBoostModalOpen ?? restProps.isBoostModalOpen;
  const setIsBoostModalOpen = ui.setIsBoostModalOpen ?? restProps.setIsBoostModalOpen;
  const boostingListing = ui.boostingListing ?? restProps.boostingListing;
  const boostMessage = ui.boostMessage ?? restProps.boostMessage;

  const isLangModalOpen = ui.isLangModalOpen ?? restProps.isLangModalOpen;
  const setIsLangModalOpen = ui.setIsLangModalOpen ?? restProps.setIsLangModalOpen;

  const isFilterDrawerOpen = ui.isFilterDrawerOpen ?? restProps.isFilterDrawerOpen;
  const setIsFilterDrawerOpen = ui.setIsFilterDrawerOpen ?? restProps.setIsFilterDrawerOpen;

  const isCategoryModalOpen = ui.isCategoryModalOpen ?? restProps.isCategoryModalOpen;
  const setIsCategoryModalOpen = ui.setIsCategoryModalOpen ?? restProps.setIsCategoryModalOpen;

  const isReportModalOpen = ui.isReportModalOpen ?? restProps.isReportModalOpen;
  const setIsReportModalOpen = ui.setIsReportModalOpen ?? restProps.setIsReportModalOpen;
  const reportTarget = ui.reportTarget ?? restProps.reportTarget;
  const setReportTarget = ui.setReportTarget ?? restProps.setReportTarget;

  const isPaymentModalOpen = ui.isPaymentModalOpen ?? restProps.isPaymentModalOpen;
  const setIsPaymentModalOpen = ui.setIsPaymentModalOpen ?? restProps.setIsPaymentModalOpen;
  const paymentModalConfig = ui.paymentModalConfig ?? restProps.paymentModalConfig;

  const isTransactionsModalOpen = ui.isTransactionsModalOpen ?? restProps.isTransactionsModalOpen;
  const setIsTransactionsModalOpen = ui.setIsTransactionsModalOpen ?? restProps.setIsTransactionsModalOpen;

  const isPrivacyCenterOpen = ui.isPrivacyCenterOpen ?? restProps.isPrivacyCenterOpen;
  const setIsPrivacyCenterOpen = ui.setIsPrivacyCenterOpen ?? restProps.setIsPrivacyCenterOpen;

  const isCguViewerOpen = ui.isCguViewerOpen ?? restProps.isCguViewerOpen;
  const setIsCguViewerOpen = ui.setIsCguViewerOpen ?? restProps.setIsCguViewerOpen;

  const isKycModalOpen = ui.isKycModalOpen ?? restProps.isKycModalOpen;
  const setIsKycModalOpen = ui.setIsKycModalOpen ?? restProps.setIsKycModalOpen;

  const isOnboardingOpen = ui.isOnboardingOpen ?? restProps.isOnboardingOpen;
  const isAdminPanelOpen = ui.isAdminPanelOpen ?? restProps.isAdminPanelOpen;
  const setIsAdminPanelOpen = ui.setIsAdminPanelOpen ?? restProps.setIsAdminPanelOpen;

  const selectedPublicUser = ui.selectedPublicUser ?? restProps.selectedPublicUser;
  const setSelectedPublicUser = ui.setSelectedPublicUser ?? restProps.setSelectedPublicUser;

  const topUpCelebration = ui.topUpCelebration ?? restProps.topUpCelebration;

  const activeSelectedListing = ui.selectedListing ?? restProps.selectedListing;
  const setSelectedListing = ui.setSelectedListing ?? restProps.setSelectedListing;

  return (
    <>
      {/* MODALE DÉTAIL D'ANNONCE (EXTRAITE DU CODE INLINE D'APP.JS) */}
      {activeSelectedListing && (
        <Suspense fallback={null}>
          <ListingDetailModal
            listing={activeSelectedListing}
            selectedListing={activeSelectedListing}
            onClose={() => {
              if (typeof setSelectedListing === 'function') {
                setSelectedListing(null);
              }
            }}
            isMobile={restProps.isMobile}
            darkMode={darkMode}
            currentLang={currentLang}
            t={t}
            profile={profile}
            showingOriginalListings={restProps.showingOriginalListings || {}}
            toggleOriginalListing={restProps.toggleOriginalListing}
            handleViewOnMap={restProps.handleViewOnMap}
            handleStartDiscussion={restProps.handleStartDiscussion}
            setReportTarget={setReportTarget}
            setIsReportModalOpen={setIsReportModalOpen}
            formatCompensation={restProps.formatCompensation}
            isAdmin={restProps.isAdmin}
            handleAdminDeleteListing={handleAdminDeleteListing}
            handleAdminToggleHideListing={handleAdminToggleHideListing}
            handleAdminEditListing={handleAdminEditListing}
            confirm={restProps.confirm}
          />
        </Suspense>
      )}

      {/* ORCHESTRATEUR PRINCIPAL DES MODALES ET OVERLAYS */}
      <AppModalsOrchestrator
        isAuthenticated={restProps.isAuthenticated}
        profile={profile}
        isLoadingSession={restProps.isLoadingSession}
        cguDismissed={restProps.cguDismissed}
        setCguDismissed={restProps.setCguDismissed}
        cguBypassRef={restProps.cguBypassRef}
        handleAcceptCgu={restProps.handleAcceptCgu}
        darkMode={darkMode}
        currentLang={currentLang}
        t={t}
        isBoostModalOpen={isBoostModalOpen}
        setIsBoostModalOpen={setIsBoostModalOpen}
        boostingListing={boostingListing}
        confirmBoostListing={restProps.confirmBoostListing}
        boostMessage={boostMessage}
        pendingEmailLinkHref={restProps.pendingEmailLinkHref}
        handleConfirmEmailLink={restProps.handleConfirmEmailLink}
        handleCancelEmailLink={restProps.handleCancelEmailLink}
        isLangModalOpen={isLangModalOpen}
        setIsLangModalOpen={setIsLangModalOpen}
        setLang={restProps.setLang}
        isFilterDrawerOpen={isFilterDrawerOpen}
        setIsFilterDrawerOpen={setIsFilterDrawerOpen}
        filteredListings={restProps.filteredListings}
        isInfiniteRadius={restProps.isInfiniteRadius}
        setIsInfiniteRadius={restProps.setIsInfiniteRadius}
        radiusKm={restProps.radiusKm}
        setRadiusKm={restProps.setRadiusKm}
        handleRequestGeolocation={restProps.handleRequestGeolocation}
        isGeolocating={restProps.isGeolocating}
        isGeolocated={restProps.isGeolocated}
        selectedLanguages={restProps.selectedLanguages}
        toggleLanguageFilter={restProps.toggleLanguageFilter}
        selectedPayment={restProps.selectedPayment}
        setSelectedPayment={restProps.setSelectedPayment}
        hideDemos={restProps.hideDemos}
        setHideDemos={restProps.setHideDemos}
        paymentOptions={restProps.paymentOptions}
        paymentLabels={restProps.paymentLabels}
        isCategoryModalOpen={isCategoryModalOpen}
        setIsCategoryModalOpen={setIsCategoryModalOpen}
        categoryInput={restProps.categoryInput}
        setCategoryInput={restProps.setCategoryInput}
        handleAddCategory={restProps.handleAddCategory}
        activeIncomingCall={restProps.activeIncomingCall}
        callState={restProps.callState}
        isCallPip={restProps.isCallPip}
        setIsCallPip={restProps.setIsCallPip}
        pipPosition={restProps.pipPosition}
        setPipPosition={restProps.setPipPosition}
        handlePipPointerDown={restProps.handlePipPointerDown}
        handlePipPointerMove={restProps.handlePipPointerMove}
        handlePipPointerUp={restProps.handlePipPointerUp}
        handlePipPointerCancel={restProps.handlePipPointerCancel}
        handlePipContentClick={restProps.handlePipContentClick}
        handleAcceptIncomingCall={restProps.handleAcceptIncomingCall}
        handleDeclineIncomingCall={restProps.handleDeclineIncomingCall}
        selectedChat={restProps.selectedChat}
        selectedListing={activeSelectedListing}
        localStream={restProps.localStream}
        remoteStream={restProps.remoteStream}
        facingMode={restProps.facingMode}
        hasMultipleCameras={restProps.hasMultipleCameras}
        switchCamera={restProps.switchCamera}
        acceptIncomingCall={restProps.acceptIncomingCall}
        endCall={restProps.endCall}
        toggleMic={restProps.toggleMic}
        toggleCam={restProps.toggleCam}
        toggleScreenShare={restProps.toggleScreenShare}
        hostMuteParticipant={restProps.hostMuteParticipant}
        hostStopParticipantScreenShare={restProps.hostStopParticipantScreenShare}
        copyInviteLink={restProps.copyInviteLink}
        attachLocalStream={restProps.attachLocalStream}
        attachRemoteStream={restProps.attachRemoteStream}
        callDuration={restProps.callDuration}
        formatCallTimer={restProps.formatCallTimer}
        settlementCallDuration={restProps.settlementCallDuration}
        setSettlementCallDuration={restProps.setSettlementCallDuration}
        setIsSettlementModalOpen={restProps.setIsSettlementModalOpen}
        isSettlementModalOpen={restProps.isSettlementModalOpen}
        handleTransferCallTokens={restProps.handleTransferCallTokens}
        getAuthorAvatar={restProps.getAuthorAvatar}
        isAdminPanelOpen={isAdminPanelOpen}
        setIsAdminPanelOpen={setIsAdminPanelOpen}
        selectedPublicUser={selectedPublicUser}
        setSelectedPublicUser={setSelectedPublicUser}
        isCommunityProfileOpen={restProps.isCommunityProfileOpen}
        setIsCommunityProfileOpen={restProps.setIsCommunityProfileOpen}
        communityProfileUser={restProps.communityProfileUser}
        listings={listings}
        handleOpenListing={restProps.handleOpenListing}
        handleStartDiscussion={restProps.handleStartDiscussion}
        isReportModalOpen={isReportModalOpen}
        setIsReportModalOpen={setIsReportModalOpen}
        reportTarget={reportTarget}
        setReportTarget={setReportTarget}
        isCounterOfferOpen={restProps.isCounterOfferOpen}
        setIsCounterOfferOpen={restProps.setIsCounterOfferOpen}
        editingDealId={restProps.editingDealId}
        setEditingDealId={restProps.setEditingDealId}
        handleCounterOfferSubmit={restProps.handleCounterOfferSubmit}
        chatThreads={chatThreads}
        counterOfferDraft={restProps.counterOfferDraft}
        isPaymentModalOpen={isPaymentModalOpen}
        setIsPaymentModalOpen={setIsPaymentModalOpen}
        paymentModalConfig={paymentModalConfig}
        handlePaymentSuccess={handlePaymentSuccess}
        playBetclicBalanceSound={restProps.playBetclicBalanceSound}
        playApplePaySound={restProps.playApplePaySound}
        isTransactionsModalOpen={isTransactionsModalOpen}
        setIsTransactionsModalOpen={setIsTransactionsModalOpen}
        userTransactions={userTransactions}
        handleOpenPayment={handleOpenPayment}
        checkoutSession={restProps.checkoutSession}
        cancelCheckout={restProps.cancelCheckout}
        applyCheckout={restProps.applyCheckout}
        isCheckoutProcessing={restProps.isCheckoutProcessing}
        checkoutStatus={restProps.checkoutStatus}
        isRateLimited={restProps.isRateLimited}
        retryAfterSeconds={restProps.retryAfterSeconds}
        resetRateLimit={restProps.resetRateLimit}
        isOnboardingOpen={isOnboardingOpen}
        handleCompleteOnboarding={restProps.handleCompleteOnboarding}
        isWelcomeGiftModalOpen={restProps.isWelcomeGiftModalOpen}
        setIsWelcomeGiftModalOpen={restProps.setIsWelcomeGiftModalOpen}
        isKycModalOpen={isKycModalOpen}
        setIsKycModalOpen={setIsKycModalOpen}
        handleKycComplete={restProps.handleKycComplete}
        isCguViewerOpen={isCguViewerOpen}
        setIsCguViewerOpen={setIsCguViewerOpen}
        isPrivacyCenterOpen={isPrivacyCenterOpen}
        setIsPrivacyCenterOpen={setIsPrivacyCenterOpen}
        handleDeleteAccount={restProps.handleDeleteAccount}
        topUpCelebration={topUpCelebration}
        transactionSuccessModalConfig={restProps.transactionSuccessModalConfig}
        handleCloseTransactionSuccessModal={restProps.handleCloseTransactionSuccessModal}
        isUserBanned={restProps.isUserBanned}
        bannedReason={restProps.bannedReason}
      />
    </>
  );
}
