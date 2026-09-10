# 🛡️ TROCO — Documentation des Règles de Sécurité Firestore (P0-SEC-04)

Ce document détaille l'architecture de sécurité **Zero-Trust (Deny-By-Default)** mise en œuvre sur Firestore pour la plateforme **Troco**, conformément aux standards fintech et à la protection des données sensibles.

---

## 1. Philosophie & Principes Fondamentaux

1. **Deny-by-default absolu** :
   Toute collection ou document non explicitement autorisé par une règle `allow` est immédiatement rejeté (`match /{document=**} { allow read, write: if false; }`).
2. **Principe du Moindre Privilège** :
   Chaque utilisateur ne dispose strictement que des droits de lecture/écriture nécessaires à sa propre session et à ses interactions actives.
3. **Sécurité Financière & Antifraude** :
   - Les soldes en euros (`euroBalance`), les jetons de troc (`trocoTokens`), le compteur de deals validés (`dealsCompleted`), les certifications KYC (`kycVerified`) et les statuts de bannissement (`isBanned`, `isShadowBanned`) sont **strictement inaccessibles en écriture côté client**.
   - Toute mise à jour financière s'effectue exclusivement par des **Cloud Functions sécurisées** avec l'Admin SDK de Firebase.
4. **Autorité Cryptographique** :
   - Les privilèges administrateur reposent uniquement sur les Custom Claims signés (`request.auth.token.admin == true`).
   - Aucune vérification n'est basée sur `request.auth.token.email` (falsifiable ou sujet à des attaques d'usurpation).

---

## 2. Fonctions Helper Réutilisables

| Helper | Description | Règle / Condition |
| :--- | :--- | :--- |
| `isAuthenticated()` | Vérifie si la requête possède un token d'authentification valide. | `request.auth != null && request.auth.uid != null` |
| `isOwner(uid)` | Vérifie que l'UID de l'utilisateur connecté correspond à l'identifiant du document. | `isAuthenticated() && request.auth.uid == uid` |
| `isAdmin()` | Vérifie que le claim administrateur signé est présent et égal à `true`. | `isAuthenticated() && request.auth.token.admin == true` |
| `isNotBanned()` | Vérifie dans `users/{uid}` que l'utilisateur n'est pas marqué comme banni (`isBanned != true`). | `!(exists(...) && get(...).data.isBanned == true)` |

---

## 3. Matrice des Droits par Collection

### 👤 `users/{uid}`
- **Lecture** : Propriétaire du compte (`isOwner(uid)`) ou Administrateur (`isAdmin()`).
- **Création** : Propriétaire du compte, avec interdiction de pré-remplir les champs protégés (`euroBalance`, `trocoTokens`, `dealsCompleted`, `kycVerified`, `isBanned`, `isShadowBanned`, `role`, `subscriptionPlan`, `cguAcceptedAt`).
- **Modification** : Propriétaire non banni sans modifier les champs protégés, ou Administrateur.
- **Suppression** : `false` (gérée via Cloud Function RGPD côté serveur).

#### 🔔 Sous-collection `users/{uid}/notifications/{notifId}`
- **Lecture** : Propriétaire du compte uniquement.
- **Écriture** : `false` (dépôt de notification réservé au serveur).

---

### 📢 `listings/{listingId}`
- **Lecture** :
  - Publique si `status == 'active'` (permet le SEO et l'exploration immédiate).
  - Auteur de l'annonce (`authorUid == request.auth.uid`) quel que soit le statut (`draft`, `hidden`, `expired`).
  - Administrateur.
- **Création** : Utilisateur connecté et non banni avec assignation obligatoire de son propre `authorUid`.
- **Modification** : Auteur non banni sans toucher aux flags de modération et de boost (`isBoosted`, `isHidden`, `firestoreId`), ou Administrateur.
- **Suppression** : Auteur de l'annonce ou Administrateur.

---

### 💬 `chats/{chatId}`
- **Lecture** : Réservée aux participants inscrits dans le tableau `participants` ou Administrateur.
- **Création** : Utilisateur authentifié non banni présent dans `participants`.
- **Modification** : Participants non bannis (mise à jour horodatage, statut de frappe, dernier message).
- **Suppression** : `false`.

#### ✉️ Sous-collection `chats/{chatId}/messages/{msgId}`
- **Lecture** : Participants déclarés dans la conversation parente `chats/{chatId}` ou Administrateur.
- **Création** : Émetteur authentifié non banni avec `senderUid == request.auth.uid`.
- **Modification** : Émetteur du message uniquement (édition / état lu).
- **Suppression** : Émetteur du message ou Administrateur.

---

### 💳 `transactions/{txId}`
- **Lecture** : Parties prenantes à l'échange (`userId`, `partnerUid`, `buyerUid`, `sellerUid`) ou Administrateur.
- **Écriture (`create, update, delete`)** : `false` (verrouillage complet, géré uniquement par les Cloud Functions avec transactions ACID).

---

### 🚨 `reports/{reportId}`
- **Lecture** : Réservée strictement aux Administrateurs (`isAdmin()`).
- **Création** : Tout membre authentifié non banni avec `reporterUid == request.auth.uid`.
- **Modification / Suppression** : Administrateurs uniquement.

---

### 🎁 `campaigns/{campaignId}`
- **Lecture** : Utilisateurs connectés pour les campagnes actives (`resource.data.active == true`).
- **Écriture** : Administrateurs uniquement.

---

## 4. Exécution des Tests Unitaires

La suite de tests unitaires contient **30+ tests automatisés** couvrant l'intégralité des scénarios d'accès et d'attaques potentielles.

### Prérequis
- Node.js 18+
- Java Runtime (JRE 8+) pour l'émulateur Firestore Firebase

### Lancement des tests avec l'émulateur Firebase
```bash
# 1. Lancement automatique avec l'émulateur Firebase
npx firebase-tools emulators:exec --only firestore "npm run test:rules"

# OU si un émulateur tourne déjà sur le port 8080 :
npm run test:rules
```

### Déploiement en production
```bash
npx firebase-tools deploy --only firestore:rules
```
