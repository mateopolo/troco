import React, { Suspense } from 'react';
import { Phone, PhoneOff, Video, Sparkles, ShieldAlert } from 'lucide-react';
import Portal from './ui/Portal';
import LanguageSelectModal from './modals/LanguageSelectModal';
import FilterDrawer from './modals/FilterDrawer';
import CheckoutModal from './modals/CheckoutModal';
import TransactionSuccessModal from './TransactionSuccessModal';
import { RateLimitToast } from './ui/RateLimitToast';
import { SkeletonModalFallback } from './SkeletonLoader';

// Lazy-loaded heavy components & modals (Strict Code-Splitting)
const AdminDashboard = React.lazy(() => import('../features/admin/AdminDashboard'));
const ReportModal = React.lazy(() => import('./ReportModal'));
const CguModal = React.lazy(() => import('./CguModal'));
const PrivacyCenterModal = React.lazy(() => import('./PrivacyCenterModal'));
const OnboardingWizardModal = React.lazy(() => import('./OnboardingWizardModal'));
const WelcomeGiftCelebrationModal = React.lazy(() => import('./WelcomeGiftCelebrationModal'));
const VisioSettlementModal = React.lazy(() => import('./VisioSettlementModal'));
const KycModal = React.lazy(() => import('./KycModal'));
const CounterOfferModal = React.lazy(() => import('./CounterOfferModal'));
const PublicProfileModal = React.lazy(() => import('./PublicProfileModal'));
const CategoryPickerModal = React.lazy(() => import('./modals/CategoryPickerModal'));
const BoostListingModal = React.lazy(() => import('./modals/BoostListingModal'));
const EmailLinkPromptModal = React.lazy(() => import('./modals/EmailLinkPromptModal'));
const CguConsentModal = React.lazy(() => import('./modals/CguConsentModal'));
const PaymentFeature = React.lazy(() => import('../features/payment'));
const CallFeature = React.lazy(() => import('../features/call'));
const WebRTCCallOverlay = React.lazy(() => import('../features/call/WebRTCCallOverlay'));

export default function AppModalsOrchestrator({
  // Auth & Profile
  isAuthenticated,
  profile,
  isLoadingSession,
  cguDismissed,
  setCguDismissed,
  cguBypassRef,
  handleAcceptCgu,

  // Common UI & i18n
  darkMode,
  currentLang,
  t,

  // Boost Modal
  isBoostModalOpen,
  setIsBoostModalOpen,
  boostingListing,
  confirmBoostListing,
  boostMessage,

  // Email Link Modal
  pendingEmailLinkHref,
  handleConfirmEmailLink,
  handleCancelEmailLink,

  // Language Modal
  isLangModalOpen,
  setIsLangModalOpen,
  setLang,

  // Filter Drawer
  isFilterDrawerOpen,
  setIsFilterDrawerOpen,
  filteredListings,
  isInfiniteRadius,
  setIsInfiniteRadius,
  radiusKm,
  setRadiusKm,
  handleRequestGeolocation,
  isGeolocating,
  isGeolocated,
  selectedLanguages,
  toggleLanguageFilter,
  selectedPayment,
  setSelectedPayment,
  hideDemos,
  setHideDemos,
  paymentOptions,
  paymentLabels,

  // Category Picker Modal
  isCategoryModalOpen,
  setIsCategoryModalOpen,
  categoryInput,
  setCategoryInput,
  handleAddCategory,

  // WebRTC & Calls
  activeIncomingCall,
  callState,
  isCallPip,
  setIsCallPip,
  pipPosition,
  setPipPosition,
  handlePipPointerDown,
  handlePipPointerMove,
  handlePipPointerUp,
  handlePipPointerCancel,
  handlePipContentClick,
  handleAcceptIncomingCall,
  handleDeclineIncomingCall,
  selectedChat,
  selectedListing,
  localStream,
  remoteStream,
  facingMode,
  hasMultipleCameras,
  switchCamera,
  acceptIncomingCall,
  endCall,
  toggleMic,
  toggleCam,
  toggleScreenShare,
  hostMuteParticipant,
  hostStopParticipantScreenShare,
  copyInviteLink,
  attachLocalStream,
  attachRemoteStream,
  callDuration,
  formatCallTimer,
  settlementCallDuration,
  setSettlementCallDuration,
  setIsSettlementModalOpen,
  isSettlementModalOpen,
  handleTransferCallTokens,
  getAuthorAvatar,

  // Admin Panel
  isAdminPanelOpen,
  setIsAdminPanelOpen,

  // Public Profile Modal
  selectedPublicUser,
  setSelectedPublicUser,
  isCommunityProfileOpen,
  setIsCommunityProfileOpen,
  communityProfileUser,
  listings,
  handleOpenListing,
  handleStartDiscussion,

  // Report Modal
  isReportModalOpen,
  setIsReportModalOpen,
  reportTarget,
  setReportTarget,

  // Counter Offer Modal
  isCounterOfferOpen,
  setIsCounterOfferOpen,
  editingDealId,
  setEditingDealId,
  handleCounterOfferSubmit,
  chatThreads,
  counterOfferDraft,

  // Payment & Checkout
  isPaymentModalOpen,
  setIsPaymentModalOpen,
  paymentModalConfig,
  handlePaymentSuccess,
  playBetclicBalanceSound,
  playApplePaySound,
  isTransactionsModalOpen,
  setIsTransactionsModalOpen,
  userTransactions,
  handleOpenPayment,
  checkoutSession,
  cancelCheckout,
  applyCheckout,
  isCheckoutProcessing,
  checkoutStatus,

  // Rate Limiting Toast
  isRateLimited,
  retryAfterSeconds,
  resetRateLimit,

  // Onboarding & Welcome Gift
  isOnboardingOpen,
  handleCompleteOnboarding,
  isWelcomeGiftModalOpen,
  setIsWelcomeGiftModalOpen,

  // KYC & CGU
  isKycModalOpen,
  setIsKycModalOpen,
  handleKycComplete,
  isCguViewerOpen,
  setIsCguViewerOpen,

  // Privacy Center
  isPrivacyCenterOpen,
  setIsPrivacyCenterOpen,
  handleDeleteAccount,

  // TopUp & Transactions & Ban
  topUpCelebration,
  transactionSuccessModalConfig,
  handleCloseTransactionSuccessModal,
  isUserBanned,
  bannedReason,
}) {
  return (
    <>
      {/* MODALE BLOQUANTE CGU & RGPD OBLIGATOIRE */}
      {isAuthenticated && !profile?.cguAcceptedAt && !cguDismissed && !cguBypassRef?.current && window.sessionStorage?.getItem('troco_cgu_dismissed') !== 'true' && !isLoadingSession && (
        <Suspense fallback={null}>
          <CguConsentModal
            isOpen={isAuthenticated && !profile?.cguAcceptedAt && !cguDismissed && !cguBypassRef?.current && window.sessionStorage?.getItem('troco_cgu_dismissed') !== 'true' && !isLoadingSession}
            onAccept={handleAcceptCgu}
            profile={profile}
            darkMode={darkMode}
            t={t}
          />
        </Suspense>
      )}

      {/* BOOST LISTING MODAL */}
      {isBoostModalOpen && boostingListing && (
        <Suspense fallback={null}>
          <BoostListingModal
            isOpen={isBoostModalOpen}
            onClose={() => setIsBoostModalOpen(false)}
            boostingListing={boostingListing}
            confirmBoostListing={confirmBoostListing}
            boostMessage={boostMessage}
            darkMode={darkMode}
            profile={profile}
          />
        </Suspense>
      )}

      {/* EMAIL LINK PROMPT MODAL */}
      {pendingEmailLinkHref && (
        <Suspense fallback={null}>
          <EmailLinkPromptModal
            isOpen={Boolean(pendingEmailLinkHref)}
            onConfirm={handleConfirmEmailLink}
            onClose={handleCancelEmailLink}
            darkMode={darkMode}
          />
        </Suspense>
      )}

      {/* LANGUAGE SELECT MODAL */}
      <LanguageSelectModal
        isOpen={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
        currentLang={currentLang}
        onSelectLanguage={(code) => {
          setLang(code);
          setIsLangModalOpen(false);
        }}
        darkMode={darkMode}
        t={t}
      />

      {/* FILTER DRAWER */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        filteredListingsCount={filteredListings?.length || 0}
        isInfiniteRadius={isInfiniteRadius}
        setIsInfiniteRadius={setIsInfiniteRadius}
        radiusKm={radiusKm}
        setRadiusKm={setRadiusKm}
        handleRequestGeolocation={handleRequestGeolocation}
        isGeolocating={isGeolocating}
        isGeolocated={isGeolocated}
        selectedLanguages={selectedLanguages}
        toggleLanguageFilter={toggleLanguageFilter}
        selectedPayment={selectedPayment}
        setSelectedPayment={setSelectedPayment}
        hideDemos={hideDemos}
        setHideDemos={setHideDemos}
        paymentOptions={paymentOptions}
        paymentLabels={paymentLabels}
        darkMode={darkMode}
        profile={profile}
        t={t}
      />

      {/* CATEGORY PICKER MODAL */}
      {isCategoryModalOpen && (
        <Suspense fallback={null}>
          <CategoryPickerModal
            isOpen={isCategoryModalOpen}
            onClose={() => setIsCategoryModalOpen(false)}
            categoryInput={categoryInput}
            setCategoryInput={setCategoryInput}
            handleAddCategory={handleAddCategory}
            darkMode={darkMode}
            t={t}
          />
        </Suspense>
      )}

      {/* BANNIÈRE GLOBALE D'ALERTE APPEL ENTRANT */}
      {activeIncomingCall && !callState?.active && (
        <Portal containerId="modal-root" lockScroll={false}>
          <div
            className="fixed top-10 left-1/2 -translate-x-1/2 z-[999999] shadow-2xl"
            style={{
              position: 'fixed',
              top: 'max(16px, calc(env(safe-area-inset-top, 0px) + 16px))',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 999999,
              width: 'calc(100% - 32px)',
              maxWidth: '520px',
              backgroundColor: darkMode ? 'rgba(30, 27, 24, 0.96)' : 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: '1.5px solid var(--accent-primary, #C67D5B)',
              borderRadius: '9999px',
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.45), 0 0 25px rgba(198, 125, 91, 0.25)',
              animation: 'slideDownIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            {/* Avatar & Infos Appelant */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent-primary, #C67D5B) 0%, #A85D3B 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFF',
                    fontSize: '18px',
                    fontWeight: '800',
                    boxShadow: '0 4px 14px rgba(198, 125, 91, 0.35)',
                  }}
                >
                  {activeIncomingCall.from ? activeIncomingCall.from.charAt(0).toUpperCase() : 'T'}
                </div>
                <div
                  style={{
                    position: 'absolute',
                    bottom: '0',
                    right: '0',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    border: '2px solid #FFF',
                  }}
                />
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    color: darkMode ? '#FAF7F2' : '#2D2825',
                    fontWeight: '800',
                    fontSize: '15px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.2,
                  }}
                >
                  {activeIncomingCall.from || 'Interlocuteur'}
                </div>
                <div
                  style={{
                    color: 'var(--accent-primary, #C67D5B)',
                    fontSize: '12px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    marginTop: '2px',
                  }}
                >
                  {activeIncomingCall.type === 'video' ? <Video size={13} /> : <Phone size={13} />}
                  <span>{activeIncomingCall.type === 'video' ? 'Appel visio FaceTime...' : 'Appel audio HD...'}</span>
                </div>
              </div>
            </div>

            {/* Boutons d'action Décrocher / Raccrocher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => {
                  handleDeclineIncomingCall(activeIncomingCall);
                }}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: '#EF4444',
                  color: '#FFF',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                  transition: 'transform 0.15s ease',
                }}
                title="Refuser l'appel"
                aria-label="Refuser l'appel"
              >
                <PhoneOff size={20} />
              </button>

              <button
                type="button"
                onClick={async () => {
                  await handleAcceptIncomingCall(activeIncomingCall);
                }}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  color: '#FFF',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                  transition: 'transform 0.15s ease',
                }}
                title="Décrocher"
                aria-label="Décrocher"
              >
                <Phone size={20} />
              </button>
            </div>
          </div>
        </Portal>
      )}

      {/* OVERLAY WEBRTC APPELS (SONNERIE ENTRANTE & MODAL PLEIN ÉCRAN) */}
      <Suspense fallback={null}>
        <WebRTCCallOverlay
          incomingCall={null}
          callState={callState}
          isCallPip={isCallPip}
          setIsCallPip={setIsCallPip}
          darkMode={darkMode}
          currentLang={currentLang}
          t={t}
          selectedChat={selectedChat}
          selectedListing={selectedListing}
          profile={profile}
          localStream={localStream}
          remoteStream={remoteStream}
          facingMode={facingMode}
          hasMultipleCameras={hasMultipleCameras}
          switchCamera={switchCamera}
          acceptIncomingCall={acceptIncomingCall}
          declineIncomingCall={handleDeclineIncomingCall}
          endCall={endCall}
          toggleMic={toggleMic}
          toggleCam={toggleCam}
          toggleScreenShare={toggleScreenShare}
          hostMuteParticipant={hostMuteParticipant}
          hostStopParticipantScreenShare={hostStopParticipantScreenShare}
          copyInviteLink={copyInviteLink}
          attachLocalStream={attachLocalStream}
          attachRemoteStream={attachRemoteStream}
          handleAcceptIncomingCall={handleAcceptIncomingCall}
          callDuration={callDuration}
          formatCallTimer={formatCallTimer}
          setSettlementCallDuration={setSettlementCallDuration}
          setIsSettlementModalOpen={setIsSettlementModalOpen}
          getAuthorAvatar={getAuthorAvatar}
        />
      </Suspense>

      {/* BULLE FLOTTANTE PIP (PICTURE-IN-PICTURE) */}
      <Suspense fallback={null}>
        <CallFeature
          callState={callState}
          isCallPip={isCallPip}
          setIsCallPip={setIsCallPip}
          pipPosition={pipPosition}
          setPipPosition={setPipPosition}
          handlePipPointerDown={handlePipPointerDown}
          handlePipPointerMove={handlePipPointerMove}
          handlePipPointerUp={handlePipPointerUp}
          handlePipPointerCancel={handlePipPointerCancel}
          handlePipContentClick={handlePipContentClick}
          selectedChat={selectedChat}
          callDuration={callDuration}
          formatCallTimer={formatCallTimer}
          remoteStream={remoteStream}
          localStream={localStream}
          facingMode={facingMode}
          attachRemoteStream={attachRemoteStream}
          attachLocalStream={attachLocalStream}
          hasMultipleCameras={hasMultipleCameras}
          switchCamera={switchCamera}
          toggleMic={toggleMic}
          endCall={endCall}
          currentLang={currentLang}
        />
      </Suspense>

      {/* PANEL ADMINISTRATEUR "GOD MODE" TEMPS RÉEL (/admin) */}
      {isAdminPanelOpen && (
        <Suspense fallback={null}>
          <AdminDashboard
            isOpen={isAdminPanelOpen}
            onClose={() => setIsAdminPanelOpen(false)}
            darkMode={darkMode}
            currentUser={profile}
            onInspectUser={(u) => {
              setIsAdminPanelOpen(false);
              setSelectedPublicUser(u);
            }}
          />
        </Suspense>
      )}

      {/* MODALE DU PROFIL PUBLIC COMPLET */}
      {selectedPublicUser && (
        <Suspense fallback={<SkeletonModalFallback title="Chargement du profil..." />}>
          <PublicProfileModal
            isOpen={Boolean(selectedPublicUser)}
            onClose={() => setSelectedPublicUser(null)}
            targetUser={selectedPublicUser}
            allListings={listings}
            onOpenListing={handleOpenListing}
            onStartDiscussion={handleStartDiscussion}
            currentLang={currentLang}
            darkMode={darkMode}
            t={t}
          />
        </Suspense>
      )}

      {/* MODALE DE SIGNALEMENT COMMUNAUTAIRE */}
      {isReportModalOpen && (
        <Suspense fallback={<SkeletonModalFallback title="Chargement du formulaire de signalement..." />}>
          <ReportModal
            isOpen={isReportModalOpen}
            onClose={() => {
              setIsReportModalOpen(false);
              setReportTarget({ listing: null, user: null });
            }}
            targetListing={reportTarget?.listing}
            targetUser={reportTarget?.user}
            currentUser={profile}
            darkMode={darkMode}
          />
        </Suspense>
      )}

      {/* MODALE DE PROPOSITION DE DEAL & CONTRE-OFFRE */}
      {isCounterOfferOpen && (
        <Suspense fallback={<SkeletonModalFallback title="Chargement de la négociation de deal..." />}>
          <CounterOfferModal
            isOpen={isCounterOfferOpen}
            onClose={() => {
              setIsCounterOfferOpen(false);
              setEditingDealId(null);
            }}
            onSubmit={handleCounterOfferSubmit}
            initialTerms={editingDealId ? (chatThreads[selectedChat?.id] || []).find(m => String(m.id) === String(editingDealId))?.terms : counterOfferDraft}
            isEditing={Boolean(editingDealId)}
            partnerName={selectedChat?.user || 'Interlocuteur'}
            listingTitle={selectedChat?.listing || ''}
            darkMode={darkMode}
            t={t}
          />
        </Suspense>
      )}

      {/* PASSERELLE DE PAIEMENT & HISTORIQUE MODULAIRE */}
      <Suspense fallback={null}>
        <PaymentFeature
          isPaymentModalOpen={isPaymentModalOpen}
          setIsPaymentModalOpen={setIsPaymentModalOpen}
          paymentModalConfig={paymentModalConfig}
          handlePaymentSuccess={handlePaymentSuccess}
          playBetclicBalanceSound={playBetclicBalanceSound}
          playApplePaySound={playApplePaySound}
          isTransactionsModalOpen={isTransactionsModalOpen}
          setIsTransactionsModalOpen={setIsTransactionsModalOpen}
          userTransactions={userTransactions}
          handleOpenPayment={handleOpenPayment}
          profile={profile}
          darkMode={darkMode}
        />
      </Suspense>

      {/* MODALE DE CHECKOUT DÉCOUPLÉE */}
      <CheckoutModal
        isOpen={Boolean(checkoutSession)}
        session={checkoutSession}
        onCancel={cancelCheckout}
        onConfirm={applyCheckout}
        isProcessing={isCheckoutProcessing}
        paymentStatus={checkoutStatus}
      />

      {/* TOAST D'AVERTISSEMENT RATE LIMITING */}
      <RateLimitToast
        isRateLimited={isRateLimited}
        retryAfterSeconds={retryAfterSeconds}
        onClose={resetRateLimit}
      />

      {/* PARCOURS D'ONBOARDING INTERACTIF POUR NOUVEAUX COMPTES */}
      {isOnboardingOpen && (
        <Suspense fallback={<SkeletonModalFallback title="Bienvenue sur Troco..." />}>
          <OnboardingWizardModal
            isOpen={isOnboardingOpen}
            darkMode={darkMode}
            currentUser={profile}
            onComplete={handleCompleteOnboarding}
          />
        </Suspense>
      )}

      {/* CÉLÉBRATION CADEAU DE BIENVENUE */}
      {isWelcomeGiftModalOpen && !profile?.welcomeBonusClaimed && !profile?.onboardingCompleted && (
        <Suspense fallback={<SkeletonModalFallback title="Cadeau de bienvenue..." />}>
          <WelcomeGiftCelebrationModal
            isOpen={isWelcomeGiftModalOpen && !profile?.welcomeBonusClaimed && !profile?.onboardingCompleted}
            onClose={() => setIsWelcomeGiftModalOpen(false)}
            currentUser={profile}
            darkMode={darkMode}
            trocoTokens={10}
            euroBalance={0}
          />
        </Suspense>
      )}

      {/* BILAN DE SÉANCE VISIO & RÉTRIBUTION EN JETONS */}
      {isSettlementModalOpen && (
        <Suspense fallback={<SkeletonModalFallback title="Bilan d'appel..." />}>
          <VisioSettlementModal
            isOpen={isSettlementModalOpen}
            onClose={() => setIsSettlementModalOpen(false)}
            callDuration={settlementCallDuration || callDuration}
            partnerName={selectedChat?.user || 'Interlocuteur'}
            onTransferTokens={handleTransferCallTokens}
            darkMode={darkMode}
            currentUserTokens={profile?.trocoTokens ?? 10}
          />
        </Suspense>
      )}

      {/* MODULE DE VÉRIFICATION D'IDENTITÉ (KYC) */}
      {isKycModalOpen && (
        <Suspense fallback={<SkeletonModalFallback title="Vérification d'identité sécurisée..." />}>
          <KycModal
            isOpen={isKycModalOpen}
            onClose={() => setIsKycModalOpen(false)}
            onComplete={handleKycComplete}
            profile={profile}
            darkMode={darkMode}
          />
        </Suspense>
      )}

      {/* MODALE D'ACCEPTATION & CONSULTATION DES CGU */}
      {(isCguViewerOpen || (Boolean(profile?.name) && !profile?.cguAcceptedAt && !cguDismissed && window.sessionStorage?.getItem('troco_cgu_dismissed') !== 'true' && !isLoadingSession && profile?.onboardingCompleted)) && (
        <Suspense fallback={<SkeletonModalFallback title="Conditions Générales d'Utilisation..." />}>
          <CguModal
            isOpen={isCguViewerOpen || (Boolean(profile?.name) && !profile?.cguAcceptedAt && !cguDismissed && window.sessionStorage?.getItem('troco_cgu_dismissed') !== 'true' && !isLoadingSession && profile?.onboardingCompleted)}
            isMandatory={!isCguViewerOpen && Boolean(profile?.name) && !profile?.cguAcceptedAt && !cguDismissed && window.sessionStorage?.getItem('troco_cgu_dismissed') !== 'true' && !isLoadingSession && profile?.onboardingCompleted}
            onClose={() => {
              setIsCguViewerOpen(false);
              setCguDismissed(true);
              try {
                window.sessionStorage?.setItem('troco_cgu_dismissed', 'true');
              } catch (_) { }
            }}
            onAccept={handleAcceptCgu}
            darkMode={darkMode}
            currentUser={profile}
          />
        </Suspense>
      )}

      {/* MODALE PROFIL PUBLIC POUR LA COMMUNAUTÉ ET LE CHAT */}
      {isCommunityProfileOpen && communityProfileUser && (
        <Suspense fallback={<SkeletonModalFallback title="Profil public..." />}>
          <PublicProfileModal
            isOpen={isCommunityProfileOpen}
            onClose={() => setIsCommunityProfileOpen(false)}
            targetUser={communityProfileUser}
            allListings={listings}
            onOpenListing={handleOpenListing}
            currentLang={currentLang}
            darkMode={darkMode}
            t={t}
          />
        </Suspense>
      )}

      {/* CENTRE DE CONFIDENTIALITÉ & GESTION DES DROITS RGPD */}
      {isPrivacyCenterOpen && (
        <Suspense fallback={<SkeletonModalFallback title="Centre de confidentialité..." />}>
          <PrivacyCenterModal
            isOpen={isPrivacyCenterOpen}
            onClose={() => setIsPrivacyCenterOpen(false)}
            darkMode={darkMode}
            currentUser={profile}
            userListings={listings}
            userTransactions={userTransactions}
            onDeleteAccount={handleDeleteAccount}
          />
        </Suspense>
      )}

      {/* OVERLAY CÉLÉBRATION TOP-UP SOLDE & JETONS AU PREMIER PLAN */}
      {topUpCelebration && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          style={{
            position: 'fixed',
            top: 'calc(env(safe-area-inset-top, 0px) + 70px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999999,
            backgroundColor: 'var(--bg-card)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '2px solid var(--accent-success)',
            borderRadius: '999px',
            padding: '12px 24px',
            boxShadow: '0 12px 36px rgba(16, 185, 129, 0.4), 0 0 20px rgba(16, 185, 129, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'fadeSlideDown 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
            color: 'var(--text-main)',
          }}
        >
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-success)',
            color: '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.5)',
            flexShrink: 0,
          }}>
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--accent-success)', letterSpacing: '-0.01em' }}>
              {topUpCelebration.title}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              {topUpCelebration.subtitle}
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE CONFIRMATION DE TRANSACTION FINTECH IMMERSIVE */}
      <TransactionSuccessModal
        isOpen={Boolean(transactionSuccessModalConfig?.isOpen)}
        type={transactionSuccessModalConfig?.type || 'sent'}
        amount={transactionSuccessModalConfig?.amount || 1}
        currency={transactionSuccessModalConfig?.currency || 'tokens'}
        partnerName={transactionSuccessModalConfig?.partnerName || ''}
        onClose={handleCloseTransactionSuccessModal}
      />

      {/* ÉCRAN D'EXCLUSION TOTAL EN CAS DE BANNISSEMENT TEMPS RÉEL */}
      {isUserBanned && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000000,
            backgroundColor: '#0F0D0B',
            color: '#FAF7F2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              backgroundColor: '#1C1714',
              border: '2px solid #EF4444',
              borderRadius: '28px',
              padding: '38px 32px',
              textAlign: 'center',
              boxShadow: '0 25px 60px rgba(239,68,68,0.25), 0 0 50px rgba(0,0,0,0.8)',
            }}
          >
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239,68,68,0.15)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(239,68,68,0.3)',
              }}
            >
              <ShieldAlert size={36} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '900', margin: '0 0 10px', color: '#EF4444', letterSpacing: '-0.02em' }}>
              Compte Suspendu
            </h2>
            <p style={{ fontSize: '14px', color: '#D4C5B5', lineHeight: 1.55, margin: '0 0 20px' }}>
              {bannedReason || "Votre compte a été suspendu par l'administration Troco suite à un non-respect des règles de la communauté."}
            </p>
            <div
              style={{
                fontSize: '12px',
                color: '#A8998C',
                backgroundColor: 'rgba(0,0,0,0.3)',
                padding: '12px 16px',
                borderRadius: '12px',
                marginBottom: '24px',
                lineHeight: 1.4,
              }}
            >
              Pour toute réclamation, contactez la modération officielle à <strong>support@troco.fr</strong> avec votre identifiant.
            </div>
            <button
              type="button"
              onClick={() => {
                window.localStorage.clear();
                window.sessionStorage.clear();
                window.location.reload();
              }}
              className="premium-button"
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: '14px',
                border: 'none',
                backgroundColor: 'rgba(255,255,255,0.12)',
                color: '#FFF',
                fontSize: '13.5px',
                fontWeight: '800',
                cursor: 'pointer',
              }}
            >
              Fermer la session & Revenir à l'accueil
            </button>
          </div>
        </div>
      )}
    </>
  );
}
