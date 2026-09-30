import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import SectoralErrorBoundary from '../components/SectoralErrorBoundary';
import { pageTransitionVariants, pageTransitionConfig } from './pageTransitions';

const PostListingFeature = React.lazy(() => import('../features/post/PostListingFeature'));

export default function PostRoute({
  profile,
  setProfile,
  listings,
  setListings,
  postDraft,
  setPostDraft,
  postStep,
  setPostStep,
  isEditingListing,
  setIsEditingListing,
  editingOriginalListing,
  setEditingOriginalListing,
  publishMessage,
  setPublishMessage,
  userCoords,
  customCategories,
  setCustomCategories,
  setUserTransactions,
  openCheckout,
  setSelectedListing,
  setPublishedListing,
  setShowPublishedPopup,
  darkMode,
  t,
  currentLang,
  formatCompensation,
  getListingDetail,
  getCoordinatesForLocation,
  generateTags,
  getSuggestedMedia,
  getSuggestedImage,
  setActiveTab,
  defaultPostDraft,
}) {
  return (
    <motion.div
      key="page-post"
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransitionConfig}
      style={{ width: '100%' }}
    >
      <SectoralErrorBoundary featureName="Dépôt d'annonce">
        <Suspense fallback={null}>
          <PostListingFeature
            profile={profile}
            setProfile={setProfile}
            listings={listings}
            setListings={setListings}
            postDraft={postDraft}
            setPostDraft={setPostDraft}
            postStep={postStep}
            setPostStep={setPostStep}
            isEditingListing={isEditingListing}
            setIsEditingListing={setIsEditingListing}
            editingOriginalListing={editingOriginalListing}
            setEditingOriginalListing={setEditingOriginalListing}
            publishMessage={publishMessage}
            setPublishMessage={setPublishMessage}
            userCoords={userCoords}
            customCategories={customCategories}
            setCustomCategories={setCustomCategories}
            setUserTransactions={setUserTransactions}
            openCheckout={openCheckout}
            setSelectedListing={setSelectedListing}
            setPublishedListing={setPublishedListing}
            setShowPublishedPopup={setShowPublishedPopup}
            darkMode={darkMode}
            t={t}
            currentLang={currentLang}
            formatCompensation={formatCompensation}
            getListingDetail={getListingDetail}
            getCoordinatesForLocation={getCoordinatesForLocation}
            generateTags={generateTags}
            getSuggestedMedia={getSuggestedMedia}
            getSuggestedImage={getSuggestedImage}
            setActiveTab={setActiveTab}
          />
        </Suspense>
      </SectoralErrorBoundary>
    </motion.div>
  );
}
