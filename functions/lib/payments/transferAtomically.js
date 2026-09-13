"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTransferAtomically = void 0;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const idempotency_1 = require("./idempotency");
const validation_1 = require("./validation");
const logger_1 = require("../utils/logger");
async function handleTransferAtomically(request, db) {
    const fromUid = request.auth?.uid;
    if (!fromUid) {
        throw new https_1.HttpsError('unauthenticated', 'Authentification requise pour effectuer un transfert.');
    }
    const { toUid, receiverUid, method = 'wallet', dealId, chatId, metadata = {}, idempotencyKey, } = request.data || {};
    const targetUid = toUid || receiverUid || '';
    let finalTokens = Number(request.data?.tokens || 0);
    let finalEuros = Number(request.data?.euros || 0);
    if (!finalTokens && !finalEuros && request.data?.amount) {
        if (request.data.currency === 'tokens') {
            finalTokens = Number(request.data.amount);
        }
        else {
            finalEuros = Number(request.data.amount);
        }
    }
    // 1. Validation stricte des arguments
    (0, validation_1.validateTransferParams)({ fromUid, toUid: targetUid, tokens: finalTokens, euros: finalEuros, idempotencyKey });
    // 2. Contrôle d'idempotence (évite double débit en cas de retry réseau)
    const existing = await (0, idempotency_1.checkIdempotency)(idempotencyKey, db);
    if (existing) {
        return existing;
    }
    // 3. Transaction atomique Firestore complète
    const result = await db.runTransaction(async (tx) => {
        const fromRef = db.doc(`users/${fromUid}`);
        const toRef = db.doc(`users/${targetUid}`);
        const [fromSnap, toSnap] = await Promise.all([tx.get(fromRef), tx.get(toRef)]);
        if (!fromSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Compte émetteur introuvable.');
        }
        if (!toSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Compte destinataire introuvable.');
        }
        const fromData = fromSnap.data() || {};
        const toData = toSnap.data() || {};
        // Sécurité : blocage des utilisateurs bannis
        if (fromData.isBanned || toData.isBanned) {
            throw new https_1.HttpsError('permission-denied', 'L\'un des comptes fait l\'objet d\'une suspension administrative.');
        }
        const fromEuro = Number(fromData.euroBalance || 0);
        const fromTokens = Number(fromData.trocoTokens || 0);
        // Vérification de solvabilité
        if (fromEuro < finalEuros) {
            throw new https_1.HttpsError('failed-precondition', `Solde en euros insuffisant (${fromEuro}€ / ${finalEuros}€ requis).`);
        }
        if (fromTokens < finalTokens) {
            throw new https_1.HttpsError('failed-precondition', `Solde en jetons insuffisant (${fromTokens} / ${finalTokens} requis).`);
        }
        const newFromEuro = Number((fromEuro - finalEuros).toFixed(2));
        const newFromTokens = fromTokens - finalTokens;
        const newToEuro = Number((Number(toData.euroBalance || 0) + finalEuros).toFixed(2));
        const newToTokens = Number(toData.trocoTokens || 0) + finalTokens;
        // Mise à jour de l'émetteur
        tx.update(fromRef, {
            euroBalance: newFromEuro,
            trocoTokens: newFromTokens,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        // Mise à jour du destinataire
        tx.update(toRef, {
            euroBalance: newToEuro,
            trocoTokens: newToTokens,
            dealsCompleted: Number(toData.dealsCompleted || 0) + 1,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        // Mise à jour du message et statut du Deal dans le Chat
        if (chatId && dealId) {
            const msgRef = db.doc(`chats/${chatId}/messages/${dealId}`);
            tx.update(msgRef, {
                status: 'confirmed',
                paidBy: fromUid,
                paidTo: targetUid,
                euroAmount: finalEuros,
                tokensAmount: finalTokens,
                paymentMethod: method,
                confirmedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            const chatRef = db.doc(`chats/${chatId}`);
            tx.update(chatRef, {
                lastDealStatus: 'confirmed',
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        // Enregistrement des écritures comptables (débit + crédit)
        const debitTxRef = db.collection('transactions').doc();
        const creditTxRef = db.collection('transactions').doc();
        tx.set(debitTxRef, {
            type: 'transfer_debit',
            userId: fromUid,
            partnerUid: targetUid,
            tokens: finalTokens,
            amountTtc: finalEuros,
            paymentMethod: method,
            dealId: dealId || null,
            chatId: chatId || null,
            status: 'completed',
            metadata,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
        tx.set(creditTxRef, {
            type: 'transfer_credit',
            userId: targetUid,
            partnerUid: fromUid,
            tokens: finalTokens,
            amountTtc: finalEuros,
            paymentMethod: method,
            dealId: dealId || null,
            chatId: chatId || null,
            status: 'completed',
            metadata,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
        // Création de la notification temps réel pour le destinataire
        const notifRef = db.collection(`users/${targetUid}/notifications`).doc();
        tx.set(notifRef, {
            type: 'payment_received',
            amount: finalTokens > 0 ? finalTokens : finalEuros,
            currency: finalTokens > 0 ? 'tokens' : 'EUR',
            from: fromUid,
            senderName: fromData.name || 'Membre Troco',
            read: false,
            timestamp: firestore_1.FieldValue.serverTimestamp(),
        });
        // Mémorisation atomique de la clé d'idempotence (TTL 24h)
        const responsePayload = {
            success: true,
            newFromBalance: { euro: newFromEuro, tokens: newFromTokens },
            newToBalance: { euro: newToEuro, tokens: newToTokens },
            newSenderTokens: newFromTokens,
            newSenderEuro: newFromEuro,
            newReceiverTokens: newToTokens,
            newReceiverEuro: newToEuro,
            transactionIds: [debitTxRef.id, creditTxRef.id],
        };
        const idemRef = db.doc(`idempotency_keys/${idempotencyKey}`);
        tx.set(idemRef, {
            result: responsePayload,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            expiresAt: firestore_1.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
        });
        return responsePayload;
    });
    await (0, logger_1.structLog)('transferAtomically', {
        fromUid,
        toUid: targetUid,
        tokens: finalTokens,
        euros: finalEuros,
        transactionIds: result.transactionIds,
    });
    return result;
}
exports.handleTransferAtomically = handleTransferAtomically;
//# sourceMappingURL=transferAtomically.js.map