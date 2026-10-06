# Guide de Migration des Participants de Chat — [VERIF-02]

## 1. Contexte & Enjeu de Sécurité

Historiquement, le champ `participants` de la collection Firestore `chats/{chatId}` enregistrait les noms ou pseudonymes d'affichage des utilisateurs (ex: `["Marc Dupont", "Sofia"]`).

Lors du durcissement des règles de sécurité Firestore, la condition `request.auth.uid in resource.data.participants` a provoqué le blocage des flux de messagerie car `request.auth.uid` correspond à un identifiant Firebase Auth (chaîne alphanumérique de 28 caractères) et non à un nom d'affichage.

Pour débloquer la production, la règle avait été assouplie temporairement (`allow read: if isAuthenticated()`). Bien que fonctionnelle, cette règle présentait une vulnérabilité de confidentialité : tout utilisateur connecté pouvait potentiellement lire les conversations privées d'un autre utilisateur.

**La mission de VERIF-02 est de :**
1. Convertir tous les noms historiques en UIDs Firebase Auth certifiés.
2. Conserver une copie de sauvegarde locale `previousParticipants` dans chaque document.
3. Marquer explicitement les conversations orphelines (`migrationStatus: 'orphan'`) sans perte de données.
4. Restaurer des règles Firestore strictement restreintes aux participants et aux administrateurs.

---

## 2. Architecture Technique de la Migration

### Composants mis en place :
- **Cloud Function Callable** : `migrateChatParticipants` (`functions/src/migration/migrateChatParticipants.ts`)
  - Région : `europe-west1`
  - Mémoire : `1GiB`, Timeout : `540s`
  - Protection : Réservée aux administrateurs (`token.admin === true`).
- **Reporting & Logs** : `functions/src/migration/migrationReport.ts` et `logger.ts` (`structLog`).
- **Script de sauvegarde** : `scripts/backup-firestore.sh` (`gcloud firestore export`).
- **Règles Firestore strictes** : `firestore.rules`.

### Structure d'un document migré :
```json
{
  "id": "chat_abc123",
  "participants": ["uid_alice_28chars", "uid_bob_28chars"],
  "participantUids": ["uid_alice_28chars", "uid_bob_28chars"],
  "previousParticipants": ["Alice Martin", "Bob Dylan"],
  "migrationStatus": "migrated",
  "migratedAt": "2026-09-10T14:41:00.000Z"
}
```

---

## 3. Procédure Opérationnelle Étape par Étape

### Étape 1 : Sauvegarde intégrale Firestore
Exécuter le script de sauvegarde avant toute intervention :
```bash
bash scripts/backup-firestore.sh
```
La commande exporte les collections `chats`, `users` et `calls` vers un bucket Google Cloud Storage dédié.

### Étape 2 : Exécution de la simulation (DRY-RUN)
Appeler la Cloud Function avec le paramètre `dryRun: true` depuis la console ou un script admin :
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions(app, 'europe-west1');
const migrate = httpsCallable(functions, 'migrateChatParticipants');

const response = await migrate({ dryRun: true });
console.log(response.data.summary);
```

**Exemple de retour :**
```text
════════════════════════════════════════════════════════════
📋 RAPPORT DE MIGRATION CHAT PARTICIPANTS — Mode: DRY-RUN
════════════════════════════════════════════════════════════
Total chats analysés     : 142
Déjà conformes (UIDs)    : 85
Migrés avec succès       : 54
Orphelins (sans UID)     : 3
Chats ignorés            : 0
Erreurs rencontrées      : 3
Durée d'exécution        : 412 ms
════════════════════════════════════════════════════════════
```

### Étape 3 : Traitement des orphelins
Si des chats sont classés en `orphan` :
1. Consulter le détail dans `report.errors`.
2. Vérifier si l'utilisateur existe dans `users` avec un pseudonyme alternatif.
3. Mettre à jour manuellement si nécessaire.

### Étape 4 : Exécution réelle de la migration
Une fois le dry-run validé, exécuter la migration en mode réel :
```typescript
const response = await migrate({ dryRun: false });
console.log(response.data.summary);
```

### Étape 5 : Déploiement des Règles Firestore Strictes
Déployer les nouvelles règles strictes :
```bash
firebase deploy --only firestore:rules
```

---

## 4. Procédure de Rollback

En cas d'anomalie critique post-migration :

### 1. Rollback rapide inline
Chaque document de chat contient le champ `previousParticipants`. Un script de restauration peut réaffecter `participants = previousParticipants`.

### 2. Restauration complète depuis le bucket
```bash
gcloud firestore import "gs://troco-app-production-firestore-backups/pre_migration_YYYYMMDD_HHMMSS" \
  --project="troco-app-production"
```
