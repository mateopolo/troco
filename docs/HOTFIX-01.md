# Rapport d'Incident & Correctif — HOTFIX-01 : Modale Troco Plus Bloquée

## 1. Description du Problème
- **Symptôme** : La modale "Abonnement Troco Plus" restait bloquée en arrière-plan sous un voile sombre. Le bouton de fermeture "X" était inactif, les clics sur le fond sombre ne fermaient pas la fenêtre, et un double ascenseur vertical apparaissait (fond et contenu de la modale).
- **Gravité** : 🚨 CRITIQUE — Bloquait l'expérience utilisateur et empêchait l'achat de jetons / abonnements.

## 2. Causes Racines Identifiées
1. **Conflit de portails imbriqués** :
   - `PaymentFeature.jsx` encapsulait les modales dans un portail direct sur `document.body` avec `<div className="fixed inset-0 z-[999999] pointer-events-none">`.
   - `PaymentModal.jsx` créait simultanément son propre portail `createPortal(..., document.body)` également à `z-[999999]`.
   - Le wrapper parent avec `pointer-events-none` créait une désynchronisation d'arborescence DOM.
2. **Backdrop sans handler `onClick`** :
   - Le conteneur du backdrop dans `PaymentModal.jsx` n'avait aucun gestionnaire de clic. Tout clic sur l'arrière-plan était sans effet.
3. **Absence de verrouillage du scroll du `body` & triple ascenseur** :
   - `document.body.style.overflow = 'hidden'` n'était jamais positionné.
   - Le backdrop avait `overflowY: 'auto'`, la carte modale avait `overflowY: 'auto'`, et le corps interne également, provoquant un double/triple ascenseur.
4. **Absence de support de la touche Échap**.

## 3. Correctifs Appliqués
1. **Architecture Globale (`src/contexts/ModalContext.jsx` & `src/components/modals/GlobalModalWrapper.jsx`)** :
   - Mise en place d'un contexte de modale standardisé et d'un wrapper universel.
2. **`src/features/payment/PaymentFeature.jsx`** :
   - Suppression du portail parent redondant et du conteneur `pointer-events-none`. Les modales sont rendues directement via leurs propres portails uniques.
3. **`src/components/PaymentModal.jsx` & `src/components/TransactionsHistoryModal.jsx`** :
   - Ajout d'un écouteur `onClick` sur le backdrop avec `if (e.target === e.currentTarget) handleCloseModal()`.
   - Ajout du verrouillage automatique de `document.body.style.overflow = 'hidden'` lors de l'ouverture et restauration lors du démontage.
   - Ajout de l'écouteur de touche `Escape`.
   - Suppression de l'ascenseur sur le backdrop (`overflow: 'hidden'`) et conservation d'un ascenseur unique contrôlé sur la carte modale.
   - Normalisation du `zIndex: 100000` et activation de `pointer-events-auto`.

## 4. Vérification
- Clic sur backdrop : ferme la modale.
- Touche Échap : ferme la modale.
- Bouton "X" : répond immédiatement.
- Arrière-plan figé sans double scrollbar.
