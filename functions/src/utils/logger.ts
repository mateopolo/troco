import * as logger from 'firebase-functions/logger';

export interface AdminLogPayload {
  action: string;
  by: string;
  target?: string;
  details?: Record<string, unknown> | null;
  status?: 'success' | 'failure' | 'warning';
  error?: string;
  timestamp?: string;
}

/**
 * 📝 Journalisation structurée dans Cloud Logging pour chaque action administrateur
 * Permet un audit trail inviolable, indexable et filtrable dans Google Cloud Console
 */
export function logAdminAction(payload: AdminLogPayload): void {
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
  } else if (payload.status === 'warning') {
    logger.warn(structuredEntry.message, structuredEntry);
  } else {
    logger.info(structuredEntry.message, structuredEntry);
  }
}

/**
 * 📊 Journalisation structurée générique pour les actions financières et RGPD
 */
export async function structLog(action: string, payload: Record<string, unknown>): Promise<void> {
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
