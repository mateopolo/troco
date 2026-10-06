# Rapport d'Incident & Correctif — HOTFIX-04 : Réparation Appels WebRTC

## 1. Description du Problème
- **Symptôme** : Les appels audio et vidéo WebRTC ne sonnaient plus chez le destinataire. Lorsque l'appelant déclenchait un appel, le destinataire ne recevait aucune notification d'appel entrant ni sonnerie.

## 2. Cause Racine Majeure Découverte
- **Absence de règle de sécurité Firestore (`firestore.rules`)** :
  - La collection `calls/{callId}` et ses sous-collections de candidats ICE (`callerCandidates`, `calleeCandidates`, etc.) ne possédaient **aucune règle d'autorisation** dans `firestore.rules`.
  - Lors de la sécurisation précédente, la clause par défaut `match /{document=**} { allow read, write: if false; }` rejetait silencieusement toutes les opérations de signalisation WebRTC (`permission-denied`).
  - L'appelant ne pouvait pas écrire le document d'offre SDP, et l'appelé ne pouvait pas écouter les appels entrants.
- **Résolution des cibles d'écoute (`targetParticipants`)** :
  - Le listener de l'appelé n'écoutait que par UID. Si l'appelant n'avait que le nom d'utilisateur dans la conversation, le filtre `where('targetParticipants', 'array-contains', myUid)` ne correspondait pas.

## 3. Correctifs Appliqués
1. **Règles Firestore (`firestore.rules`)** :
   - Ajout d'un bloc dédié autorisant les utilisateurs authentifiés à créer, lire, modifier et supprimer les documents de session d'appel dans `match /calls/{callId}` et ses sous-collections de candidats ICE (`match /{subcollection}/{candidateId}`).
2. **Context & Singleton WebRTC (`src/contexts/WebRTCContext.jsx`)** :
   - Mise à disposition d'un contexte global pour garantir une instance unique de signalisation et éviter toute duplication de listeners.
3. **Module de Traçabilité (`src/utils/webrtcTracer.js`)** :
   - Enregistrement structuré de tous les événements de signalisation (`call_start`, `call_signaling_delivered`, `call_connected`, etc.) avec intégration console dev et breadcrumbs Sentry.
4. **Multi-cibles d'écoute dans `src/hooks/useWebRTC.js`** :
   - L'appelé écoute en parallèle par UID Firebase, nom de profil et versions normalisées, garantissant la sonnerie entrante dans tous les scénarios réseau et profils.

## 4. Validation
- Règles Firestore autorisant la traversée du signaling.
- Tests unitaires Vitest : validés.
