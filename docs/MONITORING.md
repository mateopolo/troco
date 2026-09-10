# Guide de Monitoring & Diagnostic en Production [HOTFIX-03 & VERIF-03]

## 1. Outils de Diagnostic Intégrés

### Scanner Console Navigateur
Pour inspecter l'état complet de l'application en cours d'exécution (mobile ou desktop) :
```javascript
// Exécuter dans la console développeur F12 :
import('/src/utils/diagnostics/fullRegressionScan.js').then(m => m.fullDiagnostic());
```
Ce script vérifie automatiquement :
1. Les doublons d'écouteurs Firestore (`window.__firestoreListeners`).
2. L'intégrité des messages chat et l'absence de doublons dans le stockage local.
3. L'état des connexions RTCPeerConnection et les autorisations micro/caméra.
4. L'état d'App Check et les éventuels rejets réseau.
5. Copie automatiquement le résultat JSON dans le presse-papiers pour analyse technique.

### Traçage des Événements WebRTC
Les 100 derniers événements de signalisation WebRTC sont conservés en mémoire vive :
```javascript
console.table(window.__webrtcTrace || []);
```

---

## 2. Détection Proactive Client via `useFirestoreHealth`

Le hook React `src/hooks/useFirestoreHealth.js` est monté au sommet de l'arbre (`App.js`) :
- **Interception globale :** Intercepte les erreurs réseau et Firestore (`permission-denied`, `failed-precondition`, `RESOURCE_EXHAUSTED`).
- **Fenêtre glissante (60 secondes) :** Comptabilise les erreurs identiques.
- **Seuil d'alerte :** Dès que 5 erreurs identiques se produisent en moins d'une minute, un rapport critique est instantanément transmis à Sentry (`captureFirestoreAlert`).
- **Filtres Sentry (`src/utils/sentryFilters.js`) :** Nettoie les tokens d'authentification et secrets des breadcrumbs tout en catégorisant automatiquement les incidents de règles de sécurité.

---

## 3. Analyse des Logs Cloud Functions

Le script automatisé `scripts/analyze-cloud-logs.sh` permet d'extraire rapidement les erreurs serveur des 2 dernières heures :
```bash
bash scripts/analyze-cloud-logs.sh
```

---

## 4. Alertes Recommandées sur Firebase Console & Sentry

| Alerte | Condition de déclenchement | Gravité | Action Immédiate |
|---|---|:---:|---|
| **Firestore Permission Denied** | Requêtes rejetées sur `calls` ou `chats` (`> 5 / min`) | 🚨 P0 | Vérifier `firestore.rules` et la conformité UIDs des participants |
| **Failed Precondition Indexing** | Manque d'index composite Firestore | ⚠️ P1 | Cliquer sur le lien de création d'index fourni dans le log Firebase |
| **App Check Rejection Spike** | Rejet > 2% sur les callables | ⚠️ P1 | Vérifier les clés de debug sur localhost ou la validité reCAPTCHA v3 |
| **Duplicate Message Burst** | Déclenchements répétés du log `[MessageIdempotency]` | ℹ️ P2 | Analyse du composant tactile mobile (détection multi-tap) |
| **WebRTC Failed Connection** | `call_canceled_before_delivery` > 20% | ⚠️ P1 | Inspecter les serveurs STUN/TURN ou les pare-feux réseau |

---

## 5. Tableau de Bord Recommandé Sentry & Cloud Monitoring

### Métriques Clés :
1. **Taux d'erreurs Firestore Rules :**
   ```sql
   resource.type="cloud_function" OR jsonPayload.category="firestore-health"
   severity>=ERROR
   ```
2. **Latence de livraison des messages :**
   Mesure du delta entre `createdAt` (client émetteur) et `onSnapshot` (client récepteur) : cible `< 1000ms`.
3. **Distribution des statuts d'appels WebRTC :**
   Ratio `ended` vs `missed` vs `rejected`. Un pic de `missed` sans `deliveredAt` indique un problème de notification push.
