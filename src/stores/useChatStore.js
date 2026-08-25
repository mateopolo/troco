import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
  selectedChat: null,
  chatsList: [],
  chatThreads: {},
  readChats: {},
  messageDraft: '',
  typingUsers: {},
  isThemTyping: false,

  setSelectedChat: (selectedChat) => set({ selectedChat }),
  setChatsList: (chatsList) => set({ chatsList }),
  setChatThreads: (chatThreads) => set({ chatThreads }),
  updateChatThread: (chatId, messages) => set((state) => ({
    chatThreads: { ...state.chatThreads, [chatId]: messages }
  })),
  setMessageDraft: (messageDraft) => set({ messageDraft }),
  setReadChats: (readChats) => set({ readChats }),
  markChatAsRead: (chatId) => set((state) => ({
    readChats: { ...state.readChats, [chatId]: true }
  })),
  setTypingUsers: (typingUsers) => set({ typingUsers }),
  setIsThemTyping: (isThemTyping) => set({ isThemTyping }),
}));
