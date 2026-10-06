# 🌍 Troco

**Le moteur de l'économie collaborative mondiale.**

Troco est une Progressive Web App (PWA) internationale de nouvelle génération dédiée à l'**économie collaborative**, au **troc de compétences** (*time-banking* & entraide de savoir-faire), aux **prêts de matériel géolocalisés**, aux **espaces de projets collaboratifs** et au **swap de logements**. Échangez tout, partout, selon vos propres règles.

---

## ✨ Fonctionnalités clés
- **Économie Hybride :** Négociez en Jetons Troco, en Euros fiduciaires, en Troc pur ou via des formules mixtes avec séquestre escrow.
- **Moteur i18n Universel :** Traduction dynamique intégrale (FR, EN, ES, IT, DE, JA, ZH) pour une expérience mondiale fluide et sans barrière linguistique.
- **Géoconfidentialité :** Algorithmes de floutage spatial GPS (~1 km) pour protéger la vie privée des membres tout en garantissant des interactions de quartier pertinentes.
- **Messagerie Instantanée Temps Réel :** Textes, documents de travail, notes vocales enregistrées sans limite de taille, pièces jointes.
- **Studio Visio WebRTC & Tableau Blanc :** Visioconférence P2P maillée, sous-titrage et traduction live, tableau blanc interactif collaboratif.
- **Troco Office Suite :** Suite bureautique intégrée (TrocoDocs, TrocoSheets, TrocoSlides, TrocoNotes).

---

## 🛠️ Stack Technique
- **Frontend Core :** React 19 (`react@19.2.8`), Concurrent Mode, Suspense.
- **Tooling & Build :** React Scripts 5 (`react-scripts@5.0.1`), Node.js.
- **State Management :** Stores découplés Zustand 5 (`zustand@5.0.15`).
- **Cartographie :** Leaflet (`leaflet@1.9.4`, `react-leaflet@5.0.0`) + Encodage spatial `ngeohash`.
- **Backend & Cloud :** Firebase SDK v12 (`firebase@12.17.1`), Cloud Firestore Zero-Trust, Cloud Storage, Cloud Functions.
- **P2P & Multimédia :** WebRTC API native, Web Audio API, Web Speech API.
- **Observabilité :** Sentry React 10 (`@sentry/react@10.74.0`) + Core Web Vitals.

---

## 🧑💻 Guide développeur

### 1. Prérequis
- **Node.js** : version 18+ ou 20+ LTS
- **npm** : version 9+ ou supérieure
- **Java JRE / JDK** : version 11+ (requis pour l'émulateur Firestore des tests de règles)
- **Firebase CLI** (optionnel pour les déploiements) : `npm install -g firebase-tools`

### 2. Installation
```bash
# Cloner le dépôt
git clone https://github.com/mateopolo/troco.git
cd troco

# Installer les dépendances
npm install
```

### 3. Lancement local
```bash
# Démarrer le serveur de développement React (http://localhost:3000)
npm start
```

### 4. Lancement des tests
Pour les détails complets de la suite de tests, consultez le [Guide des Tests (`docs/TESTING.md`)](docs/TESTING.md).
```bash
# Tests unitaires et d'intégration Jest
npm test

# Tests des règles de sécurité Firestore (Zero-Trust)
npm run test:rules

# Tests Cloud Functions (Admin SDK & logique serveur)
npm run test:functions

# Tests End-to-End Playwright
npm run test:e2e
```

### 5. Build de production
```bash
# Générer le bundle de production optimisé dans /build
npm run build
```

### 6. Déploiement Firebase
```bash
# Déploiement complet (Hosting, Firestore rules & indexes, Functions)
firebase deploy

# Déploiement ciblé des règles et index Firestore uniquement
firebase deploy --only firestore:rules,firestore:indexes
```

---

## 📚 Documentation de Référence

- **[MASTER_AUDIT.md](MASTER_AUDIT.md)** : **Tableau de bord unique et absolu du projet**, suivi d'avancement des 74 tâches, feuille de route licorne, statut de conformité et annexes de production.
- **[CONTEXT.md](CONTEXT.md)** : **Référentiel architectural et technique absolu** de Troco (Clean State v2.0, Design System, patterns UI/UX, règles IA impératives).
- **[docs/TESTING.md](docs/TESTING.md)** : Documentation et cartographie complète de l'environnement de test.