# Rapport de Diagnostic Global Post-Batch 1 & 2 [HOTFIX-00]

## 1. Contexte & Détection
Ce rapport synthétise les résultats des diagnostics de régressions multi-modules exécutés sur l'application Troco (mobile et desktop).

- **Date d'exécution** : 2026-09-10
- **Version inspectée** : Batch 1 & 2 post-refonte
- **Outils utilisés** :
  - `src/utils/diagnostics/fullRegressionScan.js`
  - `src/utils/diagnostics/modalDebugger.js`
  - `src/utils/diagnostics/chatDebugger.js`
  - `src/utils/diagnostics/webrtcScanner.js`
  - `src/utils/diagnostics/firestoreListenerTracker.js`
  - `scripts/analyze-cloud-logs.sh`

---

## 2. Résultats des Scanners

### A. Modales & Overlays (HOTFIX-01)
- **Portals détectés** : Double portail imbriqué.
  - Niveau 1 : `PaymentFeature.jsx` montait un portail avec la classe `pointer-events-none`.
  - Niveau 2 : `PaymentModal.jsx` créait son propre portail `createPortal(..., document.body)`.
- **Événements de clic** : Le backdrop du modal ne possédait aucun handler `onClick`. Clics bloqués.
- **Scrollbars** : Triple `overflow-y: auto` (backdrop + carte + modal content) sans blocage du `document.body`.

### B. Messagerie & Synchronisation (HOTFIX-02)
- **Émissions multiples sur mobile** : Dans `ChatInputBar.jsx`, le bouton d'envoi déclenchait simultanément `onClick` et `onTouchEnd`, chacun appelant `handleSendMessage` puis `handleSubmit` (jusqu'à 4 exécutions par tap).
- **Synchronisation inter-devices** : Dans `useChatManager.js`, la mise à jour de `chats/{chatId}` omettait le tableau `participantUids`, empêchant la requête desktop `where('participantUids', 'array-contains', myUid)` de remonter les modifications.
- **Dédoublonnage optimiste** : Rejet de la fusion optimiste lorsque `createdAt` issu de `serverTimestamp()` est initialement `null` en local.

### C. Appels WebRTC & Notifications Fantômes (HOTFIX-04 & HOTFIX-05)
- **Firestore Rules (Bloquant P0)** : Absence totale de règle autorisant la lecture/écriture sur `calls/{callId}` et sous-collections dans `firestore.rules`. Tout signaling d'offre, de réponse ou de candidats ICE était immédiatement rejeté par Firestore avec `permission-denied`.
- **Notifications d'appel manqué fantômes** : Le déclenchement de la notification intervenait sur simple timer sans vérifier si le destinataire avait acquitté la réception (`deliveredAt`) ou si le statut avait transité par `ringing`.

---

## 3. Plan d'Action & Statut des Corrections

| Chantier | Description | Statut |
|---|---|---|
| **HOTFIX-01** | Orchestration globale via `ModalContext` & `GlobalModalWrapper` | En cours |
| **HOTFIX-02** | Déduplication mobile, idempotence message & sync `participantUids` | En attente |
| **HOTFIX-04** | Règles Firestore `calls/*`, singleton `WebRTCContext` & `webrtcTracer` | En attente |
| **HOTFIX-05** | Gardes `deliveredAt` et statut `ringing` sur les notifications d'appel | En attente |
| **HOTFIX-03** | Tests unitaires, validation build & documentation non-régression | En attente |
