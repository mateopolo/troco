# 🎭 Mode Démonstration — Troco

Ce document détaille le fonctionnement, l'isolation et la gouvernance des données de démonstration au sein de la plateforme Troco.

---

## 1. Contexte & Enjeu Réglementaire

Conformément aux exigences légales et comptables (art. L. 123-12 du Code de commerce et directives de protection des consommateurs) :
- **Les enregistrements financiers fictifs ou "seeds" ne doivent jamais être présentés à un utilisateur en production comme des transactions réelles.**
- Les annonces de démonstration et profils simulés (ex. Sofia M., Marc L.) doivent être hermétiquement cloisonnés et clairement signalés.

---

## 2. Activation du Mode Démonstration

Le mode démo est contrôlé par la fonction centralisée `isDemoMode()` dans [`src/data/demoData.js`](src/data/demoData.js) :

```javascript
// Variable d'environnement (Build / Déploiement)
REACT_APP_DEMO_MODE=true
# ou
VITE_DEMO_MODE=true

// Ou paramètre d'URL direct (Tests / Recette)
https://troco.app/?demo=true
```

En dehors de ces conditions, le mode démo est **inactif** par défaut :
- `getInitialTransactions()` retourne `[]`.
- Aucune transaction `tx-seed-1` ou `tx-seed-2` n'est injectée dans le portefeuille.
- `mockListings` n'est pas injecté dans le flux d'annonces.
- Aucun profil statique n'est généré artificiellement.

---

## 3. Bandeau d'Avertissement Visuel (`DemoModeBanner`)

Lorsque `isDemoMode() === true` :
- Un composant `<DemoModeBanner />` s'affiche au sommet de l'interface.
- Ce bandeau informe explicitement l'utilisateur que l'environnement est en démonstration et qu'aucune opération financière réelle n'a lieu.

---

## 4. Migration Automatique du Cache (`migrateLocalStorage`)

Pour éviter que des utilisateurs ayant visité d'anciennes versions de l'application ne conservent des seeds dans leur `localStorage` :
- La fonction `migrateLocalStorage()` est appelée au montage de l'application.
- En production, elle purge silencieusement les clés `tx-seed-*` et les annonces de démo résiduelles.
