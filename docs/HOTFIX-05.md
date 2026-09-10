# Rapport d'Incident & Correctif — HOTFIX-05 : Notifications Fantômes "Appel Manqué"

## 1. Description du Problème
- **Symptôme** : Une notification d'appel manqué ("📵 Appel sans réponse") arrivait chez le destinataire sans que son téléphone ou navigateur n'ait jamais sonné.

## 2. Causes Racines Identifiées
1. **Émission inconditionnelle dans `endCall`** :
   - Lorsque l'appelant raccrochait ou fermait sa fenêtre, le code de `endCall` écrivait automatiquement un message `kind: 'call-log', status: 'missed'` dans le fil de discussion `chats/{chatId}/messages`.
   - Ce message était créé même si le signaling `calls/{callId}` n'avait jamais été délivré (par exemple à cause du blocage de `firestore.rules`) ou si l'appelant avait raccroché dans la seconde suivante.
   - En recevant ce message système dans son fil, l'application de l'appelé déclenchait le son et le badge d'appel manqué alors qu'aucun appel n'avait retenti.
2. **Absence d'acquittement de livraison (`deliveredAt`)** :
   - Le protocole n'avait aucun accusé de réception prouvant que le destinataire avait bien affiché la sonnerie entrante avant de qualifier l'appel de "manqué".

## 3. Correctifs Appliqués
1. **Accusé de réception (`deliveredAt`)** :
   - Dès que l'appelé reçoit le document d'appel avec `status === 'ringing'`, il met à jour le document `calls/{callId}` avec `deliveredAt: serverTimestamp()` et `calleeDelivered: true`.
2. **Garde d'enregistrement dans `src/hooks/useWebRTC.js`** :
   - L'appelant ne consigne plus un appel sans réponse (`status: 'missed'`) QUE SI :
     1. L'appel a été effectivement délivré (`wasDelivered === true`).
     2. L'appel a sonné pendant au moins 6 secondes sans réponse.
   - Si l'appelant raccroche avant livraison ou sous 6 secondes, l'événement est tracé sous `call_canceled_before_delivery` et **aucun message d'appel manqué n'est créé**, éliminant 100% des notifications fantômes.
3. **Refus explicite (`declineIncomingCall`)** :
   - Le refus consigne proprement `status: 'declined'` ("📵 Appel refusé") et non un faux appel manqué.
4. **Tests Unitaires Automatisés (`tests/unit/calls/missedCall.test.js`)** :
   - 5 tests unitaires validant l'absence de notification sans acquittement, le délai minimal de 6 secondes et la complétion en cas de succès.

## 4. Statut & Validation
- Tests unitaires Vitest : **100% passés** (5/5).
- Comportement vérifié : les notifications fantômes sont éradiquées.
