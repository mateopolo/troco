import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import SectoralErrorBoundary from '../components/SectoralErrorBoundary';
import { pageTransitionVariants, pageTransitionConfig } from './pageTransitions';

const CommunityHubSection = React.lazy(() => import('../features/community/CommunityHubSection'));

export default function CommunityRoute({
  profile,
  setCommunityProfileUser,
  setIsCommunityProfileOpen,
  darkMode,
  isMobile,
  currentLang,
  t,
}) {
  return (
    <motion.div
      key="page-community"
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransitionConfig}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}
    >
      <SectoralErrorBoundary moduleName="Communauté & Troco Live">
        <Suspense fallback={null}>
          <CommunityHubSection
            currentUser={profile}
            onOpenProfile={(targetUser) => {
              const targetObj = {
                id: targetUser.id || targetUser.uid || `user-${Date.now()}`,
                user: targetUser.name || targetUser.author || 'Membre Troco',
                avatar: targetUser.avatar,
                verified: targetUser.verified || false,
                author: targetUser.name || targetUser.author || 'Membre Troco',
                authorUsername: targetUser.username || targetUser.authorUsername || '@membre',
                authorProfile: targetUser,
              };
              setCommunityProfileUser(targetObj);
              setIsCommunityProfileOpen(true);
            }}
            darkMode={darkMode}
            isMobile={isMobile}
          />
        </Suspense>
      </SectoralErrorBoundary>
    </motion.div>
  );
}
