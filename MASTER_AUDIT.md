# 🦄 TROCO — MASTER AUDIT & ROADMAP VIVANTE

> **Dernière mise à jour :** 2026-09-21T16:05:00+02:00  
> **Vision :** Marketplace P2P internationale de troc (biens & services), PWA installable, objectif licorne fintech régulée.  
> **Sources fusionnées :**
> - `CONTEXT.md` (Vision produit, architecture, design system, sécurité Zero-Trust)
> - `🦄 TROCO — ROADMAP ULTIME.txt` (Audit consolidé 130 tâches, roadmap 5 phases)
> - `Audit TROCO DEEPSEEK.txt` (Audit architectural, fuites mémoire, duplications)
> - `AMEILLIORATIONS STEP BY STEP.txt` (Piliers produit, gamification, tokenomics, IoT)
> - `AUDIT_OPERATIONS_TROCO.md` (Audit organisationnel, conformité légale, emails, DSP2/DAC7)
> - `GLOBAL_ARCHITECTURE_AUDIT.md` (Cartographie multi-niveaux, flux d'état Zustand/React/Firestore)
> - `PERFORMANCE_AUDIT.md` & `PERFORMANCE_AUDIT_IOS.md` (Core Web Vitals, re-renders, mémoire canvas)
> - `STEP BY STEP URGENT.txt` & `LISTE DES PROCHAINES FONCTIONNALITES A CODER.txt` (Backlog immédiat)
> - `PROJECT_CONTEXT.md` & `TROCO_PROJECT_HISTORY.md` (Historique des décisions et géoprivacy)
>
> **Score global :** 6.2/10 | **Progression :** 24 / 63 tâches validées avec preuves formelles (38.1%)

---

## 📊 TABLEAU DE BORD

| Phase | Fait | Restant | Progression |
|---|---|---|---|
| 🟢 Quick Wins (Niveau 1 — 15min à 1h) | 7 | 8 | 46.7% |
| 🟡 Facile (Niveau 2 — 1h à 3h) | 6 | 8 | 42.9% |
| 🟠 Moyen (Niveau 3 — 3h à 1 jour) | 8 | 7 | 53.3% |
| 🔴 Difficile (Niveau 4 — 1 à 3 jours) | 3 | 7 | 30.0% |
| 🚨 Très difficile (Niveau 5 — 3j à 2 sem) | 0 | 9 | 0.0% |
| **TOTAL** | **24** | **39** | **38.1%** |

### Score par axe vs cible Licorne
| Axe | Poids | Actuel | Cible Série A | Delta |
|---|---|---|---|---|
| **Sécurité financière** | 25% | 7.5/10 | 10/10 | 🟠 -2.5 |
| **Conformité légale (PSD2, RGPD, DSA, DAC7, KYC/AML)** | 20% | 5.0/10 | 10/10 | 🔴 -5.0 |
| **Architecture & scalabilité** | 15% | 6.5/10 | 9.0/10 | 🟠 -2.5 |
| **Performance mobile-first** | 10% | 7.5/10 | 9.0/10 | 🟡 -1.5 |
| **UX Premium** | 10% | 8.0/10 | 10/10 | 🟡 -2.0 |
| **Observabilité & DevOps** | 10% | 6.5/10 | 9.0/10 | 🟠 -2.5 |
| **Différenciation produit** | 10% | 6.0/10 | 10/10 | 🟠 -4.0 |
| **SCORE GLOBAL PONDÉRÉ** | **100%** | **6.6/10** | **9.6/10** | **-3.0** |

---

## ⏭️ PROCHAINE ACTION RECOMMANDÉE (Niveau 1, Impact max)

**[QW-02] — Filtrage effectif `hideDemos` dans `filteredListings`**
- **Pourquoi :** L'état `hideDemos` et sa persistance localStorage sont déjà connectés au tiroir de filtres, mais la condition `if (hideDemos && item.isDemo) return false;` n'a pas été insérée dans le retour du filtre de `src/App.js:2366`. Résultat : les annonces de démonstration polluent le feed même lorsque l'utilisateur demande à les masquer.
- **Fichier(s) :** `src/App.js` (ligne 2366)
- **Estimation :** 15 minutes
- **Effort/Impact :** ⭐⭐⭐⭐⭐ (Très faible effort, gain immédiat de crédibilité produit)

---

## 🟢 NIVEAU 1 — QUICK WINS (15min - 1h)

### [x] [P0-SEC-04] — Règles Firestore deny-by-default
**Preuve** : `firestore.rules:62-64` (`match /{document=**} { allow read, write: if false; }`)
**Statut** : ✅ FAIT — Verrouillage racine Zero-Trust strict actif.

### [x] [QW-13] — Filtrage temps réel des chats exclusivement par `profile.uid`
**Preuve** : `src/hooks/useChatManager.js:270` (`where('participants', 'array-contains', myUid)`) et `src/App.js:1671`
**Statut** : ✅ FAIT — Élimination de la boucle multi-identifiants (nom/email/username) qui causait les 89 erreurs de permissions Firestore.

### [x] [QW-14] — Requête `fetchListingsPaginated` simplifiée sans index composite requis
**Preuve** : `src/services/firestoreService.js:48-72`
**Statut** : ✅ FAIT — Requête pure `limit(pageSize)` avec tri chronologique en mémoire client.

### [x] [P1-BUG-01] — Toast succès `handleTransferCallTokens` encapsulé dans le bloc try
**Preuve** : `src/App.js:1846` (`setSaveMessage` dans le try, alert d'erreur dans le catch ligne 1851)
**Statut** : ✅ FAIT — Aucun message trompeur en cas d'erreur de débit.

### [x] [P1-BUG-08] — Source unique pour la célébration de solde `prevTokensRef`
**Preuve** : `src/App.js:413, 992-1015`
**Statut** : ✅ FAIT — Écoute centralisée dans le listener `onSnapshot` Firestore, évitant le double déclenchement sonore.

### [x] [P0-PAY-03] — Élimination des fausses transactions injectées `tx-seed-1` / `tx-seed-2`
**Preuve** : `src/data/demoData.js:58` et `src/utils/migrateLocalStorage.js:19` (`parsed.filter(t => !t.id?.startsWith('tx-seed-') && !t.isDemo)`)
**Statut** : ✅ FAIT — Les fausses transactions de seed sont purgées et ignorées.

### [x] [P1-BUG-11] — Suppression de la persistance brute du feed dans localStorage
**Preuve** : Absence de la clé `troco_user_listings` dans `src/` (vérifié par recherche globale)
**Statut** : ✅ FAIT — Le feed provient exclusivement de Firestore sans saturer le quota de stockage local.

---

### [ ] [QW-01] — Harmonisation hauteur/largeur des badges de solde dans AppHeader
**Statut** : ❌ À FAIRE  
**Fichier** : `src/components/layout/AppHeader.jsx:241-295`  
**Estimation** : 20min  
**Impact** : Le bouton solde Euros possède `height: '40px'` et `minWidth: '120px'` alors que le bouton Troco Plus utilise un dimensionnement inline variable, provoquant un saut visuel en version mobile et desktop.

### [ ] [QW-02] — Intégration de la condition `hideDemos` dans le retour de `filteredListings`
**Statut** : ❌ À FAIRE  
**Fichier** : `src/App.js:2366`  
**Estimation** : 15min  
**Impact** : Active enfin le toggle "Masquer les démos" présent dans `FilterDrawer.jsx`.

### [ ] [QW-03] — Ajout de `userCoords` aux dépendances du `useMemo` de `filteredListings`
**Statut** : ❌ À FAIRE  
**Fichier** : `src/App.js:2390-2406`  
**Estimation** : 15min  
**Impact** : Empêche le calcul de distance stale (`getListingDistance`) lorsque l'utilisateur autorise sa position GPS ou change de localisation.

### [ ] [QW-04] — Remplacement de la clé composite instable `key={item.id || index}` dans le feed
**Statut** : ❌ À FAIRE  
**Fichier** : `src/App.js:3941`  
**Estimation** : 15min  
**Impact** : Supprime les avertissements React et garantit la réconciliation du DOM virtuel lors du scroll infini.

### [ ] [QW-05] — Unification des flux parallèles de boost d'annonce
**Statut** : ❌ À FAIRE  
**Fichier** : `src/App.js:2585-2594` (`confirmBoostListing` vs `handleBoostListing`)  
**Estimation** : 30min  
**Impact** : Centralise le boost d'annonce sur la modale de paiement officielle au lieu d'une double logique divergente.

### [ ] [QW-06] — Éradication de l'adresse Gmail personnelle codée en dur
**Statut** : ❌ À FAIRE  
**Fichier** : `src/stores/useAuthStore.js:7`, `src/contexts/AuthContext.jsx:95`, `src/components/AdminPanel.jsx:45`, `src/components/GlobalLiveChat.jsx:84`, `src/features/admin/AdminDashboard.jsx:34`  
**Estimation** : 45min  
**Impact** : Élimine le risque d'usurpation de privilèges administrateur par falsification d'email client, en s'appuyant uniquement sur `useAdminGuard` et les Custom Claims Firebase signés.

### [ ] [QW-07] — Garde anti-écrasement du solde lors de la finalisation d'onboarding
**Statut** : ❌ À FAIRE  
**Fichier** : `src/components/OnboardingWizardModal.jsx:286-287`  
**Estimation** : 20min  
**Impact** : Empêche la réinitialisation brutale à 10 jetons et 50€ si un membre existant rejoue son onboarding.

### [ ] [QW-08] — Remplacement des `window.prompt` par des modales dédiées
**Statut** : ❌ À FAIRE  
**Fichier** : `src/hooks/useAppAuth.js:75`, `src/contexts/AuthContext.jsx:455`, `src/components/CollaborativeWhiteboardModal.jsx:2036`  
**Estimation** : 45min  
**Impact** : Supprime les ruptures d'expérience natives disgracieuses sur mobile lors de la saisie d'email magic-link ou de renommage de documents.

---

## 🟡 NIVEAU 2 — FACILE (1h - 3h)

### [x] [P2-PERF-01] — Hook de temporisation sécurisé `useSafeTimeout` anti-fuite mémoire
**Preuve** : `src/hooks/useSafeTimeout.js:12`
**Statut** : ✅ FAIT — Nettoyage systématique des timers au démontage des composants.

### [x] [P2-PERF-07] — Optimisation de rendu `React.memo` sur les cartes du Feed
**Preuve** : `src/components/FeedCardItem.jsx:587` (`export default React.memo(FeedCardItem, areFeedCardPropsEqual);`)
**Statut** : ✅ FAIT — Évite les re-renders massifs de la grille lors de la saisie dans la barre de recherche.

### [x] [P2-PERF-08] — Saisie fluide dans la recherche avec `useDeferredValue`
**Preuve** : `src/App.js:1345` (`const deferredSearchQuery = useDeferredValue(debouncedSearchQuery);`)
**Statut** : ✅ FAIT — Découplage de la réactivité de l'input et du filtrage des 50+ annonces.

### [x] [P0-SEC-05] — Découplage de l'authentification et du flag `troco_is_authenticated`
**Preuve** : `src/utils/sessionFlags.js:9-14`
**Statut** : ✅ FAIT — La seule source de vérité est `onAuthStateChanged`, le flag localStorage n'est plus qu'une indication de cache.

### [x] [P0-FIN-03] — Séparation stricte du bouton annuler et de la validation dans le checkout
**Preuve** : `src/hooks/useCheckout.js:26-35` (`cancelCheckout` UI pure sans mutation de solde)
**Statut** : ✅ FAIT — Annuler ne déclenche plus de validation financière.

### [x] [P0-SEC-02] — Découplage RGPD des profils publics via la collection `users_public`
**Preuve** : `src/hooks/useUsersPublic.js:20`, `src/services/usersPublicService.js:6`, `functions/src/index.ts:92`
**Statut** : ✅ FAIT — Les données privées des utilisateurs ne sont plus exposées publiquement.

---

### [ ] [FAC-01] — Création du hook `useConfirm()` et de la modale `<ConfirmDialog />`
**Statut** : ❌ À FAIRE  
**Fichier** : `src/hooks/useConfirm.js`, `src/components/ui/ConfirmDialog.jsx`  
**Estimation** : 2h  
**Impact** : Remplacement des 6 `window.confirm()` résiduels dans `AdminPanel.jsx:509, 528, 733, 843`, `CollaborativeWhiteboardModal.jsx:3676`, `SwipeableChatItem.jsx:62`.

### [ ] [FAC-02] — Intégration du composant `PullToRefresh` sur la vue Feed
**Statut** : ❌ À FAIRE  
**Fichier** : `src/components/ui/PullToRefresh.jsx`, `src/features/feed/FeedSection.jsx`  
**Estimation** : 2h  
**Impact** : Offre une gestuelle mobile native fluide pour rafraîchir les annonces sans recharger la page.

### [ ] [FAC-03] — Badge de présence "En ligne" temps réel
**Statut** : ❌ À FAIRE  
**Fichier** : `src/components/FeedCardItem.jsx`, `src/components/ListingDetailModal.jsx`  
**Estimation** : 2h  
**Impact** : Exploite la `presenceMap` existante pour rassurer les acheteurs et booster les prises de contact directes.

### [ ] [FAC-04] — Color picker complet (HEX/RGB/HSL) dans le tableau blanc
**Statut** : ❌ À FAIRE  
**Fichier** : `src/components/CollaborativeWhiteboardModal.jsx:2500`  
**Estimation** : 1h30  
**Impact** : Enrichit les outils créatifs pour les séances de travail partagé.

### [ ] [FAC-05] — Persistance des filtres de recherche préférés
**Statut** : ❌ À FAIRE  
**Fichier** : `src/components/modals/FilterDrawer.jsx`, `src/stores/useFeedStore.js`  
**Estimation** : 2h  
**Impact** : Permet aux membres de sauvegarder leurs requêtes récurrentes ("Bricolage à Paris 11e").

### [ ] [FAC-06] — Mode sombre automatique système + horaire
**Statut** : ❌ À FAIRE  
**Fichier** : `src/contexts/ThemeContext.jsx`  
**Estimation** : 1h30  
**Impact** : Bascule dynamique jour/nuit sans intervention manuelle de l'utilisateur.

### [ ] [FAC-07] — Extraction des libellés français résiduels dans les fichiers JSX
**Statut** : ❌ À FAIRE  
**Fichier** : `src/components/modals/`, `src/components/ui/`  
**Estimation** : 2h30  
**Impact** : Assure une couverture multilingue sans faille pour les utilisateurs anglophones, hispanophones ou germanophones.

### [ ] [FAC-08] — Harmonisation accessibilité a11y (ARIA, contrastes WCAG AA, focus-visible)
**Statut** : ❌ À FAIRE  
**Fichier** : `src/index.css`, composants de modales  
**Estimation** : 3h  
**Impact** : Conformité légale européenne d'accessibilité numérique.

---

## 🟠 NIVEAU 3 — MOYEN (3h - 1 jour)

### [x] [P0-FIN-04] — Service de transfert atomique unifié `walletService.transferAtomically`
**Preuve** : `src/services/walletService.js:15`
**Statut** : ✅ FAIT — Fusion des 3 flux distincts de transfert de fonds sous une signature unique et robuste.

### [x] [P0-FIN-02] — Cloud Function server-authoritative `applyPayment`
**Preuve** : `functions/src/index.ts:110` et `src/services/paymentService.js:14`
**Statut** : ✅ FAIT — Seul le serveur dispose des droits d'écriture sur les soldes utilisateurs.

### [x] [P0-FIN-01] — Cloud Function `claimBonus` sécurisée côté serveur
**Preuve** : `functions/src/index.ts:118` et `src/services/paymentService.js:42`
**Statut** : ✅ FAIT — Validation d'éligibilité et idempotence gérées sur le cloud.

### [x] [MÉD-01] — Moteur de transcription vocale Web Speech API avec respect de la vie privée
**Preuve** : `src/services/liveTranscriptionService.js:36`
**Statut** : ✅ FAIT — Arrêt instantané du flux audio et des sous-titres lors de l'activation du Mute.

### [x] [MÉD-02] — Service d'enregistrement et d'upload audio résumable sur Firebase Storage
**Preuve** : `src/services/voiceStorageService.js:21`
**Statut** : ✅ FAIT — Support multi-format (MP4/WebM/OGG) avec fallback DataURL en cas de coupure réseau.

### [x] [MÉD-03] — Moteur de traduction dynamique à la volée des annonces
**Preuve** : `src/utils/dynamicTranslation.js`, `src/utils/translationHelpers.js:8`
**Statut** : ✅ FAIT — Adaptation linguistique temps réel sans altération des données d'origine.

### [x] [P2-OBS-01] — Moteur de journalisation conditionnel `logger.js`
**Preuve** : `src/utils/logger.js:1`
**Statut** : ✅ FAIT — Isolation stricte des logs en production.

### [x] [P2-TEST-04] — Pipeline CI/CD GitHub Actions automatisé
**Preuve** : `.github/workflows/ci.yml:1`
**Statut** : ✅ FAIT — Vérification automatique des types, linting et tests à chaque push/PR.

---

### [ ] [MOY-01] — Remplacement de `localStorage` synchrone dans les listeners par IndexedDB
**Statut** : ❌ À FAIRE  
**Fichier** : `src/hooks/useChatManager.js`, `src/hooks/useAppAuth.js`  
**Estimation** : 4h  
**Impact** : Élimine les micro-saccades du thread principal lors des grosses réceptions de messages ou de profils.

### [ ] [MOY-02] — Extraction du feed d'annonces hors de `App.js` vers `useListingsFeed.js`
**Statut** : ❌ À FAIRE  
**Fichier** : `src/hooks/useListingsFeed.js`, `src/App.js`  
**Estimation** : 5h  
**Impact** : Allège `App.js` d'environ 400 lignes et isole la logique de pagination et de filtres.

### [ ] [MOY-03] — Extraction du chronomètre d'appel vers `useCallTimer.js`
**Statut** : ❌ À FAIRE  
**Fichier** : `src/hooks/useCallTimer.js`, `src/App.js:1730-1860`  
**Estimation** : 4h  
**Impact** : Encapsule la tarification à la minute et la modale de bilan visio dans un module indépendant.

### [ ] [MOY-04] — Extraction des notifications transactionnelles vers `useTransactionNotifications.js`
**Statut** : ❌ À FAIRE  
**Fichier** : `src/hooks/useTransactionNotifications.js`, `src/App.js`  
**Estimation** : 4h  
**Impact** : Élimine la dette technique de gestion d'alertes sonores et de bannières dans le composant racine.

### [ ] [MOY-05] — Widget réengagement "Mes deals en cours" en tête du Feed
**Statut** : ❌ À FAIRE  
**Fichier** : `src/features/feed/FeedSection.jsx`, `src/components/ActiveDealsWidget.jsx`  
**Estimation** : 5h  
**Impact** : Augmente de 25% la réactivité des utilisateurs sur les propositions en attente.

### [ ] [MOY-06] — Exportation native des documents Troco Office Suite (.pdf, .docx, .xlsx)
**Statut** : ❌ À FAIRE  
**Fichier** : `src/features/workspace/CloudOfficeSuiteModal.jsx`  
**Estimation** : 6h  
**Impact** : Transformation de la suite bureautique en un véritable outil de productivité professionnelle.

### [ ] [MOY-07] — Double validation bilatérale pour le troc pur sans monnaie
**Statut** : ❌ À FAIRE  
**Fichier** : `src/components/ChatView.jsx`, `src/services/dealService.js`  
**Estimation** : 5h  
**Impact** : Sécurise les échanges physiques en exigeant la confirmation mutuelle de fin de prestation.

---

## 🔴 NIVEAU 4 — DIFFICILE (1 - 3 jours)

### [x] [P2-TEST-03] — Suite de tests unitaires des règles de sécurité Firestore
**Preuve** : `tests/rules/firestore.rules.test.js:1`, `tests/rules/users_public.test.js:1`
**Statut** : ✅ FAIT — Validation automatisée du verrouillage des soldes, droits propriétaires et accès admin.

### [x] [P0-GDPR-01] — Cloud Functions RGPD de suppression de compte et anonymisation
**Preuve** : `functions/src/gdpr/deleteUserCompletely.ts`, `functions/src/gdpr/anonymizeTransactions.ts`
**Statut** : ✅ FAIT — Cascade de nettoyage conforme à l'article 17 du RGPD (droit à l'effacement).

### [x] [P0-SEC-01] — Protection administrateur par Custom Claims vérifiés
**Preuve** : `src/hooks/useAdminGuard.js:25`, `firestore.rules:46`
**Statut** : ✅ FAIT — Les rôles s'appuient sur des jetons cryptographiques signés par Firebase Admin SDK.

---

### [ ] [DIF-01] — Intégration PSP réelle (Stripe Connect Express / Adyen for Platforms)
**Statut** : ❌ À FAIRE  
**Fichier** : `functions/src/payments/providers/stripeProvider.ts`, `src/services/paymentService.js`  
**Estimation** : 3 jours  
**Impact** : Remplacement du `mockProvider.ts` pour permettre des recharges et retraits bancaires réels et légaux (conformité DSP2).

### [ ] [DIF-02] — Intégration d'un provider KYC certifié (Stripe Identity / Onfido)
**Statut** : ❌ À FAIRE  
**Fichier** : `src/components/KycModal.jsx`, `functions/src/kyc/`  
**Estimation** : 2 jours  
**Impact** : Fin du KYC simulé localement, vérification réelle d'identité obligatoire pour les seuils > 250 € (conformité AML).

### [ ] [DIF-03] — Module de reporting fiscal européen automatisé (DAC7)
**Statut** : ❌ À FAIRE  
**Fichier** : `functions/src/compliance/dac7Report.ts`  
**Estimation** : 2 jours  
**Impact** : Obligation légale européenne pour les plateformes d'économie collaborative.

### [ ] [DIF-04] — Déploiement et enforcement de Firebase App Check en production
**Statut** : ❌ À FAIRE  
**Fichier** : `src/firebase.js:38`, Console Firebase / Cloud Armor  
**Estimation** : 1 jour  
**Impact** : Protection contre les bots, le scraping d'annonces et les attaques par déni de service économique sur Firestore.

### [ ] [DIF-05] — Suite de tests End-to-End Playwright sur les parcours critiques
**Statut** : ❌ À FAIRE  
**Fichier** : `e2e/auth.spec.js`, `e2e/deal.spec.js`, `e2e/payment.spec.js`  
**Estimation** : 2 jours  
**Impact** : Empêche toute régression sur les flux de transaction avant mise en production.

### [ ] [DIF-06] — Modération automatisée de contenu (DSA - Digital Services Act)
**Statut** : ❌ À FAIRE  
**Fichier** : `functions/src/moderation/autoModeration.ts`  
**Estimation** : 2 jours  
**Impact** : Détection des arnaques et contenus illicites avec délai de traitement < 24h.

### [ ] [DIF-07] — Flux de résolution des litiges et séquestre escrow contractuel
**Statut** : ❌ À FAIRE  
**Fichier** : `src/features/disputes/`, `functions/src/payments/escrow.ts`  
**Estimation** : 2 jours  
**Impact** : Gestion transparente des désaccords et protection des fonds jusqu'à validation.

---

## 🚨 NIVEAU 5 — TRÈS DIFFICILE (3 jours - 2 semaines)

### [ ] [TDIF-01] — Refonte architecturale modulaire complète : Découpage de `src/App.js` en routes
**Statut** : ❌ À FAIRE  
**Fichier** : `src/App.jsx` (cible < 400 lignes), `src/routes/FeedRoute.jsx`, `ChatRoute.jsx`, `ProfileRoute.jsx`, `PostRoute.jsx`, `LegalRoute.jsx`  
**Estimation** : 5 jours  
**Impact** : `src/App.js` compte actuellement 5 295 lignes. Ce découpage est impératif pour permettre à une équipe de développeurs de collaborer sans conflits Git massifs et réduire la complexité cyclomatique.

### [ ] [TDIF-02] — IA de Matching Prédictif & Recherche Vectorielle (Vector Search)
**Statut** : ❌ À FAIRE  
**Fichier** : `functions/src/ai/vectorSearch.ts`, Cloud Firestore Vector Embeddings  
**Estimation** : 5 jours  
**Impact** : Proposition automatique de trocs parfaits entre compétences complémentaires dans un même périmètre géographique.

### [ ] [TDIF-03] — Assistant IA de rédaction d'annonces par vision par ordinateur
**Statut** : ❌ À FAIRE  
**Fichier** : `src/features/post/AIAssistantModal.jsx`, API Vertex AI / Gemini  
**Estimation** : 4 jours  
**Impact** : Dépôt d'annonce guidé en 15 secondes à partir d'une simple photo de matériel ou d'un descriptif vocal.

### [ ] [TDIF-04] — Escrow visuel interactif avec timeline cinématique
**Statut** : ❌ À FAIRE  
**Fichier** : `src/components/deal/EscrowTimeline.jsx`  
**Estimation** : 3 jours  
**Impact** : Moat concurrentiel majeur matérialisant chaque étape (Séquestre → En cours → Contrôle qualité → Clôture).

### [ ] [TDIF-05] — Authentification 2FA (TOTP) et biométrie native WebAuthn (Face ID / Touch ID)
**Statut** : ❌ À FAIRE  
**Fichier** : `src/features/auth/WebAuthnManager.js`, `functions/src/auth/`  
**Estimation** : 4 jours  
**Impact** : Standard bancaire pour la validation des transactions de plus de 100 €.

### [ ] [TDIF-06] — Support multi-devises fiat & paiement stablecoins crypto (USDC / USDT)
**Statut** : ❌ À FAIRE  
**Fichier** : `functions/src/payments/cryptoProvider.ts`, `src/services/currencyService.js`  
**Estimation** : 6 jours  
**Impact** : Expansion internationale sans friction de conversion monétaire pour les pays émergents.

### [ ] [TDIF-07] — Monétisation B2B & MRR récurrent (Troco Pass & Troco Business)
**Statut** : ❌ À FAIRE  
**Fichier** : `src/features/subscription/`, `functions/src/billing/`  
**Estimation** : 6 jours  
**Impact** : Facturation avec TVA intracommunautaire, gestion multi-utilisateurs et abonnements récurrents.

### [ ] [TDIF-08] — Mode hors-ligne enrichi avec queue de synchronisation résiliente
**Statut** : ❌ À FAIRE  
**Fichier** : `src/service-worker.js`, `src/utils/offlineQueue.js`  
**Estimation** : 4 jours  
**Impact** : Signature et consultation de deals sans aucune connexion internet active.

### [ ] [TDIF-09] — Troco Live multi-participants (LiveKit / WebRTC SFU)
**Statut** : ❌ À FAIRE  
**Fichier** : `src/features/live/LiveRoomModal.jsx`  
**Estimation** : 6 jours  
**Impact** : Ateliers de formation collectifs et sessions de dépannage de quartier en direct.

---

## 🔒 FAILLES DE SÉCURITÉ IDENTIFIÉES

### Critiques
- [ ] **Admin hardcodé par adresse email client :** Présence de `mateopolo91@gmail.com` dans `src/stores/useAuthStore.js:7`, `src/contexts/AuthContext.jsx:95`, `src/components/AdminPanel.jsx:45`, `src/components/GlobalLiveChat.jsx:84`, `src/features/admin/AdminDashboard.jsx:34`. À remplacer par la vérification stricte du custom claim admin via `useAdminGuard`.
- [ ] **Paiement et KYC simulés en production :** L'interface affiche des paiements par carte/Apple Pay et valide le KYC localement sans passer par un établissement de paiement agréé (ACPR/DSP2).

### Importantes
- [ ] **Incohérence du nom de domaine public :** Coexistence de `troco.fr` (mentions légales, politiques) et `troco.app` (placeholder d'inscription, liens WebRTC, tests).
- [ ] **Infrastructure email non provisionnée :** Les adresses obligatoires (`abuse@troco.fr`, `privacy@troco.fr`, `support@troco.fr`) ne disposent pas de serveur de messagerie opérationnel avec enregistrements SPF/DKIM/DMARC.

### Mineures
- [ ] **Console logs résiduels dans certains composants :** Remplacer les `console.warn` et `console.error` restants par le singleton `logger.js`.

---

## ⚡ PROBLÈMES DE PERFORMANCE

| Problème | Impact mesuré | Fix | Priorité |
|---|---|---|---|
| **Monolithe `App.js` de 5 295 lignes** | Re-renders fréquents, complexité de maintenance, bundle initial lourd | Découper en routes et hooks modulaires | 🔴 Haute |
| **Absence de `userCoords` dans deps `filteredListings`** | Distance géographique figée lors de la mise à jour GPS | Ajouter `userCoords` au tableau de dépendances | 🟠 Moyenne |
| **`key={item.id \|\| index}` dans le feed** | Désynchronisation potentielle des animations Framer Motion | Utiliser exclusivement `item.id` | 🟡 Basse |
| **Canvas Whiteboard intensif** | Dégradation FPS au-delà de 15 000 points vectoriels | Partitionnement spatial par bounding boxes | 🟡 Basse |

---

## 🚀 FONCTIONNALITÉS À AJOUTER

### Court terme (Quick wins produit)
- [ ] Pull-to-refresh sur le feed mobile
- [ ] Badge "En ligne" temps réel
- [ ] Filtres sauvegardés dans le profil

### Moyen terme (Différenciateurs)
- [ ] Troco Escrow visuel animé
- [ ] Double validation des trocs physiques
- [ ] Exports natifs documents de bureau (.pdf, .docx)

### Long terme (Vision licorne)
- [ ] IA de Matching vectoriel et assistant de rédaction
- [ ] Troco Pass (abonnements) & Troco Business (B2B)
- [ ] Portefeuille multi-devises fiat & crypto

---

## 💰 ROADMAP FINANCE & CONFORMITÉ

### Paiements
- [ ] Intégration Stripe Connect Express
- [ ] Apple Pay / Google Pay natif via Stripe Elements
- [ ] Gestion automatisée des commissions de service

### KYC / AML
- [ ] Intégration Stripe Identity pour vérification de pièce d'identité
- [ ] Screening des listes de sanctions internationales (OFAC, UE, ONU)
- [ ] Règles de détection des transactions suspectes > 10 000 €

### Sécurité paiements
- [ ] Authentification forte 3D Secure 2 (DSP2 / SCA)
- [ ] Confirmation biométrique WebAuthn sur transactions sensibles
- [ ] Signature électronique horodatée pour les deals de valeur

### Conformité
- [ ] Module déclaratif annuel DAC7
- [ ] Registre formel des activités de traitement RGPD
- [ ] Désignation d'un DPO et boîte `privacy@` sécurisée

---

## ⚠️ À VÉRIFIER MANUELLEMENT (hors code)

- [ ] Déploiement effectif des règles `firestore.rules` sur la console Firebase du projet `troco-8a6eb`
- [ ] Configuration des règles CORS sur le bucket Firebase Storage (`gsutil cors get gs://troco-8a6eb.firebasestorage.app`)
- [ ] Activation du mode Enforced pour Firebase App Check dans la console Google Cloud
- [ ] Configuration des variables d'environnement secrètes dans Google Secret Manager / Vercel
- [ ] Validation des enregistrements DNS (SPF, DKIM, DMARC) pour le domaine de messagerie officiel

---

## 🔄 RÈGLE DE MISE À JOUR

Ce document constitue **LE tableau de bord unique et absolu** de Troco.
À CHAQUE tâche réalisée :
1. Consulter `MASTER_AUDIT.md` avant toute intervention.
2. Vérifier la complétion de la tâche dans le code réel.
3. Remplacer `[ ]` par `[x]` avec la **preuve exacte** (`chemin/fichier:ligne`).
4. Mettre à jour les compteurs du tableau de bord.
5. Actualiser la section "Prochaine action recommandée".
6. Consigner les modifications dans un commit clair.

---

## 📌 RÉSUMÉ DÉCIDEUR

- **État actuel :** 6.6/10. Les fondations de base de données Firestore et la gestion des flux temps réel sont désormais assainies et sécurisées par UID.
- **Forces majeures :** Design épuré, couverture fonctionnelle très riche (P2P, visio WebRTC, bureau collaboratif, 7 langues), transactions atomiques serveur.
- **Faiblesses critiques :** Monolithe `App.js` de 5 295 lignes, absence de PSP réel connecté en production (mock provider actif), adresses email opérationnelles à provisionner.
- **Prochain jalon stratégique :** Clôture intégrale des Quick Wins (Niveau 1) et branchement de Stripe Connect / Stripe Identity.
- **Horizon Licorne :** 12 à 18 mois avec exécution rigoureuse de la roadmap.
