"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeIdempotency = exports.checkIdempotency = void 0;
const firestore_1 = require("firebase-admin/firestore");
const IDEMPOTENCY_COLLECTION = 'idempotency_keys';
const TTL_HOURS = 24;
/**
 * Vérifie si une clé d'idempotence a déjà été traitée et n'est pas expirée.
 * @returns Le résultat précédemment calculé, ou null si la clé n'existe pas ou est expirée.
 */
async function checkIdempotency(key, db) {
    if (!key || typeof key !== 'string')
        return null;
    try {
        const docRef = db.doc(`${IDEMPOTENCY_COLLECTION}/${key}`);
        const snap = await docRef.get();
        if (!snap.exists)
            return null;
        const data = snap.data();
        const now = Date.now();
        if (data.expiresAt && data.expiresAt.toMillis() < now) {
            // Clé expirée : suppression silencieuse en tâche de fond
            docRef.delete().catch(() => { });
            return null;
        }
        return data.result ?? null;
    }
    catch (err) {
        console.warn(`[Idempotency] Failed to check key ${key}:`, err);
        return null;
    }
}
exports.checkIdempotency = checkIdempotency;
/**
 * Enregistre le résultat d'une opération idempotente avec un TTL de 24h.
 * Utilisable directement ou au sein d'une transaction Firestore existante.
 */
function storeIdempotency(key, result, db, tx) {
    if (!key || typeof key !== 'string')
        return;
    const docRef = db.doc(`${IDEMPOTENCY_COLLECTION}/${key}`);
    const expiresAt = firestore_1.Timestamp.fromMillis(Date.now() + TTL_HOURS * 60 * 60 * 1000);
    const payload = {
        result,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        expiresAt,
    };
    if (tx) {
        tx.set(docRef, payload);
    }
    else {
        docRef.set(payload).catch((e) => {
            console.warn(`[Idempotency] Failed to store key ${key}:`, e);
        });
    }
}
exports.storeIdempotency = storeIdempotency;
//# sourceMappingURL=idempotency.js.map