"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleApplyPayment = void 0;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const idempotency_1 = require("./idempotency");
const providers_1 = require("./providers");
const logger_1 = require("../utils/logger");
async function handleApplyPayment(request, db) {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'Authentification requise pour valider un paiement.');
    }
    const { paymentIntentId, mode = 'topup', metadata = {} } = request.data || {};
    if (!paymentIntentId || typeof paymentIntentId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'L\'identifiant de paiement (paymentIntentId) est requis.');
    }
    // 1. Contrôle strict d'idempotence (évite tout double crédit)
    const existingResult = await (0, idempotency_1.checkIdempotency)(paymentIntentId, db);
    if (existingResult) {
        return existingResult;
    }
    // 2. Vérification auprès du prestataire de paiement (Mock ou Stripe)
    const provider = (0, providers_1.getProvider)();
    const payment = await provider.verifyPayment(paymentIntentId, db);
    if (!payment || payment.status !== 'succeeded') {
        throw new https_1.HttpsError('failed-precondition', 'Le paiement n\'a pas été validé ou a échoué auprès du prestataire.');
    }
    // 3. Transaction Firestore atomique (mise à jour du solde et traçabilité)
    const result = await db.runTransaction(async (tx) => {
        const userRef = db.doc(`users/${uid}`);
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Profil utilisateur introuvable.');
        }
        const userData = userSnap.data() || {};
        const curEuro = Number(userData.euroBalance ?? userData.walletBalanceFiat ?? userData.balance ?? 0);
        const curTokens = Number(userData.trocoTokens ?? userData.tokens ?? 0);
        let newEuro = curEuro;
        let newTokens = curTokens;
        if (payment.currency === 'EUR') {
            newEuro = Number((curEuro + payment.amount).toFixed(2));
        }
        else if (payment.currency === 'TOKENS') {
            newTokens = curTokens + payment.amount;
        }
        // Mise à jour sécurisée du solde utilisateur
        tx.update(userRef, {
            euroBalance: newEuro,
            walletBalanceFiat: newEuro,
            trocoTokens: newTokens,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        // Enregistrement de la transaction financière
        const txRef = db.collection('transactions').doc();
        tx.set(txRef, {
            type: mode,
            userId: uid,
            amountTtc: payment.amount,
            currency: payment.currency,
            paymentProvider: provider.name,
            paymentIntentId,
            status: 'completed',
            metadata: metadata || {},
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
        // Enregistrement de la clé d'idempotence dans la transaction (TTL 24h)
        const idempotencyPayload = {
            success: true,
            newEuroBalance: newEuro,
            newTrocoTokens: newTokens,
            transactionId: txRef.id,
        };
        const idemRef = db.doc(`idempotency_keys/${paymentIntentId}`);
        tx.set(idemRef, {
            result: idempotencyPayload,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            expiresAt: firestore_1.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
        });
        return idempotencyPayload;
    });
    // Journalisation d'audit Cloud Logging
    await (0, logger_1.structLog)('applyPayment', {
        uid,
        paymentIntentId,
        amount: payment.amount,
        currency: payment.currency,
        provider: provider.name,
        transactionId: result.transactionId,
    });
    return result;
}
exports.handleApplyPayment = handleApplyPayment;
//# sourceMappingURL=applyPayment.js.map