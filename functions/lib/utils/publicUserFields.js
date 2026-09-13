"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPublicUserFields = void 0;
const firestore_1 = require("firebase-admin/firestore");
/**
 * 🔒 Extrait STRICTEMENT les champs publics d'un document utilisateur (users/{uid}).
 * Garantit la conformité RGPD (Article 5 - Minimisation des données).
 * Exclut catégoriquement : email, soldes financiers, rôle, tokens, motifs de ban, etc.
 */
function extractPublicUserFields(data, options = {}) {
    const source = data || {};
    return {
        name: typeof source.name === 'string' ? source.name : '',
        username: typeof source.username === 'string' ? source.username : '',
        avatar: typeof source.avatar === 'string' ? source.avatar : '',
        city: typeof source.city === 'string' ? source.city : (typeof source.location === 'string' ? source.location : ''),
        country: typeof source.country === 'string' ? source.country : '',
        languages: Array.isArray(source.languages) && source.languages.length > 0
            ? source.languages.map((l) => String(l))
            : ['FR'],
        kycVerified: Boolean(source.kycVerified),
        rating: typeof source.rating === 'number' ? source.rating : null,
        dealsCompleted: typeof source.dealsCompleted === 'number' ? source.dealsCompleted : Number(source.dealsCompleted || 0),
        isTrocoPlus: Boolean(source.isTrocoPlus || source.subscriptionPlan === 'plus'),
        // Flag public pour permettre le masquage des annonces d'un compte shadow-ban côté feed sans exposer l'attribut sensible
        shadowBannedPublic: Boolean(source.isShadowBanned),
        createdAt: source.createdAt || (options.preserveTimestamps ? null : firestore_1.FieldValue.serverTimestamp()),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
}
exports.extractPublicUserFields = extractPublicUserFields;
//# sourceMappingURL=publicUserFields.js.map