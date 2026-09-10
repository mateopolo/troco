import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { structLog } from '../utils/logger';
import { ChatMigrationReport, createEmptyReport, formatReportSummary } from './migrationReport';

export interface MigrateChatParticipantsData {
  dryRun?: boolean;
  limit?: number;
}

export interface MigrateChatParticipantsResult {
  success: boolean;
  dryRun: boolean;
  report: ChatMigrationReport;
  summary: string;
}

/**
 * Heuristique de détection d'un UID Firebase Auth :
 * Chaîne alphanumérique d'au moins 20 caractères sans espaces
 */
export function isFirebaseUid(val: unknown): boolean {
  return typeof val === 'string' && /^[a-zA-Z0-9_-]{20,}$/.test(val.trim());
}

/**
 * Moteur pur de migration, réutilisable pour les tests unitaires et l'exécution Cloud Function
 */
export async function executeChatMigration(
  db: FirebaseFirestore.Firestore,
  options: MigrateChatParticipantsData,
  callerUid: string
): Promise<MigrateChatParticipantsResult> {
  const dryRun = options.dryRun !== false; // Défaut sécurisé : true
  const startTime = Date.now();
  const report = createEmptyReport();

  // 1. Indexation des utilisateurs pour le mapping Nom / Username / Email → UID
  const usersSnap = await db.collection('users').get();
  const nameToUid = new Map<string, string>();
  const usernameToUid = new Map<string, string>();
  const emailToUid = new Map<string, string>();

  usersSnap.forEach((doc) => {
    const data = doc.data();
    const uid = doc.id;

    if (data.name && typeof data.name === 'string') {
      nameToUid.set(data.name.trim().toLowerCase(), uid);
    }
    if (data.displayName && typeof data.displayName === 'string') {
      nameToUid.set(data.displayName.trim().toLowerCase(), uid);
    }
    if (data.username && typeof data.username === 'string') {
      usernameToUid.set(data.username.trim().toLowerCase().replace(/^@/, ''), uid);
    }
    if (data.email && typeof data.email === 'string') {
      emailToUid.set(data.email.trim().toLowerCase(), uid);
    }
  });

  await structLog('migration_chat_participants_start', {
    dryRun,
    callerUid,
    usersIndexed: usersSnap.size,
  });

  // 2. Récupération des conversations
  let chatsQuery: FirebaseFirestore.Query = db.collection('chats');
  if (options.limit && options.limit > 0) {
    chatsQuery = chatsQuery.limit(options.limit);
  }
  const chatsSnap = await chatsQuery.get();
  report.totalChats = chatsSnap.size;

  // 3. Traitement de chaque conversation
  for (const chatDoc of chatsSnap.docs) {
    const chat = chatDoc.data();
    const participants = Array.isArray(chat.participants) ? chat.participants : [];

    if (participants.length === 0) {
      report.errors.push({ chatId: chatDoc.id, reason: 'empty_participants' });
      report.skipped++;
      continue;
    }

    // Détection : déjà migré si tous les éléments sont des UIDs conformes
    const allAlreadyUids = participants.every((p) => isFirebaseUid(p));
    if (allAlreadyUids) {
      report.alreadyMigrated++;
      // Si participantUids n'était pas synchronisé, le synchroniser
      if (!dryRun && (!Array.isArray(chat.participantUids) || chat.participantUids.length === 0)) {
        await chatDoc.ref.update({
          participantUids: participants,
          migrationStatus: 'migrated',
        });
      }
      continue;
    }

    // Conversion des participants
    const newParticipants: string[] = [];
    const unmapped: unknown[] = [];

    for (const participant of participants) {
      if (isFirebaseUid(participant)) {
        newParticipants.push(participant);
        continue;
      }

      const key = String(participant).trim().toLowerCase();
      const usernameKey = key.replace(/^@/, '');

      const uid = nameToUid.get(key) || usernameToUid.get(usernameKey) || emailToUid.get(key);

      if (uid) {
        newParticipants.push(uid);
      } else {
        unmapped.push(participant);
      }
    }

    // Gestion des orphelins (aucun UID trouvé pour au moins un nom)
    if (unmapped.length > 0) {
      report.orphans++;
      report.errors.push({
        chatId: chatDoc.id,
        reason: 'unmapped_participants',
        unmapped,
      });

      if (!dryRun) {
        await chatDoc.ref.update({
          migrationStatus: 'orphan',
          orphanParticipants: unmapped,
          migratedAt: FieldValue.serverTimestamp(),
        });
      }
      continue;
    }

    // Déduplication des UIDs (au cas où deux libellés correspondaient au même compte)
    const uniqueUids = Array.from(new Set(newParticipants));

    if (!dryRun) {
      await chatDoc.ref.update({
        participants: uniqueUids,
        participantUids: uniqueUids,
        previousParticipants: participants, // Sauvegarde inline inviolable pour rollback
        migrationStatus: 'migrated',
        migratedAt: FieldValue.serverTimestamp(),
      });
    }

    report.migrated++;
  }

  report.durationMs = Date.now() - startTime;
  report.completedAt = new Date().toISOString();

  const summary = formatReportSummary(report, dryRun);

  await structLog('migration_chat_participants_complete', {
    callerUid,
    dryRun,
    report,
  });

  return {
    success: true,
    dryRun,
    report,
    summary,
  };
}

/**
 * Cloud Function Callable v2 sécurisée : Réservée aux administrateurs
 */
export const migrateChatParticipants = onCall(
  {
    region: 'europe-west1',
    memory: '1GiB',
    timeoutSeconds: 540,
  },
  async (request: CallableRequest<MigrateChatParticipantsData>) => {
    // 🛡️ Garde d'authentification et de privilège administrateur
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise');
    }

    if (request.auth.token?.admin !== true) {
      throw new HttpsError('permission-denied', 'Droits administrateur requis pour exécuter la migration');
    }

    const db = getFirestore();
    const callerUid = request.auth.uid;
    const data = request.data || {};

    return executeChatMigration(db, data, callerUid);
  }
);
