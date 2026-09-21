# Audit de Non-Régression & Garde-Fous — Post-Hotfixes [HOTFIX-03]

## 1. Synthèse de la Campagne de Hotfixes

| Incident | Module | Cause Racine | Correction | Statut |
|---|---|---|---|---|
| **HOTFIX-00** | Diagnostics | Absence d'outils d'inspection globale des régressions | Suite de scanners complets console & scripts | ✅ RÉSOLU |
| **HOTFIX-01** | Modale Troco Plus | Portails imbriqués, `pointer-events-none`, backdrop sans `onClick` | Normalisation z-index, suppression portail parent, fermeture backdrop & ESC, scroll lock | ✅ RÉSOLU |
| **HOTFIX-02** | Messagerie | Bouton avec `onClick` + `onTouchEnd`, `participantUids` manquant | Bouton assaini, module `messageIdempotency.js`, sync `participantUids` | ✅ RÉSOLU |
| **HOTFIX-04** | Appels WebRTC | Règles Firestore `calls` manquantes (deny all) | Autorisations `calls/*`, singleton `WebRTCContext`, `webrtcTracer` | ✅ RÉSOLU |
| **HOTFIX-05** | Notifications Fantômes | Logs missed inconditionnels sans acquittement `deliveredAt` | Garde `deliveredAt` obligatoire + délai min 6s | ✅ RÉSOLU |

---

## 2. Matrice d'Impact & Risques Adjacents

### A. Flux Financiers & Paiements (Stripe / Jetons)
- **Impact** : Nul. Les modifications de `PaymentFeature.jsx` et `PaymentModal.jsx` touchent exclusivement au conteneur DOM, aux gestionnaires de clic et au z-index. Le cycle de vie des paiements (`applyPayment`, `claimBonus`, `transferAtomically`) n'a pas été altéré.

### B. Messagerie & Offres de Deal
- **Impact** : Positif. La présence systématique de `participantUids` garantit que les deux parties voient instantanément les nouveaux messages, propositions de deals et contre-offres sur mobile comme sur ordinateur.

### C. Appels Audio / Vidéo WebRTC
- **Impact** : Majeur et positif. L'ajout des règles Firestore pour `calls` restaure le passage des offres SDP et des candidats ICE. La synchronisation par `targetsToListen` assure que la sonnerie retentit quel que soit le format du profil du destinataire.

---

## 3. Checklist Manuelle de Vérification Recommandée

### Modale Troco Plus & Paiement :
- [ ] Ouvrir la modale Troco Plus depuis le header ou le profil.
- [ ] Cliquer sur la zone sombre (backdrop) : la modale doit se fermer immédiatement.
- [ ] Ré-ouvrir et appuyer sur la touche `Échap` : la modale doit se fermer.
- [ ] Vérifier qu'un seul ascenseur vertical apparaît, sans défilement de la page arrière.

### Messagerie Mobile & Desktop :
- [ ] Ouvrir une discussion sur smartphone et taper rapidement sur le bouton Envoyer.
- [ ] Vérifier qu'un seul message est envoyé (aucun doublon).
- [ ] Vérifier la réception instantanée sur le client desktop connecté avec le compte interlocuteur.

### Appels WebRTC :
- [ ] Déclencher un appel depuis l'appareil A vers l'appareil B.
- [ ] Vérifier que la sonnerie entrante retentit sur l'appareil B en moins de 2 secondes.
- [ ] Décrocher : le flux audio/vidéo doit s'établir.
- [ ] Tester le refus : l'appel s'interrompt avec la mention "Appel refusé".
- [ ] Tester l'annulation immédiate (< 5s) avant réponse : aucune notification d'appel manqué fantôme ne doit parvenir à l'appareil B.
