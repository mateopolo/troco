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
exports.structLog = exports.logAdminAction = void 0;
const logger = __importStar(require("firebase-functions/logger"));
/**
 * 📝 Journalisation structurée dans Cloud Logging pour chaque action administrateur
 * Permet un audit trail inviolable, indexable et filtrable dans Google Cloud Console
 */
function logAdminAction(payload) {
    const structuredEntry = {
        severity: payload.status === 'failure' ? 'ERROR' : 'INFO',
        message: `[ADMIN AUDIT] Action: ${payload.action} par ${payload.by}${payload.target ? ` sur cible ${payload.target}` : ''}`,
        adminAudit: {
            action: payload.action,
            callerUid: payload.by,
            targetId: payload.target || null,
            details: payload.details || {},
            status: payload.status || 'success',
            errorMessage: payload.error || null,
            timestamp: payload.timestamp || new Date().toISOString(),
        }
    };
    if (payload.status === 'failure') {
        logger.error(structuredEntry.message, structuredEntry);
    }
    else if (payload.status === 'warning') {
        logger.warn(structuredEntry.message, structuredEntry);
    }
    else {
        logger.info(structuredEntry.message, structuredEntry);
    }
}
exports.logAdminAction = logAdminAction;
/**
 * 📊 Journalisation structurée générique pour les actions financières et RGPD
 */
async function structLog(action, payload) {
    const structuredEntry = {
        severity: 'INFO',
        message: `[STRUCTURED AUDIT] ${action}`,
        audit: {
            action,
            ...payload,
            timestamp: new Date().toISOString(),
        }
    };
    logger.info(structuredEntry.message, structuredEntry);
}
exports.structLog = structLog;
//# sourceMappingURL=logger.js.map