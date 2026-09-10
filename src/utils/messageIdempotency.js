// src/utils/messageIdempotency.js
// ═══════════════════════════════════════════════════════════════════
// TROCO — MESSAGE IDEMPOTENCY & DEDUPLICATION HELPER
// Prevents duplicate message sending across mobile & desktop.
// ═══════════════════════════════════════════════════════════════════

const inFlightMessages = new Map();
const recentMessageHashes = new Map();
const HASH_TTL_MS = 6000; // 6 seconds debounce window

/**
 * Computes a lightweight fast hash of a string.
 */
function fastHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generates a deterministic message ID based on chatId, senderUid, timestamp window, and content.
 */
export function generateDeterministicMessageId(chatId, senderUid, text, clientTimestamp = Date.now()) {
  const cleanText = (text || '').trim();
  const textHash = fastHash(cleanText);
  // Quantize timestamp to 2-second windows to absorb micro-second jitter on double-taps
  const windowedTime = Math.floor(clientTimestamp / 2000) * 2000;
  return `msg_${chatId}_${senderUid || 'anon'}_${windowedTime}_${textHash}`;
}

/**
 * Checks whether an identical message is currently in-flight or was sent in the last 6 seconds.
 * @returns {boolean} true if allowed to send, false if duplicate.
 */
export function shouldSendMessage(chatId, senderUid, text) {
  const cleanText = (text || '').trim();
  if (!cleanText) return false;

  const key = `${chatId}_${senderUid || 'anon'}_${cleanText}`;
  const now = Date.now();

  // Clean old entries
  for (const [k, timestamp] of recentMessageHashes.entries()) {
    if (now - timestamp > HASH_TTL_MS) {
      recentMessageHashes.delete(k);
    }
  }

  if (recentMessageHashes.has(key)) {
    const lastSent = recentMessageHashes.get(key);
    if (now - lastSent < HASH_TTL_MS) {
      console.warn(`[MessageIdempotency] Duplicate message blocked for chat ${chatId}: "${cleanText.substring(0, 20)}..."`);
      return false;
    }
  }

  recentMessageHashes.set(key, now);
  return true;
}

/**
 * Clears idempotency cache (mainly for testing).
 */
export function clearIdempotencyCache() {
  inFlightMessages.clear();
  recentMessageHashes.clear();
}
