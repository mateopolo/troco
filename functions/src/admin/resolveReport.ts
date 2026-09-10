import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { CallableRequest } from 'firebase-functions/v2/https';
import { throwForbidden, throwBadRequest, throwUnauthorized, throwNotFound } from '../utils/errors';
import { logAdminAction } from '../utils/logger';
import { enforceAdminRateLimit } from '../middleware/rateLimit';

export interface ResolveReportRequest {
  reportId: string;
  status: 'resolved' | 'dismissed' | 'pending';
  resolution?: string;
}

export interface ResolveReportResponse {
  success: boolean;
  reportId: string;
  status: string;
  resolution: string;
}

/**
 * ⚖️ Cloud Function Callable : resolveReport
 * Permet à un administrateur de statuer sur un signalement (résolu, rejeté, etc.) avec motif.
 */
export async function handleResolveReport(
  request: CallableRequest<ResolveReportRequest>,
  db: Firestore
): Promise<ResolveReportResponse> {
  const auth = request.auth;
  if (!auth || !auth.uid) {
    throwUnauthorized('Authentification requise.');
  }

  if (auth.token?.admin !== true) {
    logAdminAction({
      action: 'resolveReport',
      by: auth.uid,
      status: 'failure',
      error: 'Tentative non autorisée par un utilisateur non-admin'
    });
    throwForbidden('Accès réservé aux administrateurs certifiés.');
  }

  // Middleware Rate-Limiting (max 10 appels/minute)
  await enforceAdminRateLimit(db, auth.uid);

  const { reportId, status, resolution = '' } = request.data || {};
  if (!reportId || typeof reportId !== 'string') {
    throwBadRequest('Paramètre reportId (string) manquant ou invalide.');
  }

  const validStatuses = ['resolved', 'dismissed', 'pending'];
  if (!status || !validStatuses.includes(status)) {
    throwBadRequest(`Statut invalide. Valeurs permises: ${validStatuses.join(', ')}.`);
  }

  try {
    const reportRef = db.collection('reports').doc(reportId);
    const reportSnap = await reportRef.get();

    if (!reportSnap.exists) {
      throwNotFound(`Signalement #${reportId} introuvable.`);
    }

    const reportData = reportSnap.data() || {};

    await reportRef.update({
      status,
      resolution: String(resolution || ''),
      resolvedBy: auth.uid,
      resolvedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    logAdminAction({
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
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logAdminAction({
      action: 'resolveReport',
      by: auth.uid,
      target: reportId,
      status: 'failure',
      error: errorMsg,
    });
    throw err;
  }
}
