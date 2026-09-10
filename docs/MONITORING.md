# Guide de Monitoring & Diagnostic en Production [HOTFIX-03]

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

## 2. Analyse des Logs Cloud Functions

Le script automatisé `scripts/analyze-cloud-logs.sh` permet d'extraire rapidement les erreurs serveur des 2 dernières heures :
```bash
bash scripts/analyze-cloud-logs.sh
```

---

## 3. Alertes Recommandées sur Firebase Console & Sentry

| Alerte | Condition de déclenchement | Action Immédiate |
|---|---|---|
| **Firestore Permission Denied** | Requêtes rejetées sur `calls` ou `chats` | Vérifier `firestore.rules` et l'expiration du token Auth |
| **App Check Rejection Spike** | Rejet > 2% sur les callables | Vérifier les clés de debug sur localhost ou la validité reCAPTCHA v3 |
| **Duplicate Message Burst** | Déclenchements répétés du log `[MessageIdempotency]` | Signale un appareil mobile avec comportement tactile atypique |
| **WebRTC Failed Connection** | `call_canceled_before_delivery` > 20% | Inspecter les serveurs STUN/TURN ou les pare-feux réseau |
