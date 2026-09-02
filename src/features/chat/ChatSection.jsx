import React, { useCallback, Profiler } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatView from '../../components/ChatView';
import { PullToRefresh } from '../../components/ui/PullToRefresh';
import { onRenderProfilerCallback } from '../../utils/performanceProfiler';
import { pageTransitionVariants, pageTransitionConfig } from '../../utils/motionTransitions';

export default function ChatSection({
  activeTab,
  selectedChat,
  setSelectedChat,
  mockChats,
  chatThreads,
  readChats,
  chatInputText,
  setChatInputText,
  onTypingChange,
  isThemTyping,
  handleSendMessage,
  handleEditMessage,
  handleDeleteMessage,
  openCounterOffer,
  startCall,
  joinActiveCall,
  handleAcceptDeal,
  handleDeclineDeal,
  handleReleaseEscrow,
  onCreateProjectGroup,
  onProposeReward,
  onAcceptReward,
  onSendAudioMessage,
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
  allListings,
  onOpenListing,
}) {
  const safeMockChats = Array.isArray(mockChats) ? mockChats : [];

  const handleRefresh = useCallback(async () => {
    try {
      window.dispatchEvent(new CustomEvent('troco:refetch_chats'));
    } catch (_) {}
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
      <PullToRefresh onRefresh={handleRefresh} disabled={Boolean(selectedChat)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedChat ? (selectedChat.id ? `room-${selectedChat.id}` : 'room') : 'list'}
            variants={pageTransitionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransitionConfig}
            style={{ width: '100%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', flex: 1 }}
          >
            <Profiler id="ChatView" onRender={onRenderProfilerCallback}>
              <ChatView
                activeTab={activeTab}
                mockChats={safeMockChats}
                selectedChat={selectedChat}
                setSelectedChat={setSelectedChat}
                chatThreads={chatThreads}
                readChats={readChats}
                chatInputText={chatInputText}
                setChatInputText={setChatInputText}
                onTypingChange={onTypingChange}
                isThemTyping={isThemTyping}
                handleSendMessage={handleSendMessage}
                onSendMessage={handleSendMessage}
                groupId={selectedChat?.id}
                handleEditMessage={handleEditMessage}
                handleDeleteMessage={handleDeleteMessage}
                openCounterOffer={openCounterOffer}
                startCall={startCall}
                joinActiveCall={joinActiveCall}
                handleAcceptDeal={handleAcceptDeal}
                handleDeclineDeal={handleDeclineDeal}
                handleReleaseEscrow={handleReleaseEscrow}
                onCreateProjectGroup={onCreateProjectGroup}
                onProposeReward={onProposeReward}
                onAcceptReward={onAcceptReward}
                onSendAudioMessage={onSendAudioMessage}
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
                allListings={allListings}
                onOpenListing={onOpenListing}
              />
            </Profiler>
          </motion.div>
        </AnimatePresence>
      </PullToRefresh>
    </div>
  );
}
