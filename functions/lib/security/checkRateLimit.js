"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCheckRateLimit = void 0;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const rateLimitHelper_1 = require("./rateLimitHelper");
async function handleCheckRateLimit(request, db) {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'Authentification requise pour vérifier le quota d\'actions.');
    }
    const { action } = request.data || {};
    const config = rateLimitHelper_1.RATE_LIMITS[action];
    if (!config) {
        throw new https_1.HttpsError('invalid-argument', `Action inconnue ou non soumise à quota : ${action}`);
    }
    const now = Date.now();
    const windowStart = (0, rateLimitHelper_1.getWindowStart)(now, config.windowSeconds);
    const key = `${uid}_${action}_${windowStart}`;
    const ref = db.doc(`rate_limits/${key}`);
    const result = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const current = snap.exists ? Number(snap.data()?.count || 0) : 0;
        if (current >= config.max) {
            const retryAfter = Math.max(1, Math.ceil((windowStart + config.windowSeconds * 1000 - now) / 1000));
            return { allowed: false, retryAfter, remaining: 0 };
        }
        tx.set(ref, {
            uid,
            action,
            count: current + 1,
            windowStart,
            expiresAt: firestore_1.Timestamp.fromMillis(windowStart + config.windowSeconds * 1000 + 60000),
        }, { merge: true });
        return { allowed: true, retryAfter: 0, remaining: config.max - current - 1 };
    });
    if (!result.allowed) {
        throw new https_1.HttpsError('resource-exhausted', `Fréquence trop élevée pour l'action "${action}". Réessayez dans ${result.retryAfter}s.`, {
            retryAfter: result.retryAfter,
            action,
        });
    }
    return result;
}
exports.handleCheckRateLimit = handleCheckRateLimit;
//# sourceMappingURL=checkRateLimit.js.map