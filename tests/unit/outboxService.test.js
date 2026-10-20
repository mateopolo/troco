// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockAddDoc = vi.fn().mockResolvedValue({ id: 'real_doc_firestore_123' });

vi.mock('../../src/firebase', () => ({
  db: { _mockDb: true },
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((db, ...path) => ({ path: path.join('/') })),
  doc: vi.fn((db, ...path) => ({ path: path.join('/') })),
  setDoc: (...args) => mockSetDoc(...args),
  addDoc: (...args) => mockAddDoc(...args),
  serverTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' })),
  increment: vi.fn((n) => ({ _methodName: 'increment', n })),
}));

vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { outboxService } from '../../src/services/outboxService';

describe('OutboxService - IndexedDB & Offline Message Outbox [MOY-01]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    outboxService.memFallback.clear();
  });

  it('stores and retrieves cached chats asynchronously', async () => {
    const mockChats = [
      { id: 'chat_1', user: 'Alice', lastMessage: 'Coucou' },
      { id: 'chat_2', user: 'Bob', lastMessage: 'Merci !' },
    ];

    await outboxService.setCachedChats(mockChats);
    const retrieved = await outboxService.getCachedChats();

    expect(retrieved).toEqual(mockChats);
    expect(retrieved).toHaveLength(2);
  });

  it('stores and retrieves cached message threads by chatId asynchronously', async () => {
    const chatId = 'chat_room_abc';
    const mockMessages = [
      { id: 'msg_1', text: 'Premier message', sender: 'Alice' },
      { id: 'msg_2', text: 'Deuxième message', sender: 'me' },
    ];

    await outboxService.setCachedMessages(chatId, mockMessages);
    const retrieved = await outboxService.getCachedMessages(chatId);

    expect(retrieved).toEqual(mockMessages);
  });

  it('queues an offline message with status pending', async () => {
    const messagePayload = {
      chatId: 'chat_offline_1',
      text: 'Message envoyé hors-ligne',
      senderUid: 'user_123',
      senderName: 'Mateo',
    };

    const tempId = await outboxService.queueMessage(messagePayload);
    expect(tempId).toBeDefined();
    expect(tempId.startsWith('temp_')).toBe(true);

    const pending = await outboxService.getPendingMessages('chat_offline_1');
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe(tempId);
    expect(pending[0].text).toBe('Message envoyé hors-ligne');
    expect(pending[0].status).toBe('pending');
  });

  it('syncSingleMessage writes to Firestore and dispatches troco:outbox_message_synced event', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    const tempId = 'temp_test_999';
    const record = {
      id: tempId,
      temporaryId: tempId,
      chatId: 'chat_sync_test',
      text: 'Synchronisation automatique',
      senderUid: 'user_456',
      senderName: 'Tester',
    };

    await outboxService.queueMessage(record);

    const result = await outboxService.syncSingleMessage(record);
    expect(result.success).toBe(true);
    expect(result.realId).toBe('real_doc_firestore_123');
    expect(mockSetDoc).toHaveBeenCalled();
    expect(mockAddDoc).toHaveBeenCalled();

    // Verification of dispatched event
    expect(dispatchSpy).toHaveBeenCalled();
    const eventCall = dispatchSpy.mock.calls.find(call => call[0]?.type === 'troco:outbox_message_synced');
    expect(eventCall).toBeDefined();
    expect(eventCall[0].detail.tempId).toBe(tempId);
    expect(eventCall[0].detail.realId).toBe('real_doc_firestore_123');

    // Message should be removed from pending queue
    const remaining = await outboxService.getPendingMessages('chat_sync_test');
    expect(remaining).toHaveLength(0);

    dispatchSpy.mockRestore();
  });

  it('queues messages offline and flushes them when connection is restored', async () => {
    const onSyncedCallback = vi.fn();

    // Simuler le passage hors-ligne
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });

    await outboxService.queueMessage({
      id: 'temp_batch_1',
      chatId: 'chat_batch',
      text: 'Msg 1',
    });
    await outboxService.queueMessage({
      id: 'temp_batch_2',
      chatId: 'chat_batch',
      text: 'Msg 2',
    });

    // En mode hors-ligne, les 2 messages restent en file d'attente
    const pendingBefore = await outboxService.getPendingMessages('chat_batch');
    expect(pendingBefore).toHaveLength(2);

    // Rétablissement de la connexion
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });

    await outboxService.flushMessagesOutbox(onSyncedCallback);

    expect(onSyncedCallback).toHaveBeenCalledTimes(2);
    const pendingAfter = await outboxService.getPendingMessages('chat_batch');
    expect(pendingAfter).toHaveLength(0);
  });
});
