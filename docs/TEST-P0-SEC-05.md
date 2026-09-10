# 🧪 Protocole de Test Manuel — [P0-SEC-05 / P1-BUG-05]
## Élimination des Sessions Fantômes (Ghost Sessions) & Source Unique de Vérité d'Authentification

---

### 📌 Contexte & Objectif de Sécurité
Auparavant, le flag `localStorage.troco_is_authenticated` était lu pour déterminer si l'utilisateur restait connecté lorsque `onAuthStateChanged` renvoyait `firebaseUser === null`.
Un attaquant ou un utilisateur pouvait ainsi ouvrir les DevTools, exécuter `localStorage.setItem('troco_is_authenticated', 'true')`, et accéder à l'interface de l'application sans session Firebase Auth active (déclenchant des erreurs `permission-denied` sur Firestore et exposant une UX brisée).

**Objectif atteint :**
- `onAuthStateChanged(auth, ...)` est désormais la **SEULE et UNIQUE source de vérité**.
- L'état `isAuthResolved` prévient tout flash d'écran tant que Firebase n'a pas statué.
- Le localStorage ne décide plus JAMAIS de l'authentification (0 lecture dans toute l'application).

---

### 🔍 Matrice de Tests

| ID | Scénario | Conditions Initiales | Actions | Résultat Attendu | Statut |
|---|---|---|---|---|---|
| **TC-01** | Rechargement sans session Firebase | Utilisateur déconnecté (`auth.currentUser === null`) | Recharger la page (`F5` ou `Ctrl+R`) | Écran de chargement (`SplashScreen`) tant que `!isAuthResolved`, puis redirection immédiate vers `AuthScreen`. `isAuthenticated = false`. Aucun flash de feed connecté. | **Validé** |
| **TC-02** | Rechargement avec session Firebase valide | Utilisateur connecté avec un compte valide | Recharger la page (`F5`) | Écran de chargement (`SplashScreen`) tant que `!isAuthResolved`, puis affichage fluide du feed connecté. `isAuthenticated = true`. Aucun flash de page login. | **Validé** |
| **TC-03** | Injection manuelle de flag dans DevTools | Utilisateur déconnecté sur `AuthScreen` | Ouvrir la Console DevTools et exécuter `localStorage.setItem('troco_is_authenticated', 'true')`, puis recharger la page | Aucun effet : l'application reste sur `AuthScreen`. Dès que `onAuthStateChanged` retourne `null`, le flag illégitime est automatiquement purgé. | **Validé** |
| **TC-04** | Déconnexion explicite (Logout) | Utilisateur connecté dans le menu profil ou header | Cliquer sur "Se déconnecter" (`handleSignOut`) | `signOut(auth)` exécuté, `isAuthenticated = false` immédiatement, redirection vers `AuthScreen`. `troco_is_authenticated` purgé du localStorage. | **Validé** |
| **TC-05** | Bannissement en direct par l'administration | Utilisateur connecté naviguant sur l'application | Modifier le document `users/{uid}` avec `{ isBanned: true }` sur Firestore | Déconnexion instantanée de Firebase Auth, message d'alerte de suspension affiché, localStorage nettoyé, retour immédiat à l'état déconnecté. | **Validé** |
| **TC-06** | Connexion par Magic Link (Email Link) | Utilisateur clique sur le lien magique reçu par email | Ouverture de l'URL avec token email | `signInWithEmailLink` réussit, `onAuthStateChanged` capture le nouvel utilisateur, `isAuthResolved` passe à `true`, `isAuthenticated = true`. | **Validé** |

---

### 🛠️ Procédure Détaillée de Test Manuel

#### Étape 1 : Vérification de l'inexistence de session fantôme
1. Ouvrir le navigateur en mode Navigation Privée.
2. Accéder à l'application `http://localhost:3000`.
3. Constater l'apparition de l'indicateur de vérification de session haute couture (`SplashScreen`).
4. Constater l'arrivée sur l'écran d'accueil/authentification (`AuthScreen`).
5. Ouvrir la console DevTools (`F12`), aller dans l'onglet **Application** > **Local Storage**.
6. Constater que la clé `troco_is_authenticated` est absente.
7. Créer manuellement la clé :
   ```js
   localStorage.setItem('troco_is_authenticated', 'true');
   ```
8. Recharger la page (`F5`).
9. **Observation attendue :** L'écran de chargement s'affiche brièvement, puis l'application affiche `AuthScreen`. Le flag `troco_is_authenticated` est effacé immédiatement par `onAuthStateChanged`. L'accès au feed est impossible.

#### Étape 2 : Vérification du flux de connexion & persistance
1. Se connecter avec un compte valide (ou via le mode Démo interactif).
2. Vérifier l'accès au feed et aux fonctionnalités.
3. Recharger la page (`F5`).
4. **Observation attendue :** Pas de saut ("flicker") déconnecté -> connecté. Le splash screen patiente jusqu'à ce que `isAuthResolved` soit `true`, puis affiche directement le compte utilisateur.

#### Étape 3 : Vérification de la déconnexion
1. Cliquer sur le bouton de déconnexion.
2. **Observation attendue :** Retour immédiat sur `AuthScreen`.
3. Vérifier dans la console :
   ```js
   localStorage.getItem('troco_is_authenticated'); // null
   ```

---

### 📊 Validation Automatisée du Code

```bash
# Vérifier qu'aucune lecture directe de troco_is_authenticated n'existe dans src/
node -e "const fs = require('fs'); function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = d + '/' + f.name; if (f.isDirectory() && !['node_modules', '.git', 'build'].includes(f.name)) walk(p); else if (f.isFile() && /\.(jsx?|tsx?)$/.test(f.name)) { const c = fs.readFileSync(p, 'utf8'); if (c.includes('troco_is_authenticated') && p !== 'src/utils/sessionFlags.js') console.log('ERROR in:', p); } } } walk('src');"
# Résultat : 0 erreur trouvée
```
