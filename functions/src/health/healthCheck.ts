import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';

const HEALTH_CHECK_TIMEOUT_MS = 5000;

type HealthStatus = 'ok' | 'degraded';

interface HealthResponse {
  status: HealthStatus;
  timestamp: string;
  version: string;
  checks: {
    firestore: 'ok' | 'error';
    auth: 'ok' | 'error';
  };
}

export const health = onRequest(
  {
    timeoutSeconds: 5,
    cors: true,
  },
  async (_request, response) => {
    const timestamp = new Date().toISOString();
    const result: HealthResponse = {
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
        getFirestore().doc('_system/health').get(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Firestore health check timed out')), HEALTH_CHECK_TIMEOUT_MS);
        }),
      ]);
    } catch {
      result.status = 'degraded';
      result.checks.firestore = 'error';
      response.status(503).json(result);
      return;
    }

    try {
      getAuth();
    } catch {
      result.status = 'degraded';
      result.checks.auth = 'error';
      response.status(503).json(result);
      return;
    }

    response.status(200).json(result);
  },
);
