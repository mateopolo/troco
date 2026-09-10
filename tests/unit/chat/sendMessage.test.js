import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateDeterministicMessageId,
  shouldSendMessage,
  clearIdempotencyCache,
} from '../../../src/utils/messageIdempotency';

describe('Message Idempotency & Deduplication Unit Tests [HOTFIX-02]', () => {
  beforeEach(() => {
    clearIdempotencyCache();
  });

  it('generates consistent deterministic IDs within the same 2-second time window', () => {
    const fixedTs = 1700000000000;
    const id1 = generateDeterministicMessageId('chat_123', 'user_abc', 'Bonjour!', fixedTs);
    const id2 = generateDeterministicMessageId('chat_123', 'user_abc', 'Bonjour!', fixedTs + 500);
    expect(id1).toBe(id2);
  });

  it('generates different IDs for different messages or chats', () => {
    const fixedTs = 1700000000000;
    const id1 = generateDeterministicMessageId('chat_123', 'user_abc', 'Hello', fixedTs);
    const id2 = generateDeterministicMessageId('chat_123', 'user_abc', 'World', fixedTs);
    const id3 = generateDeterministicMessageId('chat_999', 'user_abc', 'Hello', fixedTs);
    expect(id1).not.toBe(id2);
    expect(id1).not.toBe(id3);
  });

  it('allows initial message and blocks identical burst duplicates within debounce window', () => {
    const chatId = 'chat_room_42';
    const uid = 'user_me';
    const text = 'Proposition acceptée';

    // First attempt -> allowed
    expect(shouldSendMessage(chatId, uid, text)).toBe(true);

    // Immediate duplicate attempt (e.g. touchEnd + click combo) -> BLOCKED
    expect(shouldSendMessage(chatId, uid, text)).toBe(false);

    // Different text in same chat -> allowed
    expect(shouldSendMessage(chatId, uid, 'Nouvelle offre')).toBe(true);
  });

  it('rejects empty or whitespace-only messages', () => {
    expect(shouldSendMessage('chat_1', 'u1', '')).toBe(false);
    expect(shouldSendMessage('chat_1', 'u1', '   ')).toBe(false);
  });
});
