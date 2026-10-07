import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { pageTransitionVariants, pageTransitionConfig } from './pageTransitions';

const ProfileFeature = React.lazy(() => import('../features/profile/ProfileFeature'));

export default function ProfileRoute({
  profile,
  setProfile,
  profileDraft,
  setProfileDraft,
  isEditingProfile,
  setIsEditingProfile,
  skills,
  setSkills,
  equipment,
  setEquipment,
  portfolioImages,
  setPortfolioImages,
  darkMode,
  currentLang,
  t,
  isMobile,
  handleSignOut,
  handleOpenPayment,
  setIsKycModalOpen,
  setIsAdminPanelOpen,
  setIsTransactionsModalOpen,
  setIsPrivacyCenterOpen,
  setIsCguViewerOpen,
  setActiveTab,
  formatStatus,
  formatTokenCount,
  formatCompensation,
}) {
  return (
    <motion.div
      key="page-profile"
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransitionConfig}
      style={{ width: '100%' }}
    >
      <Suspense fallback={null}>
        <ProfileFeature
          profile={profile}
          setProfile={setProfile}
          profileDraft={profileDraft}
          setProfileDraft={setProfileDraft}
          isEditingProfile={isEditingProfile}
          setIsEditingProfile={setIsEditingProfile}
          skills={skills}
          setSkills={setSkills}
          equipment={equipment}
          setEquipment={setEquipment}
          portfolioImages={portfolioImages}
          setPortfolioImages={setPortfolioImages}
          darkMode={darkMode}
          currentLang={currentLang}
          t={t}
          isMobile={isMobile}
          handleSignOut={handleSignOut}
          handleOpenPayment={handleOpenPayment}
          setIsKycModalOpen={setIsKycModalOpen}
          setIsAdminPanelOpen={setIsAdminPanelOpen}
          setIsTransactionsModalOpen={setIsTransactionsModalOpen}
          setIsPrivacyCenterOpen={setIsPrivacyCenterOpen}
          setIsCguViewerOpen={setIsCguViewerOpen}
          setActiveTab={setActiveTab}
          formatStatus={formatStatus}
          formatTokenCount={formatTokenCount}
          formatCompensation={formatCompensation}
        />
      </Suspense>

      <div style={{ padding: '0 20px 32px', display: 'flex', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => {
            try { sessionStorage.removeItem('troco_splash_seen'); } catch (_) {}
            window.location.href = window.location.pathname + '?splash=1';
          }}
          className="premium-button"
        >
          {t('replaySplash') || 'Revoir l\'animation d\'accueil'}
        </button>
      </div>
    </motion.div>
  );
}
