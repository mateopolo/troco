# 🦄 AUDIT OPÉRATIONNEL COMPLET — TROCO

> **Type de document :** Audit opérationnel, organisationnel et de conformité (documentation et recommandations uniquement)
> **Date de réalisation :** 18 septembre 2026
> **Réalisé par :** Principal SaaS Product Manager & Systems Architect
> **Périmètre :** Intégralité du dépôt `troco` (branche `main`, commit de référence `8b49f51`) — `src/`, `functions/`, `scripts/`, `public/`, `tests/`, `docs/`, configuration racine
> **Statut :** Livrable de recommandations. **Aucune ligne de code fonctionnel, aucune règle Firestore, aucune Cloud Function et aucun comportement d'exécution n'a été modifié.**
> **Objectif :** Permettre au fondateur de professionnaliser Troco au standard d'une fintech régulée et d'une marketplace internationale, en structurant l'infrastructure email, l'organisation humaine et les chantiers de mise en conformité.

---

## 📑 SOMMAIRE

1. [Synthèse exécutive](#synthèse-exécutive)
2. [Section 1 — Audit des adresses email opérationnelles](#section-1--audit-des-adresses-email-opérationnelles)
3. [Section 2 — Organigramme & plan de recrutement](#section-2--organigramme--plan-de-recrutement)
4. [Section 3 — Professionnalisation & recommandations stratégiques](#section-3--professionnalisation--recommandations-stratégiques)
5. [Section 4 — Checklist opérationnelle pour le fondateur](#section-4--checklist-opérationnelle-pour-le-fondateur)
6. [Annexes](#annexes)

---

## SYNTHÈSE EXÉCUTIVE

### 1. Ce que Troco est aujourd'hui (constat technique)

Troco est une **PWA React 19** (Create React App, `react-scripts` 5.0.1) adossée à **Firebase** (Firestore, Auth, Storage, Cloud Functions v2, project ID `troco-8a6eb`). Le produit couvre déjà :

| Domaine | État observé dans le code |
|---|---|
| Marketplace P2P (biens, services, troc, logements) | Opérationnel — `src/features/feed`, `src/features/map` |
| Collaboration temps réel (Docs, Sheets, Slides, Whiteboard, Notes) | Opérationnel — `src/features/workspace`, `src/TrocoSlides.jsx` |
| Wallet (jetons Troco + euros) | Opérationnel — `src/stores/useWalletStore.js`, `functions/src/payments/` |
| Paiement / Escrow | **Simulé** — `functions/src/payments/providers/mockProvider.ts` (Stripe non activé) |
| KYC | **Simulé** — `KycModal` écrit `kycVerified: true` localement (`src/components/ProfileView.jsx:741`) |
| Appels audio/vidéo WebRTC | Opérationnel — `src/hooks/useWebRTC.js`, signalisation Firestore |
| Admin / modération | Opérationnel — `src/features/admin/AdminDashboard.jsx` (2 830 lignes) |
| RGPD (effacement, rétractation 30 j, anonymisation) | Partiellement opérationnel — `functions/src/gdpr/` |
| i18n | 7 langues (FR, EN, ES, IT, DE, JA, ZH) — `src/config/translations.js` |
| Observabilité | Sentry (`src/utils/sentry.js`) + health check (`functions/src/health/healthCheck.ts`) |
| Audit trail administrateur | Oui, dans Google Cloud Logging — `functions/src/utils/logger.ts` |

**Score global auto-déclaré du projet (source : `🦄 TROCO — ROADMAP ULTIME.txt`) : 5,6/10 contre 9,5/10 visé pour une Série A.** Les trois axes les plus déficitaires sont **Observabilité/DevOps (−7)**, **Conformité légale PSD2/RGPD/DSA/DAC7/KYC-AML (−6)** et **Sécurité financière (−4)**.

### 2. Les 5 constats opérationnels majeurs issus de cet audit

1. **L'infrastructure email est inexistante au plan opérationnel.** Le code publie 6 adresses fonctionnelles (`support@`, `contact@`, `abuse@`, `privacy@`, `litiges@`, `mateo@troco.fr`) sur des pages publiques juridiquement engageantes, mais **aucun fournisseur de messagerie n'est configuré**, **aucun enregistrement SPF/DKIM/DMARC n'est attesté**, et **aucun système de ticketing ne reçoit ces emails**. Un utilisateur qui écrit à `abuse@troco.fr` (obligation DSA) écrit potentiellement dans le vide.
2. **Le nom de domaine est incohérent.** Mentions légales, footer et politique de remboursement affichent `troco.fr` ; le README démo, le lien d'invitation WebRTC (`src/hooks/useWebRTC.js:1079`), le placeholder d'inscription (`src/features/auth/AuthScreen.jsx:871`) et les tests utilisent `troco.app`. Deux domaines = deux réputations email, deux surfaces SEO, deux risques juridiques.
3. **L'administration repose encore sur une adresse Gmail personnelle codée en dur** (`mateopolo91@gmail.com`) dans **8 emplacements** (`src/contexts/AuthContext.jsx`, `src/features/admin/AdminDashboard.jsx`, `src/components/AdminPanel.jsx`, `src/components/GlobalLiveChat.jsx`, `src/stores/useAuthStore.js:7`, `scripts/bootstrap-admin.js`). Perte du compte Gmail = perte de l'administration.
4. **Les obligations structurantes de conformité ne sont pas couvertes** : pas de DPO désigné ni déclaré, pas de registre des traitements, pas de module DAC7, pas d'agrément ni de partenariat de détention de fonds pour compte de tiers (PSD2/EMI), KYC et paiements factices.
5. **L'organisation est mono-personne.** Tous les rôles critiques (support, modération, conformité, sécurité, finance, développement) reposent sur le fondateur.

### 3. Trajectoire recommandée

- **Vague 1 (M0 → M3) — « Sécuriser l'existant »** : domaine unique, emails P0, SPF/DKIM/DMARC, DPO/registre RGPD, sortie de l'admin Gmail, 2FA, premier freelance support/modération.
- **Vague 2 (M4 → M12) — « Devenir une vraie société »** : statut juridique, comptabilité, KYC/PSP réels, DAC7, recrutements structurants (CTO/Lead Dev, Customer Success, Trust & Safety).
- **Vague 3 (M13 → M24) — « Scaler »** : Compliance Officer dédié, CISO, CFO, support multilingue, expansion internationale, préparation de levée.

---


## SECTION 1 — AUDIT DES ADRESSES EMAIL OPÉRATIONNELLES

### Step A — Résultat du scan de la base de code (preuve par grep)

Le scan a été conduit sur l'intégralité des fichiers `*.js`, `*.jsx`, `*.ts`, `*.tsx`, `*.json`, `*.html`, `*.md`, `*.txt`, `*.rules`, `.env`, `firebase.json` et `firestore.rules` (hors `node_modules`).

#### A.1 — Adresses réellement présentes dans le code de production

| Occurrences | Adresse | Fichiers et lignes exactes | Nature |
|---|---|---|---|
| 7 | `support@troco.fr` | `src/App.js:5371` · `src/components/Footer.jsx:261,267` · `src/components/LegalNotice.jsx:436,441` · `src/components/RefundPolicy.jsx:253` (×2) | **Adresse publique active** |
| 5 | `privacy@troco.fr` | `src/components/PrivacyPolicy.jsx:186,465` · `src/components/LegalNotice.jsx:458,463` | **Adresse publique active** — présentée comme « DPO » |
| 5 | `abuse@troco.fr` | `src/components/LegalNotice.jsx:374,379,447,452` | **Adresse publique active** — point de contact DSA Art. 11 & 12 |
| 2 | `litiges@troco.fr` | `src/components/RefundPolicy.jsx:378` (×2) | **Adresse publique active** — saisine de la modération |
| 2 | `contact@troco.fr` | `src/components/LegalNotice.jsx:239,244` | **Adresse publique active** — contact général |
| 2 | `mateo@troco.fr` | `src/components/LegalNotice.jsx:230,235` | **Adresse publique active** — directeur de la publication |
| 1 | `compte@troco.fr` | `src/components/TransactionsHistoryModal.jsx:223` | Adresse **factice d'affichage** (fallback) — pas une boîte |
| 1 | `mateo@troco.app` | `src/features/auth/AuthScreen.jsx:871` | **Placeholder de saisie** — incohérence de domaine |

#### A.2 — Adresses techniques / personnelles (dette critique)

| Occurrences | Adresse | Fichiers et lignes exactes | Risque |
|---|---|---|---|
| 8 | `mateopolo91@gmail.com` | `src/stores/useAuthStore.js:7` · `src/contexts/AuthContext.jsx:95` (×2) · `src/components/AdminPanel.jsx:45` · `src/components/GlobalLiveChat.jsx:84` · `src/features/admin/AdminDashboard.jsx:34` · `scripts/bootstrap-admin.js:9,10,17` | 🔴 **P0** — Élévation de privilèges côté client + bus factor total |
| 1 | `admin@...` (motif) | `docs/CODEBASE-BIBLE.md:285` — contre-exemple documentaire de l'anti-pattern interdit par la doctrine Zero-Trust | Documentation |

#### A.3 — Adresses de test (à ne pas confondre avec la production)

Présentes dans `functions/test/`, `tests/rules/`, `e2e/` et les fichiers `*.test.js` :
`sender@troco.fr`, `test@troco.fr`, `user@troco.fr`, `alice@troco.app`, `bob@troco.app`, `charlie@troco.app`, `alexandre@troco.app`, `target@troco.app`, `alice@troco.fr`, `bob@troco.fr`, `alice@example.com`, `bob@example.com`, `charlie@example.com`, `sophie@private.com`, `sophie@artisan.fr`, `camille.martin@example.com`, `fraud@example.com`, `exemple@email.com`, `citoyen@example.fr`.

> **Recommandation de nomenclature :** conserver `@example.com` / `@example.fr` (réservés RFC 2606 et RFC 6761) pour tous les tests et **bannir `@troco.*` des fixtures**, afin qu'un scan de sécurité ne remonte jamais de faux positif et qu'aucun test ne puisse router vers une vraie boîte.

#### A.4 — Infrastructure email : état réel constaté

| Élément | Présence dans le dépôt | Conclusion |
|---|---|---|
| Fournisseur SMTP / API transactionnelle | ❌ Aucun SDK `sendgrid`, `nodemailer`, `resend`, `postmark` ou `mailgun` dans `package.json` ni `functions/package.json` | **À créer intégralement** |
| Extension Firebase « Trigger Email » | ⚠️ Non déployée dans `firebase.json` (seuls `firestore` et `functions` y figurent), alors que `functions/src/gdpr/sendDeletionEmail.ts:22` écrit déjà dans la collection `mail` | **Extension à installer pour que ce code fonctionne réellement** |
| Email d'effacement RGPD | ✅ Code présent — `functions/src/gdpr/sendDeletionEmail.ts` (objet : « Confirmation de la demande de suppression de compte — Troco ») | En l'absence de l'extension, seule une trace `console.log` est produite → **email jamais reçu** |
| Email de bienvenue | ❌ Aucun | À créer |
| Vérification d'adresse email | ⚠️ Template Firebase Auth par défaut (expéditeur `noreply@troco-8a6eb.firebaseapp.com`) | **Non professionnel** — à rebrander |
| Réinitialisation de mot de passe | ⚠️ Template Firebase Auth par défaut | **Non professionnel** — à rebrander |
| Notification transactionnelle (deal conclu, transfert reçu) | ❌ Aucune — uniquement in-app (`src/services/notificationService.js`) | À créer |
| SPF / DKIM / DMARC | ❌ Aucun enregistrement DNS présent ni documenté | 🔴 **Bloquant délivrabilité** |
| Signature email / bas de page légal | ❌ Inexistante | À créer |
| Système de ticketing | ❌ Inexistant | À créer |
| Templates email HTML (dossier `emails/`) | ❌ Inexistant | À créer |
| Désabonnement marketing | ⚠️ Consentement géré (`src/services/consentManager.js`, `marketingEmails` par défaut `false`) mais **aucun lien de désabonnement dans un email réel** | À implémenter |

#### A.5 — Flux de notification actuel (pour information)

Le seul canal de notification réellement opérationnel est **in-app** : `src/services/notificationService.js` implémente un moteur « Dynamic Island » (déduplication, effets sonores `playPop`, haptique). Il n'existe **aucune passerelle** entre ce service et un canal email ou push web. `src/services/outboxService.js` garantit la résilience des opérations *financières* hors-ligne (IndexedDB + réconciliation idempotente), mais **ne transporte aucun email**.

---
### Step B — Cartographie fonctionnelle complète des adresses email

> **Convention retenue :** le domaine `troco.fr` est retenu comme **domaine principal canonique** car c'est celui déjà publié sur les pages juridiques (mentions légales, confidentialité, remboursement), qui sont les seules pages opposables en droit. `troco.app` doit devenir une simple redirection 301 vers `troco.fr` (voir Step C).

#### B.1 — Tableau maître des adresses

| Adresse email | Rôle / Fonction | Requêtes entrantes traitées | Où elle apparaît dans le code | Statut | Priorité |
|---|---|---|---|---|---|
| `support@troco.fr` | Support utilisateur niveau 1 | Impossible de se connecter, bug d'affichage, question sur une annonce, aide au paiement, réclamation de modération, demande de rétractation acheteur | `src/App.js:5371` · `src/components/Footer.jsx:261,267` · `src/components/LegalNotice.jsx:436,441` · `src/components/RefundPolicy.jsx:253` (×2) | **Existe** (publiée, non opérée) | **P0** |
| `privacy@troco.fr` | Demandes RGPD (accès art. 15, effacement art. 17, portabilité art. 20, rectification art. 16) — publiée comme point de contact DPO | « Je veux récupérer mes données », « Supprimez mon compte », « Qui a accès à mes données ? », opposition au traitement | `src/components/PrivacyPolicy.jsx:186,465` · `src/components/LegalNotice.jsx:458,463` | **Existe** (publiée, non opérée) | **P0** |
| `abuse@troco.fr` | Signalement d'abus, modération, point de contact DSA (art. 11 & 12) et notification de contenus illicites (art. 16) | Annonce frauduleuse, propos haineux, usurpation d'identité, contrefaçon, contenu illicite, harcèlement | `src/components/LegalNotice.jsx:374,379,447,452` | **Existe** (publiée, non opérée) | **P0** |
| `litiges@troco.fr` | Gestion des litiges entre membres et arbitrage Escrow | « Le vendeur ne m'a pas livré », « L'objet est cassé », désaccord sur un deal, demande d'arbitrage | `src/components/RefundPolicy.jsx:378` (×2) | **Existe** — à **conserver** mais à formaliser | **P0** |
| `dpo@troco.fr` | Délégué à la Protection des Données (obligation RGPD art. 37) — adresse officielle de contact du DPO | Toute question relative à la protection des données, réclamations pré-CNIL, exercice des droits formels | ❌ Absente du code — `privacy@` joue ce rôle par défaut | **À créer** | **P0** |
| `security@troco.fr` | Signalement de vulnérabilité, faille de sécurité, sécurité informatique | Divulgation responsable de faille, suspicion de compromission de compte, signalement d'usurpation d'app | ❌ Absente du code — **aucun `security.txt` publié** | **À créer** | **P0** |
| `admin@troco.fr` | Administration interne, boîte de service technique et de compte système | Notifications système, comptes de service, récupération d'accès, invitations d'outils (Analytics, Stripe, Firebase) | ❌ Absente — remplacée par `mateopolo91@gmail.com` (8 emplacements) | **À créer** (remplace l'admin Gmail) | **P0** |
| `no-reply@troco.fr` | Notifications transactionnelles sortantes uniquement (mail « ne pas répondre ») | **Aucune entrante** (ou redirection de secours vers `support@` en cas de réponse accidentelle) | ❌ Absente — Firebase Auth envoie depuis `noreply@troco-8a6eb.firebaseapp.com` | **À créer** | **P0** |
| `legal@troco.fr` | Mises en demeure, réquisitions judiciaires, demandes des autorités, RGPD formel | Assignation, demande d'huissier, réquisition d'un officier de police judiciaire, notification légale, mise en demeure | ❌ Absente du code | **À créer** | **P1** |
| `compliance@troco.fr` | Conformité réglementaire, AML/LCB-FT, sanctions, DAC7, DSP2 | Déclaration de soupçon (TRACFIN), demande de l'ACPR, contrôle DSA, reporting fiscal | ❌ Absente du code | **À créer** | **P1** |
| `payments@troco.fr` | Opérations wallet, transactions, KYC, AML | Litige de virement, blocage de fonds, validation KYC, demande de remboursement PSP, chargeback | ❌ Absente du code | **À créer** | **P1** |
| `billing@troco.fr` | Facturation, remboursements, litiges de paiement, TVA | Demande de facture, remboursement d'un boost, erreur de facturation, contestation TVA | ❌ Absente du code | **À créer** | **P1** |
| `kyc@troco.fr` | Vérifications d'identité (KYC) | « Pourquoi mon KYC est refusé ? », « Ma pièce d'identité a expiré », renvoi de documents | ❌ Absente du code | **À créer** | **P1** |
| `fraud@troco.fr` | Détection de fraude, transactions suspectes | Signalement d'un vendeur escroc, détection d'un pattern de fraude, compte compromis | ❌ Absente du code | **À créer** | **P1** |
| `moderators@troco.fr` | Équipe de modération (boîte partagée interne) | File de travail des modérateurs (alias interne vers `abuse@`) | ❌ Absente du code | **À créer** (alias) | **P1** |
| `trust@troco.fr` | Trust & Safety (vue transverse) | Coordination interne Trust & Safety, partenaires (Thorn, INHOPE, Pharos), réquisitions | ❌ Absente du code | **À créer** (alias) | **P1** |



#### B.2 — Tableau maître (suite) — adresses corporate, presse, partenariats et arbitrages

| Adresse email | Rôle / Fonction | Requêtes entrantes traitées | Où elle apparaît dans le code | Statut | Priorité |
|---|---|---|---|---|---|
| `contact@troco.fr` | Contact général (publié) | Demandes diverses non catégorisées, journalistes, institutions, prospection entrante | `src/components/LegalNotice.jsx:239,244` | **Existe** — à conserver comme **adresse d'aiguillage** | **P1** |
| `hello@troco.fr` | Alias marketing/accueil (variante moderne de `contact@`) | Onboarding partenaires, candidatures spontanées, presse | ❌ Absente | **À créer** (redondant avec `contact@`) → **recommandation : ne pas créer**, utiliser `contact@` | **P2** |
| `help@troco.fr` | Aide et FAQ (variante de `support@`) | Questions fréquentes, orientation vers le centre d'aide | ❌ Absente | **À créer** en **alias** de `support@` (jamais une boîte distincte) | **P2** |
| `noreply@troco.fr` | Variante sans tiret de `no-reply@` | Aucune (sortant uniquement) | ❌ Absente | **NE PAS CRÉER** — arbitrage : **une seule convention, `no-reply@troco.fr`** (voir B.6) | **P2** |
| `feedback@troco.fr` | Retours produit, suggestions d'amélioration | Idées de fonctionnalités, reproches UX, avis d'utilisateurs | ❌ Absente | **À créer** (boîte partagée produit) | **P2** |
| `press@troco.fr` | Presse et médias | Interviews, communiqués, kit média, demandes de visuels | ❌ Absente | **À créer** | **P1** |
| `partners@troco.fr` | Partenariats business, développement commercial | Proposition de partenariat, API, co-marketing, affiliation | ❌ Absente | **À créer** | **P1** |
| `careers@troco.fr` | Recrutement, candidatures | CV spontanés, candidatures aux offres, demandes de stage | ❌ Absente | **À créer** (si hiring prévu — voir Section 2) | **P1** |
| `ceo@troco.fr` | Direction générale | Contact direct fondateur, investisseurs, boards, entrepreneurs | ❌ Absente | **À créer** | **P1** |
| `president@troco.fr` | Présidence (variante statutaire) | Idem `ceo@` selon le statut juridique retenu | ❌ Absente | **À créer uniquement si le statut juridique créé prévoit une présidence** (sinon alias de `ceo@`) | **P2** |
| `cto@troco.fr` | Direction technique | Partenariats techniques, intégrations, recrutement tech | ❌ Absente | **À créer après le recrutement du CTO/Lead Dev** | **P2** |
| `devops@troco.fr` | Infrastructure, monitoring, alertes | Alertes Cloud Monitoring, facturation GCP, incidents | ❌ Absente | **À créer** (boîte + **alias de réception d'alertes**, jamais un humain seul) | **P1** |
| `mateo@troco.fr` | Adresse nominative du fondateur (directeur de la publication) | Correspondance personnelle professionnelle | `src/components/LegalNotice.jsx:230,235` | **Existe** — à **conserver** (obligation LCEN art. 6-III) | **P1** |
| `compte@troco.fr` | Adresse **factice** affichée comme fallback | **Aucune** — ce n'est pas une boîte, juste une valeur de repli UI | `src/components/TransactionsHistoryModal.jsx:223` | ⚠️ **À supprimer de l'affichage** (remplacer par un libellé vide ou masqué) | **P2** |
| `troco.app` (domaine entier) | Domaine secondaire incohérent | — | `README-DEMO.md:26` · `src/hooks/useWebRTC.js:1079` · `src/features/auth/AuthScreen.jsx:871` · nombreux tests | **À renommer** → redirection 301 vers `troco.fr` | **P1** |
| `mateopolo91@gmail.com` | **Anti-pattern critique** — administration depuis un Gmail personnel | Notifications Google, récupération de compte, accès console | 8 emplacements (voir A.2) | 🔴 **À ÉLIMINER** — remplacer par `admin@troco.fr` + Custom Claims | **P0** |

#### B.3 — Récapitulatif de décision : 30 adresses canoniques cibles

| Priorité | Adresses | Décision |
|---|---|---|
| **P0 — Mois 0-2 (obligatoire)** | `support@` · `privacy@` · `dpo@` · `abuse@` · `litiges@` · `security@` · `admin@` · `no-reply@` | 7 à créer, 4 à conserver mais **opérer réellement** |
| **P1 — Mois 2-6 (professionnalisation)** | `contact@` · `legal@` · `compliance@` · `payments@` · `billing@` · `kyc@` · `fraud@` · `press@` · `partners@` · `careers@` · `ceo@` · `devops@` · `mateo@` | Création + rattachement à un outil de ticketing |
| **P2 — Mois 6-12 (confort)** | `help@` · `feedback@` · `cto@` · `president@` · `moderators@` · `trust@` | Création en **alias ou boîte partagée**, aucune boîte individuelle |
| **Interdit / supprimé** | `noreply@` (sans tiret) · `hello@` · `compte@` (affichage) · `mateopolo91@gmail.com` (usage admin) | Conflit de convention ou risque de sécurité |

---
#### B.4 — Fiches opérationnelles détaillées (objet, requêtes, SLA, automatisation)

##### 🔴 P0-a — `support@troco.fr` — Support utilisateur niveau 1

- **Objet exact :** boîte de premier contact pour tout problème d'usage du produit. C'est l'adresse affichée dans le pied de page (`src/components/Footer.jsx:267` → « Assistance & Médiation : support@troco.fr ») et dans l'écran de bannissement (`src/App.js:5371`).
- **Requêtes entrantes concrètes :**
  - « Je n'arrive pas à me connecter, mon mot de passe n'est pas reconnu » → réinitialisation Firebase Auth.
  - « Je n'ai pas reçu mes jetons après mon paiement Stripe (référence `pi_3X...`) » → vérification `transactions/{txId}` + `applyPayment`.
  - « Mes appels vidéo ne fonctionnent pas sur iPhone » → diagnostic WebRTC (`src/utils/diagnostics/webrtcScanner.js`).
  - « Comment fonctionne le séquestre sur un deal ? » → renvoi centre d'aide.
  - « Je souhaite me rétracter sur l'achat de jetons » → **si le mail contient les mots « rétractation », « remboursement », « jetons » → réétiqueter vers `billing@`**. Formulation attendue par la page `RefundPolicy.jsx:253`.
  - « Un utilisateur m'a insulté dans le chat » → **réétiqueter vers `abuse@`** (ne jamais traiter un signalement d'abus dans la file support générale : risque DSA).
- **SLA recommandé :** **première réponse sous 48 h ouvrées** ; résolution cible sous 5 jours ouvrés ; escalade automatique si non répondu à 36 h.
- **Automatisation possible :**
  1. Ticketing obligatoire (voir Step C) avec **tri par mots-clés** (`rétractation` → `billing@`, `insulte/harcèlement/contenu illicite` → `abuse@`, `mes données/RGPD` → `privacy@`).
  2. **Auto-réponse** immédiate accusant réception + numéro de ticket + lien vers le centre d'aide + rappel des délais.
  3. **Formulaire de contact in-app** créant directement le ticket avec `uid`, `chatId`, `listingId`, `transactionId` pré-remplis (gain de 2 allers-retours par demande).
  4. Réponses types (macros) pour les 10 questions les plus fréquentes, en 7 langues (aligné sur `src/config/translations.js`).

##### 🔴 P0-b — `privacy@troco.fr` — Demandes RGPD

- **Objet exact :** adresse publiée comme « Courriel dédié à la vie privée & DPO » (`src/components/PrivacyPolicy.jsx:186`) et point de contact DPO dans les mentions légales (`src/components/LegalNotice.jsx:458`). Elle est adossée à un bouton pré-rempli : `mailto:privacy@troco.fr?subject=Demande%20Exercice%20Droits%20RGPD` (`src/components/PrivacyPolicy.jsx:465`).
- **Requêtes entrantes concrètes :**
  - Exercice du **droit d'accès** (art. 15) : « Envoyez-moi toutes les données que vous détenez sur moi ».
  - **Droit à l'effacement** (art. 17) : « Supprimez mon compte et mes données » → doit déclencher `gdprService.deleteUserCompletely()` (`src/services/gdprService.js`) puis `sendDeletionEmail` (30 jours de rétractation).
  - **Droit à la portabilité** (art. 20) : export JSON/CSV — **actuellement non implémenté** (P0-GDPR-05 dans `🦄 TROCO — ROADMAP ULTIME.txt`).
  - **Droit d'opposition** (art. 21) : refus de la géolocalisation, du marketing.
  - **Rétractation d'une suppression** déjà demandée → `gdprService.restoreAccount()`.
  - Réclamations préalables avant saisine de la **CNIL**.
- **SLA recommandé :** **accusé de réception sous 72 h**, **réponse complète sous 30 jours calendaires** (délai légal RGPD art. 12-3, prolongeable à 3 mois si complexité — la prolongation doit être notifiée dans le mois).
- **Automatisation possible :**
  1. **Accusé de réception automatique** mentionnant le délai légal de 30 jours et le numéro de dossier.
  2. **Registre des demandes** (obligation de traçabilité) : table `dsr_requests` horodatée (type de droit, uid, statut, échéance à J+30, agent traitant).
  3. **Routage automatique** : si la demande porte sur un compte tiers → refus automatisé ; si elle émane de l'utilisateur lui-même → envoi d'un lien d'auto-service (Privacy Center déjà amorcé dans le footer : « Centre de Confidentialité »).
  4. **Export de portabilité en self-service** (à développer) : 90 % des demandes deviennent des clics, pas des emails.

##### 🔴 P0-c — `dpo@troco.fr` — Délégué à la Protection des Données

- **Objet exact :** adresse **officielle et distincte** du DPO, à déclarer à la CNIL et à publier dans la politique de confidentialité. `privacy@` ne doit plus porter l'étiquette « DPO ».
- **Requêtes entrantes concrètes :** questions sur les finalités de traitement, contestation d'un profilage, réclamation formelle, demande de documentation sur les sous-traitants (Firebase/Google, Sentry, Nominatim/OpenStreetMap), notification d'une violation de données par un tiers.
- **SLA recommandé :** **accusé de réception sous 48 h**, **réponse sous 30 jours**, traçabilité intégrale.
- **Automatisation possible :** boîte **partagée** (le DPO peut être externe, mutualisé, ou le fondateur lui-même en attendant) ; **jamais un alias générique** ; archivage immuable de chaque échange (preuve de conformité). Si le DPO est un cabinet externe, un alias vers son adresse professionnelle est acceptable, **avec copie obligatoire vers `legal@troco.fr`**.

##### 🔴 P0-d — `abuse@troco.fr` — Abus, modération et point de contact DSA

- **Objet exact :** point de contact au sens des **articles 11 et 12 du DSA (Règlement UE 2022/2065)**, utilisé pour la notification de contenus illicites (**art. 16**). Référencé dans `src/components/LegalNotice.jsx:374` (« Notification et retrait rapide des contenus illicites ») et `:447` (« Signalement abus / Modération (DSA Art. 11 & 12) »). Un formulaire DSA accessible existe déjà (`LegalNotice.jsx`, section 5, navigation clavier stricte, validé par `src/components/Phase4LegalAndA11y.test.js`).
- **Requêtes entrantes concrètes :**
  - Notification d'un contenu illicite (contrefaçon, incitation à la haine, **contenus CSAM → routage immédiat vers `trust@` + signalement Pharos/INHOPE**, ne jamais rester dans la file standard).
  - « Ce vendeur est un escroc, il m'a demandé un virement hors plateforme » → **routage vers `fraud@`**.
  - Usurpation d'identité / faux profil.
  - Réclamation d'un utilisateur dont le contenu a été retiré (recours DSA art. 20).
  - Demande d'un tiers de retrait de contenu le concernant.
- **SLA recommandé :** **accusé de réception sous 24 h**, **décision de modération sous 72 h maximum** (le DSA impose une action « diligente, objective et rapide ») ; contenu manifestement illicite → **retrait ou masquage sous 24 h**. Chaque décision doit être **motivée** (statement of reasons, art. 17 DSA).
- **Automatisation possible :**
  1. **Obligatoire :** champ `category` dans le formulaire (le composant DSA existant exige déjà une catégorie d'infraction) → détermination automatique du SLA et de la file cible.
  2. **Auto-accusé de réception** avec référence de dossier et rappel des voies de recours.
  3. **Routage par gravité** : `CSAM/terrorisme` → escalade immédiate ; `escroquerie` → `fraud@` ; `insulte` → modération standard.
  4. Les **rapports DSA doivent être chiffrés publiquement** (obligation de transparence art. 24 DSA) — alimentation automatique depuis la base `reports` (`functions/src/admin/resolveReport.ts`).
##### 🔴 P0-e — `litiges@troco.fr` — Litiges et arbitrage Escrow

- **Objet exact :** saisine du médiateur de la plateforme en cas d'échec de la résolution amiable. Formulation actuelle : « Si aucun accord n'est trouvé après 48 heures, l'une des parties clique sur « Signaler un litige » depuis la conversation ou écrit à `litiges@troco.fr` » (`src/components/RefundPolicy.jsx:378`).
- **Requêtes entrantes concrètes :** « Le deal est bloqué, l'autre partie ne répond plus », « L'objet reçu ne correspond pas à l'annonce », demande de libération ou de rétention des fonds du séquestre, contestation d'un remboursement partiel. Le tableau de bord admin compte déjà ces cas (`stats.disputedTransactions` dans `src/features/admin/AdminDashboard.jsx:1835-1903`).
- **SLA recommandé :** **accusé de réception sous 24 h**, **première décision d'arbitrage sous 5 jours ouvrés**, clôture sous 15 jours maximum.
- **Automatisation possible :**
  1. **Le mail ne doit pas être le canal principal** : le bouton « Signaler un litige » dans la conversation doit créer un document `disputes/{id}` (workflow traçable) ; le mail ne devient qu'un canal de secours.
  2. Création automatique de la fiche litige avec les preuves déjà présentes (messages du chat, transaction, statut Escrow) — **zéro demande de justificatif redondante**.
  3. Communication **bilatérale tracée** (les deux parties en copie, archivage immuable).
  4. En cas d'échec de Troco : **obligation d'indiquer le médiateur de la consommation** (voir Section 3.A) — mention à automatiser dans la réponse finale.

##### 🔴 P0-f — `security@troco.fr` — Sécurité et divulgation responsable

- **Objet exact :** canal de **divulgation responsable de vulnérabilités**. Aucune adresse n'existe aujourd'hui : `security@` est absent du code et **aucun fichier `public/.well-known/security.txt` n'est publié** (seuls `favicon.ico`, `index.html`, `manifest.json`, `offline.html`, `robots.txt`, `service-worker.js` et les logos existent dans `public/`).
- **Requêtes entrantes concrètes :** signalement d'une faille d'authentification, contournement de `firestore.rules`, élévation de privilèges (le vecteur `mateopolo91@gmail.com` est le premier candidat), injection, fuite de clé (`REACT_APP_FIREBASE_*` sont publiques par nature, mais une fuite de `serviceAccountKey.json` — recherché par `scripts/bootstrap-admin.js:32-35` — serait critique), suspicion de compromission de compte admin.
- **SLA recommandé :** **accusé de réception sous 24 h**, **évaluation de gravité sous 72 h**, correctif critique sous **7 jours**, communication publique coordonnée après correctif. Politique **safe harbor** obligatoire (engagement de non-poursuite du chercheur).
- **Automatisation possible :**
  1. Publier **`public/.well-known/security.txt`** (RFC 9116) avec `Contact: mailto:security@troco.fr`, `Expires:`, `Preferred-Languages: fr, en`, `Policy:`.
  2. **Clé PGP publique** recommandée pour les signalements sensibles.
  3. Boîte **strictement restreinte** (2 personnes maximum), jamais partagée avec le support, avec **alerte push immédiate** (Sentry/Telegram/Slack) à chaque réception.
  4. **Canal d'alerte privilégié** pour les incidents → déclenche le plan de réponse aux incidents (voir Section 3.A).
##### 🔴 P0-g — `admin@troco.fr` — Administration interne

- **Objet exact :** adresse de service, point d'entrée des comptes d'administration, de récupération et des notifications machine. Elle **remplace l'usage de `mateopolo91@gmail.com`** relevé dans 8 emplacements du code.
- **Requêtes entrantes concrètes :** notifications Firebase/GCP, invitations Stripe, alertes de facturation, demandes de récupération d'accès, emails de vérification d'app (App Check), notifications Cloud Logging. **Aucun flux utilisateur.**
- **SLA recommandé :** **consultation quotidienne** ; les alertes critiques doivent être redirigées vers un canal push, pas vers une boîte mail.
- **Automatisation possible :**
  1. Boîte **partagée** accessible aux administrateurs, protégée par **2FA obligatoire + clé de sécurité matérielle**.
  2. **Ne jamais utiliser cette adresse comme identifiant d'authentification applicative** : la doctrine Zero-Trust documentée dans `docs/CODEBASE-BIBLE.md:285` interdit formellement la détermination du rôle admin par email. Le rôle doit rester un **Custom Claim cryptographique Firebase** (`admin: true`), distribué par `functions/src/admin/setAdminClaim.ts` et amorcé via `scripts/bootstrap-admin.js` — **script à corriger pour ne plus viser un Gmail personnel**.
  3. Un alias **catch-all** `*@troco.fr` est recommandé pour ne jamais perdre un email adressé à une adresse non encore créée.

##### 🔴 P0-h — `no-reply@troco.fr` — Notifications transactionnelles sortantes

- **Objet exact :** expéditeur technique de tous les emails automatiques. Aujourd'hui, Firebase Auth envoie depuis `noreply@troco-8a6eb.firebaseapp.com`, ce qui **casse la confiance** (nom de projet technique visible) et produit un en-tête `From` non aligné avec le domaine.
- **Requêtes entrantes :** aucune par vocation. **Important :** les utilisateurs répondent toujours aux emails automatiques → il faut **obligatoirement** configurer un routage de secours (réponses → `support@troco.fr`), sinon ces demandes sont silencieusement perdues.
- **SLA recommandé :** sans objet. **Monitoring de délivrabilité obligatoire** (taux de rebond < 2 %, taux de plainte < 0,1 %).
- **Automatisation possible :**
  1. Sous-domaine dédié recommandé pour les envois de masse : **`mail.troco.fr`** (ou `notifications.troco.fr`) — protège la réputation du domaine principal et simplifie DKIM/DMARC (voir Step C).
  2. Emails à créer en priorité : **bienvenue**, **vérification d'adresse**, **réinitialisation de mot de passe** (templates Firebase Auth personnalisés FR/EN), **confirmation de paiement / achat de jetons**, **deal conclu**, **transfert reçu**, **libération de séquestre**, **confirmation de suppression de compte** (le code existe déjà dans `functions/src/gdpr/sendDeletionEmail.ts` mais n'est pas fonctionnel), **rappel de rétractation à J+25**.
  3. **Personnalisation obligatoire** de chaque email (prénom, montant, référence) et **lien de désabonnement** pour tout email non transactionnel.
---

#### B.5 — Fiches opérationnelles — adresses P1

##### 🟠 P1-a — `contact@troco.fr` — Contact général et aiguillage

- **Objet exact :** boîte d'aiguillage publiée dans les mentions légales (`src/components/LegalNotice.jsx:239,244`). Rôle de **frontière** : elle ne traite rien elle-même, elle route.
- **Requêtes entrantes :** presse (« je prépare un article sur Troco »), institutions, demandes juridiques non couvertes par `legal@`, prospection commerciale, questions générales sans catégorie.
- **SLA recommandé :** **accusé de réception sous 48 h**, **aiguillage sous 24 h**.
- **Automatisation possible :** auto-réponse avec arbre de décision (« Pour le support → support@ ; pour la presse → press@ ; pour un partenariat → partners@ ; pour vos données → privacy@ »). **C'est l'adresse à afficher quand on ne sait pas où afficher une adresse.**

##### 🟠 P1-b — `legal@troco.fr` — Affaires juridiques et autorités

- **Objet exact :** canal des **communications légalement formalisées**. Aucun utilisateur normal ne doit l'utiliser ; elle est destinée aux professionnels du droit et aux autorités.
- **Requêtes entrantes :** mise en demeure d'un ayant droit (retrait de contenu pour contrefaçon), réquisition d'un OPJ, demande d'un huissier, notification d'une décision de justice, demande de la CNIL, notification DSA d'une autorité, demande d'un assureur.
- **SLA recommandé :** **accusé de réception sous 24 h**, **toute réquisition traitée sous 48 h** (délais procéduraux) — cette adresse ne peut jamais rester « non lue » une semaine.
- **Automatisation possible :** **aucune réponse automatique générique** (risque juridique). En revanche : **alerte immédiate multi-canal** (email + SMS + push) au fondateur, **archivage horodaté immuable** de chaque message, **journal des réquisitions** (obligation de coopération, à distinguer des obligations de transparence DSA).

##### 🟠 P1-c — `compliance@troco.fr` — Conformité réglementaire, AML et sanctions

- **Objet exact :** interlocuteur des autorités de régulation et de l'écosystème financier. Devient obligatoire dès que Troco détiendra des fonds pour compte de tiers.
- **Requêtes entrantes :** déclaration de soupçon via TRACFIN (le canal officiel est ERMES, la coordination interne passe par cette adresse), contrôles ACPR, demandes DAC7 des administrations fiscales, criblage de sanctions (UE/OFAC/ONU), questionnaires KYC/KYB fournisseurs, questionnaires de banque partenaire.
- **SLA recommandé :** **accusé de réception sous 24 h**, **réponse sous 5 jours ouvrés** ; **toute communication d'une autorité est traitée le jour même**.
- **Automatisation possible :** boîte avec **journal d'audit** obligatoire (chaque échange horodaté et immuable), **criblage automatique** des sanctions lors de l'onboarding (à intégrer au flux KYC), **conservation 5 ans** des documents AML (obligation légale LCB-FT).

##### 🟠 P1-d — `payments@troco.fr` — Opérations wallet, PSP et KYC

- **Objet exact :** canal des opérations financières entre Troco, ses partenaires de paiement (Stripe Connect visé, `functions/src/payments/providers/index.ts`) et les utilisateurs sur des sujets de flux de fonds.
- **Requêtes entrantes :** demande d'enquête Stripe sur un compte, chargeback notifié par le PSP, blocage d'un retrait, vérification KYB de Troco par un partenaire, réconciliation d'un virement orphelin, demande de l'équipe KYC du PSP sur un dossier utilisateur.
- **SLA recommandé :** **accusé sous 24 h**, **réponse sous 48 h** (les PSP imposent des délais contractuels courts sur les chargebacks : souvent 7 jours pour répondre).
- **Automatisation possible :** **webhooks PSP → ticket automatique** (chaque événement Stripe `charge.dispute.created`, `payout.failed` doit créer une tâche), **tableau de bord de réconciliation** alimenté par `functions/src/payments/cleanupIdempotency.ts` et la collection `transactions`.

##### 🟠 P1-e — `billing@troco.fr` — Facturation et remboursements

- **Objet exact :** canal des questions de facturation utilisateur (jetons, boosts, abonnement Troco+).
- **Requêtes entrantes :** « Je veux une facture à mon nom d'entreprise + numéro de TVA », « Remboursez-moi le boost de 2,99 € » (montant codé dans `src/App.js:2680`), « Je n'ai pas reçu ma facture », « Mon paiement a été débité deux fois », contestation du montant du boost (écart relevé : `Description du projet.txt:38` annonce 1,99 € alors que le code prélève 2,99 €).
- **SLA recommandé :** **accusé sous 24 h**, **résolution sous 5 jours ouvrés**. Les demandes de rétractation relèvent du régime des 14 jours (`RefundPolicy.jsx:253`) → **compteur de 14 jours à déclencher à la réception**.
- **Automatisation possible :** génération automatique de facture PDF depuis `transactions/{txId}`, **mentions légales obligatoires** (numéro de facture séquentiel, TVA, identité de Troco), envoi automatique sur demande, **suivi du solde de rétractation**.

##### 🟠 P1-f — `kyc@troco.fr` — Vérification d'identité

- **Objet exact :** canal de support spécifique à la vérification d'identité, à activer dès que le KYC réel (Stripe Identity / Onfido / Jumio) remplacera le KYC simulé actuel. **Aujourd'hui, cette adresse n'a pas de raison d'exister** car `KycModal` valide l'identité localement (`src/components/ProfileView.jsx:741`).
- **Requêtes entrantes :** refus de vérification non compris, document expiré, changement de nom légal, nouvelle tentative après échec de détection du visage, suspicion de vol d'identité.
- **SLA recommandé :** **accusé sous 24 h**, **résolution sous 72 h** ; toute levée de blocage KYC doit être tracée (obligation AML).
- **Automatisation possible :** relance automatique du prestataire, **réutilisation du dossier** (ne jamais redemander un document déjà validé), journalisation des décisions (qui a validé, quand, sur quel document).
##### 🟠 P1-g — `fraud@troco.fr` — Fraude et transactions suspectes

- **Objet exact :** canal de détection et de traitement de la fraude, distinct de `abuse@` (qui traite le contenu) et de `compliance@` (qui traite la réglementation).
- **Requêtes entrantes :** « Ce vendeur m'a demandé de payer hors plateforme », tentative de blanchiment via recharges successives, compte compromis utilisé pour des transferts, chargeback après livraison, fausse déclaration de paiement.
- **SLA recommandé :** **accusé sous 12 h**, **blocage préventif du compte sous 24 h** en cas de faisceau d'indices, **décision sous 72 h**.
- **Automatisation possible :** **règles de détection** sur les patterns déjà disponibles (montants ronds répétés, transferts entre comptes nouveaux, achats/retraits multiples dans la même heure — la table de rate limiting de `functions/src/security/` fournit les compteurs), **file de revue quotidienne**, alimentation du registre AML.

##### 🟠 P1-h — `press@troco.fr` — Presse et médias

- **Objet exact :** point de contact presse, à publier dans une page presse dédiée.
- **Requêtes entrantes :** demande d'interview du fondateur, demande de visuels haute résolution (le dépôt contient `public/logo192.png`, `public/logo512.png`, `troco-logo.html`, `public/logo-generator.html`), demande de chiffres clés, invitation à un événement, sollicitation de podcast.
- **SLA recommandé :** **accusé sous 24 h**, **réponse sous 3 jours ouvrés**.
- **Automatisation possible :** **kit média auto-servi** (logo SVG/PNG, palette, bios fondateur en 2 longueurs, chiffres clés, captures d'écran) pour ne plus traiter à la main 80 % des demandes.

##### 🟠 P1-i — `partners@troco.fr` — Partenariats business

- **Objet exact :** développement commercial et intégrations.
- **Requêtes entrantes :** proposition d'intégration API, co-marketing, affiliation, partenariat associatif local, offre d'un PSP ou d'un prestataire KYC, demande de revendeur.
- **SLA recommandé :** **accusé sous 48 h**, **qualification sous 7 jours**.
- **Automatisation possible :** **formulaire de qualification** (type de partenariat, volume estimé, entité légale, pays) envoyé automatiquement, puis dépôt dans un CRM léger.

##### 🟠 P1-j — `careers@troco.fr` — Recrutement

- **Objet exact :** réception des candidatures et du sourcing. **À ne créer qu'à partir du moment où Troco publie ses premières offres** (voir Section 2).
- **Requêtes entrantes :** candidatures aux offres, candidatures spontanées, stages, freelances.
- **SLA recommandé :** **accusé automatique immédiat**, **réponse humaine sous 7 jours** (exigence de marque employeur).
- **Automatisation possible :** **parsing automatique des CV**, accusé de réception instantané, refus poli automatisé après 30 jours sans suite, **conformité RGPD sur les données de candidats** (durée de conservation 2 ans maximum, information obligatoire).

##### 🟠 P1-k — `ceo@troco.fr` — Direction générale

- **Objet exact :** contact direct du dirigeant, distinct de `mateo@troco.fr` (nominatif) et de `contact@` (public).
- **Requêtes entrantes :** investisseurs, board, entrepreneurs, sollicitations stratégiques, litiges escaladés par un partenaire.
- **SLA recommandé :** **réponse sous 5 jours ouvrés** (adresse de direction, volume faible attendu).
- **Automatisation possible :** **tri automatique et proposition de brouillon de réponse** ; **jamais** de délégation à un tiers sans contrôle.

##### 🟠 P1-l — `devops@troco.fr` — Infrastructure et alertes opérationnelles

- **Objet exact :** boîte de réception des alertes machine et des communications d'infrastructure.
- **Requêtes entrantes :** alertes Google Cloud Monitoring, dépassement de budget GCP, échec de déploiement Cloud Functions, expiration de certificat, notifications Firebase App Check, incidents Sentry agrégés, réclamation d'abus d'hébergement, suspension de compte de service, notification `health` en erreur (`functions/src/health/healthCheck.ts`).
- **SLA recommandé :** **temps réel** — ce n'est pas une adresse humaine mais un point d'atterrissage d'alertes ; toute alerte de sévérité `ERROR` doit déclencher un push immédiat.
- **Automatisation possible :** **routage vers un canal d'incident** (Slack/Discord/Telegram), création automatique de ticket, **astreinte** documentée. Cette adresse doit être un **groupe**, jamais une personne.

##### 🟠 P1-m — `mateo@troco.fr` — Adresse nominative du fondateur

- **Objet exact :** adresse personnelle professionnelle du directeur de la publication, **obligation légale LCEN art. 6-III** (déjà publiée dans `src/components/LegalNotice.jsx:230`).
- **Requêtes entrantes :** correspondance institutionnelle, échanges avec les conseils (avocat, comptable), sollicitations directes.
- **SLA recommandé :** **réponse sous 5 jours ouvrés**.
- **Automatisation possible :** **signature email professionnelle obligatoire** (nom, fonction, Troco, adresse postale du siège, numéro SIREN dès immatriculation, mention de confidentialité). Cette adresse doit être **protégée par 2FA** et **jamais utilisée pour créer des comptes de service**.

---
#### B.6 — Fiches opérationnelles — adresses P2 et arbitrages de convention

##### 🟡 P2-a — `help@troco.fr` — Aide et FAQ

- **Objet exact :** variante « moderne » de `support@`, souvent attendue par les utilisateurs anglophones. **Décision recommandée : créer `help@troco.fr` en tant qu'ALIAS de `support@troco.fr`**, et non comme boîte autonome — deux boîtes pour la même mission créent de la confusion et des tickets perdus.
- **Requêtes entrantes :** « Comment ça marche ? », « Où est mon argent ? », « Comment supprimer une annonce ? ».
- **SLA recommandé :** identique à `support@` (48 h).
- **Automatisation possible :** **priorité absolue à l'auto-service** — un **centre d'aide** de 30 articles couvre 70 % du volume. Un email qui répond à une question de FAQ est un échec de produit.

##### 🟡 P2-b — `feedback@troco.fr` — Retours produit

- **Objet exact :** réception des idées et critiques produit, distinct du support (qui traite les pannes).
- **Requêtes entrantes :** « Ajoutez la traduction de la carte », « L'app crash quand j'ouvre le whiteboard sur iPhone », suggestions de fonctionnalités, avis sur l'ergonomie.
- **SLA recommandé :** **accusé sous 72 h**, **aucune promesse de délai** (adresse non contractuelle), mais **revue hebdomadaire obligatoire**.
- **Automatisation possible :** dépôt automatique dans un **tableau de bord produit** (roadmap publique type Canny), vote par les utilisateurs, **clôture automatique en remerciement**.

##### 🟡 P2-c — `cto@troco.fr` — Direction technique

- **Objet exact :** à créer **uniquement après le recrutement d'un CTO ou Lead Developer** (voir Section 2). Aujourd'hui, ce rôle est tenu par le fondateur.
- **Requêtes entrantes :** partenariats techniques, audits, recrutement tech, sollicitations d'éditeurs.
- **SLA recommandé :** **réponse sous 5 jours ouvrés**.
- **Automatisation possible :** groupement avec `devops@` dans un même espace de travail technique.

##### 🟡 P2-d — `president@troco.fr` — Présidence

- **Objet exact :** **dépend entièrement du statut juridique retenu** (voir Section 3.C). Si Troco devient une SASU, la notion de « président » existe statutairement ; si c'est une SAS avec CEO, elle est redondante.
- **Décision recommandée :** **ne pas créer d'adresse distincte**. Utiliser `ceo@troco.fr` et faire de `president@` un simple alias techniquement transparent, pour éviter de publier deux titres concurrents.

##### 🟡 P2-e — `moderators@troco.fr` — Équipe de modération

- **Objet exact :** **boîte partagée interne** (file de travail de l'équipe de modération), pas une adresse publique. La version publique reste `abuse@`.
- **Requêtes entrantes :** assignations internes de dossiers, coordination, revue par les pairs, escalades entre modérateurs.
- **SLA recommandé :** **interne — cible de 24 h par dossier**.
- **Automatisation possible :** **file de tickets interne** avec assignation automatique par catégorie et par langue, suivi du temps de traitement, **statistiques réinjectées dans le rapport de transparence DSA**.

##### 🟡 P2-f — `trust@troco.fr` — Trust & Safety

- **Objet exact :** adresse transverse (alias) coordonnant les cas graves : contenus CSAM, terrorisme, sécurité des personnes, réquisitions sensibles.
- **Requêtes entrantes :** signalements CSAM, partenariats avec les lignes d'écoute (Pharos, INHOPE, Point de Contact), réquisitions d'autorités sur les cas graves.
- **SLA recommandé :** **immédiat** — un signalement CSAM déclenche une procédure de retrait et de conservation sous 24 h (obligation légale en France : signalement au procureur / Pharos et conservation des données pour les enquêtes).
- **Automatisation possible :** **escalade automatique** si `abuse@` détecte un mot-clé de gravité, **procédure documentée et testée** (runbook), **boîte restreinte à 2 personnes**.

##### ⛔ P2-g — `noreply@troco.fr` et `hello@troco.fr` — arbitrages négatifs

- **`noreply@troco.fr` (sans tiret) : NE PAS CRÉER.** On choisit **une seule convention** : `no-reply@troco.fr`. Publier les deux crée de l'ambiguïté, casse la délivrabilité (les filtres anti-spam pénalisent les conventions incohérentes) et double les règles DKIM/DMARC. Si l'on veut absolument accepter `noreply@`, il faut en faire un **alias de réception** (jamais un expéditeur).
- **`hello@troco.fr` : NE PAS CRÉER.** Le site est intégralement en français (`<html lang="fr">` dans `public/index.html`) et `contact@troco.fr` est déjà publié dans les mentions légales. Ajouter `hello@` fragmente trois adresses (`contact@`, `hello@`, `help@`) pour la même tâche d'aiguillage.

##### ⛔ P2-h — `compte@troco.fr` — valeur factice à éliminer

- **Constat :** `src/components/TransactionsHistoryModal.jsx:223` affiche `{currentUser?.email || 'compte@troco.fr'}` comme adresse du destinataire sur un reçu.
- **Risque :** un utilisateur peut **imprimer ou archiver un reçu portant une adresse qui n'appartient à personne** et croire qu'il s'agit de l'adresse de Troco. Sur un document à valeur de preuve (historique de transaction), c'est une source de confusion juridique.
- **Décision recommandée :** remplacer cette valeur de repli par une mention neutre hors adresse (ex. « Compte Troco » ou le pseudo `@username`), **sans jamais afficher une adresse email inexistante**.

---

#### B.7 — Matrice de routage automatique (règles de tri recommandées)

| Mots-clés détectés dans l'objet ou le corps | Adresse de destination | SLA déclenché | Action automatique |
|---|---|---|---|
| `rgpd`, `données personnelles`, `droit d'accès`, `effacement`, `portabilité` | `privacy@` → `dpo@` | 72 h accusé / 30 j réponse | Créer une fiche `dsr_requests` + accusé légal |
| `contenu illicite`, `insulte`, `harcèlement`, `signaler` | `abuse@` | 24 h accusé / 72 h décision | Créer un dossier modération + catégorie obligatoire |
| `escroquerie`, `arnaque`, `fraude`, `hors plateforme` | `fraud@` (copie `abuse@`) | 12 h accusé / 24 h blocage | Geler les retraits du compte concerné en attente de revue |
| `litige`, `deal bloqué`, `séquestre`, `non conforme` | `litiges@` | 24 h accusé / 5 j décision | Ouvrir `disputes/{id}` avec pièces déjà présentes |
| `rétractation`, `remboursement`, `facture`, `TVA` | `billing@` | 24 h accusé / 5 j | Démarrer le compteur de 14 jours |
| `kyc`, `identité`, `vérification refusée`, `pièce d'identité` | `kyc@` | 24 h / 72 h | Relancer le prestataire KYC |
| `faille`, `vulnérabilité`, `sécurité`, `piratage` | `security@` | 24 h / 7 j correctif | Alerte push immédiate + dossier incident confidentiel |
| `mise en demeure`, `réquisition`, `huissier`, `autorité`, `CNIL` | `legal@` | 24 h / 48 h | Alerte multi-canal + archivage immuable |
| `investisseur`, `levée`, `board` | `ceo@` | 5 j | Notification directe fondateur |
| `partenariat`, `API`, `intégration`, `affiliation` | `partners@` | 48 h / 7 j | Envoi du formulaire de qualification |
| `presse`, `interview`, `article`, `média` | `press@` | 24 h / 3 j | Envoi automatique du kit média |
| `candidature`, `CV`, `stage`, `freelance` | `careers@` | immédiat / 7 j | Accusé instantané + dépôt ATS |
| `alerte`, `incident`, `downtime`, `billing GCP` | `devops@` | temps réel | Push vers canal d'astreinte |
| *Aucune correspondance* | `contact@` | 48 h | Aiguillage manuel assisté |

---

### Step C — Recommandations d'infrastructure email

#### C.1 — Nom de domaine principal et sous-domaines

**Décision structurante n°1 : unifier le domaine sur `troco.fr`.**

| Domaine | Statut actuel | Décision recommandée |
|---|---|---|
| `troco.fr` | Publié dans les pages juridiques opposables (`LegalNotice.jsx:222` → « application web accessible à l'adresse **troco.fr** »), dans le footer et dans la politique de remboursement | ✅ **Domaine canonique** — toutes les adresses email reposent sur `@troco.fr` |
| `troco.app` | Utilisé dans `README-DEMO.md:26`, `src/hooks/useWebRTC.js:1079` (lien d'invitation de groupe), `src/features/auth/AuthScreen.jsx:871` (placeholder) et de nombreux tests | ⚠️ **Conserver en défensif** (redirection 301 → `troco.fr`) et **corriger les 3 occurrences de production** |

**Pourquoi garder les deux domaines :** `troco.app` doit rester enregistré pour (1) empêcher un squatteur de l'exploiter, (2) rediriger proprement les liens d'invitation déjà partagés, (3) servir de domaine de repli en cas de problème de réputation. Mais **un seul domaine envoie des emails** : mélanger deux domaines expéditeurs est le meilleur moyen de voir SPF/DKIM/DMARC échouer et de tomber en spam.

**Architecture de sous-domaines recommandée :**

| Sous-domaine | Usage | Enregistrements |
|---|---|---|
| `troco.fr` (racine) | Adresses humaines : `support@`, `contact@`, `mateo@`, `legal@`, etc. Envois 1-à-1 uniquement | SPF + DKIM + DMARC |
| `mail.troco.fr` | **Envois transactionnels et de masse uniquement** : bienvenue, paiement, notifications, `no-reply@mail.troco.fr` | SPF + DKIM + DMARC **séparés** |
| `notifications.troco.fr` | *(variante)* Alternative si l'on veut distinguer marketing et transactionnel | SPF + DKIM + DMARC |
| `_dmarc.troco.fr` | Publication de la politique DMARC (obligatoire) | TXT |
| `mg.troco.fr` | Réservé à un éventuel fournisseur d'envoi (Mailgun/Resend/SendGrid) | SPF + DKIM + CNAME de suivi |

**Pourquoi séparer les flux :** si un pic d'emails transactionnels (ex. 5 000 confirmations de paiement) déclenche une plainte de spam, **seule la réputation de `mail.troco.fr` est touchée** et les emails humains (`support@troco.fr`) continuent d'arriver. C'est la pratique standard des plateformes à fort volume.

**Actions DNS immédiates (référence, à valider auprès du fournisseur retenu en C.3) :**

- **SPF** — `troco.fr` → `v=spf1 include:_spf.google.com ~all` (si Google Workspace) et `mail.troco.fr` → `v=spf1 include:spf.fournisseur.com ~all`.
- **DKIM** — clé publique publiée en TXT/CNAME fournie par le prestataire (Google Workspace fournit un enregistrement `google._domainkey`).
- **DMARC** — `_dmarc.troco.fr` → `v=DMARC1; p=none; rua=mailto:dmarc-reports@troco.fr; ruf=mailto:dmarc-forensics@troco.fr; fo=1; adkim=s; aspf=s; pct=100` en phase d'observation, puis `p=quarantine`, puis `p=reject`.
- **Alias d'analyse DMARC** — créer `dmarc-reports@troco.fr` (peut pointer vers un service tiers d'analyse).

#### C.2 — Convention de nommage

**Règle d'or : `fonction@` pour les rôles, `prenom@` pour les personnes physiques. Jamais de mélange.**

| Type | Convention | Exemples | Justification |
|---|---|---|---|
| **Rôle / fonction** | `<fonction>@troco.fr` | `support@`, `billing@`, `abuse@`, `compliance@`, `press@`, `partners@`, `careers@` | Adresse **immuable** : quand la personne change, l'adresse ne change pas. Essentiel pour les obligations DSA et RGPD qui exigent un **point de contact stable**. |
| **Personne physique** | `<prenom>@troco.fr` | `mateo@troco.fr` (existant, `LegalNotice.jsx:230`), puis `sarah@`, `lucas@`, `amina@` | Obligation LCEN art. 6-III pour le directeur de la publication. Créer `prenom.nom@` uniquement en cas d'homonymie réelle. |
| **Groupe / équipe** | `<equipe>@troco.fr` (alias) | `moderators@`, `devops@`, `trust@` | Boîte partagée interne, jamais une adresse individuelle. |
| **Service technique sortant** | `no-reply@mail.troco.fr` | — | Convention unique : **tiret**, pas de souligné, pas de compact. |
| **Interdits** | — | `noreply@`, `hello@`, `webmaster@`, `info@`, `team@` | Adresses non professionnelles, sans titulaire clair, impossibles à router et facteur de spam. |

**Cas particuliers à documenter :**
- `postmaster@troco.fr` et `abuse@troco.fr` sont **exigés par la RFC 5321** pour tout domaine mail : `abuse@` est déjà publié, `postmaster@` doit être créé et redirigé vers `admin@`.
- `webmaster@` et `hostmaster@` doivent devenir des alias de secours vers `devops@` pour les communications d'hébergeur (Google/OVH).
- Les adresses **nominatives sont réservées aux personnes qui en ont besoin** : ne jamais créer `sarah@troco.fr` pour un freelance qui gère 4 heures de support par semaine — on lui donne un **accès délégué** à la boîte partagée.

#### C.3 — Fournisseur recommandé : comparatif et justification

| Critère | **Google Workspace** (Business Starter) | **Microsoft 365** (Business Basic) | **Zoho Mail / Workplace** | **Proton for Business** |
|---|---|---|---|---|
| **Prix indicatif** (par utilisateur/mois, HT, engagement annuel) | **6,80 €** (Starter, 30 Go) · 13,60 € (Standard, 2 To) · 21,10 € (Plus, 5 To) — tarifs publics France relevés le 18/09/2026 | Ordre de grandeur 6 € (Basic) / 12 € (Standard) | Ordre de grandeur **1 à 4 €** (Mail Lite / Premium / Workplace Standard) | Ordre de grandeur 7 à 13 € |
| **Stockage par utilisateur** | 30 Go (Starter) | 1 To OneDrive, 50 Go mail | 5 à 30 Go selon offre | 10 à 50 Go |
| **Délégation / boîte partagée** | ✅ Excellente (délégation Gmail, groupes, espaces partagés) | ✅ Bonne (boîtes partagées natives) | ✅ Correcte (accès délégué) | ️ Basique |
| **Groupes de distribution (alias)** | ✅ Illimités et gratuits | ✅ | ✅ | ✅ mais limités |
| **Alias catch-all** | ✅ natif | ✅ natif | ✅ natif | ✅ |
| **Localisation UE des données** | ✅ Option résidence UE | ✅ Option UE | ✅ Serveurs UE selon offre | ✅✅ Suisse |
| **Intégration Firebase / GCP** | ✅✅ **Native** (annuaire, IAM, Cloud Logging, facturation) | ⚠️ Compte Azure distinct | ⚠️ Non aligné | ❌ Aucune |
| **MFA / clés de sécurité FIDO2** | ✅✅ Politique avancée | ✅✅ | ✅ | ✅✅ |
| **Coût à 4 comptes** | ~27 €/mois | ~24 €/mois | ~4 à 16 €/mois | ~28 à 52 €/mois |
| **Coût à 10 comptes** | ~68 €/mois | ~60 €/mois | ~10 à 40 €/mois | ~70 à 130 €/mois |

**Recommandation retenue : Google Workspace, forfait Business Starter, 4 comptes réels + alias et groupes illimités.**

**Justification en 5 points, spécifique à Troco :**

1. **Alignement total avec l'infrastructure existante.** Troco tourne déjà sur Firebase/GCP avec le projet `troco-8a6eb` (visible dans `.env` et `scripts/bootstrap-admin.js:52`). Le même compte Google administre Firebase, Cloud Functions, Cloud Logging, Firestore, App Check et l'analytics (`REACT_APP_FIREBASE_MEASUREMENT_ID`). Google Workspace évite de fragmenter l'administration entre deux annuaires (Google + Microsoft), ce qui est un risque de sécurité réel pour une équipe d'une personne.
2. **Coût maîtrisé au démarrage.** 4 comptes Business Starter = **27,20 € HT/mois** (~326 € HT/an), avec **alias et groupes illimités et gratuits**. On peut créer les ~30 adresses du tableau B.1 avec seulement 4 licences payantes : les adresses de rôle sont des **alias ou des groupes**, pas des boîtes facturées.
3. **Délégation et collaboration immédiates.** Gmail permet de **déléguer `support@troco.fr`** à un freelance sans lui donner de licence, et les **groupes** permettent de router `abuse@troco.fr` vers 3 personnes simultanément — indispensable pour tenir les SLA DSA (24 h / 72 h) dès le premier recrutement.
4. **Sécurité de niveau entreprise.** Politique MFA imposée à l'échelle du domaine, clés de sécurité matérielles (FIDO2), alertes d'activité suspecte, journal d'audit — exactement ce qu'il faut pour **protéger l'accès admin**, aujourd'hui le maillon faible (8 emplacements `mateopolo91@gmail.com`).
5. **Évolutivité internationale.** Troco vise 7 langues et plusieurs marchés. Google Workspace ajoute un utilisateur en 2 minutes, gère nativement fuseaux horaires, traduction Gmail et signatures centralisées — sans changer d'outil quand l'équipe passera de 4 à 40 personnes.

**Alternatives et arbitrages :**

- **Zoho Workplace** est la seule alternative pertinente si la contrainte budgétaire est absolue en phase pré-revenus (10 à 40 €/mois pour 10 utilisateurs contre ~68 € chez Google). **Attention :** annuaire séparé du GCP et coût caché de migration et d'exploitation.
- **Proton for Business** devient le meilleur choix **si et seulement si** la confidentialité devient un argument commercial central (« plateforme respectueuse de la vie privée »). Le plus cher, le moins intégré à GCP.
- **Microsoft 365** n'apporte **aucun avantage différenciant** à Troco aujourd'hui (pas de besoin Outlook/Teams/Office ni d'Active Directory). **Non recommandé** en phase actuelle.

**Coût complet recommandé en phase 1 (M0-M3) :**

| Poste | Coût mensuel HT | Coût annuel HT |
|---|---|---|
| Google Workspace Business Starter × 4 comptes (`mateo@`, `admin@`, `support@`, `devops@`) | 27,20 € | 326,40 € |
| Alias et groupes (les ~26 autres adresses) | 0 € | 0 € |
| Fournisseur d'email transactionnel (palier gratuit ou ~10-20 €) | ~0 à 20 € | ~0 à 240 € |
| Outil de ticketing (palier gratuit ou ~15-25 €/agent) | ~0 à 25 € | ~0 à 300 € |
| **TOTAL phase 1** | **~27 à 72 €** | **~326 à 866 €** |

*Investissement dérisoire au regard du risque : une seule sanction DSA ou une plainte CNIL coûte plusieurs milliers d'euros.*
#### C.4 — Sécurité email : SPF, DKIM, DMARC — pourquoi c'est non négociable

Ces trois mécanismes ne sont pas des options techniques : **sans eux, vos emails arrivent en spam ou sont rejetés**, et votre domaine peut être usurpé pour du phishing au nom de Troco.

| Mécanisme | Ce qu'il prouve | Ce qu'il empêche | Conséquence si absent |
|---|---|---|---|
| **SPF** (RFC 7208) — TXT | Liste **les serveurs autorisés à envoyer** au nom du domaine | L'envoi depuis un serveur non autorisé | Réception en spam, rejet par Gmail/Outlook, usurpation triviale |
| **DKIM** (RFC 6376) — clé publique en DNS | **Signature cryptographique** de chaque message | L'altération du message en transit, l'usurpation du contenu | Emails non signés = non fiables ; origine non prouvable |
| **DMARC** (RFC 7489) — TXT sur `_dmarc` | **Politique** liant SPF + DKIM et **alignement** avec le `From:` visible | Le spoofing complet du domaine (phishing « support@troco.fr ») | **Un attaquant peut envoyer des emails parfaitement crédibles au nom de `support@troco.fr`** |

**Criticité spécifique à Troco — 4 raisons pour lesquelles c'est urgent, pas seulement important :**

1. **Phishing financier direct.** Troco détient un wallet avec des soldes en euros et des transferts. Un attaquant usurpant `support@troco.fr` ou `billing@troco.fr` peut demander à un utilisateur de « confirmer son IBAN » ou « régulariser un paiement » — avec un email qui passe tous les filtres parce que **votre domaine n'a aucune politique DMARC**. Le préjudice serait direct et financier.
2. **Emails transactionnels critiques.** Les emails de paiement, d'achat de jetons et de libération de séquestre (`no-reply@`) **doivent arriver en boîte de réception**. Aujourd'hui, Firebase Auth envoie depuis `troco-8a6eb.firebaseapp.com` : non seulement c'est non professionnel, mais **le domaine n'est ni SPF-aligné ni DKIM-signé pour `troco.fr`**, donc la délivrabilité est fragile dès le premier volume.
3. **Obligation contractuelle indirecte.** Les PSP (Stripe) et les hébergeurs imposent des standards de sécurité de messagerie dans leurs conditions. Un domaine sans DMARC `reject` est un signal de négligence qui peut peser lors d'un audit KYB de Troco.
4. **Réputation de marque et délivrabilité.** Google et Microsoft pénalisent les domaines sans DMARC. Un domaine `p=reject` protège aussi la délivrabilité des emails de croissance (onboarding, réactivation).

**Plan de déploiement en 5 semaines (progressif, jamais brutal — poser `p=reject` sans observation casse vos propres envois légitimes) :**

| Semaine | Étape | Enregistrement |
|---|---|---|
| S1 | Publier SPF et DKIM en observation | `v=spf1 include:... ~all` + clé DKIM |
| S1 | Publier DMARC en **`p=none`** avec rapports | `v=DMARC1; p=none; rua=mailto:dmarc-reports@troco.fr` |
| S2-S3 | Analyser les rapports agrégés (identifier tous les expéditeurs légitimes : Firebase, PSP, ticketing, newsletters) | — |
| S4 | Passer à **`p=quarantine; pct=25`**, puis `pct=100` | `v=DMARC1; p=quarantine; ...; pct=100` |
| S5 (M+2) | Passer à **`p=reject`** (état cible) | `v=DMARC1; p=reject; rua=...; adkim=s; aspf=s` |
| M+3 | Ajouter **BIMI** (logo de marque dans la boîte de réception) — nécessite un certificat VMC | TXT `default._bimi` |

**Complément indispensable :** aligner les **templates Firebase Auth** (vérification d'email, réinitialisation de mot de passe) sur `no-reply@mail.troco.fr`, et **ne jamais** activer `allowUnverifiedEmail` dans la configuration (cela casserait l'alignement SPF).
#### C.5 — Alias et groupes : la règle « une adresse, N personnes »

**Principe : une adresse fonctionnelle doit router vers une équipe, pas vers une personne.** La continuité de service et le suivi de la charge en dépendent.

| Adresse | Type recommandé | Cible(s) | Nb personnes |
|---|---|---|---|
| `support@troco.fr` | **Groupe** (Google Group) | Fondateur + freelance support + futur CSM | 1 → 3 |
| `abuse@troco.fr` | **Groupe restreint** | Fondateur + futur Trust & Safety | 1 → 2 |
| `privacy@troco.fr` | **Boîte partagée déléguée** | Fondateur (puis DPO) | 1 → 2 |
| `dpo@troco.fr` | **Alias** vers la boîte du DPO | DPO interne ou cabinet externe | 1 |
| `security@troco.fr` | **Groupe restreint + alerte push** | Fondateur + futur CTO | 1 → 2 |
| `legal@troco.fr` | **Alias vers `mateo@`** avec copie `admin@` | Fondateur + avocat externe | 1 → 2 |
| `contact@troco.fr` | **Alias vers `support@`** | Support | 1 → 3 |
| `billing@troco.fr` | **Groupe** | Fondateur + futur comptable | 1 → 2 |
| `admin@troco.fr` | **Boîte partagée** | Administrateurs | 1 → 3 |
| `devops@troco.fr` | **Groupe + webhook** | Fondateur + futur DevOps | 1 → 2 |
| `no-reply@mail.troco.fr` | **Adresse d'envoi sans réception** (réponses → `support@`) | — | 0 |
| `postmaster@troco.fr` | **Alias obligatoire (RFC 5321)** vers `admin@` | — | — |

**Bonnes pratiques de groupe :**
- Les groupes Google sont **gratuits et illimités** : ne jamais créer un alias en doublon d'un groupe.
- Un groupe doit avoir **un propriétaire nommé** et au moins **deux membres** (jamais un groupe mono-utilisateur : c'est un point de défaillance unique déguisé).
- Activer **l'historique partagé** pour qu'un nouvel arrivant voie les échanges passés de `support@` — gain d'onboarding considérable.
- L'accès au groupe `abuse@` doit être **restreint et traçable** (enjeu DSA).

#### C.6 — Boîte partagée ou adresse individuelle : matrice de décision

| Situation | Solution recommandée | Raison |
|---|---|---|
| Adresse de **rôle** publique (`support@`, `abuse@`, `billing@`) | **Boîte partagée / groupe** | Continuité, plusieurs traitants, traçabilité, survit au départ de la personne |
| Adresse **nominative** (`mateo@`, `sarah@`) | **Boîte individuelle** | Responsabilité personnelle, obligation LCEN, confidentialité |
| Adresse **technique sortante** (`no-reply@`) | **Sans boîte** (compte d'envoi uniquement) | Évite une boîte inutile ; les réponses sont redirigées vers `support@` |
| **Freelance** qui traite 2 h/jour | **Accès délégué** à la boîte partagée, **aucune licence** | Économie + révocation d'accès instantanée en fin de mission |
| **Cabinet externe** (avocat, comptable, DPO) | **Alias vers son adresse professionnelle** + copie interne | Zéro licence, traçabilité conservée |
| Adresse **temporaire / campagne** (`noel2026@`) | **Alias** | Supprimable après la campagne, ne pollue pas l'annuaire |
| **Astreinte technique** (`devops@`) | **Groupe + rotation** | Aucun humain ne peut lire une boîte 24 h/24 |

**Règle de sécurité transverse :** **aucune adresse email ne doit jamais être un mécanisme d'authentification ou d'autorisation.** C'est le principe Zero-Trust déjà documenté dans `docs/CODEBASE-BIBLE.md:285` (« le statut administrateur n'est JAMAIS déterminé par un champ modifiable en base ni par une vérification d'adresse email »). Les 8 emplacements de `mateopolo91@gmail.com` dans le client violent cette doctrine et doivent être supprimés au profit exclusif des **Custom Claims** (`functions/src/admin/setAdminClaim.ts`).

#### C.7 — Récapitulatif de mise en œuvre (ordre strict)

| # | Action | Dépendance | Délai |
|---|---|---|---|
| 1 | Acheter/vérifier `troco.fr` et `troco.app` chez le même registrar | — | J+0 |
| 2 | Ouvrir Google Workspace, vérifier le domaine (TXT), créer 4 comptes | #1 | J+1 |
| 3 | Créer les 8 adresses P0 (alias/groupes) : `admin@`, `support@`, `abuse@`, `privacy@`, `dpo@`, `security@`, `litiges@`, `no-reply@` | #2 | J+1 |
| 4 | Publier SPF, DKIM, DMARC `p=none` | #2 | J+2 |
| 5 | Configurer le routage des réponses de `no-reply@` → `support@` | #3 | J+2 |
| 6 | Personnaliser les templates Firebase Auth (FR + EN) avec `no-reply@mail.troco.fr` | #4 | J+5 |
| 7 | Brancher l'extension Firebase « Trigger Email » + fournisseur transactionnel | #4 | J+7 |
| 8 | Déployer le ticketing et router les 8 adresses P0 | #3 | J+10 |
| 9 | Créer `dmarc-reports@` et activer l'analyse des rapports | #4 | J+7 |
| 10 | Passer DMARC en `p=quarantine` puis `p=reject` | #9 + 3 semaines d'observation | M+2 |
| 11 | Créer les adresses P1 | #3 | M+1 |
| 12 | Corriger les 3 occurrences `troco.app` de production et retirer `compte@troco.fr` | — | M+1 |
| 13 | Publier `public/.well-known/security.txt` | #3 | M+1 |
| 14 | Remplacer les 8 occurrences de `mateopolo91@gmail.com` par Custom Claims | — | M+1 |
| 15 | Créer les adresses P2 (alias) | #11 | M+3 |

---

## SECTION 2 — ORGANIGRAMME & PLAN DE RECRUTEMENT

### Step A — Organigramme cible

> **Rappel de l'état actuel (M0) :** une seule personne, **Mateo**, assure simultanément les fonctions de CEO, CTO, lead developer, support client, modération, conformité, finance, marketing et design. L'ensemble de l'administration repose sur un compte Gmail personnel. Il n'existe **aucun contrat de travail, aucun prestataire, aucune délégation**.

#### A.1 — Organigramme à 6 mois (« Sécuriser et prouver »)

```text
                        ┌─────────────────────────────┐
                        │   Mateo — Fondateur / CEO   │
                        │  Vision, produit, techniq.  │
                        └──────────────┬──────────────┘
                                       │
        ┌──────────────────┬───────────┴───────────┬──────────────────┐
        │                  │                       │                  │
┌───────▼────────┐ ┌───────▼────────┐   ┌──────────▼────────┐ ┌───────▼──────────┐
│ DEV (freelance)│ │ SUPPORT (free.)│   │ MODÉRATION (free.)│ │ EXTERNES (conseil) │
│ React/Firebase │ │ Niveau 1 · FR  │   │ Trust & Safety    │ │ Avocat (forfait)   │
│ 15-20 h/sem.   │ │ 10-15 h/sem.   │   │ 5-10 h/sem.       │ │ Comptable (mensuel) │
└────────────────┘ └────────────────┘   └───────────────────┘ │ DPO (mutualisé ou   │
                                                              │ externalisé)        │
                                                              └─────────────────────┘
```

**Capacité cible à 6 mois :** 2 à 3 freelances à temps partiel + 3 prestataires externes. Budget total : **2 000 à 4 000 €/mois**. Aucun CDI encore (voir B.4).

#### A.2 — Organigramme à 12 mois (« Structurer et industrialiser »)

```text
                          ┌──────────────────────────────┐
                          │    Mateo — CEO & Fondateur   │
                          │  Vision, levée, partenariats │
                          └───────────────┬──────────────┘
                                          │
   ┌──────────────┬───────────────────────┼───────────────────────┬──────────────┐
   │              │                       │                       │              │
┌──▼───────────┐ ┌▼──────────────┐ ┌──────▼────────────┐ ┌────────▼────────┐ ┌───▼─────────────┐
│ CTO / Lead   │ │ Head of       │ │ Head of Trust &   │ │ Compliance &    │ │ Head of Growth  │
│ Developer    │ │ Customer      │ │ Safety            │ │ Risk (temps     │ │ & Partenariats  │
│ (CDI)        │ │ Success (CDI) │ │ (CDI ou contract.)│ │ partiel/externe)│ │ (CDI ou free.)  │
└──┬───────────┘ └──┬────────────┘ └──────┬────────────┘ └─────────────────┘ └───┬─────────────┘
   │                │                     │                                     │
┌──▼──────────┐  ┌──▼──────────┐   ┌──────▼───────────┐                  ┌──────▼──────────┐
│ Dév. Front  │  │ Support N1  │   │ Modérateurs      │                  │ Admin. Growth / │
│ (free./CDD) │  │ (free. ×2)  │   │ multilingues     │                  │ Contenu (free.) │
└─────────────┘  └─────────────┘   │ (free. ×2-3)     │                  └─────────────────┘
                                    └──────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ PRESTATAIRES EXTERNES : Avocat · Expert-comptable · DPO externalisé ·                │
│ PSP/EMI (Stripe Connect / Mangopay) · Prestataire KYC · Pentest annuel               │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Capacité cible à 12 mois :** 5 à 7 personnes (dont 3-4 CDI) + un vivier de freelances. Budget total : **25 000 à 45 000 €/mois**.

#### A.3 — Organigramme à 24 mois (« Scaler et internationaliser »)

```text
                                ┌───────────────────────────────┐
                                │      CEO — Mateo              │
                                └───────────────┬───────────────┘
                                                │
              ┌────────────────┬────────────────┼────────────────┬─────────────────┐
              │                │                │                │                 │
      ┌───────▼──────┐ ┌───────▼──────┐ ┌───────▼──────┐ ┌───────▼───────┐ ┌───────▼───────┐
      │ CTO          │ │ COO /        │ │ CFO /        │ │ Chief         │ │ CMO /         │
      │ (Direction   │ │ Head of Ops  │ │ Finance Mgr  │ │ Compliance    │ │ Head of Growth│
      │  technique)  │ │ (Ops,        │ │ (Wallet, TVA,│ │ Officer (MLRO)│ │ (Acquisition, │
      │              │ │  support)    │ │  DAC7, PSP)  │ │ + CISO (sécu.)│ │  marque, CRM) │
      └──┬───────────┘ └──┬───────────┘ └──┬───────────┘ └──┬────────────┘ └──┬────────────┘
         │                │                │                │                 │
   ┌─────┼─────┐    ┌─────┼─────┐    ┌─────┼─────┐    ┌─────┼─────┐    ┌──────┼──────┐
   │     │     │    │     │     │    │     │     │    │     │     │    │      │      │
 Dév×3 DevOps  │  CSM×2 Support │ Compta  Analyste│ Analyste AML  Trust  Sécu  SEO/SEA Content
 Front Back SRE│  FR/EN multiling.│ ×1    Data     │ ×1       Modérat. Pay  ×1   Growth  ×2
 UI/UX  ×1     │  ×1     ×4      │                │          ×4     ×1
               └──────────────────┴────────────────┴───────────────┴─────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ FILIALES / ENTITÉS LOCALES : expansion multi-pays (UE d'abord), partenariats PSP locaux  │
│ ÉCOSYSTÈME : cabinets (audit, juridique, fiscal, sécurité) — contrats-cadres annuels      │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

**Capacité cible à 24 mois :** 25 à 40 personnes, réparties sur 2 à 3 pays, avec une structure de conformité et de sécurité autonome.
### Step A.4 — Fiches de poste : mission et rattachement hiérarchique

| Rôle | Mission principale | Rattachement | Indispensable à |
|---|---|---|---|
| **Fondateur / CEO (Mateo)** | Vision produit, stratégie, levée de fonds, partenariats stratégiques, arbitrage final, communication | — (président) | M0 (déjà en poste) |
| **CTO / Lead Developer** | Architecture technique, sécurité du code, découpage du monolithe `App.js` (2 500+ lignes), sortie de l'admin hardcodé, CI/CD, recrutement tech | CEO | M6-M12 |
| **Responsable Support Client (Customer Success)** | Tenir les SLA support, réduire le temps de première réponse, construire le centre d'aide, mesurer la satisfaction (CSAT) | CEO → puis COO | M4-M9 |
| **Responsable Trust & Safety / Modération** | Modération des contenus, application du DSA, gestion des abus graves, rapports de transparence, runbook CSAM | CEO → puis Compliance | M6-M12 |
| **Responsable Conformité (Compliance Officer / MLRO)** | KYC/AML, LCB-FT, DSP2, DAC7, RGPD, relations ACPR/TRACFIN, criblage des sanctions | CEO (rattachement direct obligatoire pour l'indépendance) | M9-M15 |
| **Responsable Sécurité (CISO)** | Sécurité applicative et infrastructure, pentests, réponse aux incidents, conformité ISO 27001 à terme | CTO | M12-M18 |
| **Responsable Financier (CFO / Contrôleur de gestion)** | Wallet, réconciliation, TVA, facturation, unit economics, reporting investisseurs, pilotage budgétaire | CEO | M12-M18 |
| **Responsable Marketing & Growth** | Acquisition (SEO/SEA/social), activation, rétention, marque, CRM, contenu | CEO | M6-M12 |
| **Responsable Partenariats (Business Development)** | Partenariats stratégiques, API, co-marketing, expansion, négociation PSP | CEO | M9-M15 |
| **Développeur Frontend** | Composants React, PWA, accessibilité WCAG, performance mobile | CTO | M6-M12 |
| **Développeur Backend** | Cloud Functions, Firestore, sécurité des règles, intégrations PSP/KYC | CTO | M9-M15 |
| **DevOps / SRE** | CI/CD, monitoring, alerting, budgets GCP, sauvegardes, infrastructure as code | CTO | M9-M15 |
| **Designer UI/UX** | Design system, parcours d'onboarding, accessibilité, prototypage | CEO / CTO | M6-M12 |
| **Data Analyst / Growth Analyst** | KPIs (DAU, MAU, GMV, CAC, LTV), dashboards, cohortes, expérimentations | CEO / CMO | M12-M18 |
| **Juriste** | CGU/CGV, contrats, DSA, RGPD, relations autorités | CEO (externe recommandé) | M3 (externe) |
| **Comptable** | Comptabilité générale, TVA, paie, déclarations, DAC7 | CEO (externe recommandé) | M3 (externe) |
| **DPO (Délégué à la Protection des Données)** | Conformité RGPD, registre des traitements, AIPD, réponse aux autorités, formation interne | Rattachement direct au plus haut niveau (indépendance obligatoire) | M1-M3 (externe) |

### Step B — Priorisation par phase, coûts et modalités

> **Fourchettes de coût mensuel chargé (France, 2026)** — intégrant les charges patronales (~45 %) pour les CDI et le TJM moyen pour les freelances. Volontairement larges : le coût réel dépend de l'expérience, de la localisation et de la rareté du profil.

| Rôle | Phase d'embauche | Coût mensuel (France) | Coût mensuel (Europe/remote) | Modalité recommandée | Justification | Impact si le rôle n'est PAS pourvu |
|---|---|---|---|---|---|---|
| **CTO / Lead Developer** | **M0-M6** (priorité absolue) | 7 000 à 11 000 € (CDI) · 8 000 à 14 000 € (freelance 4-5 j/sem.) · 12 000 à 20 000 € (agence) | 4 500 à 7 000 € | **Freelance senior 3 j/sem. au démarrage**, puis CDI à M9-M12 | Troco a besoin d'une expertise architecturale immédiate (sortie de l'admin hardcodé, découpage du monolithe, sécurité Firestore) mais ne peut pas encore porter un CDI plein temps. | 🔴 **Critique** : la dette technique s'aggrave (monolithe `App.js`, duplication de logique financière), les failles restent ouvertes, le fondateur devient le seul point de défaillance technique. |
| **Responsable Support Client / premier agent support** | **M2-M4** | 3 200 à 4 500 € (CDI) | 1 800 à 2 800 € | **Freelance 10-15 h/sem. dès M2**, CDI à M9 | Le volume de support est encore faible ; un freelance coûte 600 à 900 €/mois et permet de tenir le SLA 48 h sans hypothéquer la trésorerie. | 🔴 **Élevé** : les SLA publiés (`support@`, 48 h) ne sont pas tenus, la réputation se dégrade, les délais DSA/RGPD (72 h) sont violés. |
| **Responsable Trust & Safety / Modération** | **M3-M6** | 3 500 à 5 500 € | 2 000 à 3 500 € | **Freelance 5-10 h/sem.** puis CDI à M12 | La modération est encore majoritairement manuelle (P0-MOD-01 de la roadmap). Un freelance formé au DSA suffit jusqu'à ~10 000 utilisateurs actifs. | 🔴 **Critique (risque légal)** : obligations DSA non tenues (point de contact, retrait rapide, recours), risque de contenu illicite non traité, exposition pénale. |
| **Compliance Officer / MLRO** | **M6-M12** | 6 000 à 9 000 € (CDI) | 3 500 à 5 500 € | **Cabinet spécialisé fintech 1-2 j/mois dès M3 (2 000 à 4 000 €/mois)**, puis temps partiel senior ou CDI à M12-M18 | Compétence rare et chère : l'externalisation auprès d'un cabinet LCB-FT est le standard des jeunes fintechs, acceptable si le dispositif est documenté. | 🔴 **Existentiel** : impossibilité d'obtenir un partenariat PSP/EMI, risque de sanction ACPR/TRACFIN, impossibilité d'ouvrir un compte bancaire professionnel. |
| **Responsable Marketing & Growth** | **M6-M9** | 4 500 à 7 000 € | 2 500 à 4 500 € | **Freelance growth 2-3 j/sem.** puis CDI à M15 | L'acquisition doit devenir mesurable avant d'être salariée. Un freelance teste les canaux avec un budget média contrôlé. |  **Élevé** : croissance organique plafonnée, CAC non maîtrisé, aucune boucle de rétention. |
| **Juriste** | **M1-M3** (externe) | 3 000 à 6 000 € (cabinet, à la mission) | — | **Externe (cabinet) sur forfait**, jamais en interne avant M18 | Les CGU (`src/components/CguModal.jsx`) et la politique de confidentialité sont rédigées mais **non validées par un professionnel**. | 🔴 **Critique** : CGU inopposables, clause de médiation de la consommation manquante, responsabilité de l'éditeur non encadrée. |
| **Comptable / Expert-comptable** | **M1-M3** (externe) | 300 à 800 €/mois (TNS) · 1 500 à 3 000 €/mois (SAS) | — | **Externe obligatoire** (expert-comptable inscrit à l'Ordre) | Obligation légale pour toute société. Le wallet, les jetons et les commissions créent des flux qui **doivent** être comptabilisés et déclarés. | 🔴 **Critique** : défaut de déclaration TVA, redressement fiscal, impossibilité de justifier les flux. |
| **DPO** | **M1-M3** | 500 à 2 000 €/mois (mutualisé) · 3 000 à 6 000 €/mois (interne) | 1 500 à 3 000 € | **DPO externalisé mutualisé** (art. 37 RGPD) | Le DPO doit être **indépendant et disposer des moyens nécessaires**. Le confier au fondateur est juridiquement fragile (conflit d'intérêts). | 🔴 **Critique** : les mentions légales désignent déjà `privacy@troco.fr` comme « DPO » sans qu'aucun DPO ne soit désigné (**fausse déclaration réglementaire**). |
| **DevOps / SRE** | **M9-M15** | 5 500 à 8 500 € | 3 500 à 5 500 € | **Freelance à la mission** puis **CDI** | Le score Observabilité/DevOps est le plus faible du projet (2/10). Sauvegardes, alerting et maîtrise des coûts GCP sont des prérequis de scalabilité. | 🔴 **Élevé** : budget GCP non contrôlé, absence d'alerting, risque de perte de données, incidents non détectés. |
| **Responsable Financier (CFO)** | **M12-M18** | 8 000 à 13 000 € | 5 000 à 8 000 € | **CFO externalisé 1-2 j/sem.** puis CDI à M18-M24 | Un CFO plein temps est prématuré avant la Série A. Un CFO fractionné prépare la levée et les unit economics. | 🟠 **Élevé** : impossible de lever des fonds sans modèles financiers crédibles. |
| **Responsable Partenariats (BD)** | **M9-M15** | 4 500 à 7 000 € (+ variable) | 2 500 à 4 500 € | **Freelance à la commission** avec variable fort | Les partenariats sont transactionnels au début : un fixe élevé serait prématuré. | 🟡 **Moyen** : expansion plus lente, opportunités de distribution manquées. |
| **Développeur Frontend** | **M6-M12** | 4 500 à 7 000 € | 2 500 à 4 500 € | **Freelance à la mission** | Les chantiers sont intermittents (design system, accessibilité, refonte du feed). |  **Élevé** : dette UI (monolithe `App.js`), accessibilité WCAG non atteinte, vélocité produit divisée. |
| **Développeur Backend** | **M9-M15** | 5 000 à 7 500 € | 3 000 à 5 000 € | **Freelance à la mission** | Les intégrations (PSP, KYC, DAC7) sont des missions délimitées, idéales pour un expert externe. | 🟠 **Élevé** : les intégrations réglementaires (Stripe Connect, KYC réel) restent irréalisées. |
| **Designer UI/UX** | **M6-M12** | 4 000 à 6 500 € | 2 000 à 3 500 € | **Freelance à la mission** | Troco a déjà un design system fort (palette, animations, dark mode) : besoin ponctuel, pas continu. | 🟡 **Moyen** : onboarding non optimisé, friction d'usage non mesurée. |
| **Data Analyst / Growth Analyst** | **M12-M18** | 4 500 à 7 000 € | 2 500 à 4 500 € | **Freelance** puis **CDI** | Sans volume de données suffisant, le rôle ne se justifie pas avant M12. | 🟠 **Élevé** : décisions produit à l'aveugle, KPIs non instrumentés (DAU/MAU/GMV/CAC/LTV). |

#### B.4 — Arbitrage transversal : freelance, CDI ou agence ?

| Situation | Choix recommandé | Raisonnement |
|---|---|---|
| **Besoin immédiat, périmètre flou, trésorerie limitée** (CTO, support, modération) | **Freelance à temps partiel** | Mise en route en jours, pas de charges sociales fixes, arrêt possible à tout moment. Le freelance absorbe l'incertitude que Troco ne peut pas encore porter. |
| **Besoin permanent, périmètre stabilisé, revenus récurrents établis** (CTO, Head of CS, Compliance) | **CDI** | Fidélisation, confidentialité, engagement long terme. À partir de ~15 000 €/mois de revenus récurrents. |
| **Besoin spécialisé et ponctuel** (design system, pentest, intégration PSP) | **Agence ou cabinet** | Livrable contractuel avec obligation de résultat, assurance professionnelle, responsabilité portée par le prestataire. Coût au projet, pas au temps. |
| **Obligation légale nécessitant une inscription professionnelle** (comptabilité, DPO, juriste) | **Prestataire externe** | L'expert-comptable doit être **inscrit à l'Ordre**, le DPO doit pouvoir agir **indépendamment**. Ni un freelance informel ni un CDI ne satisfont ces exigences. |
| **Rôle de direction nécessitant confidentialité stratégique** (CFO, Compliance Officer) | **Temps partagé externalisé (fractional executive)** | Standard européen actuel : 1 à 2 jours par semaine avec un mandat clair, sans coût d'un temps plein. |

**Règle de décision à retenir :** *jamais de CDI avant d'avoir validé le besoin avec un freelance au moins 3 mois.* Le CDI est une décision lourde à défaire (procédure de licenciement) ; un freelance permet d'itérer.

#### B.5 — Trajectoire de trésorerie de l'organisation

| Phase | Effectif | Coût mensuel de l'organisation | Prérequis pour financer |
|---|---|---|---|
| **M0-M3** | Fondateur + 1-2 freelances + 3 externes (avocat, comptable, DPO) | 2 000 à 4 000 € | Revenus existants ou apport du fondateur |
| **M4-M6** | + support freelance + modération freelance | 3 500 à 6 000 € | Premiers revenus (boosts, Troco+, commissions) |
| **M7-M12** | + CTO (freelance puis CDI) + Head of CS + growth freelance | 15 000 à 30 000 € | Croissance du GMV, amorçage ou love money |
| **M13-M18** | + Compliance Officer + DevOps + dév. front + designer | 30 000 à 55 000 € | Série A ou forte traction démontrée |
| **M19-M24** | + CFO + BD + Data Analyst + 4 modérateurs + support multilingue | 70 000 à 130 000 € | Série A bouclée |

> **Point d'attention :** ces montants n'intègrent **ni** le budget infrastructure (GCP/Firebase, Sentry, ticketing), **ni** le budget marketing, **ni** les frais juridiques exceptionnels (levée, contrats). Prévoir un budget « outils et services » de 800 à 2 500 €/mois dès M3, et un budget média de croissance à partir de M6.
### Step C — Métiers spécialisés : internaliser, externaliser ou partenariat ?

| # | Corps de métier | Volume attendu (M0 → M12) | Recommandation | Ordre de priorité | Justification et modalité |
|---|---|---|---|---|---|
| 1 | **Conformité réglementaire (DAC7, RGPD, AML, DSA)** | Faible puis croissant, mais **obligation permanente** | **Externaliser (cabinet spécialisé)** puis **internaliser à M12-M18** | **P0 — dès M0** | C'est le risque le plus grave et le plus immédiat : obligations DSA déjà violées (point de contact non tenu), DPO non désigné, DAC7 absent. Un cabinet fintech/RGPD coûte 2 000 à 4 000 €/mois et évite une sanction de plusieurs dizaines de milliers d'euros. **Ne jamais internaliser avant la Série A** : la compétence est trop rare et trop chère. |
| 2 | **Modération de contenu (Trust & Safety)** | Volume croissant et **non compressible** | **Internaliser (freelances dédiés)** | **P0 — dès M1-M3** | La modération est une fonction opérationnelle quotidienne qui ne peut pas être sous-traitée en aveugle (confidentialité des échanges, urgence CSAM). On commence par **1-2 freelances francophones** formés à la charte, puis on étend aux autres langues. **Ne jamais confier la modération à une IA seule** tant que le volume dépasse ce qu'un humain peut revoir. |
| 3 | **Support client multilingue** | Faible en FR au début, **explose avec l'international** | **Internaliser d'abord en FR (freelance)**, puis **externaliser les langues secondaires (BPO)** | **P0 (FR) puis P1 (multilingue) à M9-M15** | Le support de niveau 1 en français doit être interne (connaissance produit, accès aux données). Les niveaux 1 en ES/DE/IT/JA/ZH peuvent être confiés à un **centre de contact multilingue** (BPO) avec des scripts. **Le niveau 2 reste toujours interne.** |
| 4 | **Vérification KYC manuelle** | **Nul aujourd'hui** (KYC simulé) → **élevé après branchement du KYC réel** | **Externaliser au prestataire KYC**, **internaliser uniquement la revue des cas litigieux** | **P1 — M3-M6** | Stripe Identity / Onfido / Jumio automatisent 90 % des vérifications. L'humain n'intervient qu'en **deuxième ligne** (documents douteux, fraude documentaire, réclamations). Externaliser la totalité serait irresponsable (obligation de contrôle), tout internaliser serait ruineux. |
| 5 | **Gestion des litiges utilisateurs** | Faible puis modéré, **corrélé au GMV** | **Internaliser (fonction dédiée rattachée au Customer Success / Trust & Safety)** | **P1 — M4-M9** | L'arbitrage Escrow engage la responsabilité financière de Troco et touche à la confiance, qui est le cœur du produit. Cette fonction **ne peut pas être externalisée** : elle exige l'accès au wallet, aux transactions et à l'historique des chats. |
| 6 | **Analyse antifraude** | Nul (paiements simulés) → **critique dès l'activation du PSP réel** | **Internaliser (analyste fraude) + partenariat PSP** | **P1 — M6-M12** | Stripe fournit Radar et les signaux de risque, mais la fraude P2P (virements hors plateforme, comptes mules, chargebacks) exige une **analyse humaine des patterns métier**. Un analyste fraude à mi-temps devient indispensable dès que les flux réels dépassent ~100 000 €/mois. |
| 7 | **Comptabilité et facturation** | Immédiat (obligation légale) | **Externaliser (expert-comptable inscrit à l'Ordre)** | **P0 — dès M0-M1** | Obligation légale pour toute société. Commencer par un **expert-comptable en ligne** (300 à 800 €/mois en TNS, 1 500 à 3 000 €/mois en société), puis internaliser un **contrôleur de gestion** (pas un comptable) à partir de M15-M18. |
| 8 | **Sécurité (pentests, audits)** | Annuel a minima, **trimestriel après le scaling** | **Partenariat avec un cabinet spécialisé (audits ponctuels)** + **CISO à temps partiel à M12** | **P1 — M6 puis annuel** | Un pentest ne s'improvise pas et doit être réalisé par une **équipe indépendante** (obligation de séparation des tâches). Budget : 8 000 à 25 000 € par audit complet. À coupler avec un **bug bounty** (YesWeHack, Hackenproof) dès M12 pour une couverture continue. |
| 9 | **Traduction et localisation** | 7 langues déclarées, **volume modéré mais continu** | **Externaliser (traducteurs indépendants + outil de localisation)** | **P2 — M6-M12** | Les 7 langues existent déjà dans `src/config/translations.js` mais nécessitent une **relecture humaine** par des natifs (les traductions automatiques produisent des erreurs juridiques). Coût : 0,08 à 0,15 €/mot. **Les documents juridiques (CGU, politique de confidentialité) doivent être traduits par un juriste-linguiste**, jamais par un outil. |

#### C.4 — Ordre de priorité consolidé de la délégation

| Rang | Métier | Action | Échéance | Coût mensuel |
|---|---|---|---|---|
| **1** | Comptabilité | Expert-comptable externe | M1 | 300 à 3 000 € |
| **2** | Conformité RGPD | DPO externalisé mutualisé | M1-M3 | 500 à 2 000 € |
| **3** | Juridique | Validation des CGU + CGV + politiques par un avocat | M1-M3 | 3 000 à 6 000 € (one-shot) |
| **4** | Modération / Trust & Safety | 1er freelance modération (5-10 h/sem.) | M2-M3 | 500 à 900 € |
| **5** | Support client FR | 1er freelance support (10-15 h/sem.) | M2-M4 | 600 à 1 000 € |
| **6** | Conformité financière (AML/PSD2) | Cabinet spécialisé fintech | M3-M6 | 2 000 à 4 000 € |
| **7** | KYC | Prestataire spécialisé (Stripe Identity / Onfido) | M3-M6 | Variable (0,50 à 2 € / vérification) |
| **8** | Sécurité | 1er pentest externe | M6 | 8 000 à 25 000 € (ponctuel) |
| **9** | Traduction | Relecture native des 7 langues | M6-M12 | 500 à 1 500 € |
| **10** | Support multilingue | BPO pour ES/DE/IT/JA/ZH | M9-M15 | 1 500 à 4 000 € |
| **11** | Fraude | Analyste fraude (mi-temps) | M9-M15 | 2 000 à 3 500 € |
| **12** | Comptabilité analytique | Contrôleur de gestion interne | M15-M18 | 4 500 à 7 000 € |

---
## SECTION 3 — PROFESSIONNALISATION & RECOMMANDATIONS STRATÉGIQUES

> **Méthode :** chaque point ci-dessous confronte **ce qui existe réellement dans le code** (constat, avec référence de fichier) à **ce qu'exige le standard d'une entreprise SaaS/fintech professionnelle** (écart), puis formule **une recommandation opérationnelle concrète**.

### Step A — SÉCURITÉ & CONFORMITÉ

#### A.1 — KYC / AML : seuils, prestataires et obligations UE

**Constat dans le code :**
- Le KYC est **entièrement simulé**. `src/components/ProfileView.jsx:734-743` : le composant `KycModal` reçoit un `onComplete` qui écrit directement `kycVerified: true` et `kycVerifiedAt` dans le profil local — **aucune vérification d'identité n'a lieu**.
- `src/components/PublicProfileModal.jsx:39` affiche `const isKycVerified = user.kycVerified ?? true;` — **l'absence de donnée KYC affiche un badge « vérifié »**, ce qui est un bug de confiance majeur (valeur par défaut inversée).
- Les règles Firestore interdisent aux clients d'écrire `kycVerified` (`docs/CODEBASE-BIBLE.md:747`), ce qui est correct, mais **aucune Cloud Function ne le positionne** : le champ est un vaisseau fantôme.
- La roadmap documente explicitement le problème : « KYC simulé ? `onKycComplete` ne semble pas brancher de vrai provider → Intègre Stripe Identity / Onfido » (`Audit TROCO DEEPSEEK.txt:182`) et « Brancher KYC réel (Stripe Identity) — P0-KYC-01, P0-KYC-02 » (`🦄 TROCO — ROADMAP ULTIME.txt:324`).

**Écart par rapport au standard :** une plateforme qui permet des transferts en euros entre utilisateurs et détient un wallet **doit** vérifier l'identité de ses utilisateurs (obligation LCB-FT, et exigence contractuelle de tout PSP). Aujourd'hui, un utilisateur peut afficher un badge « Identité Vérifiée ✅ » sans avoir prouvé quoi que ce soit.

**Recommandation — seuils et déclencheurs :**

| Seuil | Obligation recommandée | Base légale / pratique |
|---|---|---|
| **Dès l'inscription** | Vérification d'email + numéro de téléphone | Anti-spam et anti-bot (lutte contre les comptes multiples) |
| **Avant tout premier retrait vers un IBAN** | **KYC complet obligatoire** (pièce d'identité + selfie de vérification de vie) | Obligation AML ; un PSP refusera le flux sinon |
| **Avant tout transfert > 1 000 € cumulés sur 30 jours** | KYC complet + vérification de l'IBAN (micro-dépôt ou Open Banking) | Seuils usuels de vigilance renforcée |
| **Avant tout transfert > 10 000 € cumulés sur 12 mois** | **Vigilance renforcée** : justificatif de domicile, justificatif d'origine des fonds | Obligation de vigilance renforcée (LCB-FT) |
| **Utilisateurs professionnels (B2B, revendeurs)** | **KYB** : extrait SIREN/KBO, identité du bénéficiaire effectif, criblage des sanctions | Obligation AML sur les personnes morales |
| **Vendeurs dépassant 30 transactions ou 2 000 € sur l'année** | Collecte obligatoire du **numéro fiscal**, de l'adresse et de la date de naissance, puis transmission à la DGFiP | Directive DAC7 (voir A.3) |

**Recommandation — prestataire :**

| Prestataire | Points forts | Points faibles | Verdict pour Troco |
|---|---|---|---|
| **Stripe Identity** | ✅ **Intégration native avec Stripe Connect** (un seul fournisseur pour le paiement ET le KYC = moins de contrats, moins de flux d'identité à réconcilier). Tarif à la vérification, documentation excellente | Coût légèrement supérieur, couverture de certains pays plus limitée | ✅✅ **Recommandé** — minimise la complexité d'intégration pour une équipe solo : `functions/src/payments/providers/index.ts` est **déjà structuré** pour accueillir un provider Stripe |
| **Onfido** (groupe Entrust) | ✅ Très forte couverture internationale (195+ pays), excellente détection de fraude documentaire, références marketplace | Intégration séparée du PSP, contrat distinct | ✅ **Alternative crédible** si l'expansion internationale devient prioritaire avant le branchement du PSP |
| **Jumio** | ✅ Référence entreprise, très forte conformité, biométrie avancée | Tarification orientée volume, moins adapté aux petites structures | 🟡 Pertinent à partir de ~50 000 vérifications/an |

**Recommandation opérationnelle :**
1. **Utiliser Stripe Identity** au démarrage (un seul fournisseur : paiement + KYC).
2. **Corriger le bug d'inversion** de `PublicProfileModal.jsx:39` (le badge ne doit apparaître que sur `kycVerified === true`).
3. **Faire positionner `kycVerified` par une Cloud Function** appelée par le webhook du prestataire — jamais par le client.
4. **Conserver un écran de revue manuelle** pour les cas échoués : l'automatisation ne doit pas être un abandon de contrôle.
5. **Cribler les sanctions** (UE, OFAC, ONU) avec revue trimestrielle des listes.
#### A.2 — Réglementation du wallet : détention de fonds pour compte de tiers

**Constat dans le code :**
- Le wallet gère **deux actifs** : des **jetons Troco** (unité de compte interne) et des **euros** (`euroBalance`, `trocoTokens` — `src/stores/useWalletStore.js`, `firestore.rules`).
- Les transferts sont atomiques et serveur-autoritatifs (`functions/src/payments/transferAtomically.ts`, `applyPayment.ts`) : c'est **excellent** techniquement. Les écritures clients sur `transactions/{txId}` sont interdites (`allow write: if false`).
- **Mais la passerelle bancaire est un mock** : `functions/src/payments/providers/mockProvider.ts` « simule un débit bancaire et valide les paiements de test » (`docs/CODEBASE-BIBLE.md:751`). Aucune clé `STRIPE_SECRET_KEY` de production n'existe (`docs/CODEBASE-BIBLE.md:752`).
- Les UI de paiement affichent **Apple Pay / Visa fictifs** — signalé comme « illégal en production » dans la roadmap (P0-PAY-01, `🦄 TROCO — ROADMAP ULTIME.txt:325`).

**Écart par rapport au standard :** dès que Troco encaisse de l'argent réel et le conserve pour le reverser plus tard à un tiers (séquestre Escrow, retraits vers IBAN), il y a **détention de fonds pour compte de tiers**. En Europe, cette activité est **réservée** aux établissements agréés (établissement de monnaie électronique — EMI, ou établissement de paiement — EP), sauf à opérer sous le régime de l'**agent** ou du **distributeur** d'un établissement agréé.

**Trois trajectoires possibles :**

| Trajectoire | Description | Avantages | Inconvénients | Verdict |
|---|---|---|---|---|
| **A. Partenariat Stripe Connect** | Troco opère en tant que **plateforme** ; Stripe est l'établissement agréé qui détient les fonds et réalise les payouts. Troco prélève une commission de plateforme. | ✅ Mise en route en semaines. ✅ Aucun capital réglementaire requis. ✅ KYC/KYB délégué à Stripe. ✅ Conforme PSD2. | Coût par transaction, dépendance à un acteur unique, contrôle limité sur l'expérience de retrait. | ✅✅ **Recommandé au démarrage (M0-M12)** — la roadmap prévoit déjà « Brancher Stripe Connect (PSP réel) » (`🦄 TROCO — ROADMAP ULTIME.txt:323`) |
| **B. Partenariat Mangopay / Lemonway** | Établissements EMI **français spécialisés marketplaces** : séquestre, wallets multi-utilisateurs, reversements, KYC intégré. | ✅ Conçu nativement pour l'Escrow et les wallets marketplace. ✅ Cadre français (ACPR), interlocuteur francophone. ✅ Souvent mieux adapté que Stripe pour un vrai séquestre. | Intégration plus lourde, tarification orientée volume. | ✅ **Recommandé si le séquestre devient central au produit (M6-M18)** — Mangopay est la référence escrow marketplace en Europe |
| **C. Agrément EMI propre** | Troco obtient son propre agrément d'établissement de monnaie électronique auprès de l'ACPR. | ✅ Marge complète, indépendance totale, valorisation supérieure. | Capital social minimum **350 000 €**, dossier réglementaire lourd, **12 à 24 mois** de procédure, obligations prudentielles permanentes, équipe conformité dédiée obligatoire. | ❌ **Prématuré** avant la Série A. À envisager seulement si le wallet devient le produit principal (M24+) |

**Recommandation opérationnelle :**
1. **M0-M3 :** arrêter toute UI de paiement fictive (Apple Pay/Visa non fonctionnels présentés comme réels) — pratique commerciale trompeuse (art. L.121-1 du Code de la consommation).
2. **M1-M6 :** brancher **Stripe Connect** en mode production, en exploitant `functions/src/payments/providers/index.ts`, déjà préparé pour accueillir un provider réel.
3. **M6-M12 :** évaluer **Mangopay** pour le séquestre réel si les volumes le justifient.
4. **Documenter** dans les CGU **qui détient les fonds** à chaque étape (Troco, Stripe ou l'EMI partenaire) — obligation d'information précontractuelle.
5. **Ne jamais présenter les jetons Troco comme une monnaie électronique remboursable** sans base légale : ce sont une **unité de compte de service**, description déjà correcte dans `CguModal.jsx:300` (« unité de compte temporelle »).
#### A.3 — RGPD : registre des traitements, DPO, mentions légales, consentements

**Constat dans le code — ce qui existe déjà et qui est bien fait :**
- ✅ **Politique de confidentialité complète** et pédagogique (`src/components/PrivacyPolicy.jsx`) : responsable de traitement identifié, durées de conservation, obligations légales de conservation des logs (LCEN) et des pièces de facturation.
- ✅ **Politique de cookies conforme CNIL** (`src/components/CookiePolicy.jsx`) : inventaire exhaustif des traceurs, refus aussi simple que l'acceptation, réinitialisation des préférences.
- ✅ **Gestionnaire de consentement réellement opt-in** (`src/services/consentManager.js`) : valeurs par défaut toutes à `false` sauf `necessary`, péremption à 6 mois (recommandation CNIL de septembre 2020), purge effective des cookies de tracking (`_ga`, `_gid`, `_gat`, `__utm`, `mp_`) et désactivation de Google Analytics. **Travail de qualité professionnelle.**
- ✅ **Fonctions RGPD opérationnelles** : `deleteUserCompletely` (art. 17), `restoreAccount` (rétractation 30 jours), `scheduledDeletion` (purge quotidienne à 03h00), `anonymizeTransactions` (conciliation RGPD / obligation comptable de 10 ans), `sendDeletionEmail`.
- ✅ **Minimisation par conception** : collection `users_public` générée par Cloud Function (`functions/src/users/onUserWriteSyncPublic.ts`) et geo-privacy (floutage GPS) — deux excellentes pratiques.

**Écart par rapport au standard — ce qui manque :**

| Obligation RGPD | État actuel | Écart |
|---|---|---|
| **Registre des traitements** (art. 30) | ❌ Inexistant | Obligatoire dès qu'on traite des données à grande échelle. Doit lister **chaque traitement** : finalité, base légale, catégories de données, destinataires, durée de conservation, mesures de sécurité. C'est le premier document demandé par la CNIL. |
| **Désignation d'un DPO** (art. 37) | ❌ **Aucun DPO désigné**, mais `privacy@troco.fr` est **présenté comme le DPO** (`LegalNotice.jsx:456` → « Délégué à la Protection des Données (DPO) : privacy@troco.fr ») | 🔴 **Fausse déclaration réglementaire.** Soit on désigne réellement un DPO (interne ou externe) et on publie son contact, soit on retire la mention et on publie une adresse de contact pour la protection des données sans prétendre qu'un DPO est désigné. |
| **AIPD / DPIA** (art. 35) | ❌ Inexistante | **Obligatoire** pour Troco : traitement à grande échelle de données de géolocalisation, de données financières, de vérification d'identité, et **surveillance systématique** (modération, détection de fraude). À réaliser **avant** la mise en production des traitements concernés. |
| **Droit à la portabilité** (art. 20) | ❌ Non implémenté (identifié P0-GDPR-05) | Doit produire un export **structuré et lisible par machine** (JSON/CSV) : profil, annonces, messages, transactions, avis. |
| **Registre des consentements** | ⚠️ Partiel (localStorage) | `consentManager.js` stocke le consentement **côté navigateur uniquement**. En cas de contrôle, on ne peut pas **prouver** le consentement. Il faut horodater chaque consentement **côté serveur** (uid, version de la politique, date, IP tronquée). |
| **Sous-traitants et transferts hors UE** | ⚠️ Mention indirecte | La politique cite Firebase, mais **aucune liste structurée des sous-traitants** (Google/Firebase, Sentry, Nominatim/OpenStreetMap, futur PSP, prestataire KYC, outil de ticketing) avec leur localisation. Obligation d'information (art. 13) et encadrement contractuel (art. 28). Les **clauses contractuelles types** doivent être signées pour tout transfert hors UE (Sentry, Google). |
| **Notification de violation** (art. 33) | ❌ Aucune procédure | Obligation de notifier la **CNIL sous 72 h** et les personnes concernées si le risque est élevé. Aucun runbook n'existe. |
| **Mentions légales** | ⚠️ Incomplètes | `LegalNotice.jsx` déclare « Éditeur : Mateo », sans **numéro SIREN/SIRET, sans adresse postale de siège, sans numéro de TVA**. Ces mentions sont **obligatoires** (LCEN art. 6-III, Code de commerce). |
| **Données de candidats** | ❌ Non encadré | Aucune procédure pour les CV reçus par `careers@` : durée (2 ans maximum), information obligatoire, suppression. |

**Recommandation opérationnelle (ordre d'exécution) :**
1. **M0-M1 :** désigner un **DPO externalisé** (ou, si un DPO interne est nommé, publier son contact nominatif) ; **retirer la mention trompeuse** de `LegalNotice.jsx:456` tant que personne n'est désigné.
2. **M0-M1 :** rédiger le **registre des traitements** (modèle CNIL disponible gratuitement) — document fondateur de toute la conformité.
3. **M1-M2 :** compléter les mentions légales (SIREN, siège, TVA, contact) dès l'immatriculation de la société.
4. **M1-M2 :** lancer l'**AIPD** sur les traitements à risque (géolocalisation, wallet, KYC, modération).
5. **M2-M3 :** implémenter l'**export de portabilité en self-service** depuis le « Centre de Confidentialité » déjà présent dans le footer.
6. **M2-M3 :** **horodater les consentements côté serveur** (collection `consents` : uid, type, version de politique, date, IP tronquée).
7. **M3 :** documenter la **liste des sous-traitants** et signer les **DPA** (Data Processing Agreements) avec Google, Sentry et tous les autres.
8. **M3 :** publier le **plan de réponse aux incidents** (voir A.8).
#### A.4 — DAC7 : obligations de reporting fiscal des plateformes (UE)

**Constat dans le code :**
- ❌ **Aucun module DAC7 n'existe.** Le constat est explicite dans la roadmap : « P0-PAY-06 — Pas de DAC7 (reporting fiscal plateforme UE) → Non-conformité depuis 2023 → Module reporting vendeurs → autorités fiscales » (` TROCO — ROADMAP ULTIME.txt:76`).
- Aucune collecte de **numéro fiscal (NIF/TIN)**, de **date de naissance** ou d'**adresse de vendeur** n'est réalisée.
- `AMEILLIORATIONS STEP BY STEP.txt:44` mentionne l'intention (« Conformité DAC7 automatisée : génération automatique du récapitulatif fiscal annuel ») mais **rien n'est implémenté**.

**Écart par rapport au standard :** la directive **DAC7** (Directive UE 2021/514), transposée en droit français, impose à **toute plateforme numérique** mettant en relation des vendeurs et des acheteurs de biens ou services de :
1. **Collecter** et **vérifier** les données d'identification des **vendeurs** : nom, adresse principale, **NIF** (numéro d'identification fiscale), **date de naissance** (personnes physiques), **numéro d'enregistrement** (personnes morales), numéro de TVA le cas échéant.
2. **Déclarer** ces données et le montant des revenus perçus à l'administration fiscale de l'État membre du vendeur, **au plus tard le 31 janvier** de l'année suivant la période de déclaration.
3. **Informer** chaque vendeur concerné des données déclarées.

Troco est en **non-conformité depuis l'entrée en application de la directive** : toute plateforme facilitant la vente de biens ou de services par des particuliers est concernée (les exceptions sont très étroites : quelques centaines d'euros ou très peu de transactions par an).

**Recommandation opérationnelle :**
1. **M1-M3 (obligation légale immédiate) :** implémenter la **collecte des données DAC7** à l'onboarding vendeur, avec **vérification** (confrontation au numéro de TVA via VIES pour les professionnels, cohérence nom/adresse pour les particuliers).
2. **Bloquer fonctionnellement la publication d'annonces** (ou la limiter à un seuil très bas) pour tout vendeur n'ayant pas fourni ses données DAC7 : seul moyen de garantir la conformité.
3. **M3-M6 :** produire le **fichier de déclaration annuel** au format attendu par la DGFiP et l'automatiser.
4. **Informer chaque vendeur** des données transmises, depuis son espace personnel.
5. **Conserver les données DAC7 pendant 5 ans** (durée légale).
6. Anticiper la **facturation électronique obligatoire en France (2026)** : le format **Factur-X** est signalé comme nécessaire dans la roadmap (`P4-REG-FR-01`).

#### A.5 — Journalisation d'audit : traçabilité des actions sensibles

**Constat dans le code — ce qui existe et qui est bien fait :**
- ✅ **Journalisation structurée des actions administratives** : `functions/src/utils/logger.ts` expose `logAdminAction()` qui écrit dans **Google Cloud Logging** un objet structuré `adminAudit` contenant `action`, `callerUid`, `targetId`, `details`, `status`, `timestamp`. **Bonne approche** : Cloud Logging est inviolable par le client, indexable et interrogeable.
- ✅ **Toutes les actions administratives passent par des Cloud Functions** (`functions/src/admin/` : `deleteListingAsAdmin`, `resetUserSafely`, `resolveReport`, `setAdminClaim`, `toggleHideListingAsAdmin`, `updateUserAsAdmin`) : elles sont donc toutes journalisables.
- ✅ **Journalisation générique** pour les actions financières et RGPD : `structLog()`.
- ✅ **Script d'exploitation des logs** : `scripts/analyze-cloud-logs.sh`.
- ✅ **Traceur WebRTC côté client** (`src/utils/webrtcTracer.js`) : tampon circulaire de 100 événements + pont Sentry.

**Écart par rapport au standard :**

| Action sensible | Journalisée aujourd'hui ? | Écart |
|---|---|---|
| Actions admin (suppression d'annonce, ban, changement de rôle) | ✅ Oui, via `logAdminAction` | — |
| Ajustements de solde par un admin | ✅ Oui (type de transaction `admin_adjustment`, `AdminDashboard.jsx:1905`) | — |
| **Consultation de données personnelles par un admin** | ❌ Non | Un admin qui consulte le profil d'un utilisateur, un dossier KYC ou l'historique d'un chat **ne laisse aucune trace**. C'est le trou de traçabilité le plus grave (RGPD art. 5-1-f et 32). |
| **Modification de `firestore.rules`** |  Non | Aucun historique de version des règles de sécurité hors GitHub. |
| **Accès aux documents KYC** | ⚠️ Non (KYC non branché) | Devient critique dès l'activation de Stripe Identity : chaque consultation d'une pièce d'identité doit être tracée. |
| **Export de données (portabilité)** | ❌ Non implémenté | Doit être tracé (qui a exporté quoi, quand, pour qui). |
| **Connexions administrateur** | ❌ Non | Aucune détection d'un accès admin inhabituel (nouveau pays, nouveau device). |
| **Sauvegarde et restauration** | ❌ Aucune politique documentée | Aucun plan de sauvegarde Firestore documenté ni testé. |

**Recommandation opérationnelle :**
1. **M1 :** ajouter un `logAdminAction` sur **toute lecture** d'une donnée personnelle sensible par un administrateur (profil complet, dossier KYC, messages privés — `AdminChatsTab.jsx` donne accès à toutes les conversations).
2. **M1 :** activer **Google Cloud Audit Logs** (Data Access audit logs) sur Firestore — couvre l'infrastructure.
3. **M2 :** mettre en place une **alerte automatique** sur les événements critiques : changement de Custom Claim `admin`, ajustement de solde > 500 €, suppression d'utilisateur, accès admin depuis une nouvelle localisation.
4. **M2 :** documenter et **tester mensuellement** une **procédure de sauvegarde/restauration Firestore** (« restore drill ») — une sauvegarde jamais testée n'est pas une sauvegarde.
5. **M3 :** conserver les logs d'audit **12 mois minimum** (usage interne) et **5 ans** pour les logs liés aux flux financiers (obligation LCB-FT).
#### A.6 — Rate limiting et protection anti-abus

**Constat dans le code — ce qui existe et qui est bien fait :**
- ✅ **Rate limiting serveur** : `functions/src/security/checkRateLimit.ts` (quota pour actions sensibles avec fenêtres glissantes), `functions/src/security/rateLimitHelper.ts`, `functions/src/middleware/rateLimit.ts`.
- ✅ **Nettoyage automatique** : `functions/src/security/cleanupRateLimits.ts` (purge horaire des compteurs expirés).
- ✅ **Idempotence des opérations financières** : `functions/src/payments/idempotency.ts` + `cleanupIdempotency.ts` — protection essentielle contre les doubles débits.
- ✅ **Cache et rate limiting côté géocodage** : `src/utils/geocodingNominatim.js` (file d'attente, cache, annulation via `AbortSignal`) — respect des conditions d'usage de Nominatim.
- ✅ **Idempotence des messages** : `src/utils/messageIdempotency.js` (fenêtre glissante de 1 200 ms) et garde `isSendingRef` dans `ChatInputBar.jsx`.
- ✅ **App Check** : `README-APPCHECK.md` documente l'activation (reCAPTCHA v3, DeviceCheck iOS, Play Integrity Android).

**Écart par rapport au standard :**

| Protection attendue | État | Écart |
|---|---|---|
| Rate limiting sur les **écritures Firestore directes** | ⚠️ Partiel | Le rate limiting existe sur les Cloud Functions, mais le client écrit **directement** dans Firestore pour de nombreuses opérations (annonces, messages, profils). Les `firestore.rules` ne peuvent pas compter les requêtes par fenêtre de temps : il faut **soit** un contrôle strict App Check / Cloud Armor, **soit** déplacer ces écritures derrière des Cloud Functions. |
| **Détection de bots** | ✅ App Check | À vérifier : App Check est-il **réellement en mode enforcing** (et non en monitoring) en production ? |
| **Anti-spam sur les annonces** | ❌ Aucun | Aucune limitation du nombre d'annonces par utilisateur, aucun filtre de contenu, aucun délai de refroidissement pour les nouveaux comptes. |
| **Anti-abus sur les inscriptions multiples** | ❌ Aucun | Un utilisateur peut créer plusieurs comptes pour contourner un bannissement ou **rejouer le bonus de bienvenue** (12 jetons offerts à la première connexion, `useAppAuth.js:121-135`). |
| **Rate limiting sur l'authentification** | ⚠️ Firebase natif | Firebase Auth limite nativement les tentatives, mais sans protection contre le *credential stuffing* distribué. |
| **Protection anti-scraping** | ❌ Aucune | Le feed est accessible : un concurrent peut aspirer toutes les annonces publiques. |
| **Détection de virements hors plateforme** | ❌ Aucune | Le pattern de fraude le plus courant en P2P (demander à l'autre partie de payer **hors** plateforme) n'est **pas détecté** : aucun filtrage des messages ne cherche d'IBAN, de numéro de téléphone ou de lien externe. |
| **Limite de débit sur les exports** | ❌ Aucune | L'export de portabilité (à venir) sera un vecteur d'abus s'il n'est pas limité. |

**Recommandation opérationnelle :**
1. **M1 :** vérifier et forcer **App Check en mode enforcing** sur Firebase (Auth, Firestore, Functions).
2. **M1 :** ajouter un **détecteur d'IBAN / téléphone / lien externe** dans `src/components/ChatView.jsx` et avertir l'utilisateur (« Ne payez jamais en dehors de Troco ») — c'est la mesure anti-fraude la plus rentable, car elle traite le vecteur n°1.
3. **M1-M2 :** limiter le **nombre d'annonces actives** par utilisateur selon son ancienneté et son statut KYC.
4. **M2 :** refuser le **bonus de bienvenue** aux comptes créés depuis la même empreinte (device fingerprint, token App Check, IP tronquée).
5. **M2 :** ajouter un **délai de refroidissement** pour les nouveaux comptes : aucun transfert d'euros sortant pendant 7 jours ou avant KYC.
6. **M3 :** implémenter une **détection de vélocité** sur les transferts (nombre et montant par heure/jour) avec blocage automatique et revue par `fraud@`.
#### A.7 — Plan de réponse aux incidents (RGPD : 72 h pour notifier la CNIL)

**Constat dans le code :**
- ✅ **Détection partielle** : Sentry (`src/utils/sentry.js`, `src/utils/sentryFilters.js`) capte les erreurs front avec filtrage en développement ; health check HTTP (`functions/src/health/healthCheck.ts`) expose un endpoint de disponibilité ; `docs/MONITORING.md` documente le health check ; `docs/INCIDENT-POST-MORTEM.md` existe — **preuve qu'un incident majeur a déjà eu lieu**.
- ⚠️ **Aucun plan de réponse formel** : pas de runbook, pas d'astreinte, pas de matrice de gravité, pas de procédure de notification CNIL, pas de modèle de communication de crise.
- ️ **Aucune alerte automatique** : `devops@troco.fr` n'existe pas ; les erreurs Sentry ne déclenchent aucun push.

**Écart par rapport au standard :** le RGPD impose de **notifier la CNIL sous 72 heures** toute violation de données susceptible d'engendrer un risque pour les droits et libertés (art. 33), et d'**informer les personnes concernées** si le risque est élevé (art. 34). Sans runbook, l'organisation perd ses 72 heures à chercher qui fait quoi.

**Recommandation — plan de réponse en 6 phases :**

| Phase | Délai cible | Actions | Responsable |
|---|---|---|---|
| **1. Détection** | Immédiat | Sentry/Cloud Monitoring déclenche une alerte → **push** vers `devops@` et le fondateur. Canal dédié (Slack/Telegram) plutôt qu'une boîte email. | Automatique |
| **2. Qualification** | **< 1 h** | Déterminer : s'agit-il d'une violation de données personnelles ? De quel type (confidentialité, intégrité, disponibilité) ? Combien de personnes concernées ? Données sensibles ? | Fondateur / CTO |
| **3. Contention** | **< 4 h** | Révoquer les accès compromis, invalider les tokens/sessions, couper la fonction concernée, isoler les données, changer les secrets (`firebase functions:secrets`). **Sauvegarder les preuves** (logs, snapshots) avant toute remédiation. | CTO |
| **4. Notification CNIL** | **< 72 h** (obligation légale) | Remplir la notification en ligne sur le site de la CNIL : nature de la violation, catégories et nombre de personnes concernées, conséquences probables, mesures prises. **Si l'analyse n'est pas terminée à 72 h, notifier quand même et compléter ensuite** — le retard est une infraction distincte. | DPO / Fondateur |
| **5. Information des personnes** | **Sans délai injustifié** | Si risque élevé : email clair, sans jargon, décrivant l'incident, ce que Troco fait, ce que l'utilisateur doit faire (changer de mot de passe, surveiller ses comptes). Préparer **3 modèles** à l'avance (fuite d'identifiants, fuite de données financières, compromission de compte). | Fondateur / DPO |
| **6. Post-mortem** | **< 15 jours** | Documenter la chronologie, la cause racine, les mesures correctives et les actions de prévention. Format déjà amorcé dans `docs/INCIDENT-POST-MORTEM.md`. | CTO / Fondateur |

**Éléments à préparer dès maintenant (M1) :**
- **Registre des violations** (obligation RGPD art. 33-5) : même les incidents non notifiables doivent être consignés.
- **Contacts d'urgence** : CNIL, avocat, assureur cyber (voir Section 3.C), prestataires critiques (Stripe, support Firebase).
- **Modèles de communication** pré-rédigés et pré-validés par l'avocat.
- **Export des données de contact** de tous les utilisateurs, accessible même si l'application est hors service (fichier chiffré hors ligne) — sans quoi il est **impossible** d'informer les personnes concernées dans les délais.
#### A.8 — Pentests et audits de sécurité externes

**Constat dans le code :**
- ❌ **Aucun pentest n'a jamais été réalisé** (aucun rapport dans le dépôt, aucune mention dans les roadmaps).
- ️ La roadmap signale des failles connues **non corrigées** : « Admin déterminé côté client (profile?.email === '...') → N'importe qui devient admin via DevTools » (P0-SEC-01). Ce point est **partiellement** traité (Custom Claims et `scripts/bootstrap-admin.js` existent) mais **les vérifications par email subsistent dans 5 fichiers client** (`AuthContext.jsx:95`, `AdminDashboard.jsx:34`, `AdminPanel.jsx:45`, `GlobalLiveChat.jsx:84`, `useAuthStore.js:7`).
- ✅ **Point positif majeur :** `docs/CODEBASE-BIBLE.md:285` documente la doctrine Zero-Trust, et les règles Firestore sont complètes, testées (`tests/rules/firestore.rules.test.js`) et en deny-by-default (`README-RULES.md`). **C'est rare et de très bonne qualité.**
- ⚠️ Un **verrou d'administration par PIN** existe dans `AdminPanel.jsx:46` (`pinInput.trim() === '2609'`) — un PIN **en dur dans le code source**, ce qui n'offre **aucune sécurité** (il est lisible dans le bundle JavaScript public).

**Écart par rapport au standard :** une plateforme qui manipule de l'argent et des données d'identité doit être auditée par un tiers indépendant **au moins une fois par an**, et toutes les failles critiques doivent être corrigées avant la mise en production réelle des paiements.

**Recommandation — programme de sécurité :**

| Échéance | Action | Budget indicatif |
|---|---|---|
| **M1 (immédiat)** | **Corriger le PIN en dur** de `AdminPanel.jsx:46` et **supprimer les 5 vérifications email** côté client au profit exclusif des Custom Claims | 0 € (interne) |
| **M1** | `npm audit` + mise à jour des dépendances ; **analyser le bundle** et vérifier qu'aucun secret n'est embarqué | 0 € |
| **M2** | **Audit de configuration** Firebase/GCP (règles Storage, IAM, clés API, App Check, CORS des Cloud Functions) | 0 à 2 000 € |
| **M3** | **Premier pentest externe** (web + API + règles Firestore + logique métier du wallet) | 8 000 à 25 000 € |
| **M6** | **Programme de bug bounty** (YesWeHack, Hackenproof) — couverture continue à coût fixe | 500 à 2 000 €/mois |
| **M12** | **Audit de conformité** (RGPD + LCB-FT) par un cabinet | 10 000 à 30 000 € |
| **M18** | **Certification ISO 27001** (ou SOC 2 Type II) — exigée par certains partenaires et investisseurs | 20 000 à 60 000 € |

> **Recommandation prioritaire de sécurité :** restreindre le `cors: true` des Cloud Functions (`functions/src/index.ts`, appliqué à **17 fonctions**) à la liste des origines légitimes de Troco. Aujourd'hui, n'importe quel site web peut appeler ces fonctions depuis le navigateur d'une victime connectée.

---

### Step B — PRODUIT & UX

#### B.1 — Onboarding professionnel (tutoriels, guides)

**Constat dans le code :**
- ✅ Un système d'onboarding existe : `handleCompleteOnboarding` (mentionné dans la roadmap P1-BUG-06), la modale `CguModal.jsx` recueille l'acceptation des CGU (`cguAcceptedAt` est un champ protégé côté Firestore), et `src/components/PublicProfileModal.jsx` affiche un état de complétion de profil.
- ⚠️ **Bug critique identifié** : « `handleCompleteOnboarding` force 10 tokens / 0€ → destruction de solde si re-trigger. Garde : ne s'exécute que si `onboardingCompleted === false` ET solde initial » (P1-BUG-06, ` TROCO — ROADMAP ULTIME.txt:104`). Un utilisateur ayant accumulé des jetons peut **les perdre** en repassant par l'onboarding.
- ️ **`window.prompt` pour le lien magique** : « `window.prompt` pour email magic link → UX cheap + faille » (P1-BUG-12, ligne 110).
- ❌ **Aucun tutoriel guidé**, aucune visite produit (product tour), aucun guide « premier pas » structuré.

**Écart par rapport au standard :** un utilisateur qui arrive sur une marketplace P2P avec wallet, séquestre et collaboration temps réel doit comprendre **en moins de 90 secondes** ce qu'il peut faire et comment. La richesse fonctionnelle (Docs, Sheets, Slides, Whiteboard, WebRTC, wallet, Escrow) est aujourd'hui un **risque de surcharge cognitive**.

**Recommandation opérationnelle :**
1. **M1 :** corriger le bug P1-BUG-06 (destruction de solde) — priorité absolue, il touche à l'argent.
2. **M1 :** remplacer les `window.prompt` / `alert` / `window.confirm` natifs par les modales maison (le projet dispose déjà d'un design system premium et d'un `ModalProvider`).
3. **M1-M2 :** implémenter un **onboarding en 4 étapes** : (1) profil minimal, (2) intentions (je propose / je cherche), (3) première annonce guidée avec exemple pré-rempli, (4) découverte du premier contact.
4. **M2 :** ajouter un **product tour** contextuel de 5 écrans maximum (feed, carte, chat, deal, wallet), **sautable** et **rejouable** depuis les paramètres.
5. **M2-M3 :** mettre en place des **emails d'onboarding** (J+0 bienvenue, J+1 « créez votre première annonce », J+3 « explorez la carte », J+7 « découvrez la collaboration ») — meilleur levier d'activation, sans développement lourd une fois l'infrastructure email en place (Section 1).
6. **M3 :** mesurer le **taux de complétion de l'onboarding** et le **time-to-first-listing** comme KPI produit d'entrée (voir C.6).
#### B.2 — Aide contextuelle et centre d'aide

**Constat dans le code :**
- ❌ **Aucun centre d'aide.** L'adresse `help@troco.fr` n'existe pas, aucun article de documentation utilisateur n'est présent dans le dépôt (les fichiers `.md` sont **techniques** : `CODEBASE-BIBLE.md`, `AUDIT-*.md`, `MONITORING.md`).
- ❌ **Aucune aide contextuelle** : le projet dispose pourtant déjà d'un composant « Tooltips » dans `src/components/ui/`, mais il n'est pas exploité pour expliquer les concepts métier.
- ⚠️ Quatre concepts non triviaux ne sont expliqués nulle part de façon accessible : la modale KYC, le séquestre Escrow, la différence jeton/euro, le système de bonus.

**Écart par rapport au standard :** un centre d'aide réduit de 40 à 70 % le volume de tickets support. C'est **l'investissement au meilleur retour** de tout ce document : chaque article écrit une fois évite des dizaines d'échanges répétés.

**Recommandation opérationnelle :**
1. **M1-M2 :** publier **30 articles** couvrant les 10 questions les plus fréquentes (mesurées via les vrais emails reçus sur `support@`), traduits dans les 7 langues déjà supportées (`src/config/translations.js`).
2. **M1-M2 :** ajouter une **aide contextuelle** sur les 5 parcours critiques : KYC, achat de jetons, création de deal avec séquestre, signalement d'abus, suppression de compte.
3. **M2 :** intégrer une **recherche** et un **widget de contact** qui pré-remplit le ticket avec le contexte (uid, écran, dernière action).
4. **M3 :** ajouter un **glossaire** (« Jeton Troco », « Séquestre », « Boost », « Troco+ », « Deal hybride ») explicité dans l'interface au survol.

#### B.3 — Résolution de litiges : workflow formalisé

**Constat dans le code :**
- ✅ `src/components/RefundPolicy.jsx:378` décrit un **processus en 3 temps** : résolution amiable entre les parties, puis saisine après **48 heures**, puis intervention de la modération.
- ✅ Le `ReportModal.jsx` existe et un formulaire DSA complet est présent dans `LegalNotice.jsx` (catégorie d'infraction, description, navigation clavier stricte).
- ✅ Le tableau de bord admin compte les litiges (`stats.disputedTransactions`) et propose un onglet « Économie & Litiges » (`AdminDashboard.jsx:1710-1903`).
- ✅ La fonction `resolveReport` existe côté serveur (`functions/src/admin/resolveReport.ts`).
- ⚠️ **Mais aucun document `disputes/{id}` n'est créé** : le litige vit dans l'email `litiges@troco.fr` et dans le compteur de transactions `disputed`. **Il n'existe pas d'entité « litige » avec un statut, un responsable et un historique.**
- ❌ **Aucune obligation de mention du médiateur de la consommation** dans les CGU (voir C.4).

**Écart par rapport au standard :** un litige non formalisé est un litige non traçable. En cas de réclamation, Troco ne peut pas prouver qu'il a traité le dossier dans les délais — risque juridique et risque de réputation.

**Recommandation opérationnelle :**
1. **M1-M2 :** créer une collection **`disputes/{disputeId}`** avec : `listingId`, `chatId`, `transactionId`, `openedByUid`, `againstUid`, `amount`, `reason`, `evidenceUrls`, `status` (`opened` → `mediation` → `arbitration` → `resolved` → `escalated`), `assignedTo`, `slaDeadline`, `resolution`, `createdAt`, `closedAt`.
2. **M2 :** remplacer le parcours email par un **parcours in-app** : le bouton « Signaler un litige » crée directement le document et ouvre une vue dédiée.
3. **M2 :** imposer une **échéance automatique** (5 jours ouvrés pour la première décision) avec alerte si dépassement.
4. **M3 :** publier les **statistiques de litiges** (nombre, taux de résolution amiable, délai moyen) — preuve de sérieux auprès des utilisateurs et des partenaires.
#### B.4 — Notations et réputation vérifiée

**Constat dans le code :**
- ✅ Un système d'avis existe : `reviews` est affiché dans le détail d'annonce (`src/App.js:3467-3471`), `src/components/PublicProfileModal.jsx` montre des notes, et `profile.reviews` / `profile.reviewsCount` sont présents dans les profils (`src/components/Phase144EthicalTransparency.test.js:22-24`).
- ✅ Un système de **badges de vérification** existe (`kycVerified`, badge « VÉRIFIÉ », `src/components/GlobalLiveChat.jsx:83`).
- ⚠️ **Mais la réputation n'est pas fiable** : `isKycVerified` vaut `true` par défaut, le badge « vérifié » peut s'afficher sans KYC, et les avis ne sont pas rattachés à une transaction conclue.
- ❌ **Aucun score de confiance composite** : la roadmap le prévoit explicitement (« P4-TS-04 — Pas de scoring de confiance → Score multi-facteurs (ancienneté, deals, KYC, avis, réactivité) », `🦄 TROCO — ROADMAP ULTIME.txt:263`).
- ❌ **Aucune notation à double aveugle** (les deux parties notent avant de voir la note de l'autre) — pourtant identifiée comme besoin métier dans `AMEILLIORATIONS STEP BY STEP.txt:38`.

**Écart par rapport au standard :** la confiance est le cœur de Troco (« Escrow visuel + Score de confiance portefeuille → la confiance devient ton moat défensif », `🦄 TROCO — ROADMAP ULTIME.txt:33`). Une réputation non vérifiée est un **faux indicateur de confiance**, plus dangereux que pas d'indicateur du tout.

**Recommandation opérationnelle :**
1. **M1 :** corriger l'affichage du badge KYC (ne jamais afficher « vérifié » sans preuve).
2. **M1-M2 :** **rattacher chaque avis à une transaction terminée** : un avis ne peut être déposé que par les deux parties d'un deal clos.
3. **M2 :** implémenter la **notation à double aveugle** (publication simultanée à J+14 ou dès que les deux ont noté).
4. **M2-M3 :** construire le **score de confiance composite** : ancienneté du compte, nombre de deals complétés, KYC, note moyenne pondérée, taux de réponse en chat, délai moyen de réponse, absence de litige. L'afficher publiquement sous forme de jauge.
5. **M3 :** pondérer les scores par le **volume** (un avis 5/5 d'un compte créé hier ne doit pas peser autant qu'un 4/5 issu de 100 deals).

#### B.5 — Support client multilingue

**Constat dans le code :**
- ✅ **7 langues déclarées** et fonctionnelles côté interface : FR, EN, ES, IT, DE, JA, ZH (`src/config/translations.js`, `PROJECT_CONTEXT.md:4`).
- ✅ Architecture i18n sérieuse : zéro texte en dur, traductions embarquées dans les annonces (`translations`), bouton « Voir l'original ».
- ❌ **Mais le support est mono-langue (français)** : aucune adresse de support par langue, aucune file de traitement multilingue, aucun agent non francophone.

**Écart par rapport au standard :** une plateforme disponible en 7 langues qui ne répond qu'en une seule langue crée une **rupture d'expérience** au moment le plus critique. Un utilisateur japonais qui écrit à `support@troco.fr` en japonais n'a aujourd'hui **aucune garantie** d'être compris.

**Recommandation opérationnelle :**
1. **M1-M2 :** rendre l'interface du support multilingue (réponses types en 7 langues).
2. **M2 :** **déduire la langue** de l'email entrant et router automatiquement vers la bonne file.
3. **M3-M6 :** pour les volumes de langues secondaires (ES, IT, DE, JA, ZH), envisager un **BPO multilingue** avec des scripts validés (voir Section 2.C).
4. **M9-M15 :** recruter des **agents bilingues** pour les deux marchés les plus actifs (probablement EN et ES).
5. **Toujours :** une **réponse automatique dans la langue détectée** avec accusé de réception et délai annoncé — gratuit en crédibilité.
#### B.6 — Accessibilité WCAG 2.2 AA

**Constat dans le code — ce qui existe déjà et qui est de bon niveau :**
- ✅ **Attributs ARIA nombreux** : `aria-label` sur les liens du footer (`Footer.jsx:261`, `LegalNotice.jsx:230`, etc.), `aria-hidden` sur les icônes décoratives, `aria-labelledby` sur les sections.
- ✅ **Focus visible** : classes `focus:ring-2 focus:ring-[#C67D5B] focus:outline-none` appliquées de façon systématique sur les éléments interactifs.
- ✅ **Tests d'accessibilité dédiés** : `src/components/Phase4LegalAndA11y.test.js` valide la présence des rôles (`textbox`, `combobox`, `button`), les libellés accessibles et l'annonce des confirmations via `role="status"`.
- ✅ **Améliorations récentes** : commits `a11y: expose toggle states to screen readers` et `a11y: announce notifications and toasts to screen readers`.
- ✅ **Navigation clavier** : le formulaire DSA de `LegalNotice.jsx` est décrit comme ayant une « navigation clavier stricte ».
- ⚠️ **Aucun audit d'accessibilité formel**, aucune mention de conformité WCAG dans le dépôt.
- ⚠️ **Points de vigilance connus** : `window.prompt` / `alert` / `window.confirm` (P1-BUG-12) ne sont **pas accessibles** correctement ; le `maximum-scale=1.0, user-scalable=no` dans `public/index.html:5` **empêche le zoom** — critère d'échec WCAG 2.2 (1.4.4 Resize Text) pénalisant les malvoyants.
- ❌ **Aucun audit de contraste**, alors que la palette sombre (`theme-color` `#1C1816`, textes `#D4C5B5`, `#9A8A7D`, `#B9A89B`) présente des contrastes potentiellement insuffisants.

**Écart par rapport au standard :** l'accessibilité n'est pas seulement éthique : en Europe, l'**European Accessibility Act** (applicable depuis juin 2025) rend l'accessibilité **obligatoire** pour de nombreux services numériques grand public. Une marketplace internationale est directement concernée.

**Recommandation opérationnelle :**
1. **M1 :** retirer `user-scalable=no` et `maximum-scale=1.0` de `public/index.html:5` (permet le zoom ; correction WCAG immédiate et gratuite).
2. **M1 :** remplacer les dialogues natifs `window.prompt` / `alert` / `confirm` par des modales accessibles (corrige simultanément P1-BUG-12 et un défaut d'accessibilité).
3. **M1-M2 :** réaliser un **audit de contraste** automatisé sur les deux thèmes (clair et sombre) et corriger les combinaisons sous le ratio 4,5:1.
4. **M2 :** intégrer **axe-core** dans les tests existants (`vitest` + `@testing-library/react`) pour bloquer toute régression d'accessibilité en CI.
5. **M3 :** réaliser un **audit WCAG 2.2 AA externe** avec tests d'utilisateurs en situation de handicap (lecteur d'écran réel, navigation clavier seule, zoom 200 %).
6. **M3 :** publier une **déclaration d'accessibilité** sur le site (obligation associée à l'EAA).
#### B.7 — PWA et application mobile native

**Constat dans le code — ce qui existe déjà et qui est solide :**
- ✅ **PWA complète et bien construite** : `public/manifest.json`, `public/service-worker.js`, `public/offline.html`, `src/components/common/PWAInstallBanner.jsx`, `src/components/OfflineScreen.jsx` (plein écran `100dvh`, z-index 99999, logo 3D interactif), `src/components/OfflineBanner.jsx`, `src/hooks/useNetworkStatus.js`.
- ✅ **Métadonnées mobiles complètes** (`public/index.html`) : `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`, `apple-mobile-web-app-title`, `theme-color`, icônes Apple Touch à 5 tailles, `viewport-fit=cover` + `interactive-widget=resizes-content` (gestion du clavier virtuel — détail avancé, rarement maîtrisé).
- ✅ **Résilience hors-ligne financière** : `src/services/outboxService.js` (pattern Outbox sur IndexedDB avec réconciliation idempotente et 10 tentatives) — **architecture de niveau fintech**, remarquable pour un projet solo.
- ✅ **Maintenance active** : commits récents `perf(geocoding): cache and rate-limit Nominatim searches`, `fix(wallet): persist balance through Firestore payment flow`, `feat(observability): add Firebase health check endpoint`.
- ❌ **Aucune application native** (App Store / Play Store). La roadmap en identifie le besoin (`5.4 — App Store / Play Store`, `🦄 TROCO — ROADMAP ULTIME.txt:252-253`) mais sans décision prise.
- ⚠️ **Mode offline partiel** : l'objectif affiché de « mode hors-ligne complet : PWA + IndexedDB + queue de sync » (`Audit TROCO DEEPSEEK.txt:226`) n'est atteint que pour les flux financiers, pas pour la consultation des messages, des annonces ou des documents collaboratifs.
- ⚠️ **Aucune notification push web** : le seul canal est in-app (`src/services/notificationService.js`).

**Écart par rapport au standard :** pour une marketplace mobile-first grand public, l'absence d'application native a trois conséquences : (1) pas de présence sur les stores (canal d'acquisition majeur), (2) pas de notifications push fiables sur iOS, (3) friction d'accès.

**Recommandation opérationnelle :**
1. **M0-M3 :** **ne pas développer d'application native** — la PWA est de qualité et suffit pour valider le product-market fit. Développer une app native maintenant serait une erreur d'allocation de ressources.
2. **M1 :** implémenter les **notifications push web** (Firebase Cloud Messaging est déjà dans l'écosystème) : nouveau message, offre reçue, deal accepté, paiement reçu, appel manqué.
3. **M1-M2 :** étendre le **mode offline** aux messages et aux annonces (lecture en cache, écriture en file d'attente) en réutilisant le pattern éprouvé d'`outboxService.js`.
4. **M3-M6 :** mesurer le **taux d'installation PWA** et l'engagement des utilisateurs installés vs navigateur.
5. **M6-M12 :** si et seulement si les données montrent que l'absence de store est un frein, envisager **une application native** — en privilégiant un wrapper (**Capacitor**) qui réutilise la base React existante plutôt qu'un développement natif *from scratch*.
6. **Condition préalable à tout store :** conformité App Store / Play Store (politique de paiement in-app, politique de confidentialité accessible depuis l'app, suppression de compte in-app — déjà implémentée côté web via `gdprService`).
#### B.8 — Tests E2E et monitoring

**Constat dans le code — ce qui existe déjà :**
- ✅ **Tests E2E Playwright** : `playwright.config.js`, `e2e/critical-path.spec.js` (parcours critiques), `tests/e2e/chat-send-receive.spec.js`, `tests/e2e/webrtc-call-ring.spec.js`.
- ✅ **Tests unitaires** : `vitest.config.mjs` et une quinzaine de fichiers `*.test.js` (`Phase109FinancialSyncAndAtomicTransfer`, `Phase128FinancialAtomicEngineAndCustomTip`, `Phase144EthicalTransparency`, `Phase4LegalAndA11y`, `ChatSectionAppCrash`, etc.).
- ✅ **Tests de règles Firestore** : `tests/rules/firestore.rules.test.js` avec `@firebase/rules-unit-testing` — **excellent**, la sécurité est testée.
- ✅ **Tests de Cloud Functions** : `functions/test/admin.test.ts`, `gdpr.test.ts`, `payments.test.ts`, `onUserWriteSyncPublic.test.ts`.
- ✅ **Intégration continue** : `.github/workflows/ci.yml`.
- ✅ **Monitoring applicatif** : Sentry (`@sentry/react`, filtres personnalisés), health check HTTP, `docs/MONITORING.md`.
- ⚠️ **Uptime non supervisé** : le health check **renvoie un statut** mais aucun uptime monitor externe ne semble configuré.
- ⚠️ **Couverture non mesurée** : aucune configuration de couverture de code dans `vitest.config.mjs` ni dans le CI.
- ❌ **Aucun test de charge** : la scalabilité n'a jamais été éprouvée.
- ❌ **Aucun test de régression visuelle**.

**Écart par rapport au standard :** le projet a **déjà** un socle de tests supérieur à la moyenne à ce stade — un atout à ne pas perdre. Mais sans **mesure de couverture** ni **test de charge**, on ne sait pas où sont les angles morts.

**Recommandation opérationnelle :**
1. **M1 :** activer la **couverture de code** dans `vitest` et la publier en CI ; viser en priorité **100 % sur `functions/src/payments/` et `functions/src/gdpr/`** (le code qui manipule l'argent et les données personnelles).
2. **M1 :** brancher un **uptime monitor externe** (UptimeRobot, Better Stack, ou Google Cloud Monitoring Uptime Check) sur l'endpoint `health`, avec alerte si le statut n'est pas `ok` pendant 2 minutes.
3. **M2 :** ajouter des tests E2E sur les parcours manquants : premier achat de jetons, ouverture d'un litige, suppression de compte, appel WebRTC à 3 participants, collaboration simultanée sur un document.
4. **M2 :** ajouter des **tests de non-régression sur les règles Firestore** à chaque modification (le fichier existe : il suffit d'ajouter des cas pour tout nouveau champ de sécurité).
5. **M3 :** réaliser un **test de charge** sur le feed, le chat et les transferts (objectif : 1 000 utilisateurs simultanés et 100 transferts/minute sans dégradation).
6. **M6 :** ajouter des **budgets de performance** (Web Vitals : LCP, INP, CLS) mesurés en CI et bloquants — `web-vitals` est **déjà** une dépendance du projet.
### Step C — BUSINESS & OPÉRATIONS

#### C.1 — Modèle économique précis (commissions, abonnements, boosts)

**Constat dans le code — ce qui existe :**
- ✅ **Trois leviers de monétisation sont définis** (`Description du projet.txt:38-40`) :
  - **Boosts** : options de visibilité pour propulser une annonce, annoncés à **1,99 €** ;
  - **Abonnement Troco+** : ~**4,99 €/mois** (jetons bonus mensuels, avantages exclusifs, zéro publicité) ;
  - **Micro-commission** : « pas de frais cachés, uniquement une micro-commission sur les échanges de grande valeur » (`AMEILLIORATIONS STEP BY STEP.txt:30`).
- ✅ **Trois montants sont codés** dans `src/App.js:2680-2686` : `profile.euroBalance < 2.99` (garde de solde), `amount: 2.99`, `label: 'Boost 7 jours — …'`.
- ✅ Une infrastructure de wallet et de transactions est opérationnelle (`transactions`, `euroBalance`, `trocoTokens`, `subscriptionPlan` — ce dernier étant un champ **protégé** dans les règles Firestore, donc prévu pour être écrit uniquement par le serveur).
- ⚠️ **Aucun module d'abonnement réel** : le champ `subscriptionPlan` existe mais **aucun code** ne le positionne, aucun webhook d'abonnement Stripe n'existe, aucune interface de gestion de souscription.

**Écart par rapport au standard — trois problèmes :**

1. **Incohérence de prix.** La documentation affiche **1,99 €** pour le boost ; le code prélève **2,99 €** (`src/App.js:2680`). Ce n'est pas un bug : c'est un **risque juridique** (pratique commerciale trompeuse si l'utilisateur voit 1,99 € et paie 2,99 €) et un risque de confiance.
2. **Aucun abonnement réel.** Troco+ est décrit comme un pilier du modèle économique mais **n'existe pas fonctionnellement**. La monétisation repose à 100 % sur un seul produit (le boost), dont le prix et le volume sont arbitraires.
3. **Aucune commission configurée.** La « micro-commission sur les échanges de grande valeur » n'existe **ni dans le code ni dans une grille documentée** : impossible à facturer, à afficher à l'utilisateur, à déclarer.

**Recommandation opérationnelle :**
1. **M1 :** **documenter la grille tarifaire** dans un fichier unique (ex. `docs/PRICING.md`) qui devient la **source unique de vérité** : prix des boosts, abonnement Troco+ (3 paliers recommandés : 4,99 € / 6,99 € / 9,99 € par mois), commission plateforme (recommandation : **5 % sur les transactions monétaires > 20 €**, 0 % sur les jetons et trocs directs, 0 % sur les échanges familiaux), et paliers de gratuité.
2. **M1 :** **harmoniser le prix du boost** (choisir 1,99 € OU 2,99 € et corriger l'autre — pas les deux).
3. **M2-M4 :** implémenter **Troco+ réellement** via Stripe Billing (webhook `invoice.paid` → Cloud Function qui écrit `subscriptionPlan`), avec 3 paliers et une période d'essai de 7 jours.
4. **M4-M6 :** implémenter la **commission de plateforme** dans `transferAtomically` (déduite du montant brut, répartie vendeur / plateforme / séquestre) et l'afficher **avant** validation du deal.
5. **M6+ :** déployer les leviers de la roadmap (`Troco Pass`, `Troco Business`, marketplace de templates) **uniquement après** avoir validé les deux leviers existants.
6. **Toujours :** afficher le **prix TTC et HT** (avec le taux de TVA applicable) et indiquer le traitement de TVA selon le régime de chaque utilisateur (B2C / B2B autoliquidé).

#### C.2 — Prévisions financières et unit economics

**Constat :** ❌ **Aucune projection financière n'existe** dans le dépôt. Aucun modèle d'unit economics, aucun calcul de CAC ou de LTV, aucune hypothèse de GMV, aucun budget d'infrastructure documenté. La roadmap mentionne l'enjeu (« P2-OBS-04 — Aucun tracking business → Analytics events (deal créé, deal complété, etc.) ») mais sans chiffrage.

**Écart par rapport au standard :** sans unit economics, Troco ne peut ni **piloter** (où va l'argent ?), ni **lever** (aucun investisseur ne finance sans modèle), ni **recruter** (aucun budget justifiable).

**Recommandation — construire le modèle en 3 couches :**

| Couche | Métrique | Formule | Objectif indicatif M12 |
|---|---|---|---|
| **Acquisition** | Utilisateurs inscrits (DAU, MAU) | — | 10 000 inscrits, 1 500 MAU |
| | Taux d'activation | MAU actifs / inscrits | ≥ 40 % |
| | CAC | Budget marketing / nouveaux clients payants | ≤ 12 € |
| **Monétisation** | GMV | Σ transactions monétaires | ≥ 100 000 € |
| | ARPU | Revenu plateforme / utilisateurs actifs payants | ≥ 3 €/mois |
| | Taux de conversion vers un plan payant | Abonnés Troco+ / MAU | ≥ 3 % |
| | Commission perçue | Σ (commission × GMV) | ≥ 5 000 € |
| **Économie** | LTV | ARPU × durée de vie moyenne (mois) | ≥ 36 € |
| | **LTV / CAC** | Ratio | **≥ 3** (seuil de viabilité SaaS) |
| | Marge brute | Revenu − coûts directs (PSP, hébergement, support) | ≥ 60 % |
| | Payback period | CAC / (ARPU × marge brute) | ≤ 6 mois |
| | Burn rate | Dépenses mensuelles nettes | Aligné sur la trajectoire de la Section 2.B.5 |

**Recommandation opérationnelle :**
1. **M1 :** **instrumenter les événements business** (via Firebase Analytics, déjà présent : `REACT_APP_FIREBASE_MEASUREMENT_ID`) — `deal_created`, `deal_accepted`, `deal_completed`, `payment_succeeded`, `subscription_started`, `boost_purchased`, `listing_published`, `dispute_opened`. C'est le prérequis à tout le reste : **sans événement, aucune mesure**.
2. **M1-M2 :** créer un **modèle financier simple** (Google Sheet ou Airtable) avec 3 scénarios (pessimiste / base / optimiste) sur 24 mois.
3. **M2 :** construire un **tableau de bord de gestion** alimenté par les événements : DAU, MAU, GMV, ARPU, CAC, LTV, taux de litiges.
4. **M3-M6 :** calculer le **coût d'infrastructure** réel par utilisateur (Firestore, Storage, Cloud Functions, Sentry) et intégrer ce coût à la marge brute.
5. **M6 :** établir les **cibles de Série A** : généralement 100 000 € de GMV, 10 000 utilisateurs actifs, LTV/CAC > 3, croissance MAU > 15 %/mois sur 6 mois.
#### C.3 — Processus de facturation et TVA

**Constat :** ❌ **Aucun module de facturation n'existe.** Les transactions sont enregistrées (`transactions/{txId}`) mais **aucune facture n'est émise** (pas de numérotation séquentielle, pas de PDF, pas de TVA calculée, pas de numéro fiscal collecté). La roadmap signale le besoin (« P0-PAY-05 — facturation » et « P4-REG-FR-01 — Factur-X / Chorus Pro »).

**Écart par rapport au standard :** dès qu'une plateforme perçoit une rémunération, elle doit émettre des documents comptables **conformes** et **déclarer sa TVA** selon son régime. Pour un modèle marketplace, le traitement de TVA est un enjeu majeur.

**Recommandation opérationnelle :**
1. **M1 :** déterminer le **statut juridique et le régime de TVA** (voir C.4 et Section 4) : micro-entreprise / entreprise individuelle (franchise de TVA sous un seuil), ou SASU / SAS (assujettissement dès le premier euro, avec possibilité de régime simplifié).
2. **M1-M2 :** générer **automatiquement une facture** pour toute opération de type achat (boost, jetons, abonnement) : numéro séquentiel, date, identité de Troco, identité du client, désignation, montant HT, taux de TVA, montant TTC, moyen de paiement, référence de transaction.
3. **M2 :** gérer les **cas de TVA marketplace** : pour les transactions entre particuliers, **Troco n'est pas redevable de TVA sur la transaction elle-même**, mais l'est sur **sa propre commission**. Pour les ventes entre professionnels (autoliquidation art. 283-2 CGI), le traitement diffère. **Faire valider la grille par l'expert-comptable.**
4. **M2-M3 :** support des **mentions obligatoires** : mention « TVA non applicable, art. 293 B du CGI » pour les micro-entreprises, identification du vendeur et de l'acheteur, numéro d'identification fiscale.
5. **M3-M6 :** préparer la **facturation électronique obligatoire** (facture électronique entre professionnels en France — format Factur-X, e-reporting).
6. **M6 :** mettre en place une **conciliation automatique** : chaque transaction Stripe doit correspondre à une entrée comptable, et chaque facture à une transaction. La collection `transactions/{txId}` est **déjà** structurée pour cela.

#### C.4 — Politique de remboursement et CGV/CGU solides

**Constat dans le code — ce qui existe et qui est bien fait :**
- ✅ **Politique de remboursement complète** (`src/components/RefundPolicy.jsx`) : droit de rétractation de **14 jours** pour les jetons non consommés, remboursement sous 14 jours par le même moyen de paiement, processus de litige en 3 temps, mention de Stripe.
- ✅ **CGU détaillées** (`src/components/CguModal.jsx`) : article 1 (objet et définitions, jeton Troco comme « unité de compte temporelle »), article 2 (compte et exactitude des informations), article 4 (cautions et responsabilités des prêts).
- ✅ **Mentions légales conformes LCEN et DSA** (`src/components/LegalNotice.jsx`) : éditeur, hébergeurs, notification de contenus illicites, propriété intellectuelle, point de contact DSA, formulaire de signalement accessible.
- ⚠️ **Points de fragilité identifiés :**
  - **Aucun numéro SIREN/SIRET ni adresse postale** dans les mentions légales (obligatoire).
  - **Aucun médiateur de la consommation désigné** : la directive 2013/11/UE (transposée en France) impose d'informer l'utilisateur de **l'existence d'un médiateur** et de **sa coordination** (site du médiateur, plateforme UE de règlement en ligne des litiges). Aucune mention n'existe dans `RefundPolicy.jsx` ni dans `CguModal.jsx`.
  - **Clause de médiation absente** : sans désignation formelle de médiateur, un utilisateur ne peut **pas** saisir un médiateur en cas d'échec de sa réclamation — il passe directement en contentieux.
  - Les **CGU n'encadrent pas explicitement le hors plateforme** : aucune règle ne dit que le paiement hors de la plateforme fait **perdre toute protection** (ni remboursement, ni médiation, ni recours).
  - **Absence de clause de disponibilité du service** (SLA) et de **limitation de responsabilité** claire.
  - Les CGU ne traitent pas les **cautions** en profondeur (pré-autorisation, déblocage, litige) et **la question des biens appartenant à un tiers** (vol, contrefaçon, prêt d'un bien non possédé).

**Écart par rapport au standard :** une marketplace P2P avec séquestre engage **la responsabilité de l'éditeur** bien plus directement qu'une simple vitrine. Les CGU doivent **encadrer tous les flux financiers**, définir les recours et **limiter la responsabilité de Troco**.

**Recommandation opérationnelle :**
1. **M0-M1 (obligatoire avant tout paiement réel) :** faire **valider l'ensemble des documents juridiques par un avocat** (forfait 3 000 à 6 000 €) : CGU, CGV, politique de confidentialité, politique de remboursement, mentions légales.
2. **M1 :** ajouter une **clause de hors plateforme** explicite : « Tout paiement effectué en dehors de Troco est réalisé aux risques et périls des parties. Aucune protection, aucun remboursement, aucune médiation n'est assurée par Troco. »
3. **M1 :** désigner et publier un **médiateur de la consommation** (CMAP, CM2C, AFNOR Médiation — tarif annuel généralement 1 000 à 3 000 €) avec les mentions obligatoires.
4. **M1 :** ajouter une **clause de disponibilité** (engagement de meilleur effort, ex. 99 % de disponibilité, avec notification en cas de maintenance) et une **clause de limitation de responsabilité** conforme au droit français.
5. **M2 :** **versionner les CGU** (numéro de version, date de mise à jour, historique) et **horodater l'acceptation** de chaque version par chaque utilisateur (`cguAcceptedAt` est déjà un champ protégé côté Firestore — il faut désormais stocker aussi la **version** acceptée).
6. **M2 :** traduire les documents juridiques en **7 langues** avec un **juriste-linguiste** (jamais une traduction automatique).
7. **M3 :** re-rédiger les CGU **après l'intégration du PSP réel** (Stripe Connect, Mangopay) pour encadrer les flux réels (séquestre, retrait, chargeback).
#### C.5 — Assurance responsabilité professionnelle

**Constat :** ❌ **Aucune assurance n'est mentionnée** dans le dépôt (ni contractuelle, ni dans les documents). Aucune couverture RC professionnelle, aucune assurance cyber.

**Écart par rapport au standard :** une plateforme P2P qui gère des biens physiques (prêt de matériel, échanges de logements), des échanges de services, de l'argent et des données personnelles cumule les risques. En cas d'incident (bien prêté endommagé, service mal exécuté, litige de logement), un utilisateur peut se tourner contre la plateforme.

**Recommandation opérationnelle — trois polices à souscrire :**

| Assurance | Ce qu'elle couvre | Tarif indicatif annuel | Priorité |
|---|---|---|---|
| **RC Pro (Responsabilité Civile Professionnelle)** | Dommages causés à des tiers dans l'exercice de l'activité (défaillance du service, erreurs, omissions) | 500 à 2 500 € | **P0 — dès l'immatriculation** |
| **Assurance cyber** (RC cyber + réponse à incident) | Violation de données, rançongiciel, interruption de service, notification CNIL, communication de crise, frais juridiques | 1 500 à 6 000 € | **P1 — dès que le wallet réel est actif** |
| **Assurance des échanges P2P** (optionnelle, facturée à l'utilisateur) | Bien endommagé ou non restitué lors d'un prêt, accident pendant un échange de services | Facturée par transaction (0,5 à 2 €) via un partenaire | **P2 — M12+** (levier de réassurance utilisateur et de différenciation) |

**Recommandation opérationnelle :**
1. **M1 :** souscrire une **RC Pro** dès l'immatriculation (mutuelles d'assureurs, Hiscox, Generali, Macif). Choisir une police couvrant **l'activité de marketplace** et **les transactions monétaires**.
2. **M2-M3 :** souscrire une **assurance cyber** dès que le PSP réel est activé.
3. **M6+ :** évaluer une **assurance P2P** avec un partenaire spécialisé — un vrai différenciateur.
4. **Toujours :** documenter **qui est assuré et pour quoi** dans la politique de remboursement (`RefundPolicy.jsx`) et dans les CGU, pour que l'utilisateur comprenne **ce qui est couvert et ce qui ne l'est pas**.

#### C.6 — Stratégie d'acquisition (SEO, SEA, réseaux, partenariats)

**Constat :** ❌ **Aucune stratégie d'acquisition n'existe.** Aucun plan de référencement, aucune page SEO, aucune campagne, aucun plan de partenariat documenté. Le produit est riche, et le trafic est **le seul levier non encore structuré**.

**Écart par rapport au standard :** Troco a déjà une **base de mots-clés riche** (troc de services, prêt de matériel, échange de compétences, marketplace de logements, coaching à distance). Cet actif est **non exploité** : le site est une SPA React, donc **peu indexable** sans un travail de référencement technique dédié.

**Recommandation opérationnelle :**
1. **M1 :** **corriger le référencement technique** — le site est rendu côté client uniquement, ce qui pénalise fortement l'indexation. Mettre en place un **rendu serveur (SSR) ou pré-rendu** (Prerender.io, ou migration vers Next.js à moyen terme) pour les **pages publiques** (annonces, profils vérifiés, catégories).
2. **M1 :** rédiger des **pages SEO pilier** : 5 à 10 pages optimisées sur les intentions de recherche principales (« prêter du matériel à un voisin », « troc de services », « échanger des compétences », « coaching gratuit en ligne », « marketplace de troc France »).
3. **M2 :** mettre en place une **prescription** (parrainage) : jetons offerts au parrain et au filleul — boucle virale naturelle pour un produit P2P.
4. **M2-M3 :** activer un **canal communautaire** (Discord / Telegram / Reddit) — le canal le plus rentable pour des produits P2P.
5. **M3-M6 :** **partenariats structurés** : associations locales, ambassadeurs, influenceurs de la consommation collaborative.
6. **M6+ :** tester un **budget SEA contrôlé** (Google Ads sur les mots-clés transactionnels, Meta sur les audiences personnalisées) **uniquement après** avoir mesuré le coût d'acquisition organique.
7. **Toujours :** mesurer le **CAC par canal** et la **LTV par source** — seule façon de savoir où investir.
#### C.7 — KPIs et tableaux de bord

**Constat :** ⚠️ **Les KPIs ne sont pas instrumentés.** Le code contient des métriques de performance et de santé, mais **aucune métrique business** (DAU, MAU, GMV, CAC, LTV, taux de rétention). Aucun tableau de bord de gestion. La roadmap l'identifie explicitement : « P2-OBS-04 — Aucun tracking business → Analytics events (deal créé, deal complété, etc.) ».

**Écart par rapport au standard :** sans tableau de bord, le fondateur pilote **à l'aveugle** : impossible de savoir si un chantier produit un effet, impossible de démontrer l'impact d'une initiative, impossible d'argumenter une levée.

**Recommandation opérationnelle — les 10 KPIs vitaux :**

| # | KPI | Définition | Cible M12 |
|---|---|---|---|
| 1 | **DAU** | Utilisateurs actifs uniques par jour | 300 |
| 2 | **MAU** | Utilisateurs actifs uniques par mois | 1 500 |
| 3 | **DAU/MAU (Stickiness)** | Engagement quotidien | ≥ 20 % |
| 4 | **GMV** | Volume brut de transactions monétaires | ≥ 100 000 € |
| 5 | **Revenu plateforme** | Commissions + boosts + abonnements | ≥ 8 000 €/mois |
| 6 | **ARPU** | Revenu moyen par utilisateur actif | ≥ 3 €/mois |
| 7 | **CAC** | Coût d'acquisition par utilisateur payant | ≤ 12 € |
| 8 | **LTV** | Valeur vie client | ≥ 36 € |
| 9 | **Taux de litiges** | Litiges ouverts / transactions conclues | ≤ 2 % |
| 10 | **Temps de première réponse support** | Première réponse / ticket | ≤ 24 h |

**Recommandation opérationnelle :**
1. **M1 :** instrumenter les **8 événements** métier (voir C.2) et créer un **tableau de bord Google Analytics 4 / Firebase** avec les dimensions produit, catégorie, langue, canal d'acquisition.
2. **M1-M2 :** créer un **tableau de bord de gestion** hebdomadaire (Looker Studio ou Google Sheets) alimenté automatiquement — l'objectif n'est pas de faire du BI, mais **de savoir chaque lundi matin où en est le business**.
3. **M2 :** mettre en place un **rapport hebdomadaire** automatique (email à `ceo@troco.fr`) : KPIs de la semaine, KPIs sur 30 jours, objectifs atteints.
4. **M3 :** ajouter des **alertes de seuil** (ex. si le taux de litiges dépasse 5 %, si le temps de première réponse dépasse 48 h, si le coût GCP dépasse 400 €/mois) pour transformer le tableau de bord en **dispositif d'alerte**.

#### C.8 — Stratégie de levée de fonds

**Constat :** ⚠️ **Aucun dossier de levée n'existe.** Le projet mentionne explicitement l'ambition (« licorne », « Série A », score cible 9,5/10 pour une Série A dans `🦄 TROCO — ROADMAP ULTIME.txt`), mais **aucun pitch, aucun deck, aucun modèle financier, aucun cap table n'est présent**.

**Écart par rapport au standard :** une levée en Série A (ou même en amorçage) exige un dossier **cohérent et pré-narré** : traction démontrée, unit economics connus, équipe construite, conformité réglée, marché cible chiffré.

**Recommandation opérationnelle — 3 étapes :**

| Étape | Contenu | Prérequis | Échéance |
|---|---|---|---|
| **1. Amorçage (love money / BPI / friends & family)** | 20 000 à 150 000 € pour financer la Vague 1 et la Vague 2 (conformité, premier recrutement, infrastructure email et KYC). Statut possible : **BPI France** (subvention ou prêt d'honneur), **Fonds français de la consommation collaborative**, ou investisseurs privés à titre personnel. | Statut juridique, comptabilité, RC Pro, premiers revenus | **M3-M6** |
| **2. Pre-seed / Seed** | 200 000 à 800 000 € pour financer la Vague 3 (CFO, Compliance Officer, support multilingue, KYC, premier pentest, app native). Lever auprès de fonds spécialisés marketplace ou fintech. | Traction démontrée (10 000 MAU, GMV ≥ 50 000 €), CTO recruté, conformité déployée, deck et modèle financier | **M12-M18** |
| **3. Série A** | 2 à 6 M€ pour l'international (multi-pays, B2B, app native, escrow, KYC avancé). | Cible de Série A de la section C.2 : 100 000 € de GMV, 10 000 MAU, LTV/CAC > 3, croissance MAU > 15 %/mois sur 6 mois | **M24+** |

**Recommandation opérationnelle :**
1. **M1-M3 :** commencer par l'**amorçage non dilutif** (BPI, subvention, love money) — Troco n'a pas besoin de dilution pour financer la conformité.
2. **M3-M6 :** produire le **deck** (10 à 15 slides) et le **modèle financier** — la Section 3.C.2 fournit le squelette des métriques à présenter.
3. **M6-M12 :** construire le **cap table** et préparer la **due diligence** : le dossier de conformité (RGPD, DSA, AML) devient un **argument de levée**, pas un coût.
4. **M12-M18 :** identifier les **fonds spécialisés** (marketplace, fintech, consommation collaborative) et préparer le **roadshow**.
5. **Toujours :** ne pas lever avant d'avoir validé **le modèle unitaire** : un investisseur finance une machine, pas une idée.

---
### Step D — TOP 10 ACTIONS PRIORITAIRES (3 prochains mois)

> Ces 10 actions sont classées par priorité. Chacune est indépendante, chiffrée, et peut être démarrée dès la semaine 1. Ensemble, elles font passer Troco de « démo technique impressionnante » à « plateforme opérée professionnellement ».

| # | Action | Impact attendu | Effort | Coût | Échéance |
|---|---|---|---|---|---|
| **1** | **Créer l'infrastructure email P0** (`support@`, `privacy@`, `dpo@`, `abuse@`, `litiges@`, `security@`, `admin@`, `no-reply@`) sur Google Workspace, avec SPF, DKIM, DMARC en `p=none` puis `p=reject`, et un ticketing | 🔴 **Critique** : les 6 adresses déjà publiées deviennent réellement opérées — ferme le trou DSA et RGPD (art. 11, 12, 16) | 2-3 jours | 27 à 72 €/mois | **Semaine 1** |
| **2** | **Supprimer les 8 occurrences de `mateopolo91@gmail.com`** au profit exclusif des Custom Claims, corriger le PIN en dur `2609` (`AdminPanel.jsx:46`) et restreindre le `cors: true` des 17 Cloud Functions | 🔴 **Critique** : élimine le vecteur n°1 d'élévation de privilèges et le bus factor total sur l'administration | 3-5 jours | 0 € | **Semaines 1-2** |
| **3** | **Désigner un DPO externalisé et rédiger le registre des traitements RGPD** ; corriger la mention trompeuse `privacy@troco.fr` = DPO tant que personne n'est désigné | 🔴 **Critique** : lève la fausse déclaration réglementaire ; le registre est le premier document exigé par la CNIL | 5 jours | 500 à 2 000 €/mois | **Semaines 1-4** |
| **4** | **Immatriculer la société** (SASU ou SAS) avec un expert-comptable, compléter les mentions légales (SIREN, siège, TVA) et souscrire une **RC Pro** | 🔴 **Critique** : condition à tout compte bancaire pro, à tout partenariat PSP, et à toute levée | 10 jours (démarches) | 300 à 3 000 €/mois (comptable) + 500 à 2 500 €/an (RC Pro) | **Semaines 2-6** |
| **5** | **Recruter le premier freelance support/modération** (10-15 h/sem.) et tenir les SLA publiés (`support@` 48 h, `abuse@` 24 h/72 h) | 🔴 **Élevé** : transforme les promesses légales en engagements réellement tenus ; réduit immédiatement la charge du fondateur | 7-10 jours (sourcing) | 600 à 1 900 €/mois | **Semaines 3-8** |
| **6** | **Activer Stripe Connect en production** (paiement réel) et retirer toute UI de paiement fictive (Apple Pay/Visa simulés) | 🔴 **Critique** : sans paiement réel, aucun revenu, aucun KYC, aucune croissance possible — et l'UI fictive est une pratique commerciale trompeuse | 10-15 jours | 0 € (commission Stripe uniquement) | **Semaines 3-8** |
| **7** | **Brancher le KYC réel** (Stripe Identity, `P0-KYC-01/02`), corriger le badge KYC par défaut (`PublicProfileModal.jsx:39`), faire positionner `kycVerified` par une Cloud Function | 🔴 **Critique** : prérequis à tout retrait IBAN et à tout partenariat EMI ; supprime l'affichage trompeur de « vérifié » sans vérification | 5-10 jours | ~0,50 à 2 € / vérification | **Semaines 4-10** |
| **8** | **Recruter un CTO/Lead Developer freelance senior** (3 j/sem.) pour piloter les chantiers techniques et sécuriser le savoir-faire | 🟠 **Élevé** : réduit la dépendance à une seule personne, accélère la conformité technique et prépare la conversion en CDI | 14-21 jours (sourcing) | 3 500 à 6 000 €/mois (temps partiel) | **Semaines 4-12** |
| **9** | **Instrumenter les événements business** (`deal_created`, `deal_completed`, `payment_succeeded`, `subscription_started`, `boost_purchased`, `dispute_opened`) et publier le premier tableau de bord | 🟠 **Élevé** : sans métrique, aucune décision n'est justifiable et aucune levée n'est possible | 3-5 jours | 0 € | **Semaines 4-8** |
| **10** | **Publier le plan de réponse aux incidents** (matrice de gravité, 6 phases, notification CNIL < 72 h, registre des violations) et brancher l'alerting (uptime + Sentry → `devops@`) | 🟠 **Élevé** : transforme une violation de données en incident maîtrisé au lieu d'une catastrophe sans réponse | 3-4 jours | 0 à 50 €/mois (monitoring) | **Semaines 6-12** |

**Synthèse budgétaire des 10 actions sur 3 mois :**

| Poste | Coût total sur 3 mois |
|---|---|
| Google Workspace + ticketing + monitoring | ~150 à 250 € |
| DPO externalisé | ~1 500 à 6 000 € |
| Expert-comptable | ~900 à 9 000 € |
| RC Pro | ~125 à 625 € |
| Freelance support/modération | ~1 800 à 5 700 € |
| CTO freelance | ~10 500 à 18 000 € |
| Stripe (commission uniquement, pas de coût fixe) | Variable sur revenus |
| KYC (Stripe Identity) | Variable sur vérifications |
| **TOTAL estimé sur 3 mois** | **~15 000 à 40 000 €** |

*Ce budget est cohérent avec la trajectoire de la Section 2.B.5 (phase M0-M3 : 2 000 à 4 000 €/mois).*

---

## SECTION 4 — CHECKLIST OPÉRATIONNELLE POUR LE FONDATEUR

> **Mode d'emploi :** cette checklist suit l'ordre chronologique d'exécution recommandé (J+0 → M+3). Chaque case correspond à une action concrète, datée et délégeable. Les cases **P0** sont bloquantes : ne rien faire d'autre tant qu'elles ne sont pas cochées.

### Emails : créer et configurer les adresses P0 en premier

- [ ] **P0** Acheter/vérifier la propriété de `troco.fr` et `troco.app` chez un registrar unique (OVH, Gandi, Cloudflare)
- [ ] **P0** Créer un compte **Google Workspace** (forfait Business Starter) et vérifier le domaine par enregistrement TXT
- [ ] **P0** Créer les 4 comptes réels : `mateo@troco.fr`, `admin@troco.fr`, `support@troco.fr`, `devops@troco.fr`
- [ ] **P0** Créer les adresses de rôle P0 en **alias ou groupes** : `privacy@`, `dpo@`, `abuse@`, `litiges@`, `security@`, `no-reply@`
- [ ] **P0** Configurer un **catch-all** `*@troco.fr` → `admin@` pour ne perdre aucun email
- [ ] **P0** Créer `postmaster@troco.fr` (obligation RFC 5321) et `webmaster@` / `hostmaster@` en alias vers `devops@`
- [ ] **P1** Créer les adresses P1 : `contact@`, `legal@`, `compliance@`, `payments@`, `billing@`, `kyc@`, `fraud@`, `press@`, `partners@`, `careers@`, `ceo@`, `devops@` (groupe)
- [ ] **P2** Créer les adresses P2 en alias : `help@` (→ `support@`), `feedback@`, `moderators@`, `trust@`, `cto@` (après recrutement)
- [ ] **P0** Configurer le **routage des réponses** de `no-reply@troco.fr` vers `support@troco.fr`
- [ ] **P1** Remplacer les 3 occurrences de `troco.app` dans le code de production (`useWebRTC.js:1079`, `AuthScreen.jsx:871`, `README-DEMO.md`) et mettre en place une redirection 301
- [ ] **P2** Retirer la valeur factice `compte@troco.fr` de `TransactionsHistoryModal.jsx:223`
- [ ] **P0** Créer un **outil de ticketing** (Freshdesk, Crisp, Help Scout) et router les 8 adresses P0 vers des files dédiées
- [ ] **P0** Écrire et publier les **réponses types** pour les 10 questions les plus fréquentes
- [ ] **P1** Établir et publier le **SLA** sur une page publique (48 h support, 24 h abuse, 72 h RGPD)

### Infrastructure : SPF, DKIM, DMARC, Google Workspace

- [ ] **P0** Publier l'enregistrement **SPF** sur `troco.fr` (`v=spf1 include:_spf.google.com ~all`)
- [ ] **P0** Générer et publier la clé **DKIM** (fournie par Google Workspace)
- [ ] **P0** Publier **DMARC en `p=none`** avec rapports (`rua=mailto:dmarc-reports@troco.fr`)
- [ ] **P0** Créer la boîte `dmarc-reports@troco.fr` et activer un service d'analyse des rapports DMARC
- [ ] **P1** Publier SPF/DKIM/DMARC **séparés** sur `mail.troco.fr` (sous-domaine d'envoi transactionnel)
- [ ] **P1** Passer DMARC en `p=quarantine; pct=25` après 3 semaines d'observation
- [ ] **P1** Passer DMARC en **`p=reject; pct=100`** (état cible)
- [ ] **P1** Personnaliser les **templates Firebase Auth** (vérification d'email, réinitialisation de mot de passe) en FR + EN depuis `no-reply@mail.troco.fr`
- [ ] **P1** Brancher l'extension Firebase **Trigger Email** et un fournisseur transactionnel (Resend, SendGrid, Postmark) pour activer `sendDeletionEmail`
- [ ] **P1** Activer la **MFA obligatoire** sur tout le domaine Google Workspace et une **clé de sécurité matérielle** pour le fondateur
- [ ] **P1** Configurer les **signatures email** centralisées (nom, fonction, Troco, adresse, SIREN)
- [ ] **P2** Ajouter **BIMI** (logo de marque dans la boîte de réception) — nécessite un certificat VMC
- [ ] **P1** Publier **`public/.well-known/security.txt`** (RFC 9116) avec `Contact: mailto:security@troco.fr`

---

### Conformité : DPO, registre RGPD, mentions légales, CGU

- [ ] **P0** Désigner un **DPO** (externalisé mutualisé recommandé) et publier son contact nominatif
- [ ] **P0** **Corriger la mention trompeuse** de `LegalNotice.jsx:456` tant qu'aucun DPO n'est désigné
- [ ] **P0** Rédiger le **registre des traitements** (modèle CNIL) : tous les traitements (profils, annonces, messages, wallet, KYC, géolocalisation, modération, analytics)
- [ ] **P0** Compléter les **mentions légales** : SIREN/SIRET, adresse du siège, numéro de TVA, hébergeur, directeur de la publication
- [ ] **P0** Faire **valider les CGU/CGV par un avocat** (forfait 3 000 à 6 000 €)
- [ ] **P1** Ajouter la **clause hors plateforme** aux CGU (aucune protection en cas de paiement extérieur à Troco)
- [ ] **P1** Désigner un **médiateur de la consommation** et publier ses coordonnées (obligation directive 2013/11/UE)
- [ ] **P1** Lancer l'**AIPD** (analyse d'impact) sur les traitements à risque : géolocalisation, wallet, KYC, modération
- [ ] **P1** Horodater les **consentements côté serveur** (collection `consents` : uid, type, version de politique, date, IP tronquée)
- [ ] **P1** Implémenter l'**export de portabilité** (art. 20) en self-service depuis le Centre de Confidentialité
- [ ] **P1** Documenter la **liste des sous-traitants** (Firebase, Sentry, Nominatim, PSP, KYC, ticketing) et signer les **DPA**
- [ ] **P1** Versionner les **CGU** (numéro de version, historique) et stocker la **version acceptée** par chaque utilisateur
- [ ] **P1** Déployer le module **DAC7** : collecte du NIF, de la date de naissance et de l'adresse des vendeurs
- [ ] **P1** Traduire les documents juridiques en 7 langues avec un **juriste-linguiste**
- [ ] **P2** Publier une **déclaration d'accessibilité** (European Accessibility Act)

### Sécurité : 2FA partout, gestionnaire de mots de passe, backups

- [ ] **P0** Activer la **2FA sur tous les comptes** (Google Workspace, GitHub, Firebase, Stripe, registrar, Sentry)
- [ ] **P0** Installer un **gestionnaire de mots de passe** (1Password, Bitwarden) et un **coffre-fort partagé** pour les secrets d'équipe
- [ ] **P0** Supprimer les **8 occurrences de `mateopolo91@gmail.com`** dans le code client au profit des Custom Claims
- [ ] **P0** Corriger le **PIN en dur `2609`** dans `AdminPanel.jsx:46`
- [ ] **P0** Restreindre le **`cors: true`** des 17 Cloud Functions (`functions/src/index.ts`) aux origines légitimes
- [ ] **P0** Vérifier qu'**aucune clé de service** (`serviceAccountKey.json`, `STRIPE_SECRET_KEY`) n'est présente dans le dépôt ou le bundle
- [ ] **P1** Activer **Firebase App Check en mode enforcing** (Auth, Firestore, Functions)
- [ ] **P1** Activer les **Google Cloud Audit Logs** (Data Access) sur Firestore
- [ ] **P1** Mettre en place les **sauvegardes Firestore automatiques** (quotidiennes, rétention 30 jours minimum) et **tester la restauration** (« restore drill » mensuel)
- [ ] **P1** Ajouter un `logAdminAction` sur **toute consultation** de données personnelles par un admin
- [ ] **P1** Configurer les **alertes automatiques** (uptime monitor sur `health`, Sentry → `devops@`, budget GCP)
- [ ] **P1** Rédiger et publier le **plan de réponse aux incidents** (6 phases, notification CNIL < 72 h, registre des violations)
- [ ] **P1** Préparer les **3 modèles de communication de crise** (pré-validés par l'avocat)
- [ ] **P2** Réaliser le **premier pentest externe** (budget 8 000 à 25 000 €)
- [ ] **P2** Lancer un programme de **bug bounty** (YesWeHack, Hackenproof)

---

### Recrutement : premier freelance à embaucher (support / modération)

- [ ] **P0** Rédiger la **charte de modération** (catégories d'infractions, gravité, sanctions, recours) — prérequis à toute embauche
- [ ] **P0** Rédiger et publier les **offres** pour : freelance support FR (10-15 h/sem.), freelance modération (5-10 h/sem.)
- [ ] **P0** Sélectionner et onboarder le **premier freelance support** (formation aux outils, accès délégué à `support@`, 1 semaine de shadowing)
- [ ] **P1** Onboarder le **premier freelance modération** (formation DSA, accès restreint et traçable à `abuse@`)
- [ ] **P1** Lancer le **sourcing du CTO/Lead Developer freelance senior** (3 j/sem.) avec un brief d'architecture
- [ ] **P1** Mettre en place la **boîte `careers@troco.fr`** avec accusé de réception automatique et politique de conservation des CV (2 ans max)
- [ ] **P2** Rédiger les fiches de poste pour les rôles M6-M12 (Compliance, Head of CS, Head of Growth)

### Business : ouvrir compte bancaire pro, statut juridique, assurance

- [ ] **P0** Choisir le **statut juridique** (SASU ou SAS recommandé pour lever ensuite) avec un avocat ou l'expert-comptable
- [ ] **P0** **Immatriculer la société** (SIREN, SIRET, code APE) et récupérer le KBIS
- [ ] **P0** Ouvrir un **compte bancaire professionnel** (Qonto, Shine, ou banque traditionnelle)
- [ ] **P0** Créer le **compte Stripe** au nom de la société et activer les payouts
- [ ] **P0** Souscrire une **RC Pro** couvrant l'activité de marketplace et les transactions monétaires
- [ ] **P1** Déterminer le **régime de TVA** avec l'expert-comptable
- [ ] **P1** Activer **Stripe Connect** en mode production (comptes connectés)
- [ ] **P1** Souscrire une **assurance cyber** dès l'activation du wallet réel
- [ ] **P2** Évaluer un partenariat **Mangopay / Lemonway** pour le séquestre réel
- [ ] **P2** Évaluer une **assurance P2P** intégrée (levier de différenciation)
