import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useChatStore = create(
  persist(
    (set, get) => ({
      selectedChat: null,
      chatsList: [],
      chatThreads: {},
      readChats: {},
      messageDraft: '',
      typingUsers: {},
      isThemTyping: false,
      activeCallPip: false,
      callDuration: 0,

      setSelectedChat: (selectedChat) => set({ selectedChat }),
      setChatsList: (chatsList) => set({ chatsList }),
      setChatThreads: (chatThreads) => set({ chatThreads }),

      updateChatThread: (chatId, messages) => set((state) => ({
        chatThreads: { ...state.chatThreads, [chatId]: messages }
      })),

      addMessageToThread: (chatId, message) => set((state) => {
        const currentThread = state.chatThreads[chatId] || [];
        return {
          chatThreads: {
            ...state.chatThreads,
            [chatId]: [...currentThread, message]
          }
        };
      }),

      setMessageDraft: (messageDraft) => set({ messageDraft }),
      setReadChats: (readChats) => set({ readChats }),

      markChatAsRead: (chatId) => set((state) => ({
        readChats: { ...state.readChats, [chatId]: true, [String(chatId)]: true }
      })),

      setTypingUsers: (typingUsers) => set({ typingUsers }),
      setIsThemTyping: (isThemTyping) => set({ isThemTyping }),
      setActiveCallPip: (activeCallPip) => set({ activeCallPip }),
      setCallDuration: (callDuration) => set({ callDuration }),
    }),
    {
      name: 'troco_chat_store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        readChats: state.readChats,
        chatThreads: state.chatThreads,
      }),
    }
  )
);
