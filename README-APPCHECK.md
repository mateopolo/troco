# 🛡️ Firebase App Check & Rate Limiting — Troco

Ce document décrit l'architecture de protection contre les abus, les bots et l'épuisement de quotas sur Firestore et Cloud Functions.

---

## 1. Architecture Firebase App Check

App Check atteste que les requêtes proviennent exclusivement de l'application cliente officielle Troco et bloque le trafic automatisé ou non authentifié.

### Fournisseurs d'Attestation
- **Production (Web)** : `ReCaptchaV3Provider` configuré avec la clé de site reCAPTCHA v3.
- **Environnements Locaux & Tests (`localhost`, `127.0.0.1`)** : Jeton de débogage (`FIREBASE_APPCHECK_DEBUG_TOKEN`) afin de ne pas bloquer les développeurs.

### Variables d'Environnement
```env
# Clé publique reCAPTCHA v3 pour App Check Web
REACT_APP_RECAPTCHA_SITE_KEY=6Le...

# Jeton de débogage (optionnel en local)
REACT_APP_APPCHECK_DEBUG_TOKEN=votre-token-debug-firebase
```

Initialisation sécurisée dans [`src/firebase.js`](src/firebase.js) :
```javascript
if (recaptchaSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}
```

---

## 2. Rate Limiting Backend (Cloud Functions)

Afin de prévenir les spams d'écritures (coûts Firestore, saturation des discussions, attaques de déni de service), la fonction `checkRateLimit` supervise les quotas par utilisateur et par action.

### Quotas Définis (`rateLimitHelper.ts`)
| Action | Quota Max | Fenêtre | Description |
| :--- | :--- | :--- | :--- |
| `send_message` | 30 req | 1 minute | Envoi de messages en messagerie |
| `create_listing` | 5 req | 1 heure | Création de nouvelles annonces |
| `initiate_payment` | 10 req | 15 minutes | Démarrage de sessions de paiement |
| `api_call` | 60 req | 1 minute | Appels API génériques |

### Nettoyage Automatisé
La tâche planifiée `cleanupRateLimits` s'exécute toutes les heures et purge les compteurs expirés.

---

## 3. Intégration Frontend (`useRateLimit` + `RateLimitToast`)

- Le hook `useRateLimit()` conserve un cache mémoire local pour éviter d'invoquer la Cloud Function à chaque frappe.
- En cas de dépassement, le composant `<RateLimitToast />` affiche une notification élégante non bloquante :
  > *"Tu vas trop vite, réessaie dans Xs."*
