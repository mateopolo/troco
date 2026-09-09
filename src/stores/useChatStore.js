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

      replaceTempId: (chatId, tempId, realDocId) => set((state) => {
        const currentThread = state.chatThreads[chatId] || [];
        const realIdStr = String(realDocId);
        const tempIdStr = String(tempId);

        // Si le document réel existe déjà (via snapshot Firestore), on purge l'ID temporaire
        const alreadyHasReal = currentThread.some(m => String(m.id) === realIdStr);

        let updated;
        if (alreadyHasReal) {
          updated = currentThread.filter(m => String(m.id) !== tempIdStr);
        } else {
          updated = currentThread.map(m =>
            String(m.id) === tempIdStr
              ? { ...m, id: realDocId, status: 'sent', isPending: false }
              : m
          );
        }

        return {
          chatThreads: {
            ...state.chatThreads,
            [chatId]: updated,
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
