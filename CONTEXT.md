# 🧠 TROCO — CONTEXTE TECHNIQUE & ARCHITECTURE ABSOLUE (CONTEXT.md)

> **Document de Référence & Cerveau Externe**  
> *Dernière mise à jour : Septembre 2026 — Version de production 2.0 (Clean State)*  
> *Avertissement : Ce fichier est le référentiel unique de l'application Troco. Tout agent IA ou développeur intervenant sur le projet DOIT impérativement lire et respecter l'intégralité de ce document avant toute intervention.*

---

## 📑 TABLE DES MATIÈRES
1. [🎯 1. Vision du Produit & Stack Technique](#-1-vision-du-produit--stack-technique)
2. [📂 2. Architecture des Dossiers & Fichiers Clés](#-2-architecture-des-dossiers--fichiers-clés)
3. [⚙️ 3. État Actuel des Fonctionnalités (Ce qui Fonctionne)](#-3-état-actuel-des-fonctionnalités-ce-qui-fonctionne)
4. [🛡️ 4. Règles de Sécurité, Base de Données & CORS](#-4-règles-de-sécurité-base-de-données--cors)
5. [🎨 5. Design System, Modales & Accessibilité](#-5-design-system-modales--accessibilité)
6. [🤖 6. CRITICAL RULES FOR AI AGENTS (Directives Impératives)](#-6-critical-rules-for-ai-agents-directives-impératives)

---

## 🎯 1. VISION DU PRODUIT & STACK TECHNIQUE

### 1.1 Qu'est-ce que Troco ?
**Troco** est une Progressive Web App (PWA) internationale de nouvelle génération dédiée à l'**économie collaborative**, au **troc de compétences** (*time-banking* & entraide de savoir-faire), aux **prêts de matériel géolocalisés**, aux **espaces de projets collaboratifs** et au **swap de logements**.

Troco intègre :
- Une marketplace géolocalisée avec respect strict de la vie privée (geoprivacy via floutage GPS).
- Un système de contractualisation de deals hybrides (Jetons Troco, Euros fiduciaires, troc pur ou formule mixte avec séquestre escrow).
- Une messagerie instantanée collaborative en temps réel (textes, documents de travail, notes vocales enregistrées, fichiers audio volumineux, tableurs partagés).
- Un studio de visio-conférence P2P WebRTC avec partage d'écran, tableau blanc interactif et sous-titrage/traduction instantanée multi-langues.
- Une suite bureautique intégrée (*Troco Office Suite* : TrocoDocs, TrocoSheets, TrocoSlides, TrocoNotes).

### 1.2 Stack Technologique Exhaustive

| Couche | Technologies | Rôle & Usage Spécifique |
| :--- | :--- | :--- |
| **Core Framework** | **React 19** (`react@19.2.8`, `react-dom@19.2.8`) | Composants fonctionnels modernes, hooks React 19, Suspense, Concurrent Mode. |
| **Tooling & Build** | **React Scripts 5** (`react-scripts@5.0.1`) / Node.js | Packaging webpack optimisé, bundling PWA, tests Jest intégrés. |
| **State Management** | **Zustand 5** (`zustand@5.0.15`) + React Contexts | Stores découplés (`useChatStore`, `useWalletStore`, `useAuthStore`, `useFeedStore`, `useUIStore`). |
| **Styling & CSS** | **Vanilla CSS Design System** + **Tailwind Merge** | Variables CSS complètes (`:root`, HSL theming, dark/light modes), `tailwind-merge` et `clsx`. |
| **Animations & Motion** | **Framer Motion** (`framer-motion@13.1.1`, `motion@13.2.0`) | Transitions de pages, modales fluides, animations micro-interactives, gestes tactiles. |
| **Icônes & Visuels** | **Lucide React** (`lucide-react@1.31.0`) | Système d'icônes vectorielles cohérent sur toute l'application. |
| **Cartographie & GPS** | **Leaflet** (`leaflet@1.9.4`, `react-leaflet@5.0.0`) | Affichage cartographique interactif, clustering, recherche d'annonces par rayon et géolocalisation. |
| **Géohash & Geoprivacy** | `ngeohash@0.6.4` + Nominatim OpenStreetMap | Encodage spatial géohash, floutage géographique obligatoire (~1 km) pour préserver la vie privée des membres. |
| **Virtualisation UI** | **TanStack Virtual** (`@tanstack/react-virtual@3.14.10`) | Rendu ultra-rapide des flux volumineux (feed infini d'annonces, listes de transactions, chat). |
| **Backend & Cloud** | **Firebase SDK v12** (`firebase@12.17.1`) | Authentification, Cloud Firestore, Cloud Storage, Cloud Functions serveur. |
| **Base de Données** | **Cloud Firestore** | Base NoSQL temps réel avec règles de sécurité strictes Zero-Trust (Deny-By-Default). |
| **Stockage Fichiers** | **Firebase Storage** | Stockage audio résumable (`uploadBytesResumable`), photos d'annonces, pièces jointes avec CORS multi-origines. |
| **P2P & Visio** | **WebRTC API Native** (Mesh P2P) | Canaux audio/vidéo chiffrés, STUN Google mondial, DataChannels pour tableau blanc collaboratif. |
| **Audio & Speech** | **Web Audio API** + **Web Speech API** (`SpeechRecognition`) | Synthèse sonore native (bruitages de caisse, sonneries), dictée vocale et transcription/traduction live. |
| **Internationalisation** | Moteur i18n propriétaire multi-langues | 7 langues supportées nativement : FR, EN, ES, IT, DE, JA, ZH. Traduction dynamique à la volée. |
| **Observabilité** | **Sentry React** (`@sentry/react@10.74.0`) + Web Vitals | Captures d'erreurs en production, monitoring des performances et métriques Core Web Vitals. |

---

## 📂 2. ARCHITECTURE DES DOSSIERS & FICHIERS CLÉS

```text
TROCO/
├── public/                     # Assets statiques, manifest PWA, robots.txt, icons
├── functions/                  # Firebase Cloud Functions (Admin SDK, paiements, RGPD)
├── tests/                      # Tests d'intégration et règles de sécurité
├── src/
│   ├── components/             # Composants d'interface (Modales, Cartes, Layout)
│   │   ├── chat/               # Composants isolés du chat (ChatInputBar, MessageBubble, DownloadButton)
│   │   ├── common/             # Composants partagés (boutons, spinners, badges)
│   │   ├── core/               # Briques fondatrices
│   │   ├── layout/             # Header, Navbar, Footer, Navigation mobile
│   │   ├── modals/             # Modales spécialisées (Boost, Checkout, FilterDrawer, etc.)
│   │   ├── profile/            # Composants du profil utilisateur et réputation
│   │   ├── ui/                 # UI primitives (UniversalModal, PullToRefresh, ProgressiveImage)
│   │   ├── AdminPanel.jsx      # Console d'administration et de modération
│   │   ├── ChatView.jsx        # Vue principale du chat temps réel et négociation
│   │   ├── DesignStudioModal.jsx # Studio de personnalisation graphique (thèmes, polices, formes)
│   │   ├── FeedView.jsx        # Flux principal d'exploration des annonces
│   │   ├── ListingDetailModal.jsx # Détail complet d'une annonce
│   │   ├── PaymentModal.jsx    # Tunnel d'achat de jetons et caution séquestre
│   │   ├── ProjectRewardsModal.jsx # Gestion de la cagnotte et rétribution d'équipe
│   │   ├── ProjectWorkspaceToolsModal.jsx # Outils de groupe (Google Drive, Meet, Fichiers)
│   │   ├── TransactionsHistoryModal.jsx # Historique et facturation des échanges
│   │   ├── VoiceNotePlayer.jsx # Lecteur audio avec barre de progression et transcription
│   │   ├── VoiceNoteRecorder.jsx # Enregistreur vocal cross-platform avec dictée en parallèle
│   │   └── CollaborativeWhiteboardModal.jsx # Tableau blanc interactif temps réel
│   ├── config/                 # Configurations applicatives et flags d'environnement
│   ├── contexts/               # Contextes React
│   │   ├── AuthContext.jsx     # Fournisseur d'état d'authentification utilisateur
│   │   ├── ThemeContext.jsx    # Moteur de styles (12+ thèmes, 12+ polices Google, radius, HSL)
│   │   └── LanguageContext.jsx # Gestion de la langue active (FR, EN, ES, IT, DE, JA, ZH)
│   ├── data/                   # Schémas et structures de données initiales
│   ├── features/               # Modules fonctionnels par domaine (auth, chat, feed, map, etc.)
│   ├── hooks/                  # Custom Hooks métier
│   │   ├── useAppAuth.js       # Orchestration de la connexion, profils et rôles
│   │   ├── useChatManager.js   # Synchronisation Firestore des conversations et messages
│   │   ├── useWebRTC.js        # Signalisation WebRTC, gestion micro/cam/screen share
│   │   ├── useCheckout.js      # Logique de paiement et mise à jour de solde
│   │   ├── useNetworkStatus.js # Détection hors-ligne et résilience réseau
│   │   └── useSafeTimeout.js   # Nettoyage automatique des timers contre les fuites de mémoire
│   ├── lib/                    # Bibliothèques externes encapsulées
│   ├── locales/                # Dictionnaires de traduction statique
│   ├── services/               # Services d'API et d'interaction Cloud
│   │   ├── audioService.js     # Synthèse audio Web Audio (clics, caisse enregistreuse, ringtone)
│   │   ├── firestoreService.js # Opérations CRUD Firestore sécurisées
│   │   ├── liveTranscriptionService.js # Reconnaissance vocale et traduction streaming
│   │   ├── voiceStorageService.js # Upload audio résumable Firebase Storage (pas de limite)
│   │   ├── whiteboardP2PService.js # Synchronisation DataChannel P2P pour le tableau blanc
│   │   ├── walletService.js    # Transactions de jetons et crédits
│   │   └── pricingService.js   # Moteur de tarification et commissions
│   ├── stores/                 # Stores globaux Zustand
│   │   ├── useAuthStore.js     # État utilisateur connecté et claims
│   │   ├── useChatStore.js     # Discussion active, messages non-lus, statuts de saisie
│   │   ├── useWalletStore.js   # Solde Troco Tokens, Solde Euros, synchronisation
│   │   ├── useFeedStore.js     # Filtres de recherche, rayon GPS, catégorie active
│   │   └── useUIStore.js       # Visibilité des modales, bannières, toasts
│   ├── utils/                  # Fonctions utilitaires pures
│   │   ├── displayName.js      # Règle d'or des noms : masquage strict des identifiants techniques
│   │   ├── dynamicTranslation.js # Détection regex `[XX]` et traduction dynamique à l'affichage
│   │   ├── formatters.js       # Formatage monétaire (€, jetons), dates et temps relatifs
│   │   ├── geocodingNominatim.js # Géocodage inversé et requêtes de communes
│   │   ├── haptics.js          # Retours haptiques sur smartphones
│   │   ├── logger.js           # Journalisation contrôlée (développement vs production)
│   │   └── translator.js       # Passerelle de traduction de textes
│   ├── App.js                  # Composant racine, orchestration des vues et navigation
│   ├── firebase.js             # Initialisation du client Firebase v12
│   └── index.css               # Design System complet, styles globaux, tokens HSL
├── firestore.rules             # Règles de sécurité Firestore Zero-Trust (Deny-By-Default)
├── cors.json                   # Configuration CORS Firebase Storage pour Vercel & Domaines
└── package.json                # Dépendances et scripts de build
```

---

## ⚙️ 3. ÉTAT ACTUEL DES FONCTIONNALITÉS (CE QUI FONCTIONNE)

### 3.1 Upload Audio Sans Limite & Architecture Résiliente
L'envoi et la lecture des messages audio et vocaux reposent sur une architecture double et éprouvée dans `voiceStorageService.js` :
1. **Notes vocales enregistrées au micro (`uploadVoiceNote`) :**
   - Normalisation du format selon le navigateur : `audio/mp4` prioritaire sur iOS Safari, `audio/webm;codecs=opus` sur Chromium/Android.
   - Upload vers `voice_notes/{chatId}/{fileName}`.
   - **Fallback gracieux offline / dégradé :** Si Firebase Storage ou les règles bloquent, conversion automatique en Data URL Base64 pour ne jamais perdre le message de l'utilisateur.
2. **Import de fichiers audio volumineux (`uploadAudioFile`) :**
   - Supporte tous les formats courants (.mp3, .wav, .m4a, .ogg, .aac, .webm).
   - **Aucune limite arbitraire de taille :** Les fichiers jusqu'à 10 Mo utilisent `uploadBytes` avec timeout de 15s ; les fichiers au-delà de 10 Mo basculent automatiquement sur `uploadBytesResumable` avec suivi de progression et timeout large (60s).
   - **Interdiction absolue du DataURL sur les fichiers importés :** Les gros fichiers audio importés ne sont JAMAIS convertis en Base64 dans Firestore car cela ferait crasher la limite stricte de 1 MiB par document Firestore.
   - **Zéro ré-encodage client :** Les fichiers sont envoyés directement dans leur format d'origine pour éviter de geler le thread principal du navigateur sur mobile.
3. **Rendu dans le Chat (`MessageBubble.jsx` & `VoiceNotePlayer.jsx`) :**
   - Composant `<audio controls>` sécurisé avec hauteur contenue (`h-10`), largeur max responsive (`max-w-[200px] md:max-w-xs`), stacking z-index propre (`z-10 relative`) et bouton de téléchargement universel (`DownloadButton`).
   - Accélération de lecture (x1, x1.5, x2), affichage de la transcription textuelle et bascule instantanée vers la traduction.

### 3.2 Transcription Vocale & Traduction Dynamique en Temps Réel
1. **Reconnaissance Vocale Streaming (`liveTranscriptionService.js`) :**
   - Exploite la `Web Speech API` (`SpeechRecognition` / `webkitSpeechRecognition`).
   - **Confidentialité absolue (Mute Guard) :** Dès que l'utilisateur coupe son micro (`setMuted(true)`), la reconnaissance vocale est **immédiatement stoppée** et tous les timers coupés. La réactivation s'effectue proprement au `unmute()`.
   - Fonctionne aussi bien en direct pendant un appel visio qu'en enregistrement de note vocale dans le chat.
2. **Moteur de Traduction Dynamique (`dynamicTranslation.js` & `translator.js`) :**
   - Détection des préfixes de langues au format `[XX]` (ex: `[EN]`, `[FR]`, `[ES]`).
   - Si la langue du contenu diffère de la langue active de l'utilisateur, traduction à la volée du titre et de la description.
   - Bouton "Voir l'original" pour restaurer immédiatement la version source de l'annonce ou du message sans écraser les données.

### 3.3 Appels Vidéo WebRTC & Signalisation P2P (`useWebRTC.js`)
- **Signalisation Firestore :** Structure `calls/{chatId}` contenant les offres/réponses SDP et les sous-collections `callerCandidates` et `calleeCandidates`.
- **Traversée NAT / Mobile :** Configuration STUN mondiale Google (`stun:stun.l.google.com:19302`, `stun1` à `stun4`) assurant la connexion fluide entre Wi-Fi, 4G et 5G.
- **Partage d'écran (Screen Sharing) :** Bascule instantanée entre la piste vidéo de la caméra (`cameraTrackRef`) et le flux d'écran (`getDisplayMedia`), avec arrêt propre quand l'utilisateur stoppe le partage depuis l'interface native du système.
- **Détection Multi-caméras :** Bascule entre caméra avant (`user`) et caméra arrière (`environment`) sur smartphone.
- **Bruitages & Sonneries :** Sonnerie d'appel générée dynamiquement via l'oscillateur Web Audio API (`audioService.js`), sans dépendre de fichiers audio externes susceptibles d'échouer au chargement.
- **Outils d'Appel Collaboratif :** Tableau blanc P2P partagé, coupure de micro à distance et sous-titres traduits en direct.

### 3.4 Onboarding Utilisateur & Règle d'Or des Identifiants (`displayName.js`)
- **Gestion stricte des noms :** L'UID Firebase (28 caractères aléatoires alphanumériques) est réservé exclusivement aux clés de base de données et à l'authentification.
- **Interdiction Formelle :** Aucun identifiant technique ne doit JAMAIS apparaître comme nom affiché dans l'interface (chat, profil, en-tête, mentions).
- **Résolution du nom d'affichage (`getDisplayName`) :**
  ```text
  1. Nom réel complet (user.name / user.displayName / user.fullName)
  2. Pseudo personnalisé (user.username)
  3. Préfixe d'email humanisé (ex: "jean.dupont@..." → "Jean Dupont")
  4. Fallback traduit universel ("Utilisateur")
  ```
- **Création du handle `@username` :** Nettoyage automatique des accents et caractères spéciaux (`slugifyUsername`), toujours basé sur le nom humain et jamais sur l'UID.
- **Connexion Google :** Récupération automatique du vrai nom du compte Google et pré-remplissage propre du profil.

### 3.5 Sécurisation des Hooks Firestore (Feed & Chats) & Persistance Session
- **Persistance Firebase Auth :** La méthode `setPersistence(auth, browserLocalPersistence)` dans `src/firebase.js` garantit qu'un rechargement de page (F5/Refresh) ne déconnecte pas l'utilisateur de sa session active.
- **Données 100% Firestore (Zéro Mock Data) :** Les flux d'annonces (`listings`) et de conversations (`chats`) proviennent **exclusivement de Cloud Firestore**. Les `onSnapshot` sur `chats` (`where('participants', 'array-contains', ...)` et `where('participantUids', 'array-contains', uid)`) et sur `listings` (`collection(db, 'listings')` trié par date avec fallback résilient) sont actifs et alimentent directement l'UI. Aucun fallback mock data n'existe plus dans le code ni dans l'initialisation des états. Si Firestore retourne une collection vide, l'interface affiche son EmptyState natif.
- **Sauvegarde du Profil et Respect des Règles Firestore Zero-Trust :** Les écritures client sur `users/{uid}` (`handleSaveProfile`, `handleAvatarFileUpload`) assainissent le payload pour ne pas modifier les champs financiers ou d'administration protégés (`euroBalance`, `trocoTokens`, `kycVerified`, `isBanned`, etc.), assurant une synchronisation et une persistance sans rejet de permission.

---

## 🛡️ 4. RÈGLES DE SÉCURITÉ, BASE DE DONNÉES & CORS

### 4.1 Modèle de Données Firestore (Collections Principales)

| Collection | Description & Utilité | Règles d'Accès Client |
| :--- | :--- | :--- |
| `users/{uid}` | Profil complet privé de l'utilisateur, coordonnées, paramètres. | Lecture/Écriture : propriétaire (`isOwner(uid)`) uniquement. Interdiction absolue d'écrire sur les champs financiers (`euroBalance`, `trocoTokens`, `kycVerified`, etc.). |
| `users_public/{uid}` | Profil public minimaliste conforme RGPD (nom, avatar, réputation, badges). | Lecture : tous utilisateurs authentifiés. Écriture client : **INTERDITE** (gérée par Cloud Functions). |
| `listings/{listingId}` | Annonces de services, prêts de matériel et trocs. | Lecture : publique si `status == 'active'`. Création/Modif : auteur non banni. Attributs protégés (`isBoosted`, `isHidden`) intouchables par le client. |
| `chats/{chatId}` | Salons de discussion privés et collectifs. | Lecture/Écriture : participants authentifiés. Sous-collection `messages/{msgId}` pour l'historique. |
| `transactions/{txId}` | Grand livre comptable financier et séquestre escrow. | Lecture : parties prenantes ou admin. **Écriture client strictement interdite** (Cloud Functions Admin SDK uniquement). |
| `reports/{reportId}` | Signalements d'abus et modération. | Création : tout membre authentifié. Lecture/Traitement : réservé strictement aux Administrateurs (`isAdmin()`). |
| `campaigns/{campaignId}` | Campagnes promotionnelles et bonus de bienvenue. | Lecture : utilisateurs authentifiés pour les campagnes actives. Écriture : Administrateurs. |
| `calls/{callId}` | Signalisation temps réel WebRTC et candidats ICE. | Lecture/Écriture : participants authentifiés à l'appel. |

### 4.2 Règles de Sécurité Critiques (Principes Zero-Trust)
1. **Deny-by-default :** `match /{document=**} { allow read, write: if false; }` est la règle racine. Aucun document n'est exposé sans autorisation explicite.
2. **Moindre Privilège Financier :** Aucune opération de crédit, de débit ou de validation de deal ne peut être injectée par un client HTTP/WebSocket non privilégié. Seules les Cloud Functions avec le Service Account Admin SDK peuvent modifier les soldes.
3. **Contrôle des Bannissements (`isNotBanned`) :** Tout utilisateur banni (`isBanned: true`) est immédiatement bloqué en écriture sur les annonces, les signalements et les profils.
4. **Filtrage Strict par UID Firebase :** Les requêtes Firestore utilisent EXCLUSIVEMENT `profile.uid` (jamais email, jamais nom, jamais username) pour filtrer les chats et les données utilisateur. Les règles de sécurité exigent `request.auth.uid in resource.data.participants` ; toute tentative de filtrage avec email, nom ou username déclenche une erreur `Missing or insufficient permissions`.

### 4.3 Configuration CORS Firebase Storage (`cors.json`)
Pour permettre l'upload audio et photo sans blocage de requêtes Cross-Origin depuis Vercel ou les environnements de test locaux, la règle CORS suivante est appliquée sur le bucket Firebase Storage :
```json
[
  {
    "origin": [
      "https://*.vercel.app",
      "https://troco.app",
      "https://www.troco.app",
      "https://troco-8a6eb.web.app",
      "https://troco-8a6eb.firebaseapp.com",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:4173"
    ],
    "method": ["GET", "POST", "PUT", "HEAD", "DELETE", "OPTIONS"],
    "maxAgeSeconds": 3600,
    "responseHeader": [
      "Content-Type",
      "Authorization",
      "Content-Length",
      "User-Agent",
      "x-goog-resumable",
      "x-firebase-storage-version"
    ]
  }
]
```

---

## 🎨 5. DESIGN SYSTEM, MODALES & ACCESSIBILITÉ

### 5.1 Architecture des Modales avec `UniversalModal.jsx`
L'application dispose d'un composant unifié pour toutes les boîtes de dialogue et fenêtres pop-up : `UniversalModal.jsx` situé dans `src/components/ui/UniversalModal.jsx`.

> [!IMPORTANT]
> **Standard universel d'architecture des Modales :**
> - **Wrapper :** `fixed inset-0 z-[999999] flex items-center justify-center p-4 md:p-6`
> - **Conteneur intérieur :** `max-h-[calc(100dvh-120px)]` (60px pour le header + 60px pour la BottomNav en bas sur mobile).
> - **En-tête (Header) & Pied de page (Footer) fixes :** `flex-shrink: 0` (toujours visibles et accessibles).
> - **Contenu central (Corps) :** `flex-1 min-h-0 overflow-y-auto` (défilement vertical fluide sans masquer les actions).
> - **Résolution du crash 'Z' (ReferenceError / Temporal Dead Zone) & Z-Index :**
>   - Les gestionnaires d'actions (ex: `handleConfirmAcceptance`) doivent impérativement être déclarés AVANT les fragments JSX qui les référencent (ex: `cguFooter`) afin d'éviter tout crash minifié en production (`Cannot access 'Z' before initialization`).
>   - **Z-Index Standard Absolu : `999999`**. Le composant `UniversalModal` utilise `zIndex: 999999` pour tous les overlays. La prop `overlayStyle` peut surcharger cette valeur mais ne doit jamais descendre en dessous de `99999`. Ce z-index garantit que les modales critiques s'affichent par-dessus la barre de navigation mobile (`AppBottomNav`).
>   - **Padding Symétrique avec `disableSafeArea={true}` :** Quand cette prop est `true`, l'overlay utilise `paddingBottom: '16px'` (identique au paddingTop), éliminant l'offset de 80px de la bottom nav. Utilisé pour les modales plein écran ou centrées type `CguModal`, `PrivacyCenterModal`.

**Points capitaux d'intégration :**
- **Portal sur `document.body` :** La modale s'extrait systématiquement du contexte d'empilement (stacking context) du chat ou de la navigation pour éviter tout débordement tronqué (`overflow: hidden`).
- **Index Z :** Backdrop à `z-[9999]`, garantissant qu'aucune barre de navigation mobile (`z-50`) ou élément d'en-tête ne vienne recouvrir la fenêtre.
- **Gestion du Défilement :** Le corps de la modale doit comporter `overflow-y: auto` et des marges de sécurité pour les écrans tactiles (`env(safe-area-inset-bottom)`).
- **Structure type :**
  ```jsx
  <UniversalModal
    isOpen={isOpen}
    onClose={onClose}
    maxWidth="640px"
    ariaLabel="Titre descriptif"
    disableSafeArea={true}
    header={monHeader}
    footer={monFooter}
  >
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {/* Contenu complet */}
    </div>
  </UniversalModal>
  ```

### 5.2 Personnalisation & Thèmes (`ThemeContext.jsx`)
- Palette HSL calculée dynamiquement (`--accent-primary`, `--accent-subtle`, `--accent-hover`).
- 12+ polices Google Fonts embarquées et applicables à la volée (Inter, Outfit, Roboto, Space Grotesk, Playfair Display, etc.).
- Rayon de courbure des bordures dynamique (`--border-radius-main` de 0px à 999px pour le mode Pilule).
- Dark Mode / Light Mode synchronisé avec préférence système et bascule manuelle instantanée.

---

## 🤖 6. CRITICAL RULES FOR AI AGENTS (Directives Impératives)

> **CES RÈGLES SONT ABSOLUES ET S'APPLIQUENT À TOUTE GÉNÉRATION AUTOMATIQUE DE CODE.**

1. **LECTURE OBLIGATOIRE DE CONTEXT.MD :**
   Avant toute modification d'un fichier source, tu DOIS te référer à ce document pour respecter les conventions architecturales, la structure des dossiers et les noms de services.

2. **ZÉRO LAZY CODE (CODE TRONQUÉ STRICTEMENT INTERDIT) :**
   Ne jamais écrire de code partiel, de placeholders du type `// existing code`, `// ... rest of code`, ou de fermetures de balises approximatives. Tout fichier modifié doit être renvoyé ou édité avec une syntaxe 100% complète et rigoureuse.

3. **CONSERVATION ABSOLUE DES FONCTIONNALITÉS :**
   Ne jamais supprimer ou désactiver les fonctionnalités validées :
   - WebRTC (Appels P2P, STUN, Screen Share, caméras).
   - Upload audio Firebase Storage résumable (`uploadAudioFile`, `uploadBytesResumable`).
   - Transcription vocale SpeechRecognition & Traduction dynamique (`[XX]`).
   - Masquage des identifiants techniques au profit des noms humains (`displayName.js`).
   - Moteur de thèmes et personnalisation visuelle (`ThemeContext.jsx`).

4. **MAÎTRISE DES MODALES & Z-INDEX :**
   Ne crée pas de structures de modales ad-hoc avec des `div` fixes bruts non portalés. Utilise le composant standardisé `UniversalModal` ou vérifie systématiquement que le conteneur est portalé sur `document.body` avec un `z-index >= 9999` et un `overflow-y: auto` scrollable.

5. **VALIDATION SYSTÉMATIQUE DU BUILD & DES TESTS :**
   Après toute modification de code, exécute mentalement ou via les outils disponibles :
   - `npm run build` ou `npx eslint <fichier>`
   Le code ne doit laisser AUCUNE erreur de syntaxe JSX, balise orpheline, ou import manquant.

6. **COMMITS PROPRES & RESPECT DE LA PRODUCTION :**
   Des messages de commit clairs, préfixés par convention (`fix:`, `feat:`, `refactor:`, `docs:`), et une synchronisation propre avec la branche `main`.

7. **REQUÊTES FIRESTORE & IDENTIFIANTS UTILISATEUR :**
   Les requêtes Firestore utilisent EXCLUSIVEMENT profile.uid (jamais email, jamais nom, jamais username) pour filtrer les chats et les données utilisateur.

---

## 📚 DOCUMENT DE RÉFÉRENCE UNIQUE

- **MASTER_AUDIT.md** : Audit ultime fusionné + roadmap vivante du projet.
  Contient l'état réel de chaque tâche (fait / à faire), les failles de
  sécurité, les problèmes de performance, les features à ajouter, triées
  du quick win au plus difficile.
  **À consulter AVANT toute tâche. À mettre à jour APRÈS chaque tâche.**

- **docs/audits-archived/** : Anciens audits fusionnés dans MASTER_AUDIT.md.
  NE PAS UTILISER comme référence. Conservés uniquement pour historique.
