import React, { Suspense, useMemo } from 'react';
import { motion } from 'framer-motion';
import SectoralErrorBoundary from '../components/SectoralErrorBoundary';
import { pageTransitionVariants, pageTransitionConfig } from './pageTransitions';

const ChatSection = React.lazy(() => import('../features/chat/ChatSection'));

export default function ChatRoute({
  activeTab,
  chatsList,
  selectedChat,
  handleSelectChat,
  chatThreads,
  readChats,
  messageDraft,
  setMessageDraft,
  handleTypingChange,
  handleSendMessage,
  handleEditMessage,
  handleDeleteMessage,
  openCounterOffer,
  startCall,
  joinActiveCall,
  handleAcceptIncomingCall,
  acceptIncomingCall,
  callState,
  isCallPip,
  handleAcceptDeal,
  handleConfirmTrocCompletion,
  handleDeclineDeal,
  handleSendToken,
  handleReleaseEscrow,
  handleCreateProjectGroup,
  handleProposeReward,
  handleAcceptReward,
  handleSendAudioMessage,
  profile,
  setProfile,
  currentLang,
  t,
  darkMode,
  getChatMessageDisplayContent,
  getListingTitleTranslation,
  formatStatus,
  showingOriginalMessages,
  toggleOriginalMessage,
  isMobile,
  presenceMap,
  listings,
  handleOpenListing,
  setSelectedPublicUser,
}) {
  const activeChatData = useMemo(() => {
    return (chatsList || []).find(c => String(c.id) === String(selectedChat?.id));
  }, [chatsList, selectedChat?.id]);

  const otherUserName = activeChatData?.user || selectedChat?.user;
  const isThemTyping = !!(activeChatData?.typing && otherUserName && activeChatData.typing[otherUserName]);

  return (
    <motion.div
      key="page-chat"
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransitionConfig}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}
    >
      <SectoralErrorBoundary moduleName="Messagerie & Hub Collaboratif">
        <Suspense fallback={null}>
          <ChatSection
            activeTab={activeTab}
            mockChats={chatsList}
            selectedChat={selectedChat}
            setSelectedChat={handleSelectChat}
            chatThreads={chatThreads}
            readChats={readChats}
            chatInputText={messageDraft}
            setChatInputText={setMessageDraft}
            onTypingChange={handleTypingChange}
            isThemTyping={isThemTyping}
            handleSendMessage={handleSendMessage}
            handleEditMessage={handleEditMessage}
            handleDeleteMessage={handleDeleteMessage}
            openCounterOffer={openCounterOffer}
            startCall={startCall}
            joinActiveCall={joinActiveCall}
            joinCall={joinActiveCall}
            answerCall={handleAcceptIncomingCall || acceptIncomingCall}
            callState={callState}
            isCallActive={Boolean(callState?.active && !isCallPip)}
            handleAcceptDeal={handleAcceptDeal}
            handleConfirmTrocCompletion={handleConfirmTrocCompletion}
            handleDeclineDeal={handleDeclineDeal}
            handleSendToken={handleSendToken}
            handleReleaseEscrow={handleReleaseEscrow}
            onCreateProjectGroup={handleCreateProjectGroup}
            onProposeReward={handleProposeReward}
            onAcceptReward={handleAcceptReward}
            onSendAudioMessage={handleSendAudioMessage}
            profile={profile}
            setProfile={setProfile}
            currentLang={currentLang}
            t={t}
            darkMode={darkMode}
            getChatMessageDisplayContent={getChatMessageDisplayContent}
            getListingTitleTranslation={getListingTitleTranslation}
            formatStatus={formatStatus}
            showingOriginalMessages={showingOriginalMessages}
            toggleOriginalMessage={toggleOriginalMessage}
            isMobile={isMobile}
            presenceMap={presenceMap}
            allListings={listings}
            onOpenListing={handleOpenListing}
            onOpenProfile={(u) => setSelectedPublicUser(u)}
          />
        </Suspense>
      </SectoralErrorBoundary>
    </motion.div>
  );
}
