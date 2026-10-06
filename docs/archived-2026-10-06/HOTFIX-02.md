# Rapport d'Incident & Correctif — HOTFIX-02 : Envois Multiples Mobile & Sync Desktop

## 1. Description du Problème
- **Symptôme 1** : Sur mobile, l'envoi d'un message le dupliquait immédiatement (envoyé 2 fois, voire 4 fois lors d'un tap).
- **Symptôme 2** : Les messages envoyés depuis le mobile n'apparaissaient pas sur l'ordinateur de bureau (desktop), ou les fils de discussion ne se synchronisaient pas en temps réel.

## 2. Causes Racines Identifiées
1. **Double/Quadruple déclencheur dans `ChatInputBar.jsx`** :
   - Le bouton d'envoi possédait à la fois un écouteur `onClick` et un écouteur `onTouchEnd`.
   - Chacun de ces deux écouteurs invoquait `handleSendMessage(localText)` puis `handleSubmit(e)` (qui à son tour invoquait `handleSendMessage(trimmed)`).
   - Lors d'un tap sur smartphone, `onTouchEnd` s'exécutait (2 envois), puis l'événement synthétique `onClick` émis 300ms plus tard s'exécutait également (2 envois supplémentaires), soit jusqu'à 4 écritures du même message.
2. **Synchronisation desktop par `participantUids` manquante** :
   - Dans `useChatManager.js`, la requête temps réel sur ordinateur de bureau écoute les chats via `where('participantUids', 'array-contains', myUid)`.
   - Lors de la mise à jour ou création du chat dans `handleSendMessage`, le champ `participantUids` était complètement omis du payload de `setDoc(doc(db, 'chats', chatId), ...)`.
   - Par conséquent, la collection `chats` sur desktop ne recevait jamais l'événement de mise à jour.
3. **Réconciliation optimiste fragile** :
   - Lorsque `serverTimestamp()` produit un champ `createdAt: null` sur le snapshot local Firestore immédiat, la condition de correspondance temporelle rejetait l'association et laissait le message optimiste et le message Firestore cohabiter dans le fil de discussion.

## 3. Correctifs Appliqués
1. **Module d'idempotence (`src/utils/messageIdempotency.js`)** :
   - Génération déterministe d'identifiants de message `msg_${chatId}_${senderUid}_${windowedTime}_${textHash}`.
   - Fenêtre de dé-rebond glissante de 6 secondes bloquant les envois identiques en rafale.
2. **Assainissement du bouton d'envoi (`src/components/chat/ChatInputBar.jsx`)** :
   - Éradication de l'écouteur `onTouchEnd`.
   - Le bouton n'écoute plus que `onClick={handleSubmit}`, qui valide le texte, vide le champ et appelle `handleSendMessage` une unique fois.
3. **Mise à jour Firestore unifiée (`src/hooks/useChatManager.js`)** :
   - Intégration du contrôle `shouldSendMessage(chatId, profile?.uid, text)`.
   - Inclusion systématique de `participantUids` (contenant le UID de l'émetteur et celui du destinataire) et de `lastSenderUid` lors de toute écriture sur `chats/{chatId}`.
4. **Tests Unitaires Automatisés (`tests/unit/chat/sendMessage.test.js`)** :
   - 4 tests validant la cohérence des identifiants, le blocage des doublons en rafale et la tolérance temporelle.

## 4. Statut & Validation
- Tests unitaires Vitest : **100% passés** (4/4).
- Synchronisation inter-appareils assurée par la présence garantie de `participantUids`.
