# 🏛️ AUDIT D'ARCHITECTURE & CARTOGRAPHIE DU DÉSORDRE `src/`

> **Rôle :** Principal React Architect & SRE  
> **Statut :** Audit Lecture Seule (Strict Read-Only)  
> **Date de réalisation :** 10 Septembre 2026  
> **Application :** Troco (P2P Marketplace & Real-Time Collab)  
> **Garantie d'intégrité :** ZÉRO fichier de code renommé, déplacé, modifié ou supprimé lors de cet audit.

---

## 1. INVENTAIRE BRUT

- **Nombre total de fichiers dans `src/` :** `308 fichiers`
- **Taille totale du répertoire `src/` :** `3.73 Mo` (`3 915 955 octets`)
- **Fichiers de code hors tests :** `230 fichiers`
- **Fichiers de tests unitaires/intégration :** `64 fichiers`
- **Fichiers de style / assets / configuration :** `14 fichiers`

### Répartition détaillée par dossier

| Dossier | Nombre de fichiers | Pourcentage | Statut structurel |
| :--- | :---: | :---: | :--- |
| `src/components` (racine) | **131** | **42.5%** | 🚨 **Critique : Surchargé (76 composants + 55 tests à plat)** |
| `src/utils` | **33** | **10.7%** | ⚠️ Élevé (mélange helpers, audio, géocodage, hooks) |
| `src/services` | **17** | **5.5%** | Correct (services métier API & Firestore) |
| `src/hooks` | **14** | **4.5%** | Homogène (hooks d'état applicatif) |
| `src/components/ui` | **12** | **3.9%** | Bon (primitives graphiques) |
| `src` (racine directe) | **11** | **3.6%** | Acceptable (`App.js`, `index.js`, CSS globaux) |
| `src/components/common` | **11** | **3.6%** | Correct (bannières, loaders, fallbacks) |
| `src/components/modals` | **7** | **2.3%** | ⚠️ Sous-utilisé (26 modales sont restées dans `src/components`) |
| `src/contexts` | **7** | **2.3%** | Attention (3 contextes orphelins identifiés) |
| `src/stores` | **7** | **2.3%** | Bon (stores Zustand) |
| `src/data` | **6** | **1.9%** | Bon (mocks et référentiels de données) |
| `src/features/admin` | **5** | **1.6%** | Modularisé |
| `src/features/map` | **5** | **1.6%** | Modularisé |
| `src/utils/diagnostics` | **5** | **1.6%** | ⚠️ 5 scripts de debug temporaires orphelins |
| `src/components/layout` | **4** | **1.3%** | Incomplet (`Navbar` et `Footer` sont à la racine) |
| `src/features/call` | **4** | **1.3%** | Modularisé (WebRTC) |
| `src/features/workspace` | **4** | **1.3%** | Partiellement modularisé (bureautique collaborative) |
| `src/components/chat` | **3** | **1.0%** | Fragmenté avec `src/components` et `src/features/chat` |
| `src/components/profile` | **3** | **1.0%** | Fragmenté avec `src/features/profile` |
| `src/features/chat` | **3** | **1.0%** | Fragmenté avec `src/components/chat` |
| `src/features/community` | **2** | **0.6%** | Modularisé |
| `src/features/feed` | **2** | **0.6%** | Modularisé |
| `src/features/payment` | **2** | **0.6%** | Modularisé |
| `src/features/post` | **2** | **0.6%** | Modularisé |
| `src/features/profile` | **2** | **0.6%** | Modularisé |
| `src/components/core` | **1** | **0.3%** | `text-effect.jsx` isolé |
| `src/config` | **1** | **0.3%** | Configuration Firebase |
| `src/features/auth` | **1** | **0.3%** | `AuthScreen.jsx` |
| `src/features` (index racine) | **1** | **0.3%** | Barrel exports |
| `src/lib` | **1** | **0.3%** | Configuration tierce |
| `src/locales` | **1** | **0.3%** | Traductions |

---

## 2. LISTE NOIRE DES NOMS ABERRANTS

Critères d'anomalie :
1. Préfixe d'itération obsolète `PhaseXXX`
2. Mot-clé de bricolage temporaire (`fix`, `dead`, `restore`, etc.)
3. Casing non conventionnel (ex: `kebab-case` pour un composant React au lieu de `PascalCase`)

| Chemin actuel | Nom proposé | Raison de l'anomalie |
| :--- | :--- | :--- |
| `src/components/core/text-effect.jsx` | `TextEffect.jsx` | Kebab-case au lieu de PascalCase pour un composant React |
| `src/components/Phase102ScrollAndLobby.test.js` | `ScrollAndLobby.test.js` | Préfixe itératif `Phase102` dans le nom de test |
| `src/components/Phase103WorkspaceDefense.test.js` | `WorkspaceDefense.test.js` | Préfixe itératif `Phase103` dans le nom de test |
| `src/components/Phase104CookieAndButtons.test.js` | `CookieAndButtons.test.js` | Préfixe itératif `Phase104` dans le nom de test |
| `src/components/Phase105LobbyAndModal.test.js` | `LobbyAndModal.test.js` | Préfixe itératif `Phase105` dans le nom de test |
| `src/components/Phase106MobilePerfKillSwitch.test.js` | `MobilePerfKillSwitch.test.js` | Préfixe itératif `Phase106` dans le nom de test |
| `src/components/Phase107SubscriptionPricing.test.js` | `SubscriptionPricing.test.js` | Préfixe itératif `Phase107` dans le nom de test |
| `src/components/Phase108WebGLOOMRemediation.test.js` | `WebGLOOMRemediation.test.js` | Préfixe itératif `Phase108` dans le nom de test |
| `src/components/Phase109FinancialSyncAndAtomicTransfer.test.js` | `FinancialSyncAndAtomicTransfer.test.js` | Préfixe itératif `Phase109` dans le nom de test |
| `src/components/Phase110WhiteboardProEngine.test.js` | `WhiteboardProEngine.test.js` | Préfixe itératif `Phase110` dans le nom de test |
| `src/components/Phase111GodModeFactoryReset.test.js` | `GodModeFactoryReset.test.js` | Préfixe itératif `Phase111` dans le nom de test |
| `src/components/Phase112AdminInspectionPasserelle.test.js` | `AdminInspectionPasserelle.test.js` | Préfixe itératif `Phase112` dans le nom de test |
| `src/components/Phase114HardwareTouchWebGLNeutralization.test.js` | `HardwareTouchWebGLNeutralization.test.js` | Préfixe itératif `Phase114` dans le nom de test |
| `src/components/Phase115NativeVirtualizationAndSmartGlassmorphism.test.js` | `NativeVirtualizationAndSmartGlassmorphism.test.js` | Préfixe itératif `Phase115` dans le nom de test |
| `src/components/Phase116StateDecouplingAndMemoryLeaks.test.js` | `StateDecouplingAndMemoryLeaks.test.js` | Préfixe itératif `Phase116` dans le nom de test |
| `src/components/Phase117ModalCenteringAndHeaderMobile.test.js` | `ModalCenteringAndHeaderMobile.test.js` | Préfixe itératif `Phase117` dans le nom de test |
| `src/components/Phase118WhiteboardToolbarSwipeAndLandscape.test.js` | `WhiteboardToolbarSwipeAndLandscape.test.js` | Préfixe itératif `Phase118` dans le nom de test |
| `src/components/Phase119DynamicTranslationAndLanguageSync.test.js` | `DynamicTranslationAndLanguageSync.test.js` | Préfixe itératif `Phase119` dans le nom de test |
| `src/components/Phase121ContinuousTextAndToolbarRestore.test.js` | `ContinuousTextAndToolbarRestore.test.js` | Préfixe itératif `Phase121` dans le nom de test |
| `src/components/Phase122MotionPrimitivesTextEffect.test.js` | `MotionPrimitivesTextEffect.test.js` | Préfixe itératif `Phase122` dans le nom de test |
| `src/components/Phase122WhiteboardSingleLineToolbar.test.js` | `WhiteboardSingleLineToolbar.test.js` | Préfixe itératif `Phase122` dans le nom de test |
| `src/components/Phase123NotesModalHeaderRefactor.test.js` | `NotesModalHeaderRefactor.test.js` | Préfixe itératif `Phase123` dans le nom de test |
| `src/components/Phase123TokenSoundAndAudioUpload.test.js` | `TokenSoundAndAudioUpload.test.js` | Préfixe itératif `Phase123` dans le nom de test |
| `src/components/Phase124PredefinedThemesAndMagicConflict.test.js` | `PredefinedThemesAndMagicConflict.test.js` | Préfixe itératif `Phase124` dans le nom de test |
| `src/components/Phase124WebRTCSubtitleLanguageUnlock.test.js` | `WebRTCSubtitleLanguageUnlock.test.js` | Préfixe itératif `Phase124` dans le nom de test |
| `src/components/Phase125CloudOfficeSuiteUpgrade.test.js` | `CloudOfficeSuiteUpgrade.test.js` | Préfixe itératif `Phase125` dans le nom de test |
| `src/components/Phase126WorkspaceHeaderUnification.test.js` | `WorkspaceHeaderUnification.test.js` | Préfixe itératif `Phase126` dans le nom de test |
| `src/components/Phase127WhiteboardDeadButtonsFix.test.js` | `WhiteboardButtons.test.js` | Préfixe `Phase127` + qualificatifs `DeadButtonsFix` |
| `src/components/Phase128FinancialAtomicEngineAndCustomTip.test.js` | `FinancialAtomicEngineAndCustomTip.test.js` | Préfixe itératif `Phase128` dans le nom de test |
| `src/components/Phase129TransactionSuccessAndFloatingGain.test.js` | `TransactionSuccessAndFloatingGain.test.js` | Préfixe itératif `Phase129` dans le nom de test |
| `src/components/Phase129WhiteboardPureAestheticsRestore.test.js` | `WhiteboardPureAesthetics.test.js` | Préfixe `Phase129` + qualificatif `Restore` |
| `src/components/Phase130CookieBannerPortalRestore.test.js` | `CookieBannerPortal.test.js` | Préfixe `Phase130` + qualificatif `Restore` |
| `src/components/Phase131WhiteboardPillToolbarFusion.test.js` | `WhiteboardPillToolbarFusion.test.js` | Préfixe itératif `Phase131` dans le nom de test |
| `src/components/Phase132DesignStudioModalExtraction.test.js` | `DesignStudioModalExtraction.test.js` | Préfixe itératif `Phase132` dans le nom de test |
| `src/components/Phase133DynamicProfileStats.test.js` | `DynamicProfileStats.test.js` | Préfixe itératif `Phase133` dans le nom de test |
| `src/components/Phase134ReviewsSection.test.js` | `ReviewsSection.test.js` | Préfixe itératif `Phase134` dans le nom de test |
| `src/components/Phase135AutoSaveAndBackdropDefense.test.js` | `AutoSaveAndBackdropDefense.test.js` | Préfixe itératif `Phase135` dans le nom de test |
| `src/components/Phase136RichTextToolbarActivation.test.js` | `RichTextToolbarActivation.test.js` | Préfixe itératif `Phase136` dans le nom de test |
| `src/components/Phase137MinimalistAppleNotes.test.js` | `MinimalistAppleNotes.test.js` | Préfixe itératif `Phase137` dans le nom de test |
| `src/components/Phase138WorkspaceFullscreenHeaderRefactor.test.js` | `WorkspaceFullscreenHeader.test.js` | Préfixe `Phase138` + qualificatif `Refactor` |
| `src/components/Phase139TrocoDocsA4ClickToFocus.test.js` | `TrocoDocsA4ClickToFocus.test.js` | Préfixe itératif `Phase139` dans le nom de test |
| `src/components/Phase140NotesModalPremiumAlignment.test.js` | `NotesModalAlignment.test.js` | Préfixe `Phase140` + qualificatif temporaire |
| `src/components/Phase141LegalCompliance.test.js` | `LegalCompliance.test.js` | Préfixe itératif `Phase141` dans le nom de test |
| `src/components/Phase142ConsentAndTrackerAudit.test.js` | `ConsentAndTrackerAudit.test.js` | Préfixe itératif `Phase142` dans le nom de test |
| `src/components/Phase143Accessibility.test.js` | `Accessibility.test.js` | Préfixe itératif `Phase143` dans le nom de test |
| `src/components/Phase144EthicalTransparency.test.js` | `EthicalTransparency.test.js` | Préfixe itératif `Phase144` dans le nom de test |
| `src/components/Phase3ProfileRestructuring.test.js` | `ProfileRestructuring.test.js` | Préfixe itératif `Phase3` dans le nom de test |
| `src/components/Phase3WorkspaceHarmony.test.js` | `WorkspaceHarmony.test.js` | Préfixe itératif `Phase3` dans le nom de test |
| `src/components/Phase4AudioTranscription.test.js` | `AudioTranscription.test.js` | Préfixe itératif `Phase4` dans le nom de test |
| `src/components/Phase4CinematicDeal.test.js` | `CinematicDeal.test.js` | Préfixe itératif `Phase4` dans le nom de test |
| `src/components/Phase4LegalAndA11y.test.js` | `LegalAndA11y.test.js` | Préfixe itératif `Phase4` dans le nom de test |

---

## 3. DÉTECTION DES DOUBLONS SUSPECTS

Pour chaque paire, analyse comparative rigoureuse du code source, des props, des exports et des points d'import réels dans l'application.

| Fichier A | Fichier B | Similarité | Recommandation |
| :--- | :--- | :---: | :--- |
| `src/components/AuthScreen.jsx` *(11.6 Ko)* | `src/features/auth/AuthScreen.jsx` *(54.6 Ko)* | **65%** | **Supprimer Fichier A (clone obsolète).** `App.js` importe exclusivement `src/features/auth/AuthScreen.jsx`. Le fichier A est un ancien prototype abandonné. |
| `src/components/CheckoutModal.jsx` *(10.4 Ko)* | `src/components/modals/CheckoutModal.jsx` *(10.1 Ko)* | **96%** | **Supprimer Fichier A (clone non utilisé).** `App.js` importe le Fichier B (`./components/modals/CheckoutModal`). Le Fichier A n'est importé nulle part. |
| `src/components/FilterDrawer.jsx` *(5.8 Ko)* | `src/components/modals/FilterDrawer.jsx` *(11.4 Ko)* | **70%** | **Supprimer Fichier A (ancienne version tronquée).** `App.js` importe le Fichier B (`./components/modals/FilterDrawer`). Le Fichier A est orphelin. |
| `src/services/audioService.js` *(8.4 Ko)* | `src/utils/audioService.js` *(4.3 Ko)* | **60%** | **Fusionner dans `src/services/audioService.js`.** L'application a deux moteurs audio concurrents : `utils` gère `playApplePaySound` et `playBetclicBalanceSound`, tandis que `services` gère Web Audio API, ringtones WebRTC, `playPop` et `playSwoosh`. Unifier sous `src/services/audioService.js` avec redirection transparente. |
| `src/components/chat/ChatHeader.jsx` *(41 octets)* | `src/components/ChatHeader.jsx` *(5.8 Ko)* | **100% (alias)** | **Consolider dans `src/components/chat/ChatHeader.jsx`.** Le fichier A n'est qu'un stub réexportant `../ChatHeader`. Déplacer l'implémentation réelle dans `components/chat/` et supprimer le stub. |
| `src/components/MessageBubble.jsx` *(48 octets)* | `src/components/chat/MessageBubble.jsx` *(1.5 Ko)* | **100% (alias)** | **Consolider dans `src/components/chat/MessageBubble.jsx`.** Le fichier A n'est qu'un stub réexportant `./chat/MessageBubble`. Supprimer le stub à la racine de `components/`. |
| `src/components/InteractiveMapView.jsx` *(134 octets)* | `src/features/map/InteractiveMapView.jsx` *(18.2 Ko)* | **100% (passerelle)** | **Supprimer Fichier A après mise à jour des imports.** Le fichier A est une passerelle de re-export pour `FeedView`. `FeedView` doit importer directement depuis `features/map/`. |
| `src/hooks/useGlobalContent.js` *(146 octets)* | `src/features/admin/useGlobalContent.js` *(4.2 Ko)* | **100% (re-export)** | **Consolider dans `src/hooks/useGlobalContent.js`.** Le hook métier doit résider dans `src/hooks/`, et être importé par la feature admin. |
| `src/components/CallModal.jsx` *(1.1 Ko)* | `src/features/call/WebRTCCallOverlay.jsx` *(36.4 Ko)* | **30%** | **Supprimer Fichier A (prototype abandonné).** Remplacé intégralement par le moteur WebRTC en production (`WebRTCCallOverlay`). |
| `src/components/UserProfile.jsx` *(15.2 Ko)* | `src/features/profile/ProfileFeature.jsx` *(31.8 Ko)* | **55%** | **Consolider vers `features/profile/`.** `UserProfile.jsx` est un reliquat partiel de l'ancien profil monolithique. |
| `src/components/ListingDetails.jsx` *(8.1 Ko)* | `src/components/ListingDetailModal.jsx` *(14.2 Ko)* | **65%** | **Consolider.** `ListingDetailModal` gère l'affichage modale plein écran alors que `ListingDetails` est un ancien bloc partiel. |
| `src/components/ChatView.jsx` *(108 Ko)* | `src/features/chat/ChatSection.jsx` *(5.2 Ko)* | **Complémentaires** | **À ne pas fusionner brutalement.** `ChatSection` sert de container d'orchestration pour `ChatView`. Ce sont deux composants légitimes mais imbriqués. |

---

## 4. FICHIERS ORPHELINS (JAMAIS IMPORTÉS)

Ces 20 fichiers sont présents dans `src/` mais ne sont référencés par **aucun** fichier de l'application ni par aucun test.

| Fichier orphelin | Poids | Nature / Cause de l'abandon | Action recommandée en Vague 3 |
| :--- | :---: | :--- | :--- |
| `src/components/CallModal.jsx` | 1.1 Ko | Ancien modal d'appel mocké sans WebRTC | Suppression sécurisée |
| `src/components/CategoryHints.jsx` | 2.3 Ko | Anciennes pastilles de suggestion de catégorie | Suppression sécurisée |
| `src/components/LanguageModal.jsx` | 3.8 Ko | Ancien modal de langue, remplacé par sélecteur inline | Suppression sécurisée |
| `src/components/modals/GlobalModalWrapper.jsx` | 1.4 Ko | Prototype d'enveloppe modale, supplanté par `Portal.jsx` | Suppression sécurisée |
| `src/components/PublishWizard.jsx` | 12.1 Ko | Ancien tunnel de publication multi-étapes | Suppression sécurisée |
| `src/components/ui/InteractiveButton.jsx` | 1.8 Ko | Bouton prototype non retenu dans le design system | Suppression sécurisée |
| `src/components/WalletModal.jsx` | 4.2 Ko | Ancien modal de portefeuille, remplacé par `CheckoutModal` | Suppression sécurisée |
| `src/contexts/ModalContext.jsx` | 2.1 Ko | Contexte abandonné (les modales sont gérées par store/états) | Suppression sécurisée |
| `src/contexts/WalletContext.jsx` | 3.5 Ko | Contexte abandonné au profit de `useWalletStore` / `walletService` | Suppression sécurisée |
| `src/contexts/WebRTCContext.jsx` | 4.1 Ko | Contexte abandonné au profit du hook `useWebRTC.js` | Suppression sécurisée |
| `src/utils/geoUtils.js` | 2.9 Ko | Code mort (géocodage opéré par `geocodingNominatim.js`) | Suppression sécurisée |
| `src/utils/imageQualityValidator.js` | 1.7 Ko | Utilitaire non intégré au flux d'upload | Suppression sécurisée |
| `src/utils/messageIdempotency.js` | 1.3 Ko | Déduplication désormais native dans `useChatManager` | Suppression sécurisée |
| `src/utils/useScrollReveal.js` | 1.2 Ko | Hook d'animation inutilisé et placé dans `utils/` | Suppression sécurisée |
| `src/utils/webrtcTracer.js` | 2.4 Ko | Script de télémétrie WebRTC de dev obsolète | Suppression sécurisée |
| `src/utils/diagnostics/chatDebugger.js` | 3.1 Ko | Script de debug ponctuel | Déplacer hors src/ ou supprimer |
| `src/utils/diagnostics/firestoreListenerTracker.js` | 2.8 Ko | Script de debug de fuite d'écouteurs | Déplacer hors src/ ou supprimer |
| `src/utils/diagnostics/fullRegressionScan.js` | 4.5 Ko | Script de diagnostic console ponctuel | Déplacer hors src/ ou supprimer |
| `src/utils/diagnostics/modalDebugger.js` | 2.2 Ko | Script de diagnostic des z-index | Déplacer hors src/ ou supprimer |
| `src/utils/diagnostics/webrtcScanner.js` | 3.6 Ko | Script de vérification ICE/STUN | Déplacer hors src/ ou supprimer |

---

## 5. FICHIERS DANS LE MAUVAIS DOSSIER

L'analyse révèle une désorganisation majeure : **plus de 100 fichiers sont mal classés**, principalement en raison du dépôt anarchique de 55 fichiers de tests et de 26 modales à la racine même de `src/components/`.

| Catégorie | Fichiers concernés | Dossier actuel | Dossier cible recommandé | Justification architecturale |
| :--- | :--- | :--- | :--- | :--- |
| **Tests égarés** *(55 fichiers)* | Tous les `Phase*.test.js`, `cancelApply.test.js`, `ChatSectionAppCrash.test.js`, etc. | `src/components/` | `src/components/__tests__/` ou `src/features/<feature>/__tests__/` | Un dossier de composants ne doit contenir QUE des composants réutilisables, pas des scripts Jest de 500 lignes. |
| **Modales à plat** *(26 fichiers)* | `BoostModal`, `CallEndModal`, `CategoryModal`, `CguModal`, `CounterOfferModal`, `DealRatingModal`, `DesignStudioModal`, `KycModal`, `ListingDetailModal`, `NotesModal`, `OnboardingWizardModal`, `PaymentModal`, `PrivacyCenterModal`, `ProjectRewardsModal`, `ProjectWorkspaceToolsModal`, `PublicProfileModal`, `PublishSuccessModal`, `ReportModal`, `SharedDocumentModal`, `TransactionsHistoryModal`, `TransactionSuccessModal`, `VideoEditorModal`, `VisioSettlementModal`, `WelcomeGiftCelebrationModal`, etc. | `src/components/` | `src/components/modals/` | Le sous-dossier `src/components/modals/` existe déjà mais ne contient que 7 modales ! Les 26 autres polluent la racine de `src/components/`. |
| **Hooks égarés** *(2 fichiers)* | `useScrollReveal.js`, `useGlobalContent.js` | `src/utils/`, `src/features/admin/` | `src/hooks/` | Tout hook personnalisé (`use*`) doit résider dans `src/hooks/` pour la découvrabilité et la cohérence de l'architecture. |
| **Composants Layout** *(2 fichiers)* | `Navbar.jsx`, `Footer.jsx` | `src/components/` | `src/components/layout/` | Les composants structurels de gabarit appartiennent à `layout/` aux côtés de `AppHeader.jsx`. |
| **Composants Chat** *(8 fichiers)* | `ChatHeader.jsx`, `ChatView.jsx`, `DealMessageCard.jsx`, `MessageBubble.jsx`, `SwipeableChatItem.jsx`, `GlobalLiveChat.jsx`, `VoiceNotePlayer.jsx`, `VoiceNoteRecorder.jsx` | `src/components/` | `src/features/chat/` ou `src/components/chat/` | Éléments hautement spécialisés du domaine de messagerie instantanée. |
| **Composants Visio/WebRTC** *(3 fichiers)* | `CallOverlay.jsx`, `LiveCallSubtitles.jsx`, `VisioSettlementModal.jsx` | `src/components/` | `src/features/call/` | Appartiennent au domaine WebRTC aux côtés de `WebRTCCallOverlay.jsx`. |
| **Composants Workspace** *(8 fichiers)* | `CollaborativeWhiteboardModal.jsx`, `WhiteboardLobby.jsx`, `TrocoDocs.jsx`, `TrocoSheets.jsx`, `TrocoSlides.jsx`, `CloudOfficeSuiteModal.jsx`, `NotesModal.jsx`, `ProjectWorkspaceToolsModal.jsx` | `src/components/` | `src/features/workspace/` | Suite bureautique collaborative isolée formant un domaine métier distinct. |
| **Composants Profil/Avis** *(4 fichiers)* | `ProfileView.jsx`, `UserProfile.jsx`, `PublicProfileModal.jsx`, `ReviewsSection.jsx` | `src/components/` | `src/features/profile/` | Appartiennent au domaine profil utilisateur. |

---

## 6. PROPOSITION D'ARBORESCENCE CIBLE

Voici l'architecture industrielle cible vers laquelle `src/` doit converger à terme :

```text
src/
├── components/
│   ├── ui/                        # Primitives UI atomiques agnostiques au métier
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Card.jsx
│   │   ├── Portal.jsx
│   │   ├── Badge.jsx
│   │   ├── SkeletonLoader.jsx
│   │   ├── NotificationPill.jsx
│   │   └── TextEffect.jsx         # Renommé depuis core/text-effect.jsx
│   ├── layout/                    # Structure et gabarit de page
│   │   ├── AppHeader.jsx
│   │   ├── Navbar.jsx             # Déplacé depuis components/
│   │   ├── Footer.jsx             # Déplacé depuis components/
│   │   └── BottomNav.jsx
│   ├── modals/                    # Modales transversales génériques
│   │   ├── CategoryModal.jsx
│   │   ├── FilterDrawer.jsx
│   │   ├── LanguageModal.jsx
│   │   ├── CguModal.jsx
│   │   ├── PrivacyPolicyModal.jsx
│   │   └── ReportModal.jsx
│   ├── common/                    # Composants système transversaux
│   │   ├── OfflineBanner.jsx
│   │   ├── OfflineScreen.jsx
│   │   ├── PWAInstallBanner.jsx
│   │   ├── DemoModeBanner.jsx
│   │   └── SectoralErrorBoundary.jsx
│   └── feedback/                  # Retours d'état utilisateurs
│       ├── EmptyState.jsx
│       ├── RateLimitToast.jsx
│       └── Spinner.jsx
│
├── features/                      # Modules métier verticaux autonomes
│   ├── auth/                      # Authentification & Sessions
│   │   ├── AuthScreen.jsx
│   │   └── components/
│   ├── chat/                      # Messagerie instantanée & Négociations
│   │   ├── ChatSection.jsx
│   │   ├── ChatView.jsx           # Déplacé depuis components/
│   │   ├── components/
│   │   │   ├── ChatHeader.jsx
│   │   │   ├── ChatInputBar.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   ├── DealMessageCard.jsx
│   │   │   ├── SwipeableChatItem.jsx
│   │   │   ├── VoiceNotePlayer.jsx
│   │   │   └── VoiceNoteRecorder.jsx
│   │   └── __tests__/
│   ├── call/                      # Visioconférence WebRTC P2P & Sous-titres
│   │   ├── WebRTCCallOverlay.jsx
│   │   ├── LiveCallSubtitles.jsx  # Déplacé depuis components/
│   │   ├── VisioSettlementModal.jsx
│   │   ├── CallEndModal.jsx
│   │   └── __tests__/
│   ├── payment/                   # Paiements, Jetons Troco & Séquestre
│   │   ├── PaymentFeature.jsx
│   │   ├── PaymentModal.jsx       # Déplacé depuis components/
│   │   ├── CheckoutModal.jsx      # Consolidé
│   │   ├── TransactionSuccessModal.jsx
│   │   └── AnimatedBalances.jsx
│   ├── workspace/                 # Suite Bureautique Collaborative
│   │   ├── WorkspaceFeature.jsx
│   │   ├── CollaborativeWhiteboardModal.jsx
│   │   ├── WhiteboardLobby.jsx
│   │   ├── TrocoDocs.jsx
│   │   ├── TrocoSheets.jsx
│   │   ├── TrocoSlides.jsx
│   │   ├── NotesModal.jsx
│   │   └── DesignStudioModal.jsx
│   ├── feed/                      # Flux d'annonces & Découverte
│   │   ├── FeedView.jsx
│   │   ├── ListingCard.jsx
│   │   ├── ListingDetailModal.jsx
│   │   └── SponsoredFeedCard.jsx
│   ├── map/                       # Cartographie interactive Leaflet
│   │   ├── InteractiveMapView.jsx
│   │   └── MapClusterTracker.jsx
│   ├── profile/                   # Gestion de profil, KYC, Avis
│   │   ├── ProfileFeature.jsx
│   │   ├── ProfileView.jsx
│   │   ├── PublicProfileModal.jsx
│   │   ├── KycModal.jsx
│   │   └── ReviewsSection.jsx
│   └── admin/                     # Dashboard Super-Admin
│       ├── AdminDashboard.jsx
│       ├── AdminPanel.jsx
│       └── tabs/
│
├── hooks/                         # Hooks personnalisés d'état & synchronisation
│   ├── useAppAuth.js
│   ├── useAppNavigation.js
│   ├── useChatManager.js
│   ├── useWebRTC.js
│   ├── useGlobalContent.js        # Déplacé depuis features/admin
│   ├── useScrollReveal.js         # Déplacé depuis utils/
│   └── ...
│
├── services/                      # Couche d'accès aux données & APIs
│   ├── audioService.js            # Consolidé (fusion de services/ et utils/)
│   ├── notificationService.js
│   ├── liveTranscriptionService.js
│   ├── firestoreService.js
│   ├── paymentService.js
│   ├── walletService.js
│   └── ...
│
├── stores/                        # État global Zustand
│   ├── useUIStore.js
│   ├── useWalletStore.js
│   └── ...
│
├── contexts/                      # Contextes React actifs
│   ├── LanguageContext.jsx
│   ├── ThemeContext.jsx
│   └── ...
│
├── utils/                         # Fonctions pures, calculs, conversions
│   ├── haptics.js
│   ├── geocodingNominatim.js
│   ├── deviceDetection.js
│   ├── sessionFlags.js
│   └── ...
│
└── data/                          # Données statiques, mocks, référentiels
    ├── translationsData.js
    ├── mockData.js
    └── ...
```

---

## 7. RISQUES IDENTIFIÉS & FICHIERS CRITIQUES

Certains fichiers constituent le **cœur névralgique réactif** de Troco. Ils ont déjà fait l'objet de régressions sévères lors des cycles passés. **Ils doivent être sanctuarisés et traités EXCLUSIVEMENT EN DERNIER**, après validation complète de toutes les étapes de refactorisation structurelle.

### 🔴 Zone Rouge : STRICTEMENT INTOUCHABLES lors des Vagues 1 et 2

1. **Domaine Messagerie & Firestore en Temps Réel :**
   - `src/hooks/useChatManager.js` *(2 446 lignes)* : Gère les snapshots Firestore, la déduplication de messages, les négociations de deals financiers et les transferts atomiques de jetons.
   - `src/components/ChatView.jsx` *(3 395 lignes)* : Vue centrale de messagerie avec scroll-anchor, upload audio et rendu optimisé des bulles.
   - `src/features/chat/ChatSection.jsx` : Enveloppe de synchronisation d'état et liaison responsive desktop/mobile.

2. **Domaine Appels Vidéo WebRTC & Traitement Audio :**
   - `src/hooks/useWebRTC.js` *(1 500+ lignes)* : Gestionnaire des connexions P2P PeerConnection, des signaux SDP/ICE, du fallback STUN/TURN, des sonneries et de l'état du microphone.
   - `src/features/call/WebRTCCallOverlay.jsx` : Modale plein écran en z-[999999] avec rendu vidéo distant/local, PIP, et bascule caméra.
   - `src/services/liveTranscriptionService.js` : Moteur de reconnaissance vocale Web Speech API, gestion fine de la confidentialité du micro et du cycle de vie sans blocage de thread.
   - `src/services/audioService.js` : Moteur audio Web Audio API unifié (sonneries, bips, alertes).

3. **Domaine Financier & Transactions Atomiques :**
   - `src/services/walletService.js` : Opérations atomiques `runTransaction` pour transferts d'euros et jetons.
   - `src/services/paymentService.js` : Séquestre financier et intégrations de checkout.
   - `src/hooks/useCheckout.js` : Validation et validation de solde.

4. **Point d'Entrée & Routage Racine :**
   - `src/App.js` *(5 240 lignes)* : Racine monolithique orchestrant les écouteurs globaux, le thème, la langue, la navigation et le montage des modales.
   - `src/index.js` : Bootstrap React DOM et montage des portals (`#modal-root`).
   - `src/config/firebase.js` : Initialisation du SDK Firebase.

---

## 8. PLAN DE NETTOYAGE PROPOSÉ (ORDRE RECOMMANDÉ)

La remise en ordre doit s'exécuter sous forme d'opérations **strictement séquentielles et étanches**, garantissant une traçabilité totale et zéro régression.

### 🌊 Vague 1 — Renommage uniquement (Zéro déplacement de dossier)
*Objectif : Normaliser tous les noms de fichiers non conformes sans altérer l'arborescence physique.*

1. **Renommer les 49 fichiers de test préfixés par `PhaseXXX` :**
   - `src/components/Phase102ScrollAndLobby.test.js` ➔ `src/components/ScrollAndLobby.test.js`
   - `src/components/Phase109FinancialSyncAndAtomicTransfer.test.js` ➔ `src/components/FinancialSyncAndAtomicTransfer.test.js`
   - `src/components/Phase127WhiteboardDeadButtonsFix.test.js` ➔ `src/components/WhiteboardButtons.test.js`
   - `src/components/Phase130CookieBannerPortalRestore.test.js` ➔ `src/components/CookieBannerPortal.test.js`
   - *(Et l'ensemble des 45 autres fichiers Phase)*
2. **Renommer le composant kebab-case isolé :**
   - `src/components/core/text-effect.jsx` ➔ `src/components/core/TextEffect.jsx`
   - *(Mettre à jour l'unique import dans le composant qui l'utilise)*
3. **Exécution de la suite de tests :** `npm test -- --watchAll=false` pour garantir 100% de succès.

### 🌊 Vague 2 — Déplacement uniquement (Zéro renommage de fichier)
*Objectif : Ranger les fichiers dans leurs dossiers respectifs avec mise à jour automatisée des chemins relatifs d'import.*

1. **Créer le dossier dédié aux tests de composants :** `src/components/__tests__/`
   - Y déplacer les 55 fichiers `.test.js` actuellement entassés à plat dans `src/components/`.
2. **Classer les modales égarées :**
   - Déplacer les 26 fichiers `*Modal.jsx` de `src/components/` vers `src/components/modals/`.
3. **Déplacer les composants de layout :**
   - `src/components/Navbar.jsx` ➔ `src/components/layout/Navbar.jsx`
   - `src/components/Footer.jsx` ➔ `src/components/layout/Footer.jsx`
4. **Déplacer le hook égaré :**
   - `src/utils/useScrollReveal.js` ➔ `src/hooks/useScrollReveal.js`
5. **Mise à jour automatique des chemins d'import relatifs** et vérification par build : `npm run build`.

### 🌊 Vague 3 — Fusion des doublons & Élimination des fichiers morts
*Objectif : Nettoyer la dette technique par ordre croissant de criticité.*

1. **Suppression des clones morts évidents (Risque : Quasi-Nul) :**
   - Supprimer `src/components/AuthScreen.jsx` (l'application utilise `features/auth/AuthScreen.jsx`).
   - Supprimer `src/components/CheckoutModal.jsx` (l'application utilise `components/modals/CheckoutModal.jsx`).
   - Supprimer `src/components/FilterDrawer.jsx` (l'application utilise `components/modals/FilterDrawer.jsx`).
2. **Suppression des stubs de réexport superflus :**
   - `src/components/chat/ChatHeader.jsx` vs `src/components/ChatHeader.jsx`
   - `src/components/MessageBubble.jsx` vs `src/components/chat/MessageBubble.jsx`
   - `src/components/InteractiveMapView.jsx`
3. **Archivage ou suppression des 20 fichiers orphelins :**
   - `CallModal.jsx`, `CategoryHints.jsx`, `WalletModal.jsx`, `ModalContext.jsx`, `WalletContext.jsx`, scripts `diagnostics/*`.
4. **Fusion du moteur audio (Risque : Moyen) :**
   - Rapatrier `playApplePaySound` et `playBetclicBalanceSound` de `src/utils/audioService.js` vers `src/services/audioService.js`.
   - Créer une redirection temporaire dans `utils/audioService.js` pour garantir zéro régression, puis basculer progressivement les imports.

---

## 9. MÉTRIQUES D'IMPACT

| Métrique | Valeur estimée | Impact sur le code |
| :--- | :---: | :--- |
| **Fichiers touchés en Vague 1** *(Renommage)* | **50 fichiers** | Renommage de 49 fichiers de test + 1 composant (`text-effect.jsx`). Impact minimal sur le bundle de prod. |
| **Fichiers touchés en Vague 2** *(Déplacement)* | **84 fichiers** | Déplacement de 55 tests, 26 modales, 2 layouts, 1 hook. Nécessite la mise à jour des imports relatifs correspondants. |
| **Fichiers touchés en Vague 3** *(Fusion/Suppression)* | **28 fichiers** | Élimination de 20 fichiers morts/orphelins, 5 clones/doublons, et unification du service audio. |
| **Réduction globale de la pollution de `src/components`** | **-75%** | Le dossier `src/components` passera de 131 fichiers à environ 30 composants partagés propres. |
| **Estimation de charge de travail Antigravity** | **~2.5 à 3 heures** | Exécution rigoureuse étape par étape avec tests unitaires systématiques et builds de vérification à chaque sous-étape. |

---

## 10. QUESTION FINALE

Audit terminé. En attente de validation pour la Vague 1 (renommage uniquement).
⚠️ Ne PAS exécuter avant confirmation explicite de l'utilisateur.
