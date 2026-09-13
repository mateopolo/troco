"use strict";
/**
 * 📊 Types et utilitaires de reporting pour la migration des participants de chat
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatReportSummary = exports.createEmptyReport = void 0;
/**
 * Initialise un rapport de migration vierge
 */
function createEmptyReport() {
    return {
        totalChats: 0,
        alreadyMigrated: 0,
        migrated: 0,
        orphans: 0,
        skipped: 0,
        errors: [],
        startedAt: new Date().toISOString(),
    };
}
exports.createEmptyReport = createEmptyReport;
/**
 * Génère un résumé textuel lisible du rapport de migration
 */
function formatReportSummary(report, dryRun) {
    const mode = dryRun ? 'DRY-RUN (Simulation sans écriture)' : 'RÉEL (Écritures appliquées)';
    const lines = [
        `════════════════════════════════════════════════════════════`,
        `📋 RAPPORT DE MIGRATION CHAT PARTICIPANTS — Mode: ${mode}`,
        `════════════════════════════════════════════════════════════`,
        `Total chats analysés     : ${report.totalChats}`,
        `Déjà conformes (UIDs)    : ${report.alreadyMigrated}`,
        `Migrés avec succès       : ${report.migrated}`,
        `Orphelins (sans UID)     : ${report.orphans}`,
        `Chats ignorés            : ${report.skipped}`,
        `Erreurs rencontrées      : ${report.errors.length}`,
        `Durée d'exécution        : ${report.durationMs ?? 0} ms`,
        `════════════════════════════════════════════════════════════`,
    ];
    if (report.errors.length > 0) {
        lines.push(`Détail des erreurs et avertissements :`);
        report.errors.slice(0, 10).forEach((err, idx) => {
            lines.push(`  ${idx + 1}. Chat ${err.chatId} : [${err.reason}] ${JSON.stringify(err.unmapped || err.details || '')}`);
        });
        if (report.errors.length > 10) {
            lines.push(`  ... et ${report.errors.length - 10} autre(s) erreur(s).`);
        }
    }
    return lines.join('\n');
}
exports.formatReportSummary = formatReportSummary;
//# sourceMappingURL=migrationReport.js.map