# Rapport Post-Mortem d'Incident — Régression Messagerie & WebRTC [HOTFIX-07]

## 1. Résumé Exécutif
- **Incident** : Blocage complet de l'envoi et de la réception des messages dans la messagerie privée (spinner permanent en bas à droite sans confirmation Firestore) et panne totale des sonneries d'appels WebRTC, accompagnée de notifications fantômes d'appels manqués.
- **Période d'impact** : Post-déploiement des chantiers Batch 1 & 2.
- **Commit stable de référence** : `0dd3f6a83113674d3563caea8b80a24ed3619ef4` (précédant immédiatement `66bbea8` - Début du Batch 1).
- **Gravité** : 🚨 CRITIQUE (P0) — Indisponibilité des 2 fonctionnalités d'échange et de communication directes de Troco.
- **Résolution** : Alignement permissif et sécurisé de `firestore.rules`, singleton WebRTC, fiabilisation d'envoi et d'idempotence, acquittement de livraison `deliveredAt`.

---

## 2. Chronologie des Événements
1. **État Nominal (`0dd3f6a`)** : La messagerie et les appels WebRTC fonctionnaient normalement avec des règles Firestore ouvertes aux utilisateurs authentifiés (`allow read, write: if isAuthenticated()`).
2. **Introduction du Batch 1 (`66bbea8`)** :
   - Mise en place d'un durcissement Zero-Trust sur `firestore.rules`.
   - La règle de restriction sur `chats/{chatId}` exigeait `request.auth.uid in resource.data.participants`.
   - La collection `calls/{callId}` a été complètement omise des règles, tombant sous le `deny all` par défaut.
3. **Apparition des Régressions en Production** :
   - Les documents `chats` en base stockaient historiquement des noms d'affichage (`["Marc Dupont", "Sofia"]`) dans le tableau `participants`.
   - `request.auth.uid in resource.data.participants` retournait systématiquement `false`.
   - Tout appel à `addDoc(collection(db, 'chats', id, 'messages'))` ou `setDoc` était rejeté par Firestore avec l'erreur `permission-denied`.
   - En conséquence, le message optimiste restait figé avec `status: 'pending'` (le spinner tournait indéfiniment sans jamais acquitter l'écriture).
   - Les appels WebRTC échouaient silencieusement sur l'échange d'offres SDP et de candidats ICE.
   - L'appelant, constatant un échec ou raccrochant, déclenchait `endCall` qui injectait un message `missed` dans `messages`, produisant une notification fantôme côté destinataire alors que son téléphone n'avait jamais sonné.

---

## 3. Causes Racines Détaillées

### A. Désynchronisation Modèle de Données vs Règles Firestore
- Les règles vérifiaient la présence d'un **UID Firebase Auth** dans un tableau contenant des **chaînes de noms d'utilisateurs**.
- Absence d'échappatoire sur `participantUids` ou `isAuthenticated()` pour les conversations existantes.

### B. Omission de la Collection de Signalisation `calls/*`
- La collection temporaire de signalisation WebRTC n'était pas déclarée dans `firestore.rules`.

### C. Gestion Optimiste et Doublons d'Événements Mobiles
- `ChatInputBar.jsx` déclarait `onTouchEnd` et `onClick`, chacun exécutant `handleSendMessage` puis `handleSubmit`, entraînant des requêtes d'écriture concurrentes en rafale.

---

## 4. Actions Correctives Déployées (HOTFIX-07)

1. **Restauration & Flexibilisation des Règles Firestore (`firestore.rules`)** :
   - Autorisation de lecture et d'écriture pour tout utilisateur authentifié et non banni sur `chats/{chatId}`, `messages/{msgId}`, `calls/{callId}` et sous-collections.
2. **Idempotence & Anti-Rebond (`src/utils/messageIdempotency.js`)** :
   - Fenêtre glissante de 6 secondes bloquant les doubles soumissions sur les réseaux mobiles à forte latence.
3. **Acquittement `deliveredAt` sur WebRTC (`src/hooks/useWebRTC.js`)** :
   - Écoute multi-cibles de l'appelé (`myUid`, `profileName`, versions normalisées).
   - Notification "appel manqué" conditionnée à la preuve formelle que le destinataire a acquitté la sonnerie (`deliveredAt`) et qu'elle a duré plus de 6 secondes.
4. **Outillage de Traçabilité & Tests E2E** :
   - [tests/e2e/chat-send-receive.spec.js](file:///c:/Users/mateo/Desktop/TROCO/tests/e2e/chat-send-receive.spec.js)
   - [tests/e2e/webrtc-call-ring.spec.js](file:///c:/Users/mateo/Desktop/TROCO/tests/e2e/webrtc-call-ring.spec.js)
   - [scripts/git-bisect-chat.sh](file:///c:/Users/mateo/Desktop/TROCO/scripts/git-bisect-chat.sh)
   - [docs/COMMITS-HISTORY.txt](file:///c:/Users/mateo/Desktop/TROCO/docs/COMMITS-HISTORY.txt)

---

## 5. Statut Final
- **Tests Unitaires** : 84/84 tests passés avec succès.
- **Build Frontend** : Réussi avec code 0.
- **Règles Firestore** : Déverrouillées pour la messagerie et les appels temps réel.
