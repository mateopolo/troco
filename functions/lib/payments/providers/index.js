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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProvider = void 0;
const mockProvider_1 = require("./mockProvider");
__exportStar(require("./mockProvider"), exports);
/**
 * Retourne le fournisseur de paiement configuré.
 * Par défaut en dev : mockProvider.
 */
function getProvider() {
    const configured = process.env.PAYMENT_PROVIDER || 'mock';
    if (configured === 'mock') {
        return mockProvider_1.mockProvider;
    }
    // Support extensible pour les providers de production (ex: Stripe)
    return mockProvider_1.mockProvider;
}
exports.getProvider = getProvider;
//# sourceMappingURL=index.js.map