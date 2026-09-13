"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.anonymizeTransactions = void 0;
const crypto = __importStar(require("crypto"));
/**
 * Anonymise les transactions pour respecter le droit à l'oubli (RGPD art. 17)
 * tout en conservant l'intégrité comptable légale (obligation 10 ans).
 */
async function anonymizeTransactions(uid, db) {
    if (!uid)
        return 0;
    const anonymizedId = 'deleted_' + crypto.createHash('sha256').update(uid).digest('hex').substring(0, 12);
    let totalAnonymized = 0;
    // 1. Transactions où l'utilisateur est initiateur (userId)
    const userTxSnap = await db.collection('transactions').where('userId', '==', uid).get();
    if (!userTxSnap.empty) {
        const batch = db.batch();
        userTxSnap.docs.forEach((doc) => {
            batch.update(doc.ref, {
                userId: anonymizedId,
                userName: 'Utilisateur supprimé',
                userEmail: '',
                anonymized: true,
            });
        });
        await batch.commit();
        totalAnonymized += userTxSnap.size;
    }
    // 2. Transactions où l'utilisateur est contrepartie (partnerUid)
    const partnerTxSnap = await db.collection('transactions').where('partnerUid', '==', uid).get();
    if (!partnerTxSnap.empty) {
        const batch = db.batch();
        partnerTxSnap.docs.forEach((doc) => {
            batch.update(doc.ref, {
                partnerUid: anonymizedId,
                partnerName: 'Utilisateur supprimé',
                anonymized: true,
            });
        });
        await batch.commit();
        totalAnonymized += partnerTxSnap.size;
    }
    return totalAnonymized;
}
exports.anonymizeTransactions = anonymizeTransactions;
//# sourceMappingURL=anonymizeTransactions.js.map