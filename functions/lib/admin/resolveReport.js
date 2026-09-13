"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleResolveReport = void 0;
const firestore_1 = require("firebase-admin/firestore");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const rateLimit_1 = require("../middleware/rateLimit");
/**
 * ⚖️ Cloud Function Callable : resolveReport
 * Permet à un administrateur de statuer sur un signalement (résolu, rejeté, etc.) avec motif.
 */
async function handleResolveReport(request, db) {
    const auth = request.auth;
    if (!auth || !auth.uid) {
        (0, errors_1.throwUnauthorized)('Authentification requise.');
    }
    if (auth.token?.admin !== true) {
        (0, logger_1.logAdminAction)({
            action: 'resolveReport',
            by: auth.uid,
            status: 'failure',
            error: 'Tentative non autorisée par un utilisateur non-admin'
        });
        (0, errors_1.throwForbidden)('Accès réservé aux administrateurs certifiés.');
    }
    // Middleware Rate-Limiting (max 10 appels/minute)
    await (0, rateLimit_1.enforceAdminRateLimit)(db, auth.uid);
    const { reportId, status, resolution = '' } = request.data || {};
    if (!reportId || typeof reportId !== 'string') {
        (0, errors_1.throwBadRequest)('Paramètre reportId (string) manquant ou invalide.');
    }
    const validStatuses = ['resolved', 'dismissed', 'pending'];
    if (!status || !validStatuses.includes(status)) {
        (0, errors_1.throwBadRequest)(`Statut invalide. Valeurs permises: ${validStatuses.join(', ')}.`);
    }
    try {
        const reportRef = db.collection('reports').doc(reportId);
        const reportSnap = await reportRef.get();
        if (!reportSnap.exists) {
            (0, errors_1.throwNotFound)(`Signalement #${reportId} introuvable.`);
        }
        const reportData = reportSnap.data() || {};
        await reportRef.update({
            status,
            resolution: String(resolution || ''),
            resolvedBy: auth.uid,
            resolvedAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        (0, logger_1.logAdminAction)({
            action: 'resolveReport',
            by: auth.uid,
            target: reportId,
            details: {
                status,
                resolution,
                targetType: reportData.targetType || reportData.type || null,
                targetId: reportData.targetId || null,
            },
            status: 'success',
        });
        return {
            success: true,
            reportId,
            status,
            resolution: String(resolution || ''),
        };
    }
    catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        (0, logger_1.logAdminAction)({
            action: 'resolveReport',
            by: auth.uid,
            target: reportId,
            status: 'failure',
            error: errorMsg,
        });
        throw err;
    }
}
exports.handleResolveReport = handleResolveReport;
//# sourceMappingURL=resolveReport.js.map