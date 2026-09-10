import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
// Purge défensive immédiate des états d'appels éphémères résiduels dans le store chat
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const raw = localStorage.getItem('troco_chat_store');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed?.state &&
        ('isCallActive' in parsed.state ||
          'callRoomId' in parsed.state ||
          'isInCall' in parsed.state ||
          'activeCall' in parsed.state ||
          'activeCallPip' in parsed.state)
      ) {
        delete parsed.state.isCallActive;
        delete parsed.state.callRoomId;
        delete parsed.state.isInCall;
        delete parsed.state.activeCall;
        delete parsed.state.activeCallPip;
        delete parsed.state.callDuration;
        localStorage.setItem('troco_chat_store', JSON.stringify(parsed));
      }
    }
  } catch (_) {}
}

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
      isCallActive: false,
      callRoomId: null,
      isInCall: false,
      activeCall: null,

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
      setIsCallActive: (isCallActive) => set({ isCallActive: Boolean(isCallActive) }),
      setCallRoomId: (callRoomId) => set({ callRoomId: callRoomId || null }),
      setIsInCall: (isInCall) => set({ isInCall: Boolean(isInCall) }),
      setActiveCall: (activeCall) => set({ activeCall: activeCall || null }),
      resetCallState: () => set({
        isCallActive: false,
        callRoomId: null,
        isInCall: false,
        activeCall: null,
        activeCallPip: false,
        callDuration: 0,
      }),
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
