"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateChatParticipants = exports.executeChatMigration = exports.isFirebaseUid = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const logger_1 = require("../utils/logger");
const migrationReport_1 = require("./migrationReport");
/**
 * Heuristique de détection d'un UID Firebase Auth :
 * Chaîne alphanumérique d'au moins 20 caractères sans espaces
 */
function isFirebaseUid(val) {
    return typeof val === 'string' && /^[a-zA-Z0-9_-]{20,}$/.test(val.trim());
}
exports.isFirebaseUid = isFirebaseUid;
/**
 * Moteur pur de migration, réutilisable pour les tests unitaires et l'exécution Cloud Function
 */
async function executeChatMigration(db, options, callerUid) {
    const dryRun = options.dryRun !== false; // Défaut sécurisé : true
    const startTime = Date.now();
    const report = (0, migrationReport_1.createEmptyReport)();
    // 1. Indexation des utilisateurs pour le mapping Nom / Username / Email → UID
    const usersSnap = await db.collection('users').get();
    const nameToUid = new Map();
    const usernameToUid = new Map();
    const emailToUid = new Map();
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
    await (0, logger_1.structLog)('migration_chat_participants_start', {
        dryRun,
        callerUid,
        usersIndexed: usersSnap.size,
    });
    // 2. Récupération des conversations
    let chatsQuery = db.collection('chats');
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
        const newParticipants = [];
        const unmapped = [];
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
            }
            else {
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
                    migratedAt: firestore_1.FieldValue.serverTimestamp(),
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
                previousParticipants: participants,
                migrationStatus: 'migrated',
                migratedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        report.migrated++;
    }
    report.durationMs = Date.now() - startTime;
    report.completedAt = new Date().toISOString();
    const summary = (0, migrationReport_1.formatReportSummary)(report, dryRun);
    await (0, logger_1.structLog)('migration_chat_participants_complete', {
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
exports.executeChatMigration = executeChatMigration;
/**
 * Cloud Function Callable v2 sécurisée : Réservée aux administrateurs
 */
exports.migrateChatParticipants = (0, https_1.onCall)({
    region: 'europe-west1',
    memory: '1GiB',
    timeoutSeconds: 540,
}, async (request) => {
    // 🛡️ Garde d'authentification et de privilège administrateur
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Authentification requise');
    }
    if (request.auth.token?.admin !== true) {
        throw new https_1.HttpsError('permission-denied', 'Droits administrateur requis pour exécuter la migration');
    }
    const db = (0, firestore_1.getFirestore)();
    const callerUid = request.auth.uid;
    const data = request.data || {};
    return executeChatMigration(db, data, callerUid);
});
//# sourceMappingURL=migrateChatParticipants.js.map