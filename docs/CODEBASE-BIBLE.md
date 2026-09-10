# TROCO — CODEBASE BIBLE

> **Document de Référence Technique & Cartographie Système Exhaustive**  
> **Version du Référentiel :** Post-HOTFIX-07 / VERIF-03 / FIX-CALL (Commit `8f7d031`)  
> **Auteur / Maintenance :** Ingénierie Troco & Antigravity  
> **Standard de documentation :** 100% Factuel — Zéro extrapolation — Références fichier:ligne vérifiées  

---

## 1. Vue d'ensemble

### 1.1 Matrice Technologique
| Composant | Technologie Choisie | Version Spécifiée | Justification & Référence Codebase |
| :--- | :--- | :--- | :--- |
| **Framework Frontend** | React | `19.2.8` | Architecture de composants réactifs, Concurrent Mode activé ([`package.json:18`](file:///c:/Users/mateo/Desktop/TROCO/package.json#L18)) |
| **DOM Engine** | React DOM | `19.2.8` | Point de montage racine dans [`src/index.js:7-14`](file:///c:/Users/mateo/Desktop/TROCO/src/index.js#L7-L14) |
| **Scripts de Build** | React Scripts (CRA) | `5.0.1` | Webpack 5 standard sous-jacent ([`package.json:21`](file:///c:/Users/mateo/Desktop/TROCO/package.json#L21)) |
| **Runtime Backend** | Node.js | `20` (LTS) | Moteur d'exécution déclaré dans [`functions/package.json:17`](file:///c:/Users/mateo/Desktop/TROCO/functions/package.json#L17) |
| **Langage Backend** | TypeScript | `5.7.3` | Typage strict pour Cloud Functions v2 ([`functions/package.json:24`](file:///c:/Users/mateo/Desktop/TROCO/functions/package.json#L24)) |
| **SDK Firebase Client** | Firebase JS SDK | `12.17.1` | Modules Auth, Firestore, Storage, Functions, App Check ([`package.json:12`](file:///c:/Users/mateo/Desktop/TROCO/package.json#L12)) |
| **SDK Firebase Admin** | Firebase Admin Node | `13.1.0` | Privilèges serveur complets pour transactions ([`functions/package.json:20`](file:///c:/Users/mateo/Desktop/TROCO/functions/package.json#L20)) |
| **Cloud Functions SDK**| Firebase Functions | `6.3.2` (v2 API) | Triggers `onCall`, `onDocumentWritten`, `onSchedule` ([`functions/package.json:21`](file:///c:/Users/mateo/Desktop/TROCO/functions/package.json#L21)) |
| **Gestion d'État Global**| Zustand | `5.0.15` | Stores atomiques avec persistance locale sélective ([`package.json:24`](file:///c:/Users/mateo/Desktop/TROCO/package.json#L24)) |
| **Animations & Gestes** | Framer Motion & Motion | `13.1.1` / `13.2.0` | Transitions de pages et glissades de modales ([`package.json:13,16`](file:///c:/Users/mateo/Desktop/TROCO/package.json#L13)) |
| **Cartographie Interactive**| Leaflet & React Leaflet | `1.9.4` / `5.0.0` | Rendu de carte pour le troc local ([`package.json:14,20`](file:///c:/Users/mateo/Desktop/TROCO/package.json#L14)) |
| **Indexation Spatiale**| NGeohash | `0.6.4` | Calcul de géohash pour requêtes spatiales d'annonces ([`package.json:17`](file:///c:/Users/mateo/Desktop/TROCO/package.json#L17)) |
| **Virtualisation de Liste**| TanStack Virtual | `3.14.10` | Performance $O(1)$ de défilement du feed et du chat ([`package.json:6`](file:///c:/Users/mateo/Desktop/TROCO/package.json#L6)) |
| **Iconographie** | Lucide React | `1.31.0` | Jeu d'icônes SVG universel ([`package.json:15`](file:///c:/Users/mateo/Desktop/TROCO/package.json#L15)) |
| **Moteur de Test Unitaire**| Vitest | `5.0.0` (root) / `3.0.7` | Validation unitaire et intégration ([`package.json:58`](file:///c:/Users/mateo/Desktop/TROCO/package.json#L58)) |
| **Moteur de Test E2E** | Playwright | `1.62.1` | Tests multi-navigateurs E2E ([`package.json:55`](file:///c:/Users/mateo/Desktop/TROCO/package.json#L55)) |

### 1.2 Configuration Réseau & Hébergement
- **Projet Firebase :** `troco-8a6eb` ([`src/firebase.js:11`](file:///c:/Users/mateo/Desktop/TROCO/src/firebase.js#L11)).
- **Région Cloud Functions :** `europe-west1` (Bruxelles/Belgique) pour minimiser la latence en Europe ([`src/firebase.js:21`](file:///c:/Users/mateo/Desktop/TROCO/src/firebase.js#L21)).
- **Auth Domain :** `troco-8a6eb.firebaseapp.com` ([`src/firebase.js:10`](file:///c:/Users/mateo/Desktop/TROCO/src/firebase.js#L10)).
- **Storage Bucket :** `troco-8a6eb.firebasestorage.app` ([`src/firebase.js:12`](file:///c:/Users/mateo/Desktop/TROCO/src/firebase.js#L12)).
- **URL Staging & Production :** ❓ Non trouvé dans la configuration du dépôt. `firebase.json` ne configure que Firestore, Functions et Emulators ([`firebase.json:1-34`](file:///c:/Users/mateo/Desktop/TROCO/firebase.json#L1-L34)). Aucun service de déploiement hosting statique n'est déclaré dans le repo.

### 1.3 Variables d'Environnement Déclarées
Définies dans `.env` et interceptées par React Scripts :
- `REACT_APP_FIREBASE_API_KEY` : Clé API publique Firebase Web.
- `REACT_APP_FIREBASE_AUTH_DOMAIN` : Domaine de callback d'authentification.
- `REACT_APP_FIREBASE_PROJECT_ID` : Identifiant unique de projet GCP/Firebase (`troco-8a6eb`).
- `REACT_APP_FIREBASE_STORAGE_BUCKET` : Bucket Cloud Storage pour avatars et médias vocaux.
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` : Numéro de projet Cloud Messaging.
- `REACT_APP_FIREBASE_APP_ID` : Identifiant d'application cliente Web.
- `REACT_APP_FIREBASE_MEASUREMENT_ID` : Identifiant Google Analytics GA4.
- `REACT_APP_RECAPTCHA_SITE_KEY` / `VITE_RECAPTCHA_SITE_KEY` : Clé publique reCAPTCHA v3 pour App Check ([`src/firebase.js:24`](file:///c:/Users/mateo/Desktop/TROCO/src/firebase.js#L24)).
- `REACT_APP_APPCHECK_DEBUG_TOKEN` : Jeton de débogage App Check en environnement de test local.

### 1.4 Volume du Code
- **`src/` :** **305 fichiers** recensés (composants React, modules métier, stores, hooks, utilitaires).
- **`functions/` :** **39 fichiers** au total (**31 fichiers** dans `functions/src/`, hors `node_modules` et `lib`).

---

## 2. Arborescence commentée

```text
TROCO/
├── .github/
│   └── workflows/
│       └── ci.yml                         → Pipeline GitHub Actions automatisant ESLint, Vitest et build React
├── docs/                                  → Référentiels d'architecture, rapports d'audit et guides
│   ├── AUDIT-00-REPORT.md                 → Rapport exhaustif post-HOTFIX-07 sur Chat, WebRTC et Sécurité
│   ├── CODEBASE-BIBLE.md                  → Le présent document de référence absolue
│   ├── MIGRATION-PARTICIPANTS.md          → Guide de migration des participants de chat (Noms → UIDs)
│   ├── MONITORING.md                      → Guide de surveillance des quotas et erreurs Firestore
│   └── VERIF-01-REPORT.md                 → Rapport de validation des tests d'intégration
├── functions/                             → Backend Cloud Functions v2 (TypeScript)
│   ├── package.json                       → Dépendances serveur et scripts de compilation
│   ├── tsconfig.json                      → Options du compilateur TypeScript pour Node 20
│   └── src/
│       ├── admin/                         → Fonctions d'administration réservées aux Custom Claims admin
│       │   ├── deleteListingAsAdmin.ts    → Suppression administrative d'annonces avec notification
│       │   ├── resetUserSafely.ts         → Réinitialisation de profil tout en préservant le portefeuille
│       │   ├── resolveReport.ts           → Traitement et résolution des signalements modérateur
│       │   ├── setAdminClaim.ts           → Attribution sécurisée du Custom Claim admin: true
│       │   ├── toggleHideListingAsAdmin.ts→ Masquage / démasquage modérateur d'une annonce
│       │   └── updateUserAsAdmin.ts       → Édition administrative des attributs d'un utilisateur
│       ├── gdpr/                          → Conformité RGPD article 17 (Droit à l'oubli)
│       │   ├── deleteUserCompletely.ts    → Enclenchement de la suppression de compte (délai de grâce 30j)
│       │   ├── restoreAccount.ts          → Annulation de suppression dans les 30 jours
│       │   └── scheduledDeletion.ts       → Cron quotidien (03:00) purgeant les comptes expirés
│       ├── middleware/                    → Validation des tokens et rate limits
│       ├── migration/                     → Scripts de migration des bases existantes
│       │   ├── migrateChatParticipants.ts → Migration idempotente de chats (noms vers Firebase Auth UIDs)
│       │   └── migrationReport.ts         → Générateur de rapports d'exécution de migration
│       ├── payments/                      → Moteur de transactions financières et portefeuille
│       │   ├── applyPayment.ts            → Validation de rechargement/achat de jetons avec idempotence 24h
│       │   ├── claimBonus.ts              → Réclamation unique anti-double-crédit de bonus de campagne
│       │   ├── cleanupIdempotency.ts      → Cron horaire purgeant les clés d'idempotence expirées
│       │   ├── idempotency.ts             → Verrou d'idempotence atomique sur collection idempotency_keys
│       │   ├── transferAtomically.ts      → Transfert atomique universel de soldes (deal, visio, tokens)
│       │   ├── validation.ts              → Schémas de validation des montants et UIDs
│       │   └── providers/                 → Adaptateurs de paiement (mockProvider actif, Stripe extensible)
│       │       ├── index.ts               → Sélecteur de provider selon configuration
│       │       └── mockProvider.ts        → Passerelle de test émulant les règlements bancaires 3D Secure
│       ├── security/                      → Protection contre les abus de requêtes
│       │   ├── checkRateLimit.ts          → Calcul de quota par fenêtre glissante
│       │   └── cleanupRateLimits.ts       → Cron horaire purgeant les compteurs de requêtes
│       ├── users/                         → Synchronisation des profils et minimisation des données
│       │   ├── migrateUsersPublic.ts      → Backfill des profils existants vers users_public
│       │   └── onUserWriteSyncPublic.ts   → Trigger Firestore dupliquant le profil privé vers users_public
│       ├── utils/                         → Utilitaires serveur
│       │   └── logger.ts                  → Journalisation structurée Cloud Logging avec audit trail
│       └── index.ts                       → Export des 18 Cloud Functions déployées
├── public/                                → Ressources publiques et fichiers statiques PWA
├── scripts/                               → Scripts d'exploitation pour développeurs et DevOps
│   ├── analyze-cloud-logs.sh              → Extraction et filtrage des erreurs dans Google Cloud Logging
│   └── backup-firestore.sh                → Sauvegarde d'urgence des collections Firestore via gcloud
├── src/                                   → Application cliente React 19
│   ├── components/                        → Composants d'interface utilisateur
│   │   ├── chat/                          → Composants modulaires du chat
│   │   │   ├── ChatHeader.jsx             → Barre d'en-tête (avatar, statut en ligne, boutons d'appel)
│   │   │   ├── ChatInputBar.jsx           → Saisie mémoïsée O(1), envoi audio, deals et anti-double-clic
│   │   │   └── MessageBubble.jsx          → Bulle de message, player audio, traduction et statuts
│   │   ├── common/                        → Éléments d'identité de marque (TrocoLogo, Badges de réputation)
│   │   ├── core/                          → Virtualisation de listes et conteneurs universels
│   │   ├── layout/                        → Structure globale (en-têtes, navigation du bas, tiroirs)
│   │   ├── modals/                        → Modales contextuelles (Filtres, Signalements, KYC, Boosts)
│   │   ├── profile/                       → Composants du profil (Portfolio, Compétences, Customiseur d'apparence)
│   │   ├── ui/                            → Primitives graphiques (PullToRefresh, Tooltips, Boutons)
│   │   ├── AdminPanel.jsx                 → Interface de supervision administrateur
│   │   ├── AuthScreen.jsx                 → Écran d'authentification principal
│   │   ├── CallOverlay.jsx                → Interface visuelle de l'appel WebRTC HD
│   │   ├── ChatView.jsx                   → Vue complète du chat (3 961 lignes, négociations de deals)
│   │   ├── CollaborativeWhiteboardModal.jsx→ Tableau blanc vectoriel collaboratif en temps réel
│   │   ├── PaymentModal.jsx               → Modale de checkout, portefeuille, KYC et achat de jetons
│   │   ├── SectoralErrorBoundary.jsx      → Barrière d'erreur cloisonnée isolant les crashs de modules
│   │   ├── TrocoDocs.jsx                  → Suite bureautique collaborative (Docs, Sheets, Slides, Notes)
│   │   └── VoiceNoteRecorder.jsx          → Enregistreur vocal micro avec forme d'onde animée
│   ├── config/                            → Drapeaux et constantes système
│   ├── contexts/                          → Providers React globaux
│   │   ├── AuthContext.jsx                → Contexte d'authentification
│   │   ├── LanguageContext.jsx            → Contexte de langue et internationalisation (7 langues)
│   │   ├── ModalContext.jsx               → Gestionnaire impératif de modales
│   │   ├── ThemeContext.jsx               → Contexte de thème sombre / clair et couleurs d'accent
│   │   ├── WalletContext.jsx              → Contexte de portefeuille
│   │   └── WebRTCContext.jsx              → Contexte optionnel d'encapsulation WebRTC
│   ├── data/                              → Données statiques, mocks de démonstration et dictionnaires
│   ├── features/                          → Découpage fonctionnel par domaine
│   │   ├── admin/                         → Gestion modérateur et litiges
│   │   ├── auth/                          → Écran d'authentification déporté
│   │   ├── call/                          → Module d'appel WebRTC (WebRTCCallOverlay, CallFeature PIP)
│   │   ├── chat/                          → Section de chat intégrée avec PullToRefresh
│   │   ├── community/                     → Fil d'entraide communautaire
│   │   ├── feed/                          → Moteur d'annonces, filtres et cartes
│   │   ├── map/                           → Vue géographique interactive Leaflet
│   │   ├── payment/                       → Checkout et souscription Troco+
│   │   ├── post/                          → Publication et édition d'annonces de troc
│   │   ├── profile/                       → Page de profil membre
│   │   └── workspace/                     → Outils bureautiques partagés
│   ├── hooks/                             → Hooks logiques personnalisés
│   │   ├── useAdminGuard.js               → Validation réactive du Custom Claim admin: true avec rotation 55 min
│   │   ├── useAppAuth.js                  → Gestionnaire de session Firebase Auth et synchronisation users/{uid}
│   │   ├── useAppModals.js                → Centralisation des états d'ouverture des modales
│   │   ├── useAppNavigation.js            → Navigation par hash (#), historique popstate et retour physique mobile
│   │   ├── useChatManager.js              → Cœur logique de messagerie, négociations et transactions (2 397 lignes)
│   │   ├── useFirestoreHealth.js          → Surveillance client proactive des erreurs Firestore (VERIF-03)
│   │   └── useWebRTC.js                   → Moteur de signalisation et gestion des flux P2P WebRTC (1 081 lignes)
│   ├── lib/                               → Modules tiers préconfigurés
│   ├── locales/                           → Dictionnaires de traductions centralisés
│   │   └── translations.js                → Fichier maître de traductions multilingues (73 Ko)
│   ├── services/                          → Couche d'interaction API et services natifs
│   │   ├── audioService.js                → Synthétiseur audio Web Audio API et sons d'interface
│   │   ├── liveTranscriptionService.js    → Transcription en direct et sous-titres visio
│   │   └── voiceStorageService.js         → Envoi et normalisation des notes vocales dans Cloud Storage
│   ├── stores/                            → Stores d'état global Zustand
│   │   ├── useAuthStore.js                → État d'authentification et profil local
│   │   ├── useChatStore.js                → Cache persistant des conversations et déduplication
│   │   ├── useFeedStore.js                → État des annonces, filtres et pagination
│   │   ├── useUIStore.js                  → États d'ouverture de l'ensemble des modales
│   │   └── useWalletStore.js              → Portefeuille (tokens, euros, devise verrouillée Géo-IP)
│   ├── utils/                             → Fonctions pures et aides de calcul
│   │   ├── audioService.js                → Effets sonores d'encaissement (Betclic, Apple Pay, Swoosh)
│   │   ├── haptics.js                     → Moteur de vibrations haptiques navigateur
│   │   ├── moderationBlacklist.js         → Filtre de modération textuelle anti-injures
│   │   ├── sentryFilters.js               → Nettoyage et assainissement des payloads d'erreurs
│   │   └── sessionFlags.js                → Marquage et purge des indicateurs de session
│   ├── App.js                             → Composant racine maître de l'application (4 849 lignes)
│   ├── firebase.js                        → Initialisation officielle des services Firebase Client
│   └── index.js                           → Point d'entrée de montage React DOM
├── tests/                                 → Suites de tests de non-régression
│   ├── e2e/                               → Scénarios Playwright E2E (chat-full-flow, webrtc-full-flow)
│   ├── rules/                             → Tests unitaires des règles de sécurité Firestore
│   └── unit/                              → Tests unitaires Vitest (useChatManager, useWebRTC, Cloud Functions)
├── firebase.json                          → Déclaration des règles, options functions et ports d'émulateurs
├── firestore.rules                        → Règles de sécurité Firestore Zero-Trust (Deny-by-default)
└── package.json                           → Dépendances frontend et commandes de scripts
```

---

## 3. Routes & Navigation

Troco opère selon une architecture **Tab-based Single-Page Application (SPA)** sans rechargement de page, orchestrée par l'état réactif `activeTab` dans [`src/App.js`](file:///c:/Users/mateo/Desktop/TROCO/src/App.js) et synchronisée avec l'historique de navigation dans [`src/hooks/useAppNavigation.js:20-50`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useAppNavigation.js#L20-L50).

### 3.1 Gestionnaire de Navigation (`useAppNavigation`)
- **Détection par Hash URL :** La fonction `getTabFromHash()` ([`useAppNavigation.js:7-14`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useAppNavigation.js#L7-L14)) lit `window.location.hash` pour supporter le deep-linking direct (ex: `https://troco.fr/#privacy-policy` ouvre directement la politique de confidentialité).
- **Défilement Automatique :** À chaque changement de `activeTab`, `window.scrollTo({ top: 0, left: 0, behavior: 'instant' })` réinitialise le scroll ([`useAppNavigation.js:29`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useAppNavigation.js#L29)).
- **Gestion du Bouton Retour Physique (Android / iOS Swipe Back) :** L'écouteur d'événement `popstate` ([`useAppNavigation.js:53-110`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useAppNavigation.js#L53-L110)) ferme hiérarchiquement les modales ouvertes dans `useUIStore` avant de modifier la route, évitant ainsi de quitter l'application accidentellement.

### 3.2 Inventaire des Vues Principales

#### 1. `feed` (Onglet "Explorer" — Vue par défaut)
- **Rendu dans le DOM :** [`src/App.js:3165-3875`](file:///c:/Users/mateo/Desktop/TROCO/src/App.js#L3165-L3875).
- **Composants Clés :** `FeedView`, `ListingCard` (virtualisé avec `@tanstack/react-virtual`), filtres par catégorie, sélecteur de rayon kilométrique, barre de recherche et commutateur vue carte Leaflet (`MapModal`).
- **Ce qu'il Affiche :** La mosaïque des annonces de troc de biens et compétences disponibles autour de l'utilisateur.
- **Déclenchements au Montage :**
  - Exécution de la requête Firestore sur `listings` ordonnée par `createdAt desc` avec pagination de 20 éléments ([`App.js:1809`](file:///c:/Users/mateo/Desktop/TROCO/src/App.js#L1809)).
  - Demande d'autorisation de géolocalisation HTML5 pour centrer les annonces par proximité.

#### 2. `community` (Onglet "Communauté")
- **Rendu dans le DOM :** [`src/App.js:3877-3911`](file:///c:/Users/mateo/Desktop/TROCO/src/App.js#L3877-L3911).
- **Composants Clés :** `CommunitySection`.
- **Ce qu'il Affiche :** Un canal de discussion collectif et public pour les membres de la communauté Troco (demandes d'aide express, retours d'expérience).
- **Déclenchements au Montage :** Établissement d'une souscription temps réel `onSnapshot` sur la collection `community_messages`.

#### 3. `chat` (Onglet "Messages")
- **Rendu dans le DOM :** [`src/App.js:3913-3976`](file:///c:/Users/mateo/Desktop/TROCO/src/App.js#L3913-L3976).
- **Composants Clés :** `ChatSection` (lazy loaded depuis [`src/features/chat/ChatSection.jsx`](file:///c:/Users/mateo/Desktop/TROCO/src/features/chat/ChatSection.jsx)), `ChatView`, `ChatHeader`, `ChatInputBar`.
- **Ce qu'il Affiche :** Sur desktop : vue scindée (liste des conversations à gauche, fil actif à droite). Sur mobile : vue plein écran avec retour arrière. Intègre les négociations de deals, l'envoi de notes vocales et les boutons d'appel vidéo.
- **Déclenchements au Montage :**
  - Synchronisation de la liste des conversations via `chatsList`.
  - Écoute `onSnapshot` des messages du chat sélectionné ([`useChatManager.js:513`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useChatManager.js#L513)).
  - Marquage de la conversation comme lue (`readChats`).

#### 4. `post` (Onglet "Publier")
- **Rendu dans le DOM :** [`src/App.js:3978-4028`](file:///c:/Users/mateo/Desktop/TROCO/src/App.js#L3978-L4028).
- **Composants Clés :** `PostListingView`.
- **Ce qu'il Affiche :** Formulaire de création ou d'édition d'annonce (titre, catégorie, type de troc, compensation souhaitée, localisation précise, téléversement de photos).
- **Déclenchements au Montage :** Initialisation de la position GPS et calcul du code geohash pour la recherche spatiale.

#### 5. `profile` (Onglet "Mon Profil")
- **Rendu dans le DOM :** [`src/App.js:4030-4073`](file:///c:/Users/mateo/Desktop/TROCO/src/App.js#L4030-L4073).
- **Composants Clés :** `ProfileView`, `ProfileAppearanceCustomizer`.
- **Ce qu'il Affiche :** Identité du membre, badges de confiance, statut KYC, solde du portefeuille (jetons Troco et euros), compétences proposées, matériel partagé, avis reçus, historique de deals réalisés.
- **Déclenchements au Montage :** Synchronisation du document Firestore `users/{uid}` et rafraîchissement du solde dans `useWalletStore`.

#### 6. Vues Légales & Réglementaires
- **`legal-notice`** ([`src/App.js:4075`](file:///c:/Users/mateo/Desktop/TROCO/src/App.js#L4075)) : Affiche `LegalNotice` (Identification de l'éditeur, de l'hébergeur, numéro SIRET, contact légal).
- **`privacy-policy`** ([`src/App.js:4099`](file:///c:/Users/mateo/Desktop/TROCO/src/App.js#L4099)) : Affiche `PrivacyPolicy` (Base légale RGPD, finalités, durées de conservation, droits d'accès et d'effacement).
- **`cookie-policy`** ([`src/App.js:4124`](file:///c:/Users/mateo/Desktop/TROCO/src/App.js#L4124)) : Affiche `CookiePolicy` (Typologie des traceurs essentiels et configuration du consentement).
- **`refund-policy`** ([`src/App.js:4156`](file:///c:/Users/mateo/Desktop/TROCO/src/App.js#L4156)) : Affiche `RefundPolicy` (Droit de rétractation de 14 jours pour les jetons Troco non consommés).

---

## 4. Authentification

### 4.1 Initialisation
- **Fichier Source :** [`src/firebase.js:1-22`](file:///c:/Users/mateo/Desktop/TROCO/src/firebase.js#L1-L22).
- **Instanciation :**
  ```javascript
  const app = initializeApp(firebaseConfig);
  export const auth = getAuth(app);
  ```
- **App Check :** Protégé par reCAPTCHA v3 via `initializeAppCheck(app, { provider: new ReCaptchaV3Provider(siteKey) })` avec jeton de débogage activé en environnement local ([`src/firebase.js:23-40`](file:///c:/Users/mateo/Desktop/TROCO/src/firebase.js#L23-L40)).

### 4.2 Flux de Connexion (AuthScreen)
L'authentification est centralisée dans [`src/features/auth/AuthScreen.jsx:1-1055`](file:///c:/Users/mateo/Desktop/TROCO/src/features/auth/AuthScreen.jsx#L1-L1055) :
1. **Email & Mot de passe traditionnel :**
   - Connexion : `signInWithEmailAndPassword(auth, email, password)` ([`AuthScreen.jsx:14`](file:///c:/Users/mateo/Desktop/TROCO/src/features/auth/AuthScreen.jsx#L14)).
   - Inscription : `createUserWithEmailAndPassword(auth, email, password)` ([`AuthScreen.jsx:15`](file:///c:/Users/mateo/Desktop/TROCO/src/features/auth/AuthScreen.jsx#L15)).
2. **Magic Link sans mot de passe :**
   - Envoi du lien sécurisé par `sendSignInLinkToEmail(auth, email, actionCodeSettings)` ([`AuthScreen.jsx:8`](file:///c:/Users/mateo/Desktop/TROCO/src/features/auth/AuthScreen.jsx#L8)). L'email est stocké temporairement dans `localStorage.getItem('emailForSignIn')`.
   - À l'ouverture de l'application par le lien : `useAppAuth` détecte `isSignInWithEmailLink(auth, window.location.href)` et finalise l'authentification avec `signInWithEmailLink(auth, email, href)` ([`src/hooks/useAppAuth.js:67-80`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useAppAuth.js#L67-L80)).
3. **Numéro de téléphone / SMS OTP :**
   - Vérification de l'humain via `new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' })`.
   - Envoi du SMS avec code à 6 chiffres via `signInWithPhoneNumber(auth, phoneNumber, verifier)` ([`AuthScreen.jsx:75-80`](file:///c:/Users/mateo/Desktop/TROCO/src/features/auth/AuthScreen.jsx#L75-L80)).
   - Repli interactif de test présent si le projet Firebase n'a pas activé la facturation SMS Blaze (`code === 123456`).
4. **OAuth Fournisseurs Tiers :**
   - Google (`GoogleAuthProvider`), Apple (`OAuthProvider`), Facebook (`FacebookAuthProvider`), GitHub (`GithubAuthProvider`) exécutés via popup `signInWithPopup(auth, provider)` ([`AuthScreen.jsx:9-13`](file:///c:/Users/mateo/Desktop/TROCO/src/features/auth/AuthScreen.jsx#L9-L13)).

### 4.3 Source de Vérité & Cycle de Session
- **Écouteur Maître :** `onAuthStateChanged(auth, async (user) => { ... })` dans [`src/hooks/useAppAuth.js:56-156`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useAppAuth.js#L56-L156).
- **Actions Déclenchées à la Détection d'un Utilisateur :**
  1. `useAuthStore.setState({ isAuthenticated: true })` et marquage de session dans `sessionFlags.js`.
  2. Abonnement temps réel au solde du portefeuille via `useWalletStore.getState().subscribeToUserBalance(user.uid)`.
  3. Abonnement temps réel au profil utilisateur privé `doc(db, 'users', user.uid)`.
  4. Détection de bannissement : si `data.isBanned === true`, l'application active `isUserBanned` et affiche le motif de suspension ([`useAppAuth.js:89-95`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useAppAuth.js#L89-L95)).
  5. Initialisation automatique si premier login : création du document avec 12 jetons Troco de bienvenue et profil par défaut ([`useAppAuth.js:121-135`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useAppAuth.js#L121-L135)).

### 4.4 Détermination du Rôle Administrateur
- **Principe de Sécurité Zero-Trust :** Le statut administrateur n'est **JAMAIS** déterminé par un champ modifiable en base (`role: 'admin'`) ni par une vérification d'adresse email (`request.auth.token.email == 'admin@...'`).
- **Source d'Autorité :** Les **Custom Claims cryptographiques Firebase** (`token.claims.admin === true`).
- **Hook Réactif `useAdminGuard` :** ([`src/hooks/useAdminGuard.js:11-89`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useAdminGuard.js#L11-L89))
  - Force l'acquisition des claims les plus récents : `const tokenResult = await user.getIdTokenResult(true);`.
  - Assigne `setIsAdmin(tokenResult.claims?.admin === true);`.
  - Maintient une rotation automatique toutes les 55 minutes pour révoquer l'accès en cas de retrait de privilèges côté serveur.
- **Attribution Serveur :** Exécutable uniquement via la Cloud Function d'administration `setAdminClaim` ([`functions/src/admin/setAdminClaim.ts:31-45`](file:///c:/Users/mateo/Desktop/TROCO/functions/src/admin/setAdminClaim.ts#L31-L45)) via l'Admin SDK `adminAuth.setCustomUserClaims(targetUid, { admin: true })`.

---

## 5. Chat / Messagerie — CARTE COMPLÈTE

### 5.1 Envoi d'un Message

#### Fonction Exacte
- `handleSendMessage` dans [`src/hooks/useChatManager.js:609-681`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useChatManager.js#L609-L681).

#### Collection Firestore Ciblée
- Sous-collection cloisonnée : `chats/{chatId}/messages` ([`useChatManager.js:659`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useChatManager.js#L659)).

#### Champs Écrits dans le Document de Message
```javascript
{
  content: text,                    // string : Corps du message
  text: text,                       // string : Clone pour compatibilité ascendante
  senderUid: uid,                   // string : UID Firebase Auth de l'expéditeur
  senderName: profile?.name,        // string : Nom d'affichage de l'expéditeur
  timestamp: serverTimestamp(),     // Timestamp : Date de référence serveur
  createdAt: serverTimestamp(),     // Timestamp : Date de création
  status: 'sent',                   // string : Statut direct sans blocage
}
```

#### Ordre d'Exécution des Opérations
1. **Contrôles de Garde :** Vérification de l'existence de `selectedChat.id`, de l'authentification `uid` et du contenu `text.trim()`.
2. **Retour Sensoriel Immédiat :**
   - Vibration légère : `hapticLight()`.
   - Son d'envoi : `playPop()`.
   - Vidage instantané du champ de saisie : `setMessageDraft('')` ([`useChatManager.js:647-649`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useChatManager.js#L647-L649)).
3. **Extinction du Typing Indicator :** Enregistrement immédiat dans Firestore de `chats/{chatId}.typing.{[profile.name]}: false` ([`useChatManager.js:653-656`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useChatManager.js#L653-L656)).
4. **Écriture du Message :** `addDoc(collection(db, 'chats', chatId, 'messages'), messagePayload)`.
5. **Mise à Jour du Parent :** Écriture dans `doc(db, 'chats', chatId)` avec `lastMessage: text` et `lastMessageAt: serverTimestamp()` (avec repli `setDoc(..., { merge: true })` en cas d'absence de document parent, [`useChatManager.js:670-679`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useChatManager.js#L670-L679)).

#### Ajout Optimiste Local
- **Messages Texte Standards :** **Non** depuis le correctif `[FIX-CHAT]` (Commit `6fb4666`). Le message est directement persisté dans Firestore, et le listener temps réel `onSnapshot` assure sa matérialisation à l'écran. Cela élimine définitivement les messages fantômes bloqués avec spinner infini.
- **Réessais Manuels (`handleRetryMessage`) :** **Oui** ([`useChatManager.js:688-695`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useChatManager.js#L688-L695)). Le message en échec passe localement au statut `pending` avant confirmation d'envoi.

#### Idempotence
- Garantie par la génération d'un identifiant cryptographique unique de document produit par le SDK Firestore lors de l'appel `addDoc()`.

---

### 5.2 Réception d'un Message

#### Emplacement de la Souscription
- `useEffect` dédié dans [`src/hooks/useChatManager.js:513-581`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useChatManager.js#L513-L581).

#### Nombre de Souscriptions Actives
- **Exactement 1 souscription active par chat sélectionné**. Aucune souscription multiple redondante.

#### Requête Firestore Exécutée
```javascript
const q = query(
  collection(db, 'chats', chatId, 'messages'),
  orderBy('timestamp', 'asc')
);
```
*En cas d'échec de l'index composite timestamp, un repli automatique sans `orderBy` est immédiatement instancié ([`useChatManager.js:568`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useChatManager.js#L568)).*

#### Dépendances du `useEffect`
- `[selectedChat?.id, profile?.name, profile?.uid, auth, db]` ([`useChatManager.js:581`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useChatManager.js#L581)).

#### Nettoyage (Cleanup) au Démontage
- **Oui** systématique :
  ```javascript
  return () => {
    if (typeof unsub === 'function') unsub();
  };
  ```

#### Filtrage du Bon Chat
- Cloisonnement physique strict par le chemin d'accès Firestore `chats/{chatId}/messages`.
- Dans le gestionnaire `handleSnapshot`, l'application calcule dynamiquement l'orientation de la bulle (`isMe`) :
  ```javascript
  const isMe = (myUid && data.senderUid && String(data.senderUid) === String(myUid)) ||
    (data.senderName && profile?.name && data.senderName.trim().toLowerCase() === profile.name.trim().toLowerCase()) ||
    data.sender === 'me';
  ```
- Les messages sont ensuite injectés dans l'état local `chatThreads` et persistés dans `useChatStore` ([`useChatManager.js:536-544`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useChatManager.js#L536-L544)).

---

### 5.3 Structure Firestore

#### Chemin : `chats/{chatId}/messages/{msgId}`
| Champ | Type | Obligatoire | Description / Rôle |
| :--- | :--- | :---: | :--- |
| `id` | `string` | Oui | Identifiant unique généré par Firestore lors du `addDoc` |
| `content` | `string` | Oui | Texte brut du message ou résumé de l'action |
| `text` | `string` | Oui | Copie du contenu textuel (rétrocompatibilité UI) |
| `senderUid` | `string` | Oui | Identifiant Firebase Auth (`request.auth.uid`) de l'émetteur |
| `senderName`| `string` | Oui | Nom d'affichage de l'émetteur au moment de l'envoi |
| `sender` | `string` | Oui | `'me'` \| `'them'` \| `'system'` (calculé pour le style visuel) |
| `timestamp` | `Timestamp` | Oui | Horodatage serveur Firestore (`serverTimestamp()`) |
| `createdAt` | `Timestamp` | Oui | Date de création du document |
| `status` | `string` | Oui | Statut du message : `'pending'`, `'sent'`, `'delivered'`, `'read'`, `'error'` |
| `read` | `boolean` | Oui | Indicateur de lecture (`false` initialement) |
| `kind` | `string` | Non | `'call-log'`, `'voice'`, `'deal-proposal'`, `'reward-proposal'`, `'system'` |
| `audioUrl` | `string` | Non | URL Cloud Storage si note vocale jointe |
| `duration` | `number` | Non | Durée en secondes (note vocale ou durée d'appel) |
| `mimeType` | `string` | Non | Format du conteneur audio (ex: `audio/mp4`, `audio/webm`) |
| `transcription` | `string` | Non | Texte transcrit par Speech-to-Text |
| `transcriptLang` | `string` | Non | Code langue de transcription (ex: `FR`, `EN`) |
| `dealId` | `string` | Non | Identifiant unique du deal négocié |
| `terms` | `string` | Non | Description des modalités du deal |
| `amount` | `number` | Non | Montant financier ou nombre de jetons associés |
| `currency` | `string` | Non | `'tokens'` \| `'EUR'` |
| `translations` | `map` | Non | Dictionnaire de traductions automatiques (ex: `{ EN: '...', ES: '...' }`) |

#### Algorithme de Génération de `chatId`
- Implémenté dans `buildConversationId` ([`src/hooks/useChatManager.js:875-894`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useChatManager.js#L875-L894)) :
  ```javascript
  const buildConversationId = (listingId, userA, userB, uidA = null, uidB = null) => {
    if (uidA && uidB) {
      const sortedUids = [String(uidA).trim(), String(uidB).trim()].sort().join('_');
      const cleanListingId = listingId ? `_${String(listingId).trim()}` : '';
      return `chat_${sortedUids}${cleanListingId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    }
    // Repli de secours si UIDs indisponibles
    const uA = String(userA || '').trim().toLowerCase();
    const uB = String(userB || '').trim().toLowerCase();
    const pair = [uA, uB].sort().join('_');
    const cleanListingId = listingId ? `_${String(listingId).trim()}` : '';
    return `chat_${pair}${cleanListingId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  };
  ```
- **Propriété Mathématique :** L'opération `.sort()` garantit la commutativité : `buildConversationId(listing, userA, userB) === buildConversationId(listing, userB, userA)`.

#### Structure du Document Parent `chats/{chatId}`
| Champ | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Identifiant déterministe identique au nom de document |
| `user` | `string` | Nom de l'interlocuteur d'échange |
| `authorUid` | `string` | UID de l'auteur créateur de l'annonce ou de la discussion |
| `partnerUid` | `string` | UID de la contrepartie dans la conversation |
| `listing` | `string` | Titre de l'annonce faisant l'objet du troc |
| `lastMessage` | `string` | Extrait textuel du dernier message envoyé |
| `lastMessageAt` | `Timestamp` | Horodatage du dernier message |
| `status` | `string` | État textuel (ex: `'Nouvelle discussion'`, `'Deal en cours'`, `'Deal validé'`) |
| `terms` | `string` | Conditions actuelles du deal |
| `participants` | `array<string>` | Liste des identifiants et noms des participants |
| `participantUids` | `array<string>` | Liste stricte des UIDs Firebase Auth |
| `typing` | `map<string, boolean>` | Présence de frappe en direct (ex: `{ "Mateo": true }`) |
| `activeCall` | `map \| null` | Session d'appel en cours (`chatId`, `host`, `type`, `isLive`, `startedAt`) |
| `isGroup` | `boolean` | Indicateur si salon de projet collectif |
| `rewardPool` | `number` | Cagnotte de jetons allouée au projet collaboratif |
| `updatedAt` | `Timestamp` | Date de dernière modification |

---

### 5.4 Composants UI du Chat

#### `ChatSection` ([`src/features/chat/ChatSection.jsx`](file:///c:/Users/mateo/Desktop/TROCO/src/features/chat/ChatSection.jsx))
- **Rôle :** Conteneur racine de l'onglet messagerie. Enveloppe la vue dans un conteneur gestuel `PullToRefresh` pour rafraîchir manuellement les discussions via l'événement `troco:refetch_chats`. Applique les transitions animées de page Framer Motion.

#### `ChatView` ([`src/components/ChatView.jsx`](file:///c:/Users/mateo/Desktop/TROCO/src/components/ChatView.jsx))
- **Rôle :** Vue monolithique du chat (3 961 lignes).
- **Fonctionnalités Intégrées :**
  - Moteur de négociation de deals bilatéraux avec boutons "Proposer un deal", "Accepter" (`1/2` puis `2/2`), "Refuser".
  - Modale d'évaluation post-troc (`DealRatingModal`) avec étoiles de notation et attribution de points de karma.
  - Sélecteur d'outils bureautiques collaboratifs (TrocoDocs, Whiteboard vectoriel partagé).
  - Transfert direct de jetons avec animation d'envoi.
  - Défilement automatique vers le bas lors de l'arrivée de nouveaux messages.

#### `ChatInputBar` ([`src/components/chat/ChatInputBar.jsx`](file:///c:/Users/mateo/Desktop/TROCO/src/components/chat/ChatInputBar.jsx))
- **Rôle :** Barre de saisie isolée et mémoïsée pour garantir des performances de frappe $O(1)$ sans recalculer le fil des messages.
- **Mécanisme Anti-Double-Envoi :**
  Dans `handleSubmit` ([`ChatInputBar.jsx:209-236`](file:///c:/Users/mateo/Desktop/TROCO/src/components/chat/ChatInputBar.jsx#L209-L236)) :
  ```javascript
  const handleSubmit = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = localText.trim();
    if (!trimmed) return;

    // 1. Vidage immédiat de l'input local pour verrouiller la saisie
    setLocalText('');

    // 2. Transmission au gestionnaire
    if (typeof handleSendMessage === 'function') {
      handleSendMessage(trimmed);
    }

    // 3. Annulation de l'indicateur de frappe
    if (onTypingChange) onTypingChange('');
  }, [localText, handleSendMessage, onTypingChange]);
  ```

#### Affichage et Disparition du Spinner "Pending"
- Dans `renderMessageStatus` ([`src/components/ChatView.jsx:916-933`](file:///c:/Users/mateo/Desktop/TROCO/src/components/ChatView.jsx#L916-L933)) :
  ```jsx
  if (msg.status === 'pending') {
    return (
      <span title="Envoi en cours...">
        <Clock size={11} style={{ animation: 'spin 2s linear infinite' }} />
      </span>
    );
  }
  ```
- Dès que Firestore notifie l'enregistrement officiel via `onSnapshot`, le message arrive avec `status: 'sent'`. L'horloge animée disparaît instantanément au profit de l'icône de confirmation de transmission `<Check size={12} />`.

---

### 5.5 Points Sensibles & Vulnérabilités Connues
1. **Règles Firestore Permissives Actuelles :** Depuis le correctif `[FIX-CHAT]`, `chats/{chatId}` autorise `read, write: if request.auth != null;`. Tout utilisateur connecté peut techniquement lire ou écrire dans n'importe quel chat. La fonction de migration `migrateChatParticipants` prépare la fermeture sécurisée aux seuls membres présents dans `participantUids`.
2. **Double Écriture Document Parent :** `handleSendMessage` effectue deux écritures Firestore consécutives : `addDoc` sur `messages`, puis `updateDoc` sur le document parent `chats/{chatId}`. Si la seconde écriture échoue en raison du réseau, le message est envoyé mais le résumé `lastMessage` de la conversation n'est pas mis à jour dans la liste latérale.
3. **Index Firestore Composite pour `timestamp` :** Si la base de données Firestore ne dispose pas de l'index ascendant sur `timestamp`, la requête avec `orderBy` échoue. Le code implémente un mécanisme de repli automatique sans tri ([`useChatManager.js:568`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useChatManager.js#L568)), mais l'ordre des messages dépend alors de l'ordre d'insertion des documents.

---

## 6. Appels WebRTC — CARTE COMPLÈTE

### 6.1 Lancer un Appel

#### Fonction Exacte
- `startCall` dans [`src/hooks/useWebRTC.js:510-611`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useWebRTC.js#L510-L611).

#### Collection de Signalisation
- Document unique : `calls/{callId}` ([`useWebRTC.js:579`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useWebRTC.js#L579)).

#### Résolution de `calleeUid` (Destinataire)
```javascript
let calleeUid = selectedChat?.partnerUid || selectedChat?.calleeUid || selectedChat?.uid || selectedChat?.authorUid || selectedChat?.userId || selectedChat?.userUid || null;
if (!calleeUid && Array.isArray(selectedChat?.participantUids)) {
  calleeUid = selectedChat.participantUids.find(u => u && u !== myUid);
}
if (!calleeUid && Array.isArray(selectedChat?.participants)) {
  calleeUid = selectedChat.participants.find(u => u && u !== myUid && u !== profileName);
}
if (!calleeUid) {
  calleeUid = selectedChat?.user || selectedChat?.name || selectedChat?.id || 'callee';
}
```

#### Calcul Déterministe de `callId`
```javascript
const callId = (myUid && calleeUid) ? [myUid, calleeUid].sort().join('_') : String(selectedChat?.id || 'call');
```

#### Champs Écrits dans `calls/{callId}`
```javascript
{
  callId: callId,
  callerUid: myUid,
  calleeUid: calleeUid,
  participants: [myUid, calleeUid],
  targetParticipants: [calleeUid, myUid, partnerName, profileName],
  status: 'ringing',
  createdAt: serverTimestamp(),
  startedAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  type: type || 'video',             // 'video' | 'audio'
  from: profileName,
  fromUid: myUid,
  to: partnerName,
  toUid: calleeUid,
  offer: { type: offer.type, sdp: offer.sdp },
  isScreenSharing: false,
}
```

#### Mise à Jour de la Conversation
- Si `selectedChat.id` existe, mise à jour dans `chats/{chatId}` de l'objet `activeCall` ([`useWebRTC.js:600-609`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useWebRTC.js#L600-L609)) pour afficher l'indicateur "Appel en direct" aux membres du chat.

---

### 6.2 Recevoir un Appel

#### Souscription Entrante
- `useEffect` dans [`src/hooks/useWebRTC.js:810-880`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useWebRTC.js#L810-L880).

#### Requête Firestore Ciblée
```javascript
const q = query(
  collection(db, 'calls'),
  where('calleeUid', '==', myUid),
  where('status', '==', 'ringing')
);
```
- **Propriété de Performance :** Utilise exclusivement des filtres d'égalité stricts. Cette requête ne requiert aucun index Firestore composite, garantissant une interception en moins de 100 ms sur tous les réseaux.
- **Exclusion du Caller :** Le filtre `calleeUid == myUid` exclut par définition l'initiateur (`callerUid`).

#### Actions Déclenchées à l'Interception
1. Dès l'événement `change.type === 'added'` :
   - Mise à jour de l'état : `setIncomingCall({ id: change.doc.id, ...change.doc.data() })`.
   - Démarrage de la sonnerie audio : `playRingtone()`.
   - Déclenchement du vibreur matériel : `if (navigator.vibrate) navigator.vibrate([400, 150, 400, 150, 400])`.
   - Marquage de distribution dans Firestore : mise à jour de `deliveredAt: serverTimestamp()` et `calleeDelivered: true` sur `calls/{callId}`.
2. Si le document change vers un statut autre que `'ringing'` (`'connected'`, `'ended'`, `'declined'`, `'canceled'`) ou est supprimé :
   - Arrêt immédiat de la sonnerie : `stopRingtone()`.
   - Fermeture de l'overlay : `setIncomingCall(null)`.

---

### 6.3 Échange de Signalisation (SDP & Candidats ICE)

#### Configuration STUN
Définie dans [`src/hooks/useWebRTC.js:21-34`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useWebRTC.js#L21-L34) :
```javascript
const ICE_CONFIG = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun3.l.google.com:19302',
        'stun:stun4.l.google.com:19302',
      ],
    },
  ],
  iceCandidatePoolSize: 10,
};
```

#### Stockage des Candidats ICE
- Candidats générés par l'Appelant (Caller) : écrits via `addDoc()` dans `calls/{callId}/callerCandidates` ([`useWebRTC.js:463`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useWebRTC.js#L463)).
- Candidats générés par l'Appelé (Callee) : écrits via `addDoc()` dans `calls/{callId}/calleeCandidates` ([`useWebRTC.js:467`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useWebRTC.js#L467)).

#### Buffer d'Attente ICE (Trickle ICE)
- Si des candidats ICE distants sont reçus avant que la session SDP (`pc.remoteDescription`) ne soit finalisée, ils sont conservés dans `pendingCandidatesRef.current`.
- Dès résolution de la réponse SDP, la fonction `flushPendingCandidates()` ([`useWebRTC.js:397-407`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useWebRTC.js#L397-L407)) injecte séquentiellement tous les candidats en attente dans `RTCPeerConnection.addIceCandidate()`.

---

### 6.4 Fin d'Appel & Raccrochage

#### Fonction Exacte
- `endCall` dans [`src/hooks/useWebRTC.js:682-759`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useWebRTC.js#L682-L759).

#### Valeurs Possibles du Champ `status`
- `'ringing'` : Appel en cours d'acheminement / sonnerie.
- `'connected'` : Flux audio/vidéo P2P établi.
- `'ended'` : Appel terminé normalement par l'un des participants.
- `'declined'` : Appel rejeté explicitement par l'interlocuteur.
- `'canceled'` : Appel interrompu par l'appelant avant décrochage.

#### Protocole de Clôture
1. **Arrêt Matériel des Médias :**
   ```javascript
   localStreamRef.current.getTracks().forEach(track => track.stop());
   ```
2. **Suppression de la Session Firestore :**
   - Mise à jour de `chats/{chatId}` : `activeCall: null, isLive: false, endedAt: serverTimestamp()`.
   - Destruction du document de signalisation : `deleteDoc(doc(db, 'calls', String(chatId)))`.
3. **Création du Journal d'Appel (`call-log`) :**
   - **Si l'appel était connecté :** Création d'un message système dans le chat indiquant l'heure et la durée formatée : `📞 Appel vidéo terminé • 14:32 • Durée : 04:15` ([`useWebRTC.js:714-727`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useWebRTC.js#L714-L727)).
   - **Si l'appel est resté sans réponse :** **Garde Stricte Anti-Ghost (HOTFIX-05)** ([`useWebRTC.js:735-752`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useWebRTC.js#L735-L752)). Le message `📵 Appel sans réponse` n'est créé **QUE SI** deux conditions cumulatives sont réunies :
     1. L'appel a été effectivement distribué sur l'appareil distant (`wasDelivered === true`).
     2. L'appel a sonné pendant une durée supérieure ou égale à 6 secondes (`callDurationBeforeEnd >= 6000`).
     *Si l'utilisateur raccroche au bout de 2 secondes, aucun log parasite d'appel manqué n'est créé.*

---

### 6.5 Composants UI Dédiés

#### `WebRTCCallOverlay` ([`src/features/call/WebRTCCallOverlay.jsx`](file:///c:/Users/mateo/Desktop/TROCO/src/features/call/WebRTCCallOverlay.jsx))
- **Emplacement de Rendu :** Rendu **AU NIVEAU RACINE** de l'application dans [`src/App.js:4416-4451`](file:///c:/Users/mateo/Desktop/TROCO/src/App.js#L4416-L4451) sous `<Suspense fallback={null}>`.
- **Isolation :** **Il n'est rendu ni dans une route spécifique, ni dans le composant Chat.** Cela garantit que quelle que soit la page affichée (Profil, Feed, Mentions Légales, Workspace), un appel entrant sonne et déclenche la modale au premier plan.
- **Fonctionnalités :**
  - Écran de sonnerie entrante (Avatar pulsant, boutons Répondre/Refuser).
  - Écran d'appel actif plein écran avec bascule caméra avant/arrière (`switchCamera`), coupure micro/caméra, partage d'écran (`toggleScreenShare`), bouton PIP et chronomètre de durée.

#### `CallFeature` (PIP — Picture-in-Picture) ([`src/features/call/CallFeature.jsx`](file:///c:/Users/mateo/Desktop/TROCO/src/features/call/CallFeature.jsx))
- **Rôle :** Bulle vidéo flottante miniature déplaçable sur l'écran par pointer events natifs.
- **Sécurité :** Encapsulé dans un `SectoralErrorBoundary` ([`CallFeature.jsx:31`](file:///c:/Users/mateo/Desktop/TROCO/src/features/call/CallFeature.jsx#L31)) pour éviter qu'une défaillance d'incrustation vidéo ne fasse crasher le reste de l'application.

#### `WebRTCContext` ([`src/contexts/WebRTCContext.jsx`](file:///c:/Users/mateo/Desktop/TROCO/src/contexts/WebRTCContext.jsx))
- Déclaré pour encapsuler `useWebRTC`. *Remarque : `App.js` instancie le hook directement à la ligne 1353 et propage les callbacks aux composants.*

---

### 6.6 Points Sensibles & Vulnérabilités WebRTC
1. **Absence de Serveur TURN :** La configuration actuelle n'inclut que des serveurs STUN Google publics. Si deux utilisateurs sont tous deux situés derrière des routeurs d'entreprise stricts avec NAT symétrique (Symmetric NAT) ou des pare-feux 4G/5G stricts, la traversée P2P directe peut échouer sans serveur de relais TURN (Coturn / Twilio / Xirsys).
2. **Politiques Autoplay Navigateur :** Sur Safari iOS et Chrome Android, le décodage d'un flux audio distant requiert une interaction utilisateur préalable sur la page. Si l'utilisateur clique sur "Répondre", le contexte audio est automatiquement déverrouillé, mais une sonnerie automatique peut être atténuée par l'OS si l'application est en arrière-plan.

---

## 7. Notifications

### 7.1 Typologie des Notifications Internes
| Type (`type`) | Émetteur | Déclencheur | Impact Côté Destinataire |
| :--- | :--- | :--- | :--- |
| **`payment_received`** | Client / Cloud Function | Règlement financier ou libération de séquestre escrow ([`useChatManager.js:1463`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useChatManager.js#L1463)) | Modale fintech de célébration avec animation de crédit et son Apple Pay |
| **`tokens_received`** | Client / Cloud Function | Transfert direct de jetons Troco entre membres ([`useChatManager.js:1960`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useChatManager.js#L1960), [`2107`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useChatManager.js#L2107)) | Modale de crédit de jetons avec vibration haptique |
| **`call-log`** / **`missed`**| Client (`useWebRTC`) | Appel terminé ou appel manqué $\ge 6$s ([`useWebRTC.js:737`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useWebRTC.js#L737)) | Message d'information système dans le fil de discussion |

### 7.2 Emplacement & Structure Firestore
- **Chemin :** Sous-collection `users/{recipientUid}/notifications/{notifId}`.
- **Champs Standards :**
  ```javascript
  {
    type: 'payment_received' | 'tokens_received',
    amount: number,                 // Quantité transférée
    currency: 'tokens' | 'EUR',     // Unité financière
    from: string,                   // UID de l'émetteur
    fromName: string,               // Nom d'affichage de l'émetteur
    comment: string,                // Message d'accompagnement optionnel
    read: false,                    // Booléen d'acquittement
    timestamp: serverTimestamp(),   // Date d'émission
  }
  ```

### 7.3 Écoute Temps Réel Côté Client
- **Initialisation :** `useEffect` global dans [`src/App.js:468-504`](file:///c:/Users/mateo/Desktop/TROCO/src/App.js#L468-L504).
- **Requête :**
  ```javascript
  const notifsCol = collection(db, 'users', currentUid, 'notifications');
  const qNotifs = query(notifsCol, where('read', '==', false));
  ```
- **Comportement Réactif :** Tout nouveau document intercepté (`change.type === 'added'` ou `'modified'`) déclenche l'ouverture automatique de la modale de confirmation fintech `<TransactionSuccessModal>` ([`App.js:485-492`](file:///c:/Users/mateo/Desktop/TROCO/src/App.js#L485-L492)).

### 7.4 Acquittement & Clôture
- Lorsque l'utilisateur clique sur le bouton de fermeture de la modale (`handleCloseTransactionSuccessModal`, [`App.js:450-465`](file:///c:/Users/mateo/Desktop/TROCO/src/App.js#L450-L465)) :
  ```javascript
  const notifRef = doc(db, 'users', currentUid, 'notifications', notifId);
  await updateDoc(notifRef, {
    read: true,
    readAt: serverTimestamp(),
  });
  ```
- Dès la mise à jour de `read: true`, la notification quitte immédiatement la requête `where('read', '==', false)` et ne s'affiche plus.

---

## 8. Paiements & Transactions

### 8.1 Cloud Functions Dédiées
1. **`applyPayment`** ([`functions/src/payments/applyPayment.ts`](file:///c:/Users/mateo/Desktop/TROCO/functions/src/payments/applyPayment.ts)) : Validation côté serveur d'un achat de jetons ou d'un rechargement euro.
2. **`transferAtomically`** ([`functions/src/payments/transferAtomically.ts`](file:///c:/Users/mateo/Desktop/TROCO/functions/src/payments/transferAtomically.ts)) : Moteur de virement atomique de solde entre utilisateurs.
3. **`claimBonus`** ([`functions/src/payments/claimBonus.ts`](file:///c:/Users/mateo/Desktop/TROCO/functions/src/payments/claimBonus.ts)) : Réclamation sécurisée de jetons promotionnels de parrainage.
4. **`cleanupIdempotency`** ([`functions/src/payments/cleanupIdempotency.ts`](file:///c:/Users/mateo/Desktop/TROCO/functions/src/payments/cleanupIdempotency.ts)) : Cron horaire purgeant les jetons d'idempotence expirés.

### 8.2 Flux : Acheteur $\rightarrow$ Séquestre (Escrow) $\rightarrow$ Vendeur
1. **Proposition de Deal :** Dans le chat, l'une des parties clique sur "Proposer un deal" (`handleCounterOfferSubmit`, [`useChatManager.js:1155`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useChatManager.js#L1155)). Elle spécifie les compétences échangées et une éventuelle compensation en jetons ou euros.
2. **Signature Bilatérale (1/2 puis 2/2) :**
   - Partie A clique sur "Accepter" : le message affiche `Statut : 1/2 (En attente de confirmation)`.
   - Partie B clique sur "Accepter" : le deal passe à `Statut : 2/2 (Deal validé)`.
3. **Séquestre Contractuel :** Les jetons convenus sont réservés dans le contrat de deal.
4. **Libération (Settlement) :**
   - Une fois la prestation exécutée ou le bien remis, l'acheteur valide l'achèvement (`handleConfirmTrocCompletion` / `handleReleaseEscrow`, [`useChatManager.js:1552`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useChatManager.js#L1552)).
   - La transaction atomique Firestore décrémente l'acheteur, crédite le vendeur, enregistre la transaction et génère la notification de crédit.

### 8.3 Verrou d'Idempotence
- Géré par `checkIdempotency<T>(paymentIntentId, db)` ([`functions/src/payments/idempotency.ts:15-45`](file:///c:/Users/mateo/Desktop/TROCO/functions/src/payments/idempotency.ts#L15-L45)).
- Chaque requête de paiement enregistre son identifiant dans la collection `idempotency_keys/{key}` avec une durée de validité de 24 heures. Toute tentative de rejeu (réseau instable, double clic) retourne immédiatement le résultat en cache sans réexécuter de débit ni de crédit.

### 8.4 Intégrité Financière & Champs Protégés
Dans [`firestore.rules:69-87`](file:///c:/Users/mateo/Desktop/TROCO/firestore.rules#L69-L87) :
- Les clients Web ont une interdiction formelle de modifier :
  `euroBalance`, `trocoTokens`, `dealsCompleted`, `kycVerified`, `isBanned`, `isShadowBanned`, `role`, `subscriptionPlan`, `cguAcceptedAt`.
- L'écriture dans `transactions/{txId}` est formellement interdite à tout client (`allow write: if false;`, ligne 161). Seul l'Admin SDK serveur des Cloud Functions peut créer ou modifier des écritures comptables.

### 8.5 Statut de la Passerelle Bancaire Stripe
- **Fournisseur Actif :** `mockProvider.ts` ([`functions/src/payments/providers/mockProvider.ts`](file:///c:/Users/mateo/Desktop/TROCO/functions/src/payments/providers/mockProvider.ts)). Il simule un débit bancaire et valide les paiements de test.
- **Fournisseur Stripe Réel :** L'architecture est prête dans `functions/src/payments/providers/index.ts:16`, mais aucune clé de production `STRIPE_SECRET_KEY` n'est activée dans l'environnement actuel.

---

## 9. Firestore Rules — Inventaire

Basé sur l'inspection exhaustive de [`firestore.rules:1-204`](file:///c:/Users/mateo/Desktop/TROCO/firestore.rules#L1-L204) :

| Collection Ciblée | Règles de Lecture (`allow read`) | Règles d'Écriture (`allow write`) | Analyse de Sécurité & Statut |
| :--- | :--- | :--- | :--- |
| **`/{document=**}`** | `false` | `false` | **Zero-Trust Deny All** par défaut. Tout ce qui n'est pas explicité est interdit (Lignes 62-64). |
| **`users/{uid}`** | Propriétaire (`isOwner(uid)`) ou Admin (`isAdmin()`) | Création/Mise à jour par propriétaire non banni. **Blocage strict** d'altération des champs financiers et administratifs (Lignes 69-87). Suppression interdite. | Robuste & Conforme Fintech ISO 27001. |
| **`users/{uid}/notifications/{notifId}`** | Propriétaire (`isOwner(uid)`) | Interdit à tous les clients (`allow write: if false;`, Ligne 95). Écriture exclusive Admin SDK serveur. | Robuste. |
| **`users_public/{uid}`** | Tout utilisateur connecté (`isAuthenticated()`) | Interdit à tous les clients (`allow write: if false;`, Ligne 106). Synchronisé par trigger Cloud Function. | Robuste & Conforme RGPD (Minimisation). |
| **`listings/{listingId}`** | Public si annonce active (`resource.data.status == 'active'`), ou créateur, ou Admin | Création si utilisateur authentifié non banni s'assignant comme auteur ; Mise à jour protégée contre l'altération de `isBoosted` et `isHidden` ; Suppression par auteur ou Admin. | Robuste. |
| **`chats/{chatId}`** | Tout utilisateur connecté (`request.auth != null`) | Tout utilisateur connecté (`request.auth != null`) (Lignes 140-145). | ⚠️ **Règle permissive** (assouplie lors de FIX-CHAT pour débloquer les échanges). |
| **`chats/{chatId}/messages/{msgId}`** | Tout utilisateur connecté (`request.auth != null`) | Tout utilisateur connecté (`request.auth != null`) (Lignes 142-144). | ⚠️ **Règle permissive** (assouplie lors de FIX-CHAT). |
| **`transactions/{txId}`** | Parties prenantes de la transaction (`userId`, `partnerUid`, `buyerUid`, `sellerUid`) ou Admin | Interdit à tous les clients (`allow write: if false;`, Ligne 161). Écriture exclusive Cloud Functions Admin SDK. | Robuste & Conforme Audit bancaire. |
| **`reports/{reportId}`** | Administrateurs uniquement (`isAdmin()`, Ligne 169) | Création par utilisateur authentifié non banni s'assignant comme reporter ; Traitement et suppression réservés aux Administrateurs. | Robuste (Protection des lanceurs d'alerte). |
| **`campaigns/{campaignId}`** | Utilisateurs connectés si campagne active | Administrateurs uniquement (`isAdmin()`, Ligne 187). | Robuste. |
| **`calls/{callId}`** | Tout utilisateur connecté (`request.auth != null`) | Tout utilisateur connecté (`request.auth != null`) (Lignes 193-201). | ⚠️ **Règle permissive** (assouplie lors de FIX-CALL pour garantir le signaling). |
| **`calls/{callId}/signals/{signalId}`** | Tout utilisateur connecté (`request.auth != null`) | Tout utilisateur connecté (`request.auth != null`). | ⚠️ **Règle permissive**. |
| **`calls/{callId}/{subcollection}/{candidateId}`** | Tout utilisateur connecté (`request.auth != null`) | Tout utilisateur connecté (`request.auth != null`). | ⚠️ **Règle permissive** (candidats ICE). |

### ⚠️ Collections Utilisées par le Code mais Absentes des Rules
Les collections suivantes sont interrogées ou écrites par le code frontend mais ne disposent d'aucun bloc `match` dans `firestore.rules`. En conséquence, le verrou par défaut `match /{document=**} { allow read, write: if false; }` **bloque tout accès client** à ces collections en production :
1. **`presence`** : Utilisé dans [`src/hooks/useChatManager.js:111-184`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useChatManager.js#L111-L184) pour diffuser l'état de présence en ligne des utilisateurs (heartbeat toutes les 12 secondes).
2. **`community_messages`** : Utilisé dans `CommunitySection` pour les discussions publiques de l'onglet Communauté.
3. **`whiteboard_rooms`** & **`project_whiteboards`** : Utilisés dans `CollaborativeWhiteboardModal.jsx` pour la synchronisation vectorielle multi-utilisateurs.
4. **`workspaces`** & **`project_shared_notes`** : Utilisés dans `TrocoDocs.jsx` pour la suite bureautique partagée.
5. **`global_chat`** : Utilisé dans `GlobalLiveChat.jsx`.

---

## 10. Cloud Functions — Inventaire

Inventaire complet basé sur [`functions/src/index.ts:1-177`](file:///c:/Users/mateo/Desktop/TROCO/functions/src/index.ts#L1-L177) :

| N° | Nom Exporté | Type de Trigger | Fichier Source du Handler | Rôle Métier | Données Retournées | Touche Chat / Call / Pay ? |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **1** | `setAdminClaim` | `onCall({ cors: true })` | `admin/setAdminClaim.ts` | Définition ou révocation des Custom Claims Admin signés | `{ success: boolean, targetUid: string, isAdmin: boolean }` | Non |
| **2** | `deleteListingAsAdmin` | `onCall({ cors: true })` | `admin/deleteListingAsAdmin.ts` | Suppression administrative d'une annonce avec trace d'audit | `{ success: boolean, listingId: string }` | Non |
| **3** | `resetUserSafely` | `onCall({ cors: true })` | `admin/resetUserSafely.ts` | Réinitialisation de compte avec conservation du solde par défaut | `{ success: boolean, keptEuro: number, keptTokens: number }` | **Oui** (Portefeuille) |
| **4** | `resolveReport` | `onCall({ cors: true })` | `admin/resolveReport.ts` | Traitement, résolution ou rejet d'un signalement d'abus | `{ success: boolean, reportId: string, status: string }` | Non |
| **5** | `toggleHideListingAsAdmin`| `onCall({ cors: true })` | `admin/toggleHideListingAsAdmin.ts` | Masquage / démasquage modérateur d'une annonce dans le feed | `{ success: boolean, listingId: string, isHidden: boolean }` | Non |
| **6** | `updateUserAsAdmin` | `onCall({ cors: true })` | `admin/updateUserAsAdmin.ts` | Édition sécurisée des attributs d'un profil par un modérateur | `{ success: boolean, updatedFields: string[] }` | Non |
| **7** | `onUserWriteSyncPublic` | `onDocumentWritten('users/{uid}')` | `users/onUserWriteSyncPublic.ts` | Duplication automatique des données publiques vers `users_public` | `Promise<void>` | Non |
| **8** | `migrateUsersPublic` | `onCall({ cors: true })` | `users/migrateUsersPublic.ts` | Rattrapage et backfill massif des profils vers `users_public` | `{ success: boolean, migratedCount: number, errors: any[] }` | Non |
| **9** | `applyPayment` | `onCall({ cors: true })` | `payments/applyPayment.ts` | Validation d'achat de jetons / solde avec contrôle d'idempotence | `ApplyPaymentResponse` (nouveaux soldes, transactionId) | **Oui** (Paiement) |
| **10**| `claimBonus` | `onCall({ cors: true })` | `payments/claimBonus.ts` | Attribution unique de bonus de campagne partenaire | `{ success: boolean, rewardAmount: number, transactionId: string }` | **Oui** (Paiement) |
| **11**| `transferAtomically` | `onCall({ cors: true })` | `payments/transferAtomically.ts` | Virement atomique de solde de compte à compte | `TransferAtomicallyResponse` (soldes émetteur et récepteur) | **Oui** (Paiement / Chat) |
| **12**| `cleanupIdempotency` | `onSchedule('every 1 hours')` | `payments/cleanupIdempotency.ts` | Purge horaire des jetons d'idempotence de plus de 24h | `Promise<void>` | **Oui** (Paiement) |
| **13**| `deleteUserCompletely` | `onCall({ cors: true })` | `gdpr/deleteUserCompletely.ts` | Suppression de compte RGPD art. 17 (délai 30j ou immédiate) | `{ success: boolean, scheduledAt?: string, immediate?: boolean }` | Non |
| **14**| `restoreAccount` | `onCall({ cors: true })` | `gdpr/restoreAccount.ts` | Rétractation de suppression de compte pendant le délai de 30j | `{ success: boolean, restoredAt: string }` | Non |
| **15**| `scheduledDeletion` | `onSchedule('every day 03:00')` | `gdpr/scheduledDeletion.ts` | Purge quotidienne définitive des comptes dont les 30j sont révolus | `Promise<void>` | Non |
| **16**| `checkRateLimit` | `onCall({ cors: true })` | `security/checkRateLimit.ts` | Contrôle serveur de limitation de débit par IP ou UID | `{ allowed: boolean, remaining: number, resetTime: number }` | Non |
| **17**| `cleanupRateLimits` | `onSchedule('every 1 hours')` | `security/cleanupRateLimits.ts` | Purge horaire des compteurs de rate limit expirés | `Promise<void>` | Non |
| **18**| `migrateChatParticipants`| `onCall({ cors: true })` | `migration/migrateChatParticipants.ts`| Migration des participants de chats (noms vers Firebase UIDs) | `MigrationReport` (chats analysés, migrés, orphelins) | **Oui** (Chat) |

---

## 11. État global (Zustand + Contexts)

### 11.1 Stores Zustand (`src/stores/`)

#### 1. `useAuthStore` ([`src/stores/useAuthStore.js`](file:///c:/Users/mateo/Desktop/TROCO/src/stores/useAuthStore.js))
- **État Managé :** `profile`, `profileDraft`, `isEditingProfile`, `isAuthenticated`, `saveMessage`, `skills`, `equipments`, `portfolioImages`, `socialLinks`.
- **Persistance :** Non persisté dans le localStorage (la session est garantie par Firebase Auth pour éviter les sessions fantômes, résolu dans `P0-SEC-05`).
- **Actions Clés :** `setProfile`, `setProfileDraft`, `setIsEditingProfile`, `addSkill`, `removeSkill`, `resetToDefault`.

#### 2. `useChatStore` ([`src/stores/useChatStore.js`](file:///c:/Users/mateo/Desktop/TROCO/src/stores/useChatStore.js))
- **État Managé :** `chatsList` (liste des conversations), `chatThreads` (dictionnaire `{ [chatId]: Message[] }`).
- **Persistance :** Persisté dans `localStorage` sous la clé `troco_chat_store` avec `createJSONStorage`.
- **Actions Clés :** `setChatsList`, `setChatThreads`, `updateChatThread`, `replaceTempId(chatId, tempId, finalId)` (déduplication essentielle des messages envoyés).

#### 3. `useFeedStore` ([`src/stores/useFeedStore.js`](file:///c:/Users/mateo/Desktop/TROCO/src/stores/useFeedStore.js))
- **État Managé :** `listings`, `lastVisibleDoc`, `hasMore`, `categoryFilter`, `radiusKm`, `searchQuery`, `sortBy`.
- **Actions Clés :** `setListings`, `appendListings`, `setCategoryFilter`, `setRadiusKm`, `setSearchQuery`.

#### 4. `useUIStore` ([`src/stores/useUIStore.js`](file:///c:/Users/mateo/Desktop/TROCO/src/stores/useUIStore.js))
- **État Managé :** Visibilité de l'ensemble des modales de l'application : `isFilterDrawerOpen`, `isCategoryModalOpen`, `isBoostModalOpen`, `isPrivacyCenterOpen`, `isCguViewerOpen`, `isKycModalOpen`, `isAdminPanelOpen`, `isLangModalOpen`, `isReportModalOpen`, `selectedListing`, `selectedPublicUser`.
- **Consommateur Majeur :** `useAppNavigation` pour fermer les modales au clic sur le bouton retour physique mobile.

#### 5. `useWalletStore` ([`src/stores/useWalletStore.js`](file:///c:/Users/mateo/Desktop/TROCO/src/stores/useWalletStore.js))
- **État Managé :** `euroBalance`, `trocoTokens`, `kycVerified`, `isTrocoPlus`, `currency` (verrouillé sur `'EUR'`), `currencySymbol` (`'€'`), `transactions`.
- **Persistance :** Persisté sous la clé `troco_wallet_store`.
- **Fonction Clé :** `subscribeToUserBalance(uid)` : abonnement temps réel au document Firestore `users/{uid}` détectant les gains de jetons, jouant les sons d'encaissement (`playBetclicBalanceSound`, `playApplePaySound`) et déclenchant les vibrations haptiques (`hapticSuccess`).

---

### 11.2 Contextes React (`src/contexts/`)
- **`AuthContext`** ([`src/contexts/AuthContext.jsx`](file:///c:/Users/mateo/Desktop/TROCO/src/contexts/AuthContext.jsx)) : Fournit l'accès aux méthodes d'authentification pour les composants n'utilisant pas directement `useAppAuth`.
- **`LanguageContext`** ([`src/contexts/LanguageContext.jsx`](file:///c:/Users/mateo/Desktop/TROCO/src/contexts/LanguageContext.jsx)) : Gère la langue active, stockée dans `localStorage.getItem('troco_language')`, et expose `t(key)`.
- **`ModalContext`** ([`src/contexts/ModalContext.jsx`](file:///c:/Users/mateo/Desktop/TROCO/src/contexts/ModalContext.jsx)) : Interface impérative d'ouverture de boîtes de dialogue modales.
- **`ThemeContext`** ([`src/contexts/ThemeContext.jsx`](file:///c:/Users/mateo/Desktop/TROCO/src/contexts/ThemeContext.jsx)) : Mode sombre (`darkMode`) et 24 palettes de couleurs d'accentuation personnalisées.
- **`WalletContext`** ([`src/contexts/WalletContext.jsx`](file:///c:/Users/mateo/Desktop/TROCO/src/contexts/WalletContext.jsx)) : Contexte de commodité autour des opérations financières.
- **`WebRTCContext`** ([`src/contexts/WebRTCContext.jsx`](file:///c:/Users/mateo/Desktop/TROCO/src/contexts/WebRTCContext.jsx)) : Wrapper autour de `useWebRTC`.

---

## 12. i18n / Langues

### 12.1 Architecture de Traduction
- **Stockage :** Centralisé dans [`src/locales/translations.js`](file:///c:/Users/mateo/Desktop/TROCO/src/locales/translations.js) (73 Ko) et [`src/data/translationsData.js`](file:///c:/Users/mateo/Desktop/TROCO/src/data/translationsData.js).
- **Fonction de Résolution :** Implémentée dans [`src/contexts/LanguageContext.jsx:58-60`](file:///c:/Users/mateo/Desktop/TROCO/src/contexts/LanguageContext.jsx#L58-L60) :
  ```javascript
  const t = useCallback((key) => {
    return translations?.[currentLang]?.[key] || translations?.['FR']?.[key] || key;
  }, [currentLang]);
  ```
  *La résolution inspecte la langue active, puis la clé française de repli, puis retourne la clé brute si non trouvée.*

### 12.2 Langues Supportées (7 Langues)
Déclarées dans `SUPPORTED_LANGUAGES` ([`LanguageContext.jsx:6`](file:///c:/Users/mateo/Desktop/TROCO/src/contexts/LanguageContext.jsx#L6)) :
1. **`FR`** (Français) — Langue native et source de vérité de l'application.
2. **`EN`** (Anglais).
3. **`ES`** (Espagnol).
4. **`IT`** (Italien).
5. **`DE`** (Allemand).
6. **`JA`** (Japonais).
7. **`ZH`** (Chinois simplifié).

### 12.3 Chaînes Françaises Hardcodées
- **Constat :** Plusieurs dizaines de chaînes de caractères françaises sont codées en dur dans les composants UI, servant de valeur de repli par défaut (ex: `t('counterOffer') || 'Proposer un deal / Contre-offre'`, `senderName || 'Utilisateur'`, `'Appel vidéo'`, `'Compte suspendu pour non-respect des CGU.'`).
- **Recommandation :** Extraire ces chaînes vers `translations.js` pour assurer une internationalisation 100% couverte en anglais et espagnol.

---

## 13. Points chauds (hotspots) — TOP 10

| Rang | Fichier | Taille | Justification de la Sensibilité | Conséquence Directe en Cas de Rupture |
| :---: | :--- | :---: | :--- | :--- |
| **1** | [`src/App.js`](file:///c:/Users/mateo/Desktop/TROCO/src/App.js) | 4 849 lignes | Point névralgique monolithique centralisant routing, auth, modales, WebRTC, chatManager, listeners globaux et styles inline. | Crash total de l'application (écran blanc pour tous les utilisateurs). |
| **2** | [`src/components/ChatView.jsx`](file:///c:/Users/mateo/Desktop/TROCO/src/components/ChatView.jsx) | 3 961 lignes | Contient toute l'UI du chat, les négociations de deals bilatéraux, les évaluations post-troc, le rendu audio et les raccourcis. | Impossibilité pour les utilisateurs d'accéder à leurs conversations ou de négocier. |
| **3** | [`src/hooks/useChatManager.js`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useChatManager.js) | 2 397 lignes | Cœur logique de messagerie : envoi, réception, synchronisation Firestore, transactions d'escrow, indicateur de frappe. | Blocage complet de l'envoi de messages et corruption des deals. |
| **4** | [`src/hooks/useWebRTC.js`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useWebRTC.js) | 1 081 lignes | Signalisation temps réel P2P, capture des flux caméra/micro, échange des candidats ICE, gestion des appels entrants. | Plus aucune sonnerie d'appel ni connexion audio/vidéo possible. |
| **5** | [`firestore.rules`](file:///c:/Users/mateo/Desktop/TROCO/firestore.rules) | 204 lignes | Règles de sécurité régissant l'intégralité des autorisations en base de données de production. | Blocage `permission-denied` sur toute l'application ou fuite de données privées. |
| **6** | [`src/features/auth/AuthScreen.jsx`](file:///c:/Users/mateo/Desktop/TROCO/src/features/auth/AuthScreen.jsx) | 1 055 lignes | Point d'entrée utilisateur gérant SMS, Email Link, Password et 4 fournisseurs OAuth. | Impossibilité pour les membres de s'inscrire ou de se connecter. |
| **7** | [`src/components/PaymentModal.jsx`](file:///c:/Users/mateo/Desktop/TROCO/src/components/PaymentModal.jsx) | 1 232 lignes | Interface de rechargement, achat de packs de jetons, validation KYC et consultation de solde. | Rupture des flux de monétisation et blocage du système de jetons. |
| **8** | [`functions/src/payments/transferAtomically.ts`](file:///c:/Users/mateo/Desktop/TROCO/functions/src/payments/transferAtomically.ts) | 227 lignes | Cœur d'exécution financière côté serveur (débit/crédit atomique entre utilisateurs). | Anomalies de soldes, double dépense ou blocage des règlements de deals. |
| **9** | [`src/components/CollaborativeWhiteboardModal.jsx`](file:///c:/Users/mateo/Desktop/TROCO/src/components/CollaborativeWhiteboardModal.jsx) | 2 700+ lignes | Moteur de dessin vectoriel collaboratif multi-utilisateurs en temps réel. | Crash du studio de design et des tableaux blancs partagés. |
| **10** | [`src/hooks/useAppAuth.js`](file:///c:/Users/mateo/Desktop/TROCO/src/hooks/useAppAuth.js) | 227 lignes | Cycle de vie de la session utilisateur, synchronisation du profil Firestore et détection des bannissements. | Déconnexions intempestives ou échec de chargement des profils. |

---

## 14. Dettes techniques connues

1. **Appels Bloquants Natifs du Navigateur :**
   - L'application utilise encore des appels natifs synchrones `alert()`, `confirm()`, `prompt()` dans [`src/App.js`](file:///c:/Users/mateo/Desktop/TROCO/src/App.js) (lignes 693, 717, 915, 918, 1446, 1462, 1470, 1474, 1530, 2241, 3101, 3203, 3810). Ces dialogues bloquent l'exécution du thread JavaScript et dégradent l'expérience utilisateur mobile.
2. **Prolifération des Logs Console en Production :**
   - **363 occurrences** de `console.log`, `console.warn`, `console.error` sont actives dans le code source de `src/`, polluant la console du navigateur en production.
3. **Monolithisme d'`App.js` (4 849 lignes) :**
   - `App.js` concentre trop de responsabilités : injection des styles inline volumineux, gestion de 15 modales, orchestration des flux d'annonces, listeners de notifications et signalisation d'appels.
4. **Dépendance à Webpack Ancien via Create React App :**
   - `react-scripts: 5.0.1` est basé sur un outillage historique. Une migration vers Vite permettrait de diviser le temps de build par 5 et d'alléger la configuration.
5. **Absence d'Initialisation Sentry :**
   - Le fichier [`src/utils/sentryFilters.js`](file:///c:/Users/mateo/Desktop/TROCO/src/utils/sentryFilters.js) définit des filtres de nettoyage de mots de passe, mais le SDK officiel `@sentry/react` n'est pas installé dans `package.json`. Les erreurs frontend non interceptées ne sont pas remontées sur un tableau de bord d'observabilité.

---

## 15. Historique récent (30 derniers commits)

*Synthèse chronologique issue de `git log --oneline -30` :*

1. `8f7d031` — `fix(call): [FIX-CALL] Les appels sonnent et se connectent` : Réparation du signaling d'appel, ID déterministe `[callerUid, calleeUid].sort().join('_')`, règles `calls` assouplies.
2. `6fb4666` — `fix(chat): [FIX-CHAT] Messages s'envoient et se reçoivent` : Élimination du spinner infini, assouplissement temporaire des règles Firestore de chat.
3. `42274a8` — `docs(audit): [AUDIT-00] Rapport audit complet Chat + WebRTC post-HOTFIX-07` : Cartographie exhaustive des modules temps réel.
4. `35248ef` — `test(regression): [VERIF-03] Tests E2E exhaustifs + monitoring Firestore` : Mise en place des suites Vitest (114 tests) et monitoring client.
5. `5a106ae` — `feat(migration): [VERIF-02] Migration participants noms → UIDs + Rules strictes` : Cloud Function de migration idempotente des conversations.
6. `8679376` — `docs(verif): [VERIF-01] Rapport de validation post-HOTFIX-07` : Synthèse des tests manuels de non-régression.
7. `a82f68c` — `hotfix(critical): [HOTFIX-07] Restauration Chat + WebRTC fonctionnels` : Résolution d'urgence suite aux blocages de permissions.
8. `69d1799` — `hotfix(core): [HOTFIX-00 a 05] Diagnostic et resolution complete des regressions critiques` : Correctifs audio iOS, garde anti-notifications fantômes.
9. `3310e69` — `feat(p0): complete financial security, unified wallet, demo isolation, gdpr deletion` : Intégrité financière et conformité RGPD.
10. `e650442` — `fix(security): [P0-SEC-05/P1-BUG-05] Suppression ghost session localStorage` : Élimination des faux états de session.
11. `2e1ed6a` — `feat(security): [P0-SEC-02/03] users_public + listeners gated isAdmin` : Cloisonnement des profils publics.
12. `81bf90d` — `feat(security): [P0-SEC-01] Admin via Firebase Custom Claims + Cloud Functions` : Remplacement des vérifications d'emails par les claims cryptographiques.
13. `66bbea8` — `feat(security): [P0-SEC-04] Firestore Rules deny-by-default + 30 tests` : Première mise en place du verrou Zero-Trust.
14. `0dd3f6a` — `feat(logo): upgrade TrocoLogo3D to Liquid Chrome Infinity` : Amélioration du logo 3D interactif.
15. `588d989` — `fix(chat): resolve TDZ ReferenceError on activeChatObj` : Résolution d'un crash de portée JavaScript dans le chat.
16. `105bccc` — `feat(profile): upgrade ProfileAppearanceCustomizer` : Laboratoire de couleurs, 23 polices Google Fonts.
17. `d9bf763` — `feat(deal): cinematic deal engine with in-chat negotiation buttons` : Moteur de négociation bilatérale dans le chat.
18. `9b6e9a6` — `fix(legal-a11y): enforce pre-consent zero trackers, keyboard focus rings` : Conformité légale et accessibilité WCAG.
19. `f2124e3` — `fix(audio): robust iOS audio/mp4 MIME normalization` : Normalisation audio cross-platform.
20. `4445f08` — `feat(profile): add explicit Changer mon avatar button` : Ergonomie du profil utilisateur.
21. `bcb2e6c` — `feat(workspace): glassmorphic pill tab selector` : Hub bureautique unifié.
22. `33cfc7f` — `feat(whiteboard): add marquee selection tool` : Outils avancés du tableau blanc.
23. `22d02a8` — `fix(whiteboard): add global pointerup, pointercancel` : Stabilité des gestes tactiles et stylet.
24. `a78c61e` — `fix(chat): add replaceTempId in useChatStore` : Déduplication des messages optimistes.
25. `ad73ae1` — `fix(finance): enforce atomic runTransaction in closeCheckout` : Sécurisation du débit/crédit simultané.
26. `16f9e2b` — `fix(ui): remove all placeholder fake reviews` : Conformité contractuelle de l'interface.
27. `042d9ab` — `feat(a11y): implement full keyboard navigation` : Accessibilité complète au clavier.
28. `1a0674e` — `fix(compliance): enforce strict cookie consent blocking` : Blocage des traceurs avant consentement.
29. `b63956c` — `feat(legal): implement privacy, legal notice, refund and cookie policies` : Rédaction des pages légales obligatoires.
30. `23710ae` — `feat(workspace): add TrocoSlides to hub menu` : Ajout du module de présentation.

---

## 16. Carte des flux critiques

### 16.1 Flux : Un utilisateur envoie un message texte
```text
Étape 1 : Saisie utilisateur
Utilisateur tape son texte dans le composant ChatInputBar
└── Fichier: src/components/chat/ChatInputBar.jsx (Ligne 209)

Étape 2 : Interception de soumission
L'utilisateur appuie sur Entrée ou clique sur le bouton d'envoi (handleSubmit)
├── e.preventDefault() et e.stopPropagation()
├── localText.trim() extrait le texte
├── setLocalText('') vide le buffer de saisie local
└── Invoque handleSendMessage(trimmed)
    └── Fichier: src/components/chat/ChatInputBar.jsx (Lignes 214-227)

Étape 3 : Traitement logique dans useChatManager
handleSendMessage valide le contexte :
├── Vérifie l'authentification : uid = profile?.uid || auth.currentUser.uid
├── Vérifie le chat actif : chatId = String(selectedChat.id)
├── Émet les signaux sensoriels : hapticLight() et playPop()
├── Réinitialise le brouillon : setMessageDraft('')
└── Annule l'indicateur de frappe : doc(db, 'chats', chatId).typing[profile.name] = false
    └── Fichier: src/hooks/useChatManager.js (Lignes 609-656)

Étape 4 : Écriture Firestore
Envoi du document dans la sous-collection :
├── addDoc(collection(db, 'chats', chatId, 'messages'), {
│     content: text,
│     text: text,
│     senderUid: uid,
│     senderName: profile.name,
│     timestamp: serverTimestamp(),
│     createdAt: serverTimestamp(),
│     status: 'sent'
│   })
└── Fichier: src/hooks/useChatManager.js (Lignes 659-668)

Étape 5 : Mise à jour du résumé parent
Mise à jour du document parent de conversation :
├── updateDoc(doc(db, 'chats', chatId), {
│     lastMessage: text,
│     lastMessageAt: serverTimestamp()
│   }) (avec repli setDoc merge: true)
└── Fichier: src/hooks/useChatManager.js (Lignes 670-679)

Étape 6 : Réception réactive temps réel
Le listener onSnapshot reçoit le document validé :
├── Mappe les documents avec calcul dynamique de isMe
├── Met à jour le fil de messages dans chatThreads
└── Persiste le fil dans useChatStore.getState().updateChatThread()
    └── Fichier: src/hooks/useChatManager.js (Lignes 518-544)

Étape 7 : Affichage dans l'UI
Le composant ChatView reçoit les nouveaux messages :
├── Le spinner de chargement est masqué
└── L'icône de coche de confirmation s'affiche
    └── Fichier: src/components/ChatView.jsx (Lignes 916-933)
```

---

### 16.2 Flux : Un utilisateur lance un appel WebRTC
```text
Étape 1 : Déclenchement de l'appel
L'utilisateur clique sur le bouton Appel vidéo dans l'en-tête du chat
└── Fichier: src/components/chat/ChatHeader.jsx ou src/components/ChatView.jsx (Ligne 1380)

Étape 2 : Initialisation dans useWebRTC
startCall(type) s'exécute :
├── Résout calleeUid depuis selectedChat (partnerUid, participantUids)
├── Calcule callId déterministe = [myUid, calleeUid].sort().join('_')
├── Récupère les flux caméra/micro locaux via _getLocalStream(type)
├── Active la sonnerie d'attente locale : playRingtone() et vibration
└── Instancie la connexion P2P : pc = _createPC(callId, 'caller')
    └── Fichier: src/hooks/useWebRTC.js (Lignes 510-563)

Étape 3 : Création et envoi de l'Offre SDP
Le client appelant génère sa proposition de flux :
├── offer = await pc.createOffer()
├── await pc.setLocalDescription(offer)
└── Écrit la session dans Firestore :
    setDoc(doc(db, 'calls', callId), {
      callId, callerUid: myUid, calleeUid, status: 'ringing',
      offer: { type: offer.type, sdp: offer.sdp },
      createdAt: serverTimestamp()
    })
    └── Fichier: src/hooks/useWebRTC.js (Lignes 564-596)

Étape 4 : Détection temps réel côté Destinataire
Sur l'appareil destinataire (callee), le listener écoute :
├── query(collection(db, 'calls'), where('calleeUid', '==', myUid), where('status', '==', 'ringing'))
├── Intercepte le document entrant dès qu'il est créé
├── Déclenche la sonnerie d'alerte : playRingtone() et vibration
└── Ouvre au premier plan l'overlay global WebRTCCallOverlay
    └── Fichier: src/hooks/useWebRTC.js (Lignes 810-840) et src/App.js (Ligne 4417)

Étape 5 : Décrochage et Réponse SDP (Answer)
Le destinataire clique sur "Répondre" :
├── acceptIncomingCall(callData) s'exécute
├── Capture le flux média local du destinataire
├── Initialise pc = _createPC(callId, 'callee')
├── await pc.setRemoteDescription(new RTCSessionDescription(callData.offer))
├── answer = await pc.createAnswer()
├── await pc.setLocalDescription(answer)
└── Écrit la réponse dans Firestore :
    updateDoc(doc(db, 'calls', callId), {
      answer: { type: answer.type, sdp: answer.sdp },
      status: 'connected'
    })
    └── Fichier: src/hooks/useWebRTC.js (Lignes 655-680)

Étape 6 : Échange des Candidats ICE (Trickle ICE)
Chaque appareil envoie ses candidats réseau :
├── L'appelant écrit dans calls/{callId}/callerCandidates
├── Le destinataire écrit dans calls/{callId}/calleeCandidates
└── Les listeners respectifs dépochent les candidats et les injectent via pc.addIceCandidate()
    └── Fichier: src/hooks/useWebRTC.js (Lignes 460-475)

Étape 7 : Établissement du flux P2P
L'événement pc.ontrack est déclenché :
├── Le flux distant remoteStream est attaché à l'élément vidéo
├── La sonnerie est stoppée : stopRingtone()
└── Le chronomètre d'appel démarre dans WebRTCCallOverlay
    └── Fichier: src/hooks/useWebRTC.js (Lignes 620-636)
```

---

### 16.3 Flux : Un utilisateur reçoit un paiement
```text
Étape 1 : Validation de l'échange ou achat de jetons
Un utilisateur règle une commande ou libère un séquestre escrow
└── Fichier: functions/src/payments/applyPayment.ts (Ligne 20) ou transferAtomically.ts (Ligne 38)

Étape 2 : Contrôle d'idempotence serveur
La Cloud Function interroge la collection d'idempotence :
├── checkIdempotency(paymentIntentId, db)
└── Si la clé existe déjà, retourne le résultat mémorisé sans réexécuter de débit
    └── Fichier: functions/src/payments/idempotency.ts (Lignes 15-45)

Étape 3 : Exécution de la transaction atomique Firestore
db.runTransaction(async (tx) => { ... }) exécute :
├── 1. Débit du compte de l'émetteur : users/{fromUid}.trocoTokens -= amount
├── 2. Crédit du compte du destinataire : users/{toUid}.trocoTokens += amount
├── 3. Création du reçu comptable immuable dans transactions/{txId}
└── 4. Création de la notification dans users/{toUid}/notifications/{notifId} :
       { type: 'tokens_received', amount, currency: 'tokens', read: false }
})
└── Fichier: functions/src/payments/transferAtomically.ts (Lignes 135-195)
    et src/hooks/useChatManager.js (Lignes 1461, 1958)

Étape 4 : Interception temps réel côté Récepteur
L'application cliente du destinataire maintient un listener actif :
├── query(collection(db, 'users', currentUid, 'notifications'), where('read', '==', false))
├── Intercepte le document nouvellement créé
└── Extrait : amount, currency, partnerName
    └── Fichier: src/App.js (Lignes 468-495)

Étape 5 : Célébration Fintech Immersive
L'interface déclenche l'animation de succès :
├── Ouvre la modale <TransactionSuccessModal>
├── Joue l'effet sonore financier playBetclicBalanceSound() ou playApplePaySound()
└── Met à jour le compteur de solde dans useWalletStore avec retour haptique
    └── Fichier: src/App.js (Lignes 485-492) et src/stores/useWalletStore.js (Ligne 120)

Étape 6 : Acquittement de la notification
L'utilisateur clique sur le bouton "Fermer" :
├── handleCloseTransactionSuccessModal s'exécute
└── updateDoc(doc(db, 'users', uid, 'notifications', notifId), { read: true, readAt })
    └── Fichier: src/App.js (Lignes 450-465)
```

---

### 16.4 Flux : Un utilisateur supprime son compte (RGPD)
```text
Étape 1 : Demande de suppression par l'utilisateur
L'utilisateur accède à : Profil -> Paramètres -> Centre de Confidentialité RGPD
└── Clique sur "Supprimer définitivement mon compte"
    └── Fichier: src/components/PrivacyCenterModal.jsx (Lignes 180-220)

Étape 2 : Invocation de la Cloud Function
Le client appelle la fonction sécurisée :
├── const deleteUser = httpsCallable(functions, 'deleteUserCompletely')
└── await deleteUser({ immediate: false })
    └── Fichier: functions/src/gdpr/deleteUserCompletely.ts (Lignes 20-35)

Étape 3 : Contrôle de sécurité et Soft-Delete
La Cloud Function vérifie l'identité :
├── Extrait l'UID authentifié : const uid = request.auth.uid (refuse les non-authentifiés)
├── Enregistre l'état dans users/{uid} :
│     isDeleted: true,
│     deletedAt: Timestamp.now(),
│     scheduledPermanentDeletion: Timestamp.now() + 30 jours
└── Désactive toutes les annonces de l'utilisateur dans listings (status: 'archived')
    └── Fichier: functions/src/gdpr/deleteUserCompletely.ts (Lignes 45-80)

Étape 4 : Déconnexion et purge des sessions locales
Le client intercepte le succès :
├── signOut(auth) révoque la session Firebase Auth
├── useAuthStore.getState().resetToDefault() vide le cache mémoire
└── clearSessionFlags() et localStorage.removeItem('troco_user_profile')
    └── Fichier: src/hooks/useAppAuth.js (Lignes 160-169)

Étape 5 : Rétractation possible pendant 30 jours
Si l'utilisateur se reconnecte avant 30 jours :
├── Une invite lui propose d'annuler la suppression
└── Appel de la Cloud Function restoreAccount qui réactive son profil et ses annonces
    └── Fichier: functions/src/gdpr/restoreAccount.ts (Lignes 20-60)

Étape 6 : Purge définitive par Cron quotidien (03:00)
Chaque nuit à 03h00, la fonction scheduledDeletion s'exécute :
├── Détecte les profils dont scheduledPermanentDeletion est dépassé
├── 1. Supprime définitivement les annonces dans listings
├── 2. Supprime le profil public dans users_public/{uid}
├── 3. Supprime les notifications dans users/{uid}/notifications
├── 4. Supprime le document principal dans users/{uid}
├── 5. Supprime le compte d'authentification : adminAuth.deleteUser(uid)
└── 6. Consigne l'opération dans les logs d'audit admin_audit_logs
    └── Fichier: functions/src/gdpr/scheduledDeletion.ts (Lignes 15-85)
```

---

## 17. Comment tester manuellement

### 17.1 Test du Chat (Mobile $\rightleftarrows$ Desktop)
1. **Préparation :**
   - Ouvrir Fenêtre 1 (Chrome en mode émulation mobile F12, User A connecté).
   - Ouvrir Fenêtre 2 (Chrome/Firefox standard, User B connecté).
2. **Action d'Envoi :**
   - Sur Fenêtre 1 (User A) : Sélectionner l'onglet **Messages**, cliquer sur la conversation avec User B.
   - Saisir `"Bonjour B, échangeons nos compétences !"` dans le champ de saisie.
   - Appuyer sur Entrée.
3. **Vérification A :** Le champ est vidé instantanément, le message apparaît à droite avec un badge de coche.
4. **Vérification B :** En moins de 500 ms, le message apparaît sur Fenêtre 2 (User B) à gauche sans rechargement de page.
5. **Action de Réponse :**
   - Sur Fenêtre 2 (User B) : Taper `"Avec plaisir A !"`, envoyer.
6. **Vérification A :** Le message apparaît instantanément sur l'écran mobile de User A avec le son pop.

---

### 17.2 Test d'un Appel WebRTC (Mobile $\rightleftarrows$ Desktop)
1. **Préparation :**
   - Fenêtre 1 (User A, Mobile) et Fenêtre 2 (User B, Desktop) toutes deux connectées.
2. **Lancement de l'Appel :**
   - Sur Fenêtre 1 : Dans la conversation ouverte avec B, cliquer sur l'icône **Appel Vidéo** en haut à droite.
3. **Vérification A (Appelant) :**
   - La caméra locale s'allume.
   - La sonnerie d'attente sortante retentit.
4. **Vérification B (Destinataire) :**
   - En moins de 3 secondes, l'overlay plein écran `<WebRTCCallOverlay>` surgit au premier plan avec la sonnerie d'appel entrant et l'avatar de User A.
5. **Décrochage :**
   - Sur Fenêtre 2 (User B) : Cliquer sur le bouton vert **Répondre**.
6. **Vérification P2P :**
   - La sonnerie s'arrête immédiatement sur les deux appareils.
   - Le flux vidéo de User A s'affiche sur l'écran de User B, et vice-versa.
   - Le chronomètre de communication commence à défiler (`00:01`, `00:02`...).
7. **Raccrochage :**
   - Cliquer sur le bouton rouge **Raccrocher**.
8. **Vérification Clôture :**
   - Les caméras s'éteignent sur les deux appareils.
   - L'overlay se ferme proprement sans notification fantôme.
   - Un message de journal d'appel `📞 Appel vidéo terminé • HH:MM • Durée : MM:SS` apparaît dans le chat.

---

### 17.3 Test des Paiements & Transferts de Jetons
1. **Relevé Initial :**
   - Consulter le profil de User A : relever le solde (ex: 12 jetons).
   - Consulter le profil de User B : relever le solde (ex: 10 jetons).
2. **Transfert :**
   - Dans la conversation de User A avec User B, cliquer sur l'icône de transfert de jetons (ou menu `+` $\rightarrow$ `Transférer des jetons`).
   - Saisir `2` jetons et valider.
3. **Vérification User A :** Le solde de User A passe immédiatement à 10 jetons.
4. **Vérification User B :**
   - La modale de célébration fintech surgit au premier plan sur l'écran de User B avec le son Apple Pay.
   - Le solde de User B est incrémenté à 12 jetons.

---

### 17.4 Test de l'Authentification & Déconnexion
1. **Déconnexion :**
   - Aller sur l'onglet **Mon Profil**.
   - Cliquer sur **Se déconnecter**.
2. **Vérification Déconnexion :**
   - L'application redirige vers l'accueil public avec le bouton "Se connecter".
   - `localStorage.getItem('troco_user_profile')` et les drapeaux de session sont purgés.
3. **Reconnexion :**
   - Cliquer sur "Se connecter", renseigner email et mot de passe de test.
4. **Vérification Reconnexion :**
   - L'écran `AuthScreen` disparaît, le profil personnalisé et le solde réapparaissent instantanément.

---

## 18. Ce qui N'EXISTE PAS (pour éviter les erreurs)

Pour éviter toute perte de temps ou hypothèse inexacte de la part des futurs développeurs, voici la liste formelle des éléments **non présents** dans le dépôt :

1. **Pas de configuration Firebase Hosting dans `firebase.json` :**
   - Le fichier `firebase.json` ne contient aucune directive d'hébergement web (`"hosting": { ... }`). Les déploiements frontend s'effectuent sur une plateforme tierce non déclarée dans ce dépôt.
2. **Pas d'environnement Staging séparé :**
   - Aucun fichier `.firebaserc` n'existe dans le projet. L'ensemble de la configuration cible l'unique projet Firebase `troco-8a6eb`.
3. **Pas de clés Stripe en production active :**
   - Bien que les interfaces TypeScript et les modèles de données prévoient Stripe, le backend utilise exclusivement `mockProvider.ts`. Aucune variable `STRIPE_SECRET_KEY` n'est configurée dans l'infrastructure.
4. **Pas de Push Notifications Web en arrière-plan (FCM Service Worker) :**
   - Il n'existe pas de fichier `firebase-messaging-sw.js` configuré pour recevoir des notifications push lorsque le navigateur est fermé. Les notifications et sonneries d'appel ne fonctionnent **que si l'onglet Troco est ouvert**.
5. **Pas de SDK Sentry installé dans `package.json` :**
   - Bien que le fichier [`src/utils/sentryFilters.js`](file:///c:/Users/mateo/Desktop/TROCO/src/utils/sentryFilters.js) existe, le package `@sentry/react` n'est pas présent dans `package.json`. Aucun rapport de crash n'est envoyé vers Sentry en production.
6. **Pas d'exécution automatique des tests E2E Playwright sur GitHub Actions :**
   - Les fichiers de test Playwright (`tests/e2e/`) existent localement, mais le workflow CI [`.github/workflows/ci.yml`](file:///c:/Users/mateo/Desktop/TROCO/.github/workflows/ci.yml) n'exécute que Vitest (tests unitaires et règles Firestore).
