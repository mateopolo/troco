import { useChatStore } from './useChatStore';

describe('useChatStore - replaceTempId & deduplication', () => {
  beforeEach(() => {
    useChatStore.setState({
      chatThreads: {},
      chatsList: [],
      selectedChat: null,
    });
  });

  it('correctly replaces temporary message ID with real document ID in Zustand store', () => {
    const chatId = 'chat_123';
    const tempId = 'temp_9999';
    const realDocId = 'firestore_real_abc';

    useChatStore.getState().addMessageToThread(chatId, {
      id: tempId,
      text: 'Bonjour !',
      sender: 'me',
      status: 'pending',
    });

    let thread = useChatStore.getState().chatThreads[chatId];
    expect(thread).toHaveLength(1);
    expect(thread[0].id).toBe(tempId);

    // Call replaceTempId
    useChatStore.getState().replaceTempId(chatId, tempId, realDocId);

    thread = useChatStore.getState().chatThreads[chatId];
    expect(thread).toHaveLength(1);
    expect(thread[0].id).toBe(realDocId);
    expect(thread[0].status).toBe('sent');
  });

  it('purges tempId if real document ID is already present (e.g. from onSnapshot race condition)', () => {
    const chatId = 'chat_456';
    const tempId = 'temp_8888';
    const realDocId = 'firestore_real_xyz';

    // Simulate onSnapshot having already inserted the real message
    useChatStore.getState().setChatThreads({
      [chatId]: [
        { id: tempId, text: 'Négociation deal', status: 'pending' },
        { id: realDocId, text: 'Négociation deal', status: 'sent' },
      ],
    });

    let thread = useChatStore.getState().chatThreads[chatId];
    expect(thread).toHaveLength(2);

    // Call replaceTempId: it must purge the temporary duplicate
    useChatStore.getState().replaceTempId(chatId, tempId, realDocId);

    thread = useChatStore.getState().chatThreads[chatId];
    expect(thread).toHaveLength(1);
    expect(thread[0].id).toBe(realDocId);
    expect(thread.some(m => m.id === tempId)).toBe(false);
  });

  it('reconciles and purges temporary message when real document arrives with temporaryId matching tempId', () => {
    const chatId = 'chat_789';
    const tempId = 'temp_optimistic_111';
    const realDocId = 'firestore_doc_222';

    useChatStore.getState().addMessageToThread(chatId, {
      id: tempId,
      temporaryId: tempId,
      text: 'Message optimiste mobile',
      status: 'pending',
    });

    let thread = useChatStore.getState().chatThreads[chatId];
    expect(thread).toHaveLength(1);

    // Call replaceTempId
    useChatStore.getState().replaceTempId(chatId, tempId, realDocId);

    thread = useChatStore.getState().chatThreads[chatId];
    expect(thread).toHaveLength(1);
    expect(thread[0].id).toBe(realDocId);
    expect(thread[0].temporaryId).toBe(tempId);
    expect(thread[0].status).toBe('sent');
  });
});
