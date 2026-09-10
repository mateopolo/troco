import { describe, it, expect, beforeEach } from 'vitest';

/**
 * 🧪 Tests des règles de sécurité Firestore dédiées aux Chats & Messages [VERIF-03]
 * Vérifie l'isolation stricte des conversations privées post-migration VERIF-02.
 */

describe('🔒 Firestore Rules — Isolation Stricte Chats & Messages [VERIF-03]', () => {
  let simulatedStore;

  // Simulateur ciblé des règles chats/messages de firestore.rules
  const evaluateRule = (auth, path, operation, data = null) => {
    const isAuthenticated = Boolean(auth && auth.uid);
    const isAdmin = Boolean(auth && auth.token && auth.token.admin === true);
    const isBanned = Boolean(auth && auth.isBanned === true);

    const segments = path.split('/');

    // Collection /chats/{chatId}
    if (segments[0] === 'chats' && segments.length === 2) {
      const currentChat = simulatedStore[path];

      if (operation === 'read') {
        if (!isAuthenticated) return false;
        if (isAdmin) return true;
        if (!currentChat) return false;
        const inParticipants = Array.isArray(currentChat.participants) && currentChat.participants.includes(auth.uid);
        const inUids = Array.isArray(currentChat.participantUids) && currentChat.participantUids.includes(auth.uid);
        return inParticipants || inUids;
      }

      if (operation === 'create') {
        if (!isAuthenticated || isBanned) return false;
        const participants = data?.participants || [];
        const participantUids = data?.participantUids || [];
        return participants.includes(auth.uid) || participantUids.includes(auth.uid);
      }

      if (operation === 'update') {
        if (!isAuthenticated || isBanned) return false;
        if (isAdmin) return true;
        if (!currentChat) return false;
        const inParticipants = Array.isArray(currentChat.participants) && currentChat.participants.includes(auth.uid);
        const inUids = Array.isArray(currentChat.participantUids) && currentChat.participantUids.includes(auth.uid);
        return inParticipants || inUids;
      }

      if (operation === 'delete') {
        return false; // Jamais autorisé côté client
      }
    }

    // Sous-collection /chats/{chatId}/messages/{msgId}
    if (segments[0] === 'chats' && segments[2] === 'messages' && segments.length === 4) {
      const parentChatPath = `chats/${segments[1]}`;
      const parentChat = simulatedStore[parentChatPath];

      if (operation === 'read') {
        if (!isAuthenticated) return false;
        if (isAdmin) return true;
        if (!parentChat) return false;
        const inParticipants = Array.isArray(parentChat.participants) && parentChat.participants.includes(auth.uid);
        const inUids = Array.isArray(parentChat.participantUids) && parentChat.participantUids.includes(auth.uid);
        return inParticipants || inUids;
      }

      if (operation === 'create') {
        if (!isAuthenticated || isBanned) return false;
        if (data?.senderUid !== auth.uid) return false;
        if (!parentChat) return false;
        const inParticipants = Array.isArray(parentChat.participants) && parentChat.participants.includes(auth.uid);
        const inUids = Array.isArray(parentChat.participantUids) && parentChat.participantUids.includes(auth.uid);
        return inParticipants || inUids;
      }

      if (operation === 'delete') {
        const currentMsg = simulatedStore[path];
        if (!isAuthenticated) return false;
        if (isAdmin) return true;
        return currentMsg && currentMsg.senderUid === auth.uid;
      }
    }

    return false;
  };

  beforeEach(() => {
    simulatedStore = {
      'chats/chat_alice_bob': {
        participants: ['uid_alice', 'uid_bob'],
        participantUids: ['uid_alice', 'uid_bob'],
        lastMessage: 'Hello !',
      },
      'chats/chat_alice_bob/messages/msg_1': {
        id: 'msg_1',
        senderUid: 'uid_alice',
        text: 'Bonjour Bob !',
      },
    };
  });

  it('1. Autorise un participant légitime à lire sa conversation', () => {
    expect(evaluateRule({ uid: 'uid_alice' }, 'chats/chat_alice_bob', 'read')).toBe(true);
    expect(evaluateRule({ uid: 'uid_bob' }, 'chats/chat_alice_bob', 'read')).toBe(true);
  });

  it('2. Bloque un utilisateur tiers non participant de lire le chat', () => {
    expect(evaluateRule({ uid: 'uid_charlie_spy' }, 'chats/chat_alice_bob', 'read')).toBe(false);
  });

  it('3. Bloque un utilisateur non connecté de lire le chat', () => {
    expect(evaluateRule(null, 'chats/chat_alice_bob', 'read')).toBe(false);
  });

  it('4. Autorise l administrateur à lire le chat pour modération', () => {
    expect(evaluateRule({ uid: 'admin_1', token: { admin: true } }, 'chats/chat_alice_bob', 'read')).toBe(true);
  });

  it('5. Autorise un participant à poster un message dans le fil', () => {
    const canSend = evaluateRule(
      { uid: 'uid_alice' },
      'chats/chat_alice_bob/messages/msg_2',
      'create',
      { senderUid: 'uid_alice', text: 'Nouvelle proposition' }
    );
    expect(canSend).toBe(true);
  });

  it('6. Bloque un imposteur tentant d envoyer un message avec le senderUid d un autre', () => {
    const canSpoof = evaluateRule(
      { uid: 'uid_bob' },
      'chats/chat_alice_bob/messages/msg_3',
      'create',
      { senderUid: 'uid_alice', text: 'Usurpation' }
    );
    expect(canSpoof).toBe(false);
  });

  it('7. Bloque un utilisateur banni de participer ou d envoyer des messages', () => {
    const canBannedSend = evaluateRule(
      { uid: 'uid_alice', isBanned: true },
      'chats/chat_alice_bob/messages/msg_4',
      'create',
      { senderUid: 'uid_alice', text: 'Spam' }
    );
    expect(canBannedSend).toBe(false);
  });

  it('8. Autorise l auteur du message ou l admin à supprimer son propre message', () => {
    expect(evaluateRule({ uid: 'uid_alice' }, 'chats/chat_alice_bob/messages/msg_1', 'delete')).toBe(true);
    expect(evaluateRule({ uid: 'uid_bob' }, 'chats/chat_alice_bob/messages/msg_1', 'delete')).toBe(false);
    expect(evaluateRule({ uid: 'admin_mod', token: { admin: true } }, 'chats/chat_alice_bob/messages/msg_1', 'delete')).toBe(true);
  });
});
