# 📋 Procédure de Test P0-MOD : Cloisonnement Démo & Transparence Éthique

## Objectif
Vérifier que l'application en mode production ne présente aucune transaction fictive, n'injecte pas d'annonces de démo dans le flux principal, et affiche le bandeau d'avertissement lorsque le mode démo est explicitement activé.

---

## 1. Tests Automatisés
Exécuter les tests de conformité :
```bash
npx vitest run src/components/Phase144EthicalTransparency.test.js
```

---

## 2. Test Manuel en Mode Production
1. Lancer l'application sans variable d'environnement démo :
   `npm start`
2. Ouvrir l'historique des transactions :
   - Vérifier que la liste est vide pour un nouveau compte (absence de `Achat 5 Jetons Troco - Apple Pay` ou `Recharge Portefeuille Troco - 20.00€`).
3. Consulter le flux d'annonces :
   - Les annonces affichées proviennent uniquement de Firestore (`users_public`).
   - Aucun bandeau jaune `Mode Démonstration Actif` n'est visible.

---

## 3. Test Manuel en Mode Démo
1. Accéder à l'application avec le paramètre démo :
   `http://localhost:3000/?demo=true`
2. **Vérifications :**
   - Le bandeau jaune `Mode Démonstration Actif` apparaît au sommet.
   - Les annonces d'exemple (Marc L., Sofia M., etc.) sont visibles avec les badges correspondants.
   - Cliquer sur la croix du bandeau le ferme convenablement.
