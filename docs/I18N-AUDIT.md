# 🌐 AUDIT COMPLET DE COUVERTURE i18n — TROCO

> **Date de génération :** 7 Octobre 2026  
> **Statut :** Conforme & Validé — Étape 4 (Ratissage final i18n)  
> **Source de référence :** `src/locales/translations.js`, `src/data/translationsData.js`, `src/data/translationsSecondary.js`

---

## 1. 📊 Tableau de Couverture par Langue

Le système de traduction de TROCO repose sur 7 langues officielles supportées nativement dans l'interface utilisateur.  
Chaque clé est rigoureusement synchronisée entre les 3 fichiers de dictionnaires.

| Code Langue | Langue | Nombre de Clés | Couverture UI | Statut Synchronisation |
|:---:|:---|:---:|:---:|:---:|
| **FR** | Français (Source) | **698** | **100.0%** | ✅ Dictionnaire Maître |
| **EN** | English | **698** | **100.0%** | ✅ Parfaitement aligné |
| **ES** | Español | **698** | **100.0%** | ✅ Parfaitement aligné |
| **IT** | Italiano | **698** | **100.0%** | ✅ Parfaitement aligné |
| **DE** | Deutsch | **698** | **100.0%** | ✅ Parfaitement aligné |
| **JA** | 日本語 (Japonais) | **698** | **100.0%** | ✅ Parfaitement aligné |
| **ZH** | 中文 (Chinois simplifié) | **698** | **100.0%** | ✅ Parfaitement aligné |

**Taux de couverture global : 100.0% sur 698 clés uniques.**

---

## 2. 🎯 Clés Ajoutées lors de l'Étape 4 (Ratissage Final)

41 nouvelles clés critiques ont été ajoutées pour éliminer les dernières chaînes françaises codées en dur dans les composants critiques :

### A. Écran de Compte Banni / Suspendu (`src/components/AppModalsOrchestrator.jsx`)
| Clé | Valeur FR |
|:---|:---|
| `accountSuspendedTitle` | "Votre compte a été suspendu" |
| `accountSuspendedReason` | "Raison :" |
| `accountSuspendedDefaultReason` | "Votre compte a été suspendu par l'administration Troco pour non-respect des règles de la communauté." |
| `accountSuspendedContact` | "Contactez le support pour plus d'informations : support@troco.fr" |
| `accountSuspendedLogout` | "Se déconnecter" |

### B. Menu d'Actions & Gestion Mobile (`src/components/FeedInteractions.jsx`, `src/App.js`)
| Clé | Valeur FR |
|:---|:---|
| `actionEditListing` | "Modifier l'annonce" |
| `actionBoostListing` | "Booster l'annonce" |
| `actionPauseListing` | "Mettre en pause" |
| `actionResumeListing` | "Réactiver l'annonce" |
| `actionDeleteListing` | "Supprimer l'annonce" |
| `actionAdminHideListing` | "Masquer (Admin)" |
| `actionAdminDeleteListing` | "Supprimer (Admin)" |
| `statusPaused` | "En pause" |
| `statusActive` | "Active" |
| `adminListingHidden` | "🚫 Annonce #{id} masquée du feed public" |
| `adminListingVisible` | "👁️ Annonce #{id} visible" |

### C. Feed, Badges & Pagination (`src/routes/FeedRoute.jsx`, `FeedSection.jsx`, `FeedCardItem.jsx`)
| Clé | Valeur FR |
|:---|:---|
| `noListingsFoundTitle` | "Aucune annonce ne correspond à votre recherche" |
| `noListingsFoundDesc` | "Essayez d'élargir le rayon de recherche, de changer de catégorie ou de réinitialiser les filtres pour découvrir les annonces des membres Troco." |
| `loadingMoreListings` | "Chargement des annonces..." |
| `loadMoreListings` | "Charger plus d'annonces" |
| `urgentBadge` | "URGENT" |
| `exampleBadge` | "Exemple" |
| `topVisibilityBadge` | "TOP VISIBILITÉ" |
| `manageListingTooltip` | "Gérer ou supprimer cette annonce" |
| `manageListingBtn` | "Gérer" |
| `defaultAuthor` | "Membre Troco" |
| `sponsoredBadge` | "Sponsorisé" |
| `closeListingDetailsAria` | "Fermer les détails de l'annonce" |

### D. Bannières & Hooks de Transaction (`useDealActions.js`, `FeedSection.jsx`)
| Clé | Valeur FR |
|:---|:---|
| `boostSuccessToast` | "Annonce boostée avec succès pour 7 jours !" |
| `boostHeadline` | "Passez en tête du Feed !" |
| `boostSubtitle` | "Multipliez vos contacts par 5 en plaçant vos annonces tout en haut." |
| `boostPricing` | "À partir de 2,99€ / 7 jours" |
| `boostAlertSelectAd` | "💡 Créez ou sélectionnez une de vos annonces depuis votre profil pour activer le Boost !" |
| `boostMyListingBtn` | "Booster mon annonce" |
| `loginToTransferTokens` | "Veuillez vous connecter pour transférer des jetons." |

### E. Modales de Chargement & Feedback (`AppModalsOrchestrator.jsx`)
| Clé | Valeur FR |
|:---|:---|
| `loadingProfile` | "Chargement du profil..." |
| `loadingReportForm` | "Chargement du formulaire de signalement..." |
| `loadingDealNegotiation` | "Chargement de la négociation..." |

---

## 3. 🔍 Inventaire des Chaînes Résiduelles & Cas Particuliers

Certains types de contenus ne sont pas des chaînes d'interface statiques et sont traités selon des mécanismes dédiés :

1. **Contenu Généré par les Utilisateurs (UGC) :**
   - Les titres d'annonces, descriptions, commentaires et messages de chat sont dynamiques.
   - Ils sont pris en charge par le service de traduction temps réel `src/services/dynamicTranslation.js` (Gemini AI API / Cloud Translation), garantissant la traduction à la volée selon la langue de lecture de l'utilisateur.

2. **Documents Légaux & CGU denses (`LegalModal.jsx`, `TermsRoute.jsx`) :**
   - Les textes intégraux de contrats juridiques français font l'objet de traductions contextuelles et de fallbacks conformes au droit applicable.

3. **Logs & Messages Console :**
   - Les `console.error` et `console.warn` techniques dans les services restent en anglais/français pour faciliter le débogage développeur et ne sont pas visibles des utilisateurs finaux.

---

## 4. 📋 Liste Complète des 698 Clés de Traduction

Ci-dessous l'inventaire exhaustif de l'ensemble des clés enregistrées dans le dictionnaire maître :

| Index | Clé de Traduction | Exemple Valeur (FR) |
|:---:|:---|:---|
| 1 | `workspace.slides_title` | "Troco Slides" |
| 2 | `workspace.badge_slides` | "SLIDES" |
| 3 | `workspace.slides_badge` | "SLIDES" |
| 4 | `workspace.slides_desc` | "Présentations & diapositives collaboratives" |
| 5 | `workspace.slides_card_title` | "Troco Slides" |
| 6 | `office.menu_file` | "Fichier" |
| 7 | `office.menu_edit` | "Édition" |
| 8 | `office.menu_view` | "Affichage" |
| 9 | `office.menu_insert` | "Insertion" |
| 10 | `office.menu_format` | "Format" |
| 11 | `office.menu_tools` | "Outils" |
| 12 | `office.menu_undo` | "Annuler" |
| 13 | `office.menu_redo` | "Rétablir" |
| 14 | `office.menu_select_all` | "Tout sélectionner" |
| 15 | `office.menu_clear` | "Effacer" |
| 16 | `office.menu_fullscreen` | "Plein écran" |
| 17 | `office.menu_zoom` | "Zoom 100%" |
| 18 | `office.menu_image` | "Image" |
| 19 | `office.menu_table` | "Tableau" |
| 20 | `office.menu_link` | "Lien" |
| 21 | `office.menu_bold` | "Gras" |
| 22 | `office.menu_italic` | "Italique" |
| 23 | `office.menu_underline` | "Souligné" |
| 24 | `office.menu_word_count` | "Statistiques & Mots" |
| 25 | `workspace.workspace_premium` | "WORKSPACE PREMIUM" |
| 26 | `workspace.pro_badge` | "PRO" |
| 27 | `workspace.tools_title` | "Outils Collaboratifs Workspace (Tableau blanc, Documents, Feuilles, No..." |
| 28 | `workspace.tools_aria` | "Ouvrir le menu des outils collaboratifs Workspace" |
| 29 | `workspace.whiteboard_card_title` | "Tableau Blanc collaboratif" |
| 30 | `workspace.notes_badge` | "NOTES" |
| 31 | `workspace.notes_card_title` | "Notes Partagées" |
| 32 | `workspace.docs_badge` | "DOCS" |
| 33 | `workspace.docs_card_title` | "Troco Doc" |
| 34 | `workspace.sheets_badge` | "SHEETS" |
| 35 | `workspace.sheets_card_title` | "Troco Sheet" |
| 36 | `workspace.planning_title` | "Planning & Visios HD" |
| 37 | `workspace.planning_desc` | "Calendrier de projet & réunions" |
| 38 | `workspace.transfer_tokens_title` | "Transférer des Jetons" |
| 39 | `workspace.transfer_tokens_desc` | "Envoi direct de Jetons Troco" |
| 40 | `workspace.project_rewards_title` | "Rétribution en Jetons" |
| 41 | `workspace.project_rewards_desc` | "Attribuer les gains du projet" |
| 42 | `workspace.doc_unavailable` | "Document indisponible" |
| 43 | `workspace.card_open` | "Ouvrir" |
| 44 | `workspace.card_join` | "Rejoindre" |
| 45 | `workspace.collab_doc` | "Document partagé" |
| 46 | `workspace.card_default_snippet` | "Cliquez pour ouvrir le document..." |
| 47 | `workspace.collab_snippet_fallback` | "Document collaboratif partagé dans l'espace de travail." |
| 48 | `deleteAd` | "Supprimer" |
| 49 | `pauseAd` | "Mettre en pause" |
| 50 | `resumeAd` | "Reprendre l'annonce" |
| 51 | `editAdBtn` | "Modifier" |
| 52 | `editCostsMoneyTitle` | "Modification Payante" |
| 53 | `editCostsMoneyText` | "Toute modification du texte ou ajout de plus de 4 photos requiert un p..." |
| 54 | `addPhoto` | "Ajouter une photo factice" |
| 55 | `confirmDeleteTitle` | "Supprimer l'annonce ?" |
| 56 | `confirmDeleteText` | "Es-tu sûr de vouloir supprimer cette annonce ?" |
| 57 | `adminDeleteListingTitle` | "Suppression administrateur" |
| 58 | `adminDeleteListingMessage` | "Confirmez la suppression définitive de" |
| 59 | `delete` | "Supprimer" |
| 60 | `cancel` | "Annuler" |
| 61 | `cancelBtn` | "Annuler" |
| 62 | `confirmBtn` | "Confirmer" |
| 63 | `uploadProfilePhoto` | "📁 Importer une photo depuis mon appareil" |
| 64 | `viewListingButton` | "Voir l'annonce" |
| 65 | `boostButtonLabel` | "🔥 Booster" |
| 66 | `editButtonLabel` | "✏️ Modifier" |
| 67 | `filtersTitle` | "Filtres avancés" |
| 68 | `addButton` | "Ajouter" |
| 69 | `categoryPlaceholder` | "Ex : Événements, Transport..." |
| 70 | `buyAction` | "Acheter" |
| 71 | `tokenPackSub` | "1 Jeton Troco = 12€ • À utiliser pour des services, du temps ou des éc..." |
| 72 | `pack5Tokens` | "Pack 5 Jetons" |
| 73 | `pack1Token` | "Pack 1 Jeton" |
| 74 | `rechargeAction` | "Recharger" |
| 75 | `customAmount` | "Montant personnalisé" |
| 76 | `walletNotice` | "Les deux soldes sont mis à jour instantanément après chaque transactio..." |
| 77 | `manageWalletSub` | "Gère ton solde Euro et tes Jetons Troco" |
| 78 | `langModalSub` | "L'interface et les annonces seront instantanément traduites dans la la..." |
| 79 | `cancelButton` | "Annuler" |
| 80 | `sendCounterOffer` | "Envoyer la contre-proposition" |
| 81 | `counterOfferSub` | "Ajuste les termes du deal — Montant en euros, Jetons Troco et conditio..." |
| 82 | `counterOfferTitle` | "Faire une contre-proposition" |
| 83 | `doneButton` | "Terminé" |
| 84 | `encryptedPayment` | "Paiement chiffré de bout en bout" |
| 85 | `transactionSuccess` | "Transaction sécurisée validée avec succès" |
| 86 | `secureBankConnection` | "Connexion sécurisée au réseau bancaire" |
| 87 | `transactionProcessing` | "Transaction en cours..." |
| 88 | `payAction` | "Payer" |
| 89 | `sepaNotice` | "💡 Recharge depuis ton solde Troco ou par virement SEPA. Tes jetons se..." |
| 90 | `amountToPay` | "Montant à payer" |
| 91 | `securePaymentHeader` | "PAIEMENT SÉCURISÉ" |
| 92 | `all` | "Tous" |
| 93 | `slogan` | "Liberté d'Échange & Entraide" |
| 94 | `explorer` | "Explorer" |
| 95 | `messages` | "Messages" |
| 96 | `post` | "Déposer" |
| 97 | `profile` | "Profil" |
| 98 | `searchPlaceholder` | "Rechercher un service, un matériel, une compétence..." |
| 99 | `allCategories` | "Toutes catégories" |
| 100 | `allFormats` | "Tous formats" |
| 101 | `remote` | "💻 À distance (Visio)" |
| 102 | `onsite` | "📍 Sur place (Présentiel)" |
| 103 | `bothFormats` | "🌐 Présentiel & Visio" |
| 104 | `viewList` | "Vue Liste" |
| 105 | `viewMap` | "Vue Carte" |
| 106 | `filterTitle` | "Filtres avancés" |
| 107 | `searchRadius` | "Rayon de recherche" |
| 108 | `infiniteWorld` | "♾️ Infini (Monde & Visio)" |
| 109 | `infinite` | "Infini" |
| 110 | `useMyLocation` | "📍 Utiliser ma position actuelle" |
| 111 | `geolocating` | "Géolocalisation..." |
| 112 | `geolocatedSuccess` | "Géolocalisé !" |
| 113 | `geolocatedError` | "Position par défaut utilisée." |
| 114 | `availableListings` | "annonces disponibles dans" |
| 115 | `totalInfinite` | "annonces au total (Mode Infini & Visio)" |
| 116 | `negotiationsTitle` | "Négociations & Chats" |
| 117 | `validateDeal` | "Valider le Deal" |
| 118 | `counterOffer` | "Faire une contre-proposition" |
| 119 | `dealConditions` | "🤝 Conditions du Troco-Deal en cours :" |
| 120 | `selectChatPrompt` | "Sélectionne une conversation pour voir les conditions." |
| 121 | `payWithTokens` | "Payer en Jetons Troco" |
| 122 | `payWithEuros` | "Payer en Euros (€)" |
| 123 | `payHybrid` | "Payer en Formule Hybride" |
| 124 | `postTitle` | "Publier une annonce de A à Z" |
| 125 | `publishButton` | "Publier mon annonce sur Troco" |
| 126 | `proposeDealButton` | "Proposer un Deal" |
| 127 | `startDiscussion` | "Démarrer la discussion" |
| 128 | `sponsored` | "🔥 Sponsorisé" |
| 129 | `urgent` | "URGENTE" |
| 130 | `verifiedOffer` | "Offre certifiée" |
| 131 | `credits` | "Jetons" |
| 132 | `tokens` | "Jetons" |
| 133 | `euroBalance` | "Solde Euros" |
| 134 | `selectLanguage` | "Choisir la langue d'affichage" |
| 135 | `close` | "Fermer" |
| 136 | `showOriginal` | "🌐 Voir l'original" |
| 137 | `showTranslation` | "🌐 Voir la traduction" |
| 138 | `translatedByTroco` | "Traduit automatiquement" |
| 139 | `noListingsFound` | "Aucune annonce ne correspond à vos filtres." |
| 140 | `resetFilters` | "Réinitialiser tous les filtres" |
| 141 | `catSkills` | "Cours & Compétences" |
| 142 | `catTools` | "Prêt de Matériel" |
| 143 | `catServices` | "Services & Dépannage" |
| 144 | `catHousing` | "Logement & Stay Swap" |
| 145 | `newCategory` | "+ Nouvelle catégorie" |
| 146 | `addCategory` | "Ajouter une catégorie" |
| 147 | `categoryName` | "Nom de la catégorie" |
| 148 | `authorAnnc` | "C'est votre annonce" |
| 149 | `compensation` | "Compensation" |
| 150 | `availability` | "Disponibilité" |
| 151 | `caution` | "Caution" |
| 152 | `demoVideo` | "Démo Vidéo" |
| 153 | `livePlayback` | "Lecture en direct" |
| 154 | `photos` | "Photos" |
| 155 | `rechargeCash` | "Recharger en Cash" |
| 156 | `buyTokens` | "Acheter des Jetons" |
| 157 | `editProfile` | "Éditer le profil" |
| 158 | `saveProfile` | "Enregistrer" |
| 159 | `myListings` | "Mes Annonces Publiées" |
| 160 | `swapHistory` | "Historique des Swaps & Deals" |
| 161 | `wallet` | "Mon porte-monnaie" |
| 162 | `socialNetworks` | "Réseaux sociaux" |
| 163 | `portfolio` | "Portfolio" |
| 164 | `reviews` | "Avis détaillés" |
| 165 | `detailCaution` | "Caution requise" |
| 166 | `noCaution` | "Aucune caution" |
| 167 | `exchange` | "Échange" |
| 168 | `writeToInterlocutor` | "Écris à l'interlocuteur..." |
| 169 | `typeYourMessage` | "Écris ton message..." |
| 170 | `send` | "Envoyer" |
| 171 | `fullscreen` | "Plein écran" |
| 172 | `reduce` | "Réduire" |
| 173 | `call` | "Appel" |
| 174 | `videoCall` | "Visio" |
| 175 | `newDiscussion` | "Nouvelle discussion" |
| 176 | `negotiationInProgress` | "Négociation en cours" |
| 177 | `dealValidated` | "Deal Validé" |
| 178 | `toConfirm` | "À confirmer" |
| 179 | `verifiedProfile` | "Profil vérifié" |
| 180 | `closed` | "Clôturé" |
| 181 | `inProgress` | "En cours" |
| 182 | `planned` | "Planifié" |
| 183 | `discussions` | "Discussions" |
| 184 | `myDealProposal` | "Ma proposition de Deal" |
| 185 | `receivedDealProposal` | "Proposition de Deal reçue" |
| 186 | `waitingYourResponse` | "En attente de ta réponse" |
| 187 | `waitingResponse` | "En attente de réponse" |
| 188 | `dealValidatedConfirmed` | "Deal Validé & Confirmé" |
| 189 | `declined` | "Refusé" |
| 190 | `acceptValidateDeal` | "Accepter & Valider le Deal" |
| 191 | `decline` | "Refuser" |
| 192 | `waitingInterlocutorResponse` | "En attente de la réponse de l'interlocuteur..." |
| 193 | `dealConfirmedLocked` | "Deal confirmé et verrouillé avec succès." |
| 194 | `directSwap` | "Troc direct" |
| 195 | `spokenLanguages` | "Langues parlées" |
| 196 | `manageWallet` | "Gérer mon portefeuille" |
| 197 | `trocoTokensLabel` | "Jetons Troco" |
| 198 | `tokenRateNotice` | "1 Jeton ≈ 10€ / 1h" |
| 199 | `skillsCV` | "CV Compétences" |
| 200 | `servicesExpertise` | "Services & Expertise" |
| 201 | `availableEquipment` | "Matériel disponible" |
| 202 | `loansTools` | "Prêts / Outils" |
| 203 | `inTotal` | "au total" |
| 204 | `swapHistorySub` | "Toutes vos transactions passées et en cours avec statut et avis détail..." |
| 205 | `closedDeals` | "Deals clôturés" |
| 206 | `averageRating` | "Note moyenne" |
| 207 | `profile.no_reviews` | "Pas d'évaluation pour l'instant" |
| 208 | `inProgressPlanned` | "En cours / Planifié" |
| 209 | `guidedPath` | "Parcours guidé" |
| 210 | `chooseAdTypePrompt` | "Choisis le type d'annonce que tu souhaites publier." |
| 211 | `iOfferService` | "Je propose un service ou du matériel" |
| 212 | `iOfferServiceSub` | "Ex: cours, réparations, prêt d'outils, ateliers." |
| 213 | `iRequestService` | "Je recherche un service ou du matériel" |
| 214 | `iRequestServiceSub` | "Ex: besoin d'un outil, d'un cours ou d'un dépannage rapide." |
| 215 | `collaborativeProjectTitle` | "Projet Collaboratif" |
| 216 | `collaborativeProjectSub` | "Monter une équipe, un collectif ou un projet à plusieurs avec rétribut..." |
| 217 | `adTitleLabel` | "Titre" |
| 218 | `adTitlePlaceholder` | "Ex : Prêt d’une échelle ou cours d’anglais" |
| 219 | `adCategoryLabel` | "Catégorie" |
| 220 | `adFormatLabel` | "Format" |
| 221 | `adDescriptionLabel` | "Description" |
| 222 | `adDescriptionPlaceholder` | "Explique ce que tu proposes, les limites, les conditions et ce qui est..." |
| 223 | `adMediaTitle` | "Médias de l'annonce (Photos & Vidéo courte)" |
| 224 | `autoGenerateVisuals` | "✨ Générer les visuels automatiquement" |
| 225 | `adMediaDesc` | "Troco garantit un maximum de visibilité. Ajoute tes médias ou laisse l..." |
| 226 | `mainPhotoLabel` | "📸 Photo principale" |
| 227 | `photoUrlPlaceholder` | "URL de la photo (ex: https://...)" |
| 228 | `importPhoto` | "Importer une photo" |
| 229 | `miniVideoLabel` | "🎥 Vidéo de présentation courte (.mp4)" |
| 230 | `videoUrlPlaceholder` | "URL de la vidéo MP4 (ex: https://...)" |
| 231 | `importVideo` | "Importer une vidéo" |
| 232 | `autoGeneratedTags` | "Tags auto-générés :" |
| 233 | `retributionModeLabel` | "Mode de rétribution" |
| 234 | `timeCreditOption` | "Jeton temps" |
| 235 | `euroPaymentOption` | "Paiement en euros" |
| 236 | `directSwapOption` | "Troc direct" |
| 237 | `hybridOption` | "Hybride" |
| 238 | `expectedAmountLabel` | "Montant attendu (€)" |
| 239 | `trocoTokensAmountLabel` | "Nombre de Jetons Troco" |
| 240 | `locationZoneLabel` | "Lieu ou zone" |
| 241 | `availabilityLabel` | "Disponibilité" |
| 242 | `requireCautionLabel` | "Exiger une caution virtuelle ?" |
| 243 | `cautionAmountLabel` | "Montant de la caution (€)" |
| 244 | `setUrgentLabel` | "Marquer l'annonce comme Urgente ?" |
| 245 | `urgentBadgeDesc` | "Badge URGENT ultra-visible + affichage prioritaire dans le feed et les..." |
| 246 | `previewLabel` | "Prévisualisation" |
| 247 | `titleToBeDefined` | "Titre à définir" |
| 248 | `addDescriptionConvincing` | "Ajoute une description pour que l’annonce soit claire et convaincante...." |
| 249 | `compensationLabel` | "Compensation :" |
| 250 | `priorityNotice` | "Affiche en priorité • 1,99€ sera débité" |
| 251 | `publishVisibilityNotice` | "L'annonce sera visible dans le flux principal, sur la carte et dans le..." |
| 252 | `backButton` | "Retour" |
| 253 | `continueButton` | "Continuer" |
| 254 | `publishAdButton` | "Publier l’annonce" |
| 255 | `verifyIdentity` | "Vérifier mon identité (+ Badge ✅)" |
| 256 | `identityVerified` | "Identité Vérifiée ✅" |
| 257 | `logout` | "Se déconnecter" |
| 258 | `noReviewsYet` | "Cet utilisateur n'a pas encore reçu d'avis." |
| 259 | `moderationPanel` | "Panel Modération" |
| 260 | `dealsInProgress` | "En cours" |
| 261 | `presentationInfo` | "Présentation & Infos" |
| 262 | `reviewsRatings` | "Avis et Évaluations" |
| 263 | `translateContent` | "Traduire" |
| 264 | `translating` | "Traduction en cours..." |
| 265 | `resumeDiscussion` | "Reprendre la discussion" |
| 266 | `secureExchangeGuarantee` | "🔒 Échange sécurisé avec garantie Troco" |
| 267 | `verifiedTransactionsTrust` | "Transactions réelles vérifiées par le tiers de confiance Troco." |
| 268 | `listingsTab` | "Annonces" |
| 269 | `portfolioTab` | "Portfolio" |
| 270 | `reply` | "Répondre" |
| 271 | `replyPlaceholder` | "Écrivez votre réponse publique à cet avis..." |
| 272 | `verifiedReviews` | "avis vérifié" |
| 273 | `verifiedReviewsPlural` | "avis vérifiés" |
| 274 | `sending` | "Envoi..." |
| 275 | `topupEuroTitle` | "Recharger mon solde Euros" |
| 276 | `subscribeTrocoPlus` | "S'abonner à Troco Plus" |
| 277 | `onlineStatus` | "En ligne" |
| 278 | `kycVerifiedBadge` | "Identité vérifiée" |
| 279 | `viewResume` | "Consulter le CV" |
| 280 | `reviewsPlural` | "avis" |
| 281 | `reviewSingular` | "avis" |
| 282 | `allListingsBy` | "Toutes les annonces de" |
| 283 | `loadingListings` | "Chargement des annonces..." |
| 284 | `noActiveListing` | "Aucune annonce active" |
| 285 | `noListingsDesc` | "Ce membre n'a pas encore publié d'annonce active sur Troco." |
| 286 | `trocoTokensPlural` | "Jetons Troco" |
| 287 | `trocoTokensSingular` | "Jeton Troco" |
| 288 | `view` | "Voir" |
| 289 | `aboutUser` | "À propos de" |
| 290 | `verifiedSocialNetworks` | "Réseaux Sociaux & Liens vérifiés" |
| 291 | `skillsOfferedForTrade` | "Compétences & Services proposés en troc" |
| 292 | `noSkillsReported` | "Aucune compétence renseignée" |
| 293 | `equipmentAvailable` | "Matériel & Outils disponibles" |
| 294 | `noEquipmentReported` | "Aucun matériel renseigné" |
| 295 | `portfolioGallery` | "Galerie Portfolio" |
| 296 | `emptyPortfolio` | "Portfolio vide" |
| 297 | `noPhotosInPortfolio` | "Aucune photo dans le portfolio de ce membre." |
| 298 | `newMemberZeroReviews` | "Nouveau membre (0 avis)" |
| 299 | `recentReviews` | "Avis récents" |
| 300 | `newMemberNoReviewsYet` | "Ce membre est nouveau et n'a pas encore reçu d'évaluation." |
| 301 | `centerMapTooltip` | "Centrer la carte" |
| 302 | `contactMember` | "Contacter le membre" |
| 303 | `boostVisibility` | "Booster la visibilité de l'annonce" |
| 304 | `boost` | "Booster" |
| 305 | `editThisListing` | "Modifier cette annonce" |
| 306 | `edit` | "Modifier" |
| 307 | `resumeListingPublication` | "Reprendre la publication de l'annonce" |
| 308 | `pauseListingPublication` | "Mettre l'annonce en pause" |
| 309 | `resume` | "Reprendre" |
| 310 | `pause` | "Pause" |
| 311 | `replyFrom` | "Réponse de" |
| 312 | `yourPublicReplyAs` | "Votre réponse publique en tant que" |
| 313 | `skillsServicesOffered` | "Compétences & Services proposés" |
| 314 | `addSkillPlaceholder` | "Ajouter une compétence (ex: Mixage audio, React...)" |
| 315 | `equipmentForLoan` | "Matériel & Outils à prêter" |
| 316 | `addEquipmentPlaceholder` | "Ajouter un matériel (ex: Micro Shure SM7B, Perceuse...)" |
| 317 | `myPortfolio` | "Mon Portfolio" |
| 318 | `deleteThisPhoto` | "Supprimer" |
| 319 | `noPortfolioPhotos` | "Aucune photo dans ton portfolio" |
| 320 | `portfolioDesc` | "Ajoute des photos authentiques pour mettre en valeur ton savoir-faire...." |
| 321 | `pasteImageUrlPlaceholder` | "Colle une URL d'image..." |
| 322 | `uploadPhotoFromDevice` | "Importer une photo depuis l'appareil" |
| 323 | `photo` | "Photo" |
| 324 | `noSwapsYet` | "Aucun swap enregistré" |
| 325 | `noSwapsDesc` | "Vos échanges clôturés et en cours apparaîtront ici." |
| 326 | `withUser` | "avec" |
| 327 | `exchangeInProgress` | "Échange en cours..." |
| 328 | `appointmentScheduled` | "Rendez-vous planifié" |
| 329 | `settingsAppearance` | "Paramètres & Apparence" |
| 330 | `settingsAppearanceSubtitle` | "Personnalise ton expérience visuelle et tes préférences de profil." |
| 331 | `designStudio` | "Studio de design" |
| 332 | `invoices` | "Factures" |
| 333 | `manageTrocoPlus` | "Gérer Troco Plus" |
| 334 | `mySubscription` | "Mon Abonnement" |
| 335 | `trocoPlusPro` | "Troco Plus Illimité & Pro" |
| 336 | `trocoPlusEssential` | "Troco Plus Essentiel" |
| 337 | `activeStatus` | "ACTIF" |
| 338 | `renewalOn` | "Renouvellement le" |
| 339 | `noCommitment` | "Sans engagement" |
| 340 | `upgradeToPro` | "Upgrade vers Pro" |
| 341 | `subAdvantagePro1` | "15 Jetons crédités par mois" |
| 342 | `subAdvantagePro2` | "3 Boosts d'annonces inclus" |
| 343 | `subAdvantagePro3` | "Badge 👑 Membre Pro vérifié" |
| 344 | `subAdvantagePro4` | "Support prioritaire VIP 7j/7" |
| 345 | `subAdvantageEss1` | "5 Jetons crédités par mois" |
| 346 | `subAdvantageEss2` | "1 Boost d'annonce inclus" |
| 347 | `subAdvantageEss3` | "Badge ⭐ Membre Plus" |
| 348 | `subAdvantageEss4` | "Priorité de contact sur les deals" |
| 349 | `photosPlural` | "photos" |
| 350 | `photoSingular` | "photo" |
| 351 | `newProfileZeroDeals` | "Nouveau profil (0 deal clôturé)" |
| 352 | `noDealsYetDescription` | "Vous n'avez pas encore d'échange clôturé. Parcourez l'explorateur ou p..." |
| 353 | `exploreListings` | "Explorer les annonces" |
| 354 | `closedDealNoReview` | "Deal clôturé — aucun avis laissé." |
| 355 | `designStudioTitle` | "Studio de Design & Apparence" |
| 356 | `designStudioSubtitle` | "Personnalisez les thèmes, le générateur magique HSL, les typographies,..." |
| 357 | `customizeAppearance` | "Personnaliser l'apparence" |
| 358 | `securityLegalGdpr` | "Sécurité, Juridique & RGPD" |
| 359 | `securityLegalGdprDesc` | "Gérez vos données personnelles, exportez vos archives ou consultez les..." |
| 360 | `privacyCenterButton` | "Centre de Confidentialité & Export RGPD (JSON)" |
| 361 | `termsConditionsButton` | "Conditions Générales & Charte Communautaire (v2026.1)" |
| 362 | `adminModerationPanel` | "Panel Administrateur & Modération" |
| 363 | `profileUpdatedSuccess` | "Profil mis à jour avec succès !" |
| 364 | `uploadCustomPhoto` | "Importer ma propre photo" |
| 365 | `fullName` | "Nom complet" |
| 366 | `username` | "Pseudo (@)" |
| 367 | `cvLinkHelp` | "Lien vers votre CV (PDF, Drive, Notion, Portfolio)" |
| 368 | `catDiy` | "Bricolage, Travaux & Jardin" |
| 369 | `catTech` | "Tech, Digital & Bureautique" |
| 370 | `catVehicles` | "Véhicules & Mobilité" |
| 371 | `catOther` | "Autre domaine (personnalisé)" |
| 372 | `catMedia` | "Audiovisuel, Photo & Son" |
| 373 | `catWellness` | "Santé, Sport & Bien-être" |
| 374 | `catEvents` | "Événements & Matériel de fête" |
| 375 | `catFashion` | "Mode, Beauté & Accessoires" |
| 376 | `community` | "Communauté" |
| 377 | `trocoLive` | "Troco Live" |
| 378 | `communityAndLive` | "Communauté & Troco Live" |
| 379 | `communitySub` | "Événements en direct, entraide instantanée et salle de discussion mond..." |
| 380 | `globalChat` | "Chat Mondial" |
| 381 | `activityFeed` | "Fil d'actualité" |
| 382 | `onlineUsersBadge` | "1,428 EN LIGNE" |
| 383 | `chatTipMention` | "Cliquez sur un pseudo pour mentionner avec @" |
| 384 | `chatTipAlert` | "Activez l'éclair alerte pour les demandes urgentes" |
| 385 | `chatAlertTooltip` | "Activer l'éclair alerte pour les demandes urgentes" |
| 386 | `alert` | "Alerte" |
| 387 | `globalChatPlaceholder` | "Envoyer un message au chat mondial..." |
| 388 | `urgentChatPlaceholder` | "Décrivez votre besoin urgent (visio, dépannage)..." |
| 389 | `pastCompletedDeal` | "Deal passé complété" |
| 390 | `mediaQualification` | "Qualification média" |
| 391 | `noReviewsZeroTransactions` | "Aucun avis pour le moment (0 transaction clôturée)" |
| 392 | `termsAndConditions` | "Conditions Générales d'Utilisation" |
| 393 | `privacyPolicyTitle` | "Charte de Confidentialité" |
| 394 | `privacyCenterTitle` | "Centre de Confidentialité RGPD" |
| 395 | `legalTexts` | "Textes Juridiques" |
| 396 | `cguConsentTitle` | "Conditions Générales & RGPD" |
| 397 | `cguConsentSubtitle` | "Cadre juridique et engagement communautaire" |
| 398 | `cguSection1Title` | "1. Plateforme d'intermédiation technique" |
| 399 | `cguSection1Desc` | "Troco met à disposition une infrastructure logicielle permettant aux u..." |
| 400 | `cguSection2Title` | "2. Clause de non-responsabilité (P2P)" |
| 401 | `cguSection2Desc` | "Les échanges, interventions physiques et prêts de matériel relèvent de..." |
| 402 | `cguSection3Title` | "3. Protection des données & RGPD" |
| 403 | `cguSection3Desc` | "Vos données personnelles (nom, email, ville, compétences) sont stricte..." |
| 404 | `acceptCguAndPrivacy` | "J'accepte les CGU et la Politique RGPD" |
| 405 | `cguModalTitle` | "Conditions Générales & Charte Troco" |
| 406 | `cguModalSubtitle` | "Version 2026.1 • Engagement communautaire & conformité légale" |
| 407 | `cguTabSummary` | "📋 Les 6 Piliers Fondamentaux" |
| 408 | `cguTabFull` | "📜 Texte Juridique Intégral" |
| 409 | `cguWelcomeIntro` | "Bienvenue sur Troco ! Pour garantir une plateforme sûre, équitable et ..." |
| 410 | `pillar1Title` | "1 Heure = 1 Jeton Troco" |
| 411 | `pillar1Desc` | "La règle fondamentale de Troco repose sur l’égalité du temps partagé. ..." |
| 412 | `pillar2Title` | "Sécurité des Prêts & Cautions" |
| 413 | `pillar2Desc` | "Pour tout prêt de matériel, une empreinte de caution par pré-autorisat..." |
| 414 | `pillar3Title` | "Tolérance Zéro Fraude & Arnaques" |
| 415 | `pillar3Desc` | "Sont strictement interdits : coupons prépayés (Transcash, Neosurf), de..." |
| 416 | `pillar4Title` | "Modération & Sanctions" |
| 417 | `pillar4Desc` | "Tout manquement aux règles de la communauté peut entraîner une suspens..." |
| 418 | `pillar5Title` | "Protection RGPD & Données" |
| 419 | `pillar5Desc` | "Vos données personnelles sont chiffrées (SSL/TLS 256 bits), ne sont ja..." |
| 420 | `pillar6Title` | "Courtoisie & Respect Mutuel" |
| 421 | `pillar6Desc` | "Les échanges, visioconférences et discussions doivent se dérouler dans..." |
| 422 | `cguArt1Title` | "Article 1 — Objet & Définition de la Plateforme" |
| 423 | `cguArt1Desc` | "Troco est une plateforme numérique d’intermédiation communautaire perm..." |
| 424 | `cguArt2Title` | "Article 2 — Compte & Exactitude des Informations" |
| 425 | `cguArt2Desc` | "L’utilisateur s’engage à fournir des informations exactes lors de son ..." |
| 426 | `cguArt3Title` | "Article 3 — Règle du Troc Temporel & Monétisation" |
| 427 | `cguArt3Desc` | "Le Jeton Troco représente 1 heure de service ou de formation. Les acha..." |
| 428 | `cguArt4Title` | "Article 4 — Cautions & Responsabilité des Prêts" |
| 429 | `cguArt4Desc` | "Les cautions demandées pour les prêts de biens matériels constituent u..." |
| 430 | `cguArt5Title` | "Article 5 — Modération, Détection et Sanctions" |
| 431 | `cguArt5Desc` | "Troco utilise des outils d'analyse automatisée pour détecter les tenta..." |
| 432 | `cguArt6Title` | "Article 6 — Données Personnelles (RGPD)" |
| 433 | `cguArt6Desc` | "Les données sont traitées conformément au Règlement Général sur la Pro..." |
| 434 | `agreeTermsCheckbox` | "J'ai lu et j'accepte sans réserve les Conditions Générales d'Utilisati..." |
| 435 | `agreePrivacyCheckbox` | "J'accepte la Politique de Confidentialité et le traitement de mes donn..." |
| 436 | `acceptTermsButton` | "Accepter les CGU et Rejoindre la Communauté" |
| 437 | `privacyCenterSubtitle` | "Contrôlez vos données personnelles et vos préférences de confidentiali..." |
| 438 | `privacyTabData` | "📥 Mes Données & Portabilité" |
| 439 | `privacyTabConsents` | "⚙️ Consentements" |
| 440 | `privacyTabDeletion` | "🗑️ Droit à l’Oubli" |
| 441 | `privacyExportDesc` | "Exportez l'intégralité des données rattachées à votre compte utilisate..." |
| 442 | `downloadMyDataButton` | "Télécharger mon archive personnelle (JSON)" |
| 443 | `privacyDeletionDesc` | "Conformément à l'Article 17 du RGPD (Droit à l'effacement), vous pouve..." |
| 444 | `invoicesTitle` | "Historique & Factures" |
| 445 | `invoicesSubtitle` | "Reçus conformes, TVA 20% & traçabilité de vos paiements Troco" |
| 446 | `trocoPlusSubTitle` | "Abonnement Troco Plus" |
| 447 | `boostListingTitle` | "Booster une Annonce" |
| 448 | `cautionTitle` | "Empreinte de Caution" |
| 449 | `secureDealPaymentTitle` | "Paiement Sécurisé du Deal" |
| 450 | `encryptedPaymentSubtitle` | "Paiement 100% chiffré & sécurisé SSL 256 bits" |
| 451 | `rechargeEuroTab` | "Recharger mon solde (€)" |
| 452 | `trocoPlusTab` | "Abonnement Troco Plus" |
| 453 | `boostListingCta` | "Valider le boost — procéder au paiement" |
| 454 | `boostListingDesc` | "Mets en avant {title} pendant 7 jours pour 2,99€." |
| 455 | `boostListingTitle2` | "🔥 Booster cette annonce" |
| 456 | `boostListingAriaLabel` | "Booster une annonce" |
| 457 | `securePayment` | "Paiement Sécurisé" |
| 458 | `paymentConfirmed` | "Paiement Confirmé !" |
| 459 | `transactionValidatedSuccess` | "Votre transaction a été validée avec succès." |
| 460 | `transactionFailed` | "Échec de la transaction" |
| 461 | `transactionErrorOccurred` | "Une erreur est survenue lors de l'opération. Aucun débit n'a été effec..." |
| 462 | `orderDetails` | "Détail de la commande" |
| 463 | `paymentMethod` | "Moyen de paiement" |
| 464 | `cardLabel` | "Carte Bancaire" |
| 465 | `processing` | "Traitement sécurisé..." |
| 466 | `confirmAndPay` | "Confirmer & Payer ({amount})" |
| 467 | `cancelPayment` | "Annuler le paiement" |
| 468 | `finalizeTransaction` | "Finaliser la transaction" |
| 469 | `closeCategorySelection` | "Fermer la sélection de catégorie" |
| 470 | `langModalDescription` | "L'interface et les annonces seront instantanément traduites dans la la..." |
| 471 | `colorPickerTitle` | "Sélecteur de couleur" |
| 472 | `colorPickerEyedropper` | "Prélever une couleur à l'écran" |
| 473 | `colorPickerEyedropperAria` | "Pipette pour prélever une couleur" |
| 474 | `colorPickerClose` | "Fermer le sélecteur de couleur" |
| 475 | `colorPickerCopy` | "Copier" |
| 476 | `colorPickerCopied` | "Copié" |
| 477 | `colorPickerHex` | "Code couleur hexadécimal" |
| 478 | `colorPickerLuminosity` | "Curseur Luminosité" |
| 479 | `colorPickerLuminosityVal` | "Valeur Luminosité" |
| 480 | `colorPickerRecents` | "Récents (5)" |
| 481 | `colorRecentPrefix` | "Couleur récente" |
| 482 | `colorPickerPalette` | "Palette Système (20)" |
| 483 | `retributionFilters` | "Filtres de rétribution" |
| 484 | `savedFilters` | "Filtres sauvegardés" |
| 485 | `noSavedFilters` | "Aucun filtre enregistré" |
| 486 | `rateLimitTitle` | "Action ralentie" |
| 487 | `rateLimitMessage` | "Tu vas trop vite, réessaie dans {s}s." |
| 488 | `universalModalAriaLabel` | "Fenêtre modale" |
| 489 | `closeBtn` | "Fermer" |
| 490 | `workspace.premium_title` | "WORKSPACE PREMIUM" |
| 491 | `workspace.badge_pro` | "PRO" |
| 492 | `workspace.whiteboard_title` | "Tableau Blanc" |
| 493 | `workspace.whiteboard_desc` | "Créer un nouveau projet ou reprendre un board" |
| 494 | `workspace.notes_title` | "Notes Partagées" |
| 495 | `workspace.badge_notes` | "NOTES" |
| 496 | `workspace.notes_desc` | "Notes de session & checklist Apple-Style" |
| 497 | `workspace.docs_title` | "Troco Docs" |
| 498 | `workspace.badge_docs` | "DOCS" |
| 499 | `workspace.docs_desc` | "Éditeur texte Markdown collaboratif" |
| 500 | `workspace.sheets_title` | "Troco Sheets" |
| 501 | `workspace.badge_sheets` | "SHEETS" |
| 502 | `workspace.sheets_desc` | "Tableur & formules en temps réel" |
| 503 | `workspace.calendar_title` | "Planning & Visios HD" |
| 504 | `workspace.calendar_desc` | "Calendrier de projet & réunions" |
| 505 | `workspace.transfer_title` | "Transférer des Jetons" |
| 506 | `workspace.transfer_desc` | "Envoi direct de Jetons Troco" |
| 507 | `workspace.rewards_title` | "Gérer les Récompenses" |
| 508 | `workspace.rewards_desc` | "Allouer des Jetons pour les tâches accomplies" |
| 509 | `workspace.cancel_reply` | "Annuler la réponse" |
| 510 | `workspace.cancel_edit` | "Annuler la modification" |
| 511 | `workspace.collaborative_tools_tooltip` | "Outils Collaboratifs Workspace (Tableau blanc, Documents, Feuilles, No..." |
| 512 | `workspace.attach_audio` | "Joindre un fichier audio (.mp3, .wav)" |
| 513 | `workspace.send_photo` | "Envoyer une photo / image" |
| 514 | `workspace.transfer_tokens_tooltip` | "Transférer des Jetons Troco instantanément" |
| 515 | `workspace.record_voice_note` | "Enregistrer une note vocale" |
| 516 | `workspace.validate_edit` | "Valider la modification" |
| 517 | `workspace.sending` | "Envoi en cours..." |
| 518 | `workspace.send` | "Envoyer" |
| 519 | `workspace.edit_msg_placeholder` | "Modifie ton message..." |
| 520 | `workspace.companion_msg_placeholder` | "Message d'accompagnement (optionnel)..." |
| 521 | `workspace.by_author` | "Par {author}" |
| 522 | `workspace.by_you` | "Par Vous" |
| 523 | `workspace.shared_doc` | "Document partagé" |
| 524 | `workspace.open_btn` | "Ouvrir" |
| 525 | `workspace.join_btn` | "Rejoindre" |
| 526 | `workspace.click_to_open` | "Cliquez pour ouvrir le document..." |
| 527 | `workspace.whiteboard_collab` | "Tableau Blanc Collaboratif" |
| 528 | `workspace.notes_collab` | "Notes Partagées (Apple-Style)" |
| 529 | `workspace.docs_collab` | "Document Partagé (Troco Docs)" |
| 530 | `workspace.sheets_collab` | "Tableur Collaboratif (Troco Sheets)" |
| 531 | `workspace.slides_collab` | "Présentation (Troco Slides)" |
| 532 | `workspace.planning_collab` | "Planning & Réunions HD" |
| 533 | `workspace.drive_collab` | "Cloud Drive Collaboratif" |
| 534 | `workspace.tools_collab` | "Outils Pro Workspace" |
| 535 | `design.reset` | "Réinitialiser" |
| 536 | `design.reset_title` | "Réinitialiser toutes les personnalisations" |
| 537 | `design.close_aria` | "Fermer le studio de design" |
| 538 | `design.preview_live` | "Aperçu Live" |
| 539 | `design.contrast_guaranteed` | "Contraste Garanti (WCAG AA)" |
| 540 | `design.sample_title` | "Cours Particulier de Guitare & MAO" |
| 541 | `design.sample_meta` | "Par Mateo Polo • Paris 11e • 1 Jeton Troco" |
| 542 | `design.sample_description` | "Session d'apprentissage et de mixage studio. Échange contre dépannage ..." |
| 543 | `design.sample_price` | "1 Jeton Troco" |
| 544 | `design.sample_button` | "Proposer un Troc" |
| 545 | `design.preset_themes` | "Thèmes & Ambiances Prédéfinies" |
| 546 | `design.magic_generator` | "Générateur Magique (1 Clic)" |
| 547 | `design.magic_generator_desc` | "Choisissez une couleur primaire : le moteur HSL calcule automatiquemen..." |
| 548 | `design.brand_color` | "Couleur de Marque" |
| 549 | `design.studio_title` | "Studio Design, Ambiances & Typographie" |
| 550 | `design.accent_ambiance` | "Ambiance & Couleur d'Accentuation Globale" |
| 551 | `design.global_typography` | "Typographie Globale (12+ Polices Google Fonts)" |
| 552 | `design.active_label` | "Actif" |
| 553 | `design.zoom_title` | "Échelle & Zoom d'Affichage" |
| 554 | `design.zoom_compact` | "Compact (90%)" |
| 555 | `design.zoom_standard` | "Standard (100%)" |
| 556 | `design.zoom_large` | "Grand (110%)" |
| 557 | `design.shape_title` | "Forme des Boutons & Cartes" |
| 558 | `design.shape_square` | "Carré (0px)" |
| 559 | `design.shape_soft` | "Doux (14px)" |
| 560 | `design.shape_pill` | "Pilule (999px)" |
| 561 | `design.color_tuning_title` | "Ajustement Précis des Couleurs" |
| 562 | `design.color_bg` | "Fond" |
| 563 | `design.color_card` | "Cartes" |
| 564 | `design.color_text` | "Texte" |
| 565 | `design.color_buttons` | "Boutons" |
| 566 | `theme.earthy.name` | "Earthy Pastel" |
| 567 | `theme.earthy.description` | "Fonds crème & sable, accents terracotta, textes marron" |
| 568 | `theme.sakura.name` | "Soft Sakura" |
| 569 | `theme.sakura.description` | "Douceur florale, rose poudré et touches minérales" |
| 570 | `theme.sage.name` | "Botanical Sage" |
| 571 | `theme.sage.description` | "Élégance végétale, vert sauge et nuances naturelles" |
| 572 | `theme.lavender.name` | "Pastel Lavender" |
| 573 | `theme.lavender.description` | "Brume provençale, lilas apaisant et gris perle" |
| 574 | `theme.titanium.name` | "Minimalist Titanium" |
| 575 | `theme.titanium.description` | "Précision architecturale, monochrome noir et titane" |
| 576 | `theme.custom.name` | "Sur-Mesure" |
| 577 | `typo.cat.modern_neutral` | "Moderne & Neutre" |
| 578 | `typo.cat.round_dynamic` | "Rond & Dynamique" |
| 579 | `typo.cat.geometric_bold` | "Géométrique & Audacieux" |
| 580 | `typo.cat.clean_universal` | "Épuré & Universel" |
| 581 | `typo.cat.serif_luxury` | "Serif Éditorial & Luxueux" |
| 582 | `typo.cat.tech_futuristic` | "Tech & Futuriste" |
| 583 | `typo.cat.handwritten_creative` | "Manuscrit & Créatif" |
| 584 | `typo.cat.literary_poetic` | "Littéraire & Poétique" |
| 585 | `typo.cat.round_soft` | "Rond & Doux" |
| 586 | `typo.cat.condensed_impact` | "Condensé & Impactant" |
| 587 | `typo.cat.stable_pro` | "Stable & Professionnel" |
| 588 | `typo.cat.balanced_round` | "Arrondi & Équilibré" |
| 589 | `typo.cat.classic_prestige` | "Classique & Prestige" |
| 590 | `typo.cat.clean_tech` | "Épuré & Tech" |
| 591 | `typo.cat.code_mono` | "Code & Monospace" |
| 592 | `live.title` | "Troco Live Chat" |
| 593 | `live.badge_direct` | "DIRECT" |
| 594 | `live.badge_admin` | "ADMIN" |
| 595 | `live.badge_membre` | "MEMBRE" |
| 596 | `live.badge_verifie` | "VÉRIFIÉ" |
| 597 | `live.badge_fondateur` | "FONDATEUR" |
| 598 | `live.badge_vip` | "VIP" |
| 599 | `live.badge_pro` | "PRO" |
| 600 | `live.stream_speed` | "Flux 50 ms" |
| 601 | `live.online_count` | "{count} connectés" |
| 602 | `live.connected_users` | "connectés" |
| 603 | `live.click_to_mention` | "Cliquer pour mentionner" |
| 604 | `live.default_author` | "Membre Troco" |
| 605 | `payment.custom_amount_placeholder` | "Ou montant libre en € (ex: 75)" |
| 606 | `payment.boost_7d_title` | "Boost 7 jours" |
| 607 | `payment.boost_7d_duration` | "7 jours" |
| 608 | `payment.boost_7d_desc` | "Remonte en tête de liste dans les résultats de recherche" |
| 609 | `payment.boost_urgent_title` | "Boost Urgent 48h" |
| 610 | `payment.boost_urgent_duration` | "48 heures" |
| 611 | `payment.boost_urgent_desc` | "Badge Flamme exclusif + notification de proximité" |
| 612 | `payment.boost_max_title` | "Pack Visibilité Max" |
| 613 | `payment.boost_max_duration` | "14 jours" |
| 614 | `payment.boost_max_desc` | "Visibilité maximale prioritaire + mise en avant carrousel" |
| 615 | `office.add_row` | "Ajouter une ligne" |
| 616 | `office.add_col` | "Ajouter une colonne" |
| 617 | `office.add_col_right` | "Ajouter une colonne à droite" |
| 618 | `office.insert_slide_image` | "Insérer une image sur la diapositive" |
| 619 | `office.delete_image` | "Supprimer l'image" |
| 620 | `office.bg_theme_aria` | "Thème de fond" |
| 621 | `notes.close_title` | "Fermer la note" |
| 622 | `notes.export_md` | "Exporter au format Markdown (.md)" |
| 623 | `notes.print_pdf` | "Imprimer / Exporter PDF" |
| 624 | `notes.heading_1` | "Titre 1" |
| 625 | `notes.heading_2` | "Titre 2" |
| 626 | `notes.heading_3` | "Titre 3" |
| 627 | `notes.bold` | "Gras" |
| 628 | `notes.italic` | "Italique" |
| 629 | `notes.checkbox` | "Case à cocher / Tâche" |
| 630 | `notes.bullet_list` | "Liste à puces" |
| 631 | `notes.quote` | "Citation" |
| 632 | `notes.code_block` | "Bloc de code" |
| 633 | `nav.main_mobile_aria` | "Navigation principale mobile" |
| 634 | `nav.main_aria` | "Navigation principale" |
| 635 | `header.light_mode_title` | "Activer le mode clair" |
| 636 | `header.dark_mode_title` | "Activer le mode sombre" |
| 637 | `header.change_language` | "Changer de langue" |
| 638 | `close_notification_aria` | "Fermer la notification" |
| 639 | `close_filters_aria` | "Fermer les filtres" |
| 640 | `closeLanguageModal` | "Fermer la sélection de langue" |
| 641 | `previous_step` | "Étape précédente" |
| 642 | `back_to_previous_step` | "Revenir à l'étape précédente" |
| 643 | `myProfile` | "Mon Profil" |
| 644 | `admin.close_panel_title` | "Fermer le panel admin" |
| 645 | `admin.inspect_public_profile` | "Inspecter le profil public" |
| 646 | `admin.ban_user` | "Bannir" |
| 647 | `admin.unban_user` | "Débannir" |
| 648 | `admin.edit_user_profile` | "Éditer le profil utilisateur" |
| 649 | `admin.adjust_balance` | "Ajuster solde jetons/euros" |
| 650 | `admin.remove_admin` | "Retirer Admin" |
| 651 | `admin.grant_admin` | "Donner Admin" |
| 652 | `admin.verify_kyc` | "Vérifier KYC" |
| 653 | `admin.delete_firestore_account` | "Supprimer le compte Firestore" |
| 654 | `admin.factory_reset_account` | "🧨 Réinitialisation Usine du Compte" |
| 655 | `admin.close_dispute_confirm` | "Clôturer le litige et valider la transaction" |
| 656 | `admin.refund_transaction` | "Rembourser la transaction à l'utilisateur" |
| 657 | `admin.delete_transaction_firestore` | "Supprimer la transaction de Firestore" |
| 658 | `accountSuspendedTitle` | "Votre compte a été suspendu" |
| 659 | `accountSuspendedReason` | "Raison :" |
| 660 | `accountSuspendedDefaultReason` | "Votre compte a été suspendu par l'administration Troco pour non-respec..." |
| 661 | `accountSuspendedContact` | "Contactez le support pour plus d'informations : support@troco.fr" |
| 662 | `accountSuspendedLogout` | "Se déconnecter" |
| 663 | `actionEditListing` | "Modifier l'annonce" |
| 664 | `actionBoostListing` | "Booster l'annonce" |
| 665 | `actionPauseListing` | "Mettre en pause" |
| 666 | `actionResumeListing` | "Réactiver l'annonce" |
| 667 | `actionDeleteListing` | "Supprimer l'annonce" |
| 668 | `actionAdminHideListing` | "Masquer (Admin)" |
| 669 | `actionAdminDeleteListing` | "Supprimer (Admin)" |
| 670 | `statusPaused` | "En pause" |
| 671 | `statusActive` | "Active" |
| 672 | `noListingsFoundTitle` | "Aucune annonce ne correspond à votre recherche" |
| 673 | `noListingsFoundDesc` | "Essayez d'élargir le rayon de recherche, de changer de catégorie ou de..." |
| 674 | `loadingMoreListings` | "Chargement des annonces..." |
| 675 | `loadMoreListings` | "Charger plus d'annonces" |
| 676 | `loadingProfile` | "Chargement du profil..." |
| 677 | `loadingReportForm` | "Chargement du formulaire de signalement..." |
| 678 | `loadingDealNegotiation` | "Chargement de la négociation..." |
| 679 | `boostSuccessToast` | "Annonce boostée avec succès pour 7 jours !" |
| 680 | `urgentBadge` | "URGENT" |
| 681 | `exampleBadge` | "Exemple" |
| 682 | `topVisibilityBadge` | "TOP VISIBILITÉ" |
| 683 | `manageListingTooltip` | "Gérer ou supprimer cette annonce" |
| 684 | `manageListingBtn` | "Gérer" |
| 685 | `desktopAdBannerAria` | "Monétisation et Boost Troco" |
| 686 | `visibilityBadge` | "Visibilité" |
| 687 | `boostAdAlt` | "Booster une annonce" |
| 688 | `boostHeadline` | "Passez en tête du Feed !" |
| 689 | `boostSubtitle` | "Multipliez vos contacts par 5 en plaçant vos annonces tout en haut." |
| 690 | `boostPricing` | "À partir de 2,99€ / 7 jours" |
| 691 | `boostAlertSelectAd` | "💡 Créez ou sélectionnez une de vos annonces depuis votre profil pour ..." |
| 692 | `boostMyListingBtn` | "Booster mon annonce" |
| 693 | `loginToTransferTokens` | "Veuillez vous connecter pour transférer des jetons." |
| 694 | `sponsoredBadge` | "Sponsorisé" |
| 695 | `closeListingDetailsAria` | "Fermer les détails de l'annonce" |
| 696 | `defaultAuthor` | "Membre Troco" |
| 697 | `adminListingHidden` | "🚫 Annonce #{id} masquée du feed public" |
| 698 | `adminListingVisible` | "👁️ Annonce #{id} visible" |

---

## 5. 🛠️ Recommandations & Bonnes Pratiques pour les Futures Évolutions

1. **Toujours déclarer les clés dans les 3 fichiers :**
   - `src/locales/translations.js` : Utilisé pour le module principal et les tests.
   - `src/data/translationsData.js` : Utilisé pour les données partagées et structures étendues.
   - `src/data/translationsSecondary.js` : Contient les 6 langues secondaires (EN, ES, IT, DE, JA, ZH).
2. **Propagations de la fonction `t` :**
   - Passer systématiquement la fonction `t` ou le hook `useI18n` aux sous-composants, avec valeur par défaut :  
     `const { t = (k, def) => def || k } = props;`
3. **Contrôle automatique de non-régression :**
   - Lancer `npm test` ou `npx vitest run` après tout ajout pour s'assurer qu'aucun snapshot ni test unitaire n'est rompu.
   - Lancer `npm run build` pour vérifier l'absence d'erreurs de syntaxe ou de duplication de clés.
