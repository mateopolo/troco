import React from 'react';
import ChatView from '../../components/ChatView';
import { useChatStore } from '../../stores/useChatStore';
import { useWalletStore } from '../../stores/useWalletStore';

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
}) {
  return (
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
    />
  );
}
