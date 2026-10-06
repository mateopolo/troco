# 📋 Procédure de Test P0-FIN-03 : Séparation cancelCheckout / applyCheckout

## Objectif
Garantir que la fermeture de la modale de paiement (via la croix `X`, le clic extérieur ou le bouton `Annuler`) est une opération purement graphique avec **zéro effet de bord financier**. Aucun débit, transfert ou enregistrement de transaction ne doit se produire.

---

## 1. Test Automatisé
Exécuter la suite de tests dédiée :
```bash
npx vitest run src/components/cancelApply.test.js
```
**Résultat attendu :**
- `cancelCheckout closes the session with zero financial side-effects` -> PASS
- `applyCheckout performs payment and prevents duplicate execution via applied guard` -> PASS

---

## 2. Test Manuel (Étape par étape)
1. Ouvrir l'application et se connecter à un compte ayant du solde ou des jetons.
2. Déclencher un flux d'achat (ex : Recharger mon solde ou Finaliser un deal).
3. La modale `<CheckoutModal />` s'affiche.
4. **Action de test :** Cliquer sur la croix `X` en haut à droite.
5. **Vérifications :**
   - La modale disparaît immédiatement.
   - Les soldes affichés (Euros, Jetons) restent strictement inchangés.
   - La collection Firestore `transactions` ne contient aucun nouvel enregistrement.
   - Aucun appel réseau vers `applyPayment` ou `transferAtomically` n'a été émis.
6. Ré-ouvrir la modale et appuyer sur la touche Retour du navigateur (Android Back / PopState).
7. La modale se ferme sans altération de solde.
