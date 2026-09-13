"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceAdminRateLimit = void 0;
const firestore_1 = require("firebase-admin/firestore");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const MAX_ADMIN_CALLS_PER_MINUTE = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
/**
 * ⏱️ Middleware de limitation de débit (Rate Limiting) pour actions administrateur
 * Règle stricte : 10 requêtes par minute par UID administrateur
 * Enregistrement dans une collection technique privée Firestore '_admin_rate_limits'
 */
async function enforceAdminRateLimit(db, callerUid) {
    if (!callerUid)
        return;
    const limitRef = db.collection('_admin_rate_limits').doc(callerUid);
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    await db.runTransaction(async (transaction) => {
        const docSnap = await transaction.get(limitRef);
        let timestamps = [];
        if (docSnap.exists) {
            const data = docSnap.data();
            if (Array.isArray(data?.timestamps)) {
                // Filtrer les appels survenus dans la dernière minute glissante
                timestamps = data.timestamps.filter((ts) => typeof ts === 'number' && ts > windowStart);
            }
        }
        if (timestamps.length >= MAX_ADMIN_CALLS_PER_MINUTE) {
            (0, logger_1.logAdminAction)({
                action: 'RATE_LIMIT_EXCEEDED',
                by: callerUid,
                status: 'warning',
                details: { count: timestamps.length, limit: MAX_ADMIN_CALLS_PER_MINUTE }
            });
            (0, errors_1.throwRateLimited)(`Limite de ${MAX_ADMIN_CALLS_PER_MINUTE} opérations administrateur par minute dépassée.`);
        }
        timestamps.push(now);
        transaction.set(limitRef, {
            timestamps,
            lastCallAt: firestore_1.FieldValue.serverTimestamp(),
            count: timestamps.length
        }, { merge: true });
    });
}
exports.enforceAdminRateLimit = enforceAdminRateLimit;
//# sourceMappingURL=rateLimit.js.map