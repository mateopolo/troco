import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatView from '../../components/ChatView';

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
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedChat ? (selectedChat.id ? `room-${selectedChat.id}` : 'room') : 'list'}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{ width: '100%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', flex: 1 }}
        >
          <ChatView
            activeTab={activeTab}
            mockChats={mockChats}
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
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
