"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.health = void 0;
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const HEALTH_CHECK_TIMEOUT_MS = 5000;
exports.health = (0, https_1.onRequest)({
    timeoutSeconds: 5,
    cors: true,
}, async (_request, response) => {
    const timestamp = new Date().toISOString();
    const result = {
        status: 'ok',
        timestamp,
        version: process.env.APP_VERSION || '0.1.0',
        checks: {
            firestore: 'ok',
            auth: 'ok',
        },
    };
    try {
        await Promise.race([
            (0, firestore_1.getFirestore)().doc('_system/health').get(),
            new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Firestore health check timed out')), HEALTH_CHECK_TIMEOUT_MS);
            }),
        ]);
    }
    catch {
        result.status = 'degraded';
        result.checks.firestore = 'error';
        response.status(503).json(result);
        return;
    }
    try {
        (0, auth_1.getAuth)();
    }
    catch {
        result.status = 'degraded';
        result.checks.auth = 'error';
        response.status(503).json(result);
        return;
    }
    response.status(200).json(result);
});
//# sourceMappingURL=healthCheck.js.map