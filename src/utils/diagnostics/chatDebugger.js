/**
 * chatDebugger.js
 * Script de diagnostic pour inspecter les discussions, les listeners Firestore,
 * les doublons de messages et la synchronisation multi-device.
 */
export async function diagnoseChat() {
  console.group('🔍 [DIAGNOSTIC CHAT - HOTFIX-02]');

  // 1. Listeners Firestore
  console.log('👂 Listeners Firestore actifs :', window.__firestoreListeners?.length || 'non tracké globalement');

  // 2. État du chat dans window ou Zustand store
  let zustandState = null;
  try {
    const { useChatStore } = await import('../../stores');
    if (useChatStore) {
      zustandState = useChatStore.getState();
      console.log('💬 useChatStore state trouvé :', {
        activeChatId: zustandState.activeChatId,
        threadsCount: Object.keys(zustandState.chatThreads || {}).length,
      });
    }
  } catch (_) {}

  const activeDebug = window.__chatDebug || zustandState;
  if (activeDebug) {
    console.log('💬 selectedChat :', activeDebug.selectedChat || activeDebug.activeChatId);
    console.log('💬 chatThreads keys :', Object.keys(activeDebug.chatThreads || {}));
  }

  // 3. Détection des doublons de messages
  const threads = activeDebug?.chatThreads || {};
  let totalDups = 0;
  for (const [chatId, messages] of Object.entries(threads)) {
    if (!Array.isArray(messages)) continue;
    const ids = messages.map(m => m.id);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (duplicates.length > 0) {
      totalDups += duplicates.length;
      console.warn(`⚠️ Chat ${chatId} : ${duplicates.length} message(s) avec le même ID`, duplicates);
    }

    // Détecter messages avec contenu identique et timestamps très proches (< 10s)
    const contentMap = new Map();
    messages.forEach(m => {
      const ts = typeof m.timestamp === 'number'
        ? Math.floor(m.timestamp / 1000)
        : (m.createdAt ? Math.floor(new Date(m.createdAt).getTime() / 1000) : 0);
      const key = `${(m.text || m.content || '').trim()}_${ts}`;
      contentMap.set(key, (contentMap.get(key) || 0) + 1);
    });

    const contentDups = [...contentMap.entries()].filter(([_, count]) => count > 1);
    if (contentDups.length > 0) {
      console.warn(`⚠️ Chat ${chatId} : ${contentDups.length} contenu(s) dupliqué(s) en < 1s :`, contentDups);
    }
  }

  if (totalDups === 0) {
    console.log('✅ Aucun ID dupliqué strict dans le state actuel en mémoire.');
  }

  // 4. Éléments DOM du Chat (Mobile vs Desktop)
  const chatMessagesDom = document.querySelectorAll('.chat-message, [data-message-id]');
  console.log(`💬 Nœuds messages rendus dans le DOM : ${chatMessagesDom.length}`);

  // 5. Bouton d'envoi et événements attachés
  const sendBtns = document.querySelectorAll('button[type="button"].premium-button');
  console.log(`💬 Boutons premium trouvés dans le DOM : ${sendBtns.length}`);

  console.groupEnd();
  return { threadsCount: Object.keys(threads).length, totalDups };
}

if (typeof window !== 'undefined') {
  window.diagnoseChat = diagnoseChat;
}
