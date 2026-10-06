# 🧪 Guide des Tests — Troco

Ce document centralise les procédures d'exécution, la configuration et la cartographie complète de la suite de tests de l'application **Troco**.

---

## 📋 Table des Matières
1. [Prérequis Système](#-1-prérequis-système)
2. [Tests des Règles de Sécurité Firestore](#-2-tests-des-règles-de-sécurité-firestore)
3. [Tests Unitaires & Composants](#-3-tests-unitaires--composants)
4. [Tests End-to-End (Playwright)](#-4-tests-end-to-end-playwright)
5. [Tests Cloud Functions](#-5-tests-cloud-functions)
6. [Cartographie des Fichiers de Test](#-6-cartographie-des-fichiers-de-test)

---

## ⚙️ 1. Prérequis Système

Pour exécuter l'ensemble de la suite de tests en local :
- **Node.js** : version 18+ ou 20+ LTS
- **Java JRE / JDK** : version 11 ou supérieure (nécessaire pour exécuter l'émulateur local Cloud Firestore via Firebase CLI).
  ```bash
  java -version
  ```
- **Firebase CLI** : installé globalement ou via npx :
  ```bash
  npm install -g firebase-tools
  ```
- **Navigateurs Playwright (pour les tests e2e)** :
  ```bash
  npx playwright install --with-deps
  ```

---

## 🛡️ 2. Tests des Règles de Sécurité Firestore

Les tests de sécurité s'exécutent avec **Vitest** et `@firebase/rules-unit-testing`. Ils valident l'isolation Zero-Trust, le verrouillage des soldes (`euroBalance`, `trocoTokens`), les autorisations de lecture des annonces, et les permissions des salons de discussion.

### Exécution :
```bash
# Lancement direct via le script configuré
npm run test:rules
```
Ou manuellement avec Vitest :
```bash
npx vitest run tests/rules
```

*Note : Ces tests démarrent automatiquement l'environnement de test de règles ou se connectent à l'émulateur Firestore local.*

---

## ⚡ 3. Tests Unitaires & Composants

L'application dispose d'une couverture approfondie de ses composants React, de ses custom hooks et de ses modules utilitaires.

### Exécution avec Vitest :
```bash
# Exécution de toute la suite unitaire
npx vitest run

# Ciblage d'un test spécifique (ex: Phase143)
npx vitest run src/components/Phase143TrocoSlidesOverhaul.test.js

# Mode surveillance (watch)
npx vitest
```

### Exécution avec Jest (React Scripts) :
```bash
# Lancement interactif Jest
npm test -- --watchAll=false
```

---

## 🎭 4. Tests End-to-End (Playwright)

Les tests E2E simulent le comportement utilisateur réel dans des navigateurs Chromium, WebKit et Firefox : scénarios de messagerie instantanée, signalisation WebRTC, négociations de deals.

### Exécution :
```bash
# Lancer tous les tests E2E headless
npm run test:e2e

# Mode interface graphique interactive Playwright
npx playwright test --ui

# Débogage pas-à-pas
npx playwright test --debug
```

Fichiers de test E2E :
- `tests/e2e/chat-full-flow.spec.js` : Parcours complet d'ouverture et d'échange dans le chat.
- `tests/e2e/chat-send-receive.spec.js` : Émission et réception temps réel multi-fenêtres.
- `tests/e2e/webrtc-call-ring.spec.js` : Sonnerie et notifications d'appel entrant.
- `tests/e2e/webrtc-full-flow.spec.js` : Établissement de communication audio/vidéo P2P.

---

## ☁️ 5. Tests Cloud Functions

Validation des fonctions backend (Admin SDK, paiements, RGPD, synchronisation de profil public).

### Exécution :
```bash
npm run test:functions
```

Fichiers de test Cloud Functions :
- `functions/test/admin.test.ts`
- `functions/test/gdpr.test.ts`
- `functions/test/onUserWriteSyncPublic.test.ts`
- `functions/test/payments.test.ts`
- `functions/test/security.test.ts`

---

## 🗺️ 6. Cartographie des Fichiers de Test

| Catégorie | Emplacement | Rôle principal |
| :--- | :--- | :--- |
| **Règles Firestore** | `tests/rules/*.test.js` | Zero-Trust, Deny-by-default, intégrité des soldes |
| **Modules Unitaires** | `tests/unit/**/*.test.js` | Fonctions pures, parseurs, migrations de données |
| **Composants & Phases** | `src/components/*.test.js` | Validation de non-régression des phases 102 à 144 |
| **Fonctionnalités métier** | `src/features/**/*.test.js` | WebRTC call overlay, chat background, interactive map |
| **Services & Stores** | `src/services/*.test.js`, `src/stores/*.test.js` | Audio, transcription, stores Zustand |
| **E2E Playwright** | `tests/e2e/*.spec.js` | Scénarios utilisateurs multi-sessions |
| **Cloud Functions** | `functions/test/*.test.ts` | Logique serveur, paiements et RGPD |
