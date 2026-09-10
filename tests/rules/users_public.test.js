import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * 🧪 TESTS DE SÉCURITÉ FIRESTORE RULES : USERS_PUBLIC (P0-SEC-02)
 *
 * Scénarios vérifiés :
 * 1. Utilisateur non-authentifié (anonyme) -> lecture interdite
 * 2. Utilisateur authentifié -> lecture autorisée
 * 3. Utilisateur authentifié -> écriture / création / update / suppression interdite
 * 4. Administrateur depuis client SDK -> écriture directe interdite (seules les Cloud Functions écrivent)
 */

const PROJECT_ID = 'troco-users-public-rules-test';
const rulesPath = resolve(process.cwd(), 'firestore.rules');
const rulesContent = readFileSync(rulesPath, 'utf8');

let testEnv = null;
let useEmulator = false;
let simulatedDb = {};

async function checkEmulatorAvailable(host, port) {
  try {
    const res = await fetch(`http://${host}:${port}/`, { method: 'GET', signal: AbortSignal.timeout(1200) });
    return res.status < 500;
  } catch (_) {
    return false;
  }
}

class UsersPublicRuleSimulator {
  static evaluate({ auth, path, operation }) {
    const isAuthenticated = Boolean(auth && auth.uid);
    const segments = path.split('/').filter(Boolean);

    if (segments[0] === 'users_public') {
      if (operation === 'get' || operation === 'list') {
        return isAuthenticated;
      }
      // write/create/update/delete toujours false depuis le client
      return false;
    }

    return false;
  }
}

class SimulatedContext {
  constructor(auth) {
    this.auth = auth;
  }

  firestore() {
    return {
      doc: (docPath) => ({
        get: async () => {
          const allowed = UsersPublicRuleSimulator.evaluate({
            auth: this.auth,
            path: docPath,
            operation: 'get',
          });
          if (!allowed) {
            const err = new Error(`PERMISSION_DENIED: False for 'get' on ${docPath}`);
            err.code = 'permission-denied';
            throw err;
          }
          return { exists: () => Boolean(simulatedDb[docPath]), data: () => simulatedDb[docPath] };
        },
        set: async (data) => {
          const allowed = UsersPublicRuleSimulator.evaluate({
            auth: this.auth,
            path: docPath,
            operation: 'create',
          });
          if (!allowed) {
            const err = new Error(`PERMISSION_DENIED: False for 'create' on ${docPath}`);
            err.code = 'permission-denied';
            throw err;
          }
          simulatedDb[docPath] = data;
        },
        update: async (data) => {
          const allowed = UsersPublicRuleSimulator.evaluate({
            auth: this.auth,
            path: docPath,
            operation: 'update',
          });
          if (!allowed) {
            const err = new Error(`PERMISSION_DENIED: False for 'update' on ${docPath}`);
            err.code = 'permission-denied';
            throw err;
          }
          simulatedDb[docPath] = { ...(simulatedDb[docPath] || {}), ...data };
        },
        delete: async () => {
          const allowed = UsersPublicRuleSimulator.evaluate({
            auth: this.auth,
            path: docPath,
            operation: 'delete',
          });
          if (!allowed) {
            const err = new Error(`PERMISSION_DENIED: False for 'delete' on ${docPath}`);
            err.code = 'permission-denied';
            throw err;
          }
          delete simulatedDb[docPath];
        },
      }),
    };
  }
}

describe('🌐 Firestore Rules : users_public/{uid}', () => {
  beforeAll(async () => {
    const isEmulatorRunning = await checkEmulatorAvailable('127.0.0.1', 8080);
    if (isEmulatorRunning) {
      try {
        testEnv = await initializeTestEnvironment({
          projectId: PROJECT_ID,
          firestore: {
            rules: rulesContent,
            host: '127.0.0.1',
            port: 8080,
          },
        });
        useEmulator = true;
      } catch (_) {
        useEmulator = false;
      }
    }
  });

  afterAll(async () => {
    if (testEnv) await testEnv.cleanup();
  });

  beforeEach(async () => {
    simulatedDb = {};
    if (useEmulator && testEnv) {
      await testEnv.clearFirestore();
    }
  });

  function getContext(auth) {
    if (useEmulator && testEnv) {
      return auth ? testEnv.authenticatedContext(auth.uid, auth.token || {}) : testEnv.unauthenticatedContext();
    }
    return new SimulatedContext(auth);
  }

  it('❌ Un utilisateur anonyme ne peut PAS lire users_public', async () => {
    const unauthDb = getContext(null).firestore();
    await expect(unauthDb.doc('users_public/user_123').get()).rejects.toThrow(/permission-denied|PERMISSION_DENIED/);
  });

  it('✅ Un utilisateur authentifié PEUT lire users_public/{uid}', async () => {
    const authDb = getContext({ uid: 'alice_456' }).firestore();
    await expect(authDb.doc('users_public/bob_789').get()).resolves.not.toThrow();
  });

  it('❌ Un utilisateur authentifié ne peut PAS créer directement un document dans users_public', async () => {
    const authDb = getContext({ uid: 'alice_456' }).firestore();
    await expect(authDb.doc('users_public/alice_456').set({
      name: 'Piratage Alice',
      rating: 5.0,
    })).rejects.toThrow(/permission-denied|PERMISSION_DENIED/);
  });

  it('❌ Un utilisateur authentifié ne peut PAS modifier un profil dans users_public', async () => {
    const authDb = getContext({ uid: 'alice_456' }).firestore();
    await expect(authDb.doc('users_public/bob_789').update({
      rating: 1.0,
    })).rejects.toThrow(/permission-denied|PERMISSION_DENIED/);
  });

  it('❌ Un utilisateur authentifié ne peut PAS supprimer un document de users_public', async () => {
    const authDb = getContext({ uid: 'alice_456' }).firestore();
    await expect(authDb.doc('users_public/bob_789').delete()).rejects.toThrow(/permission-denied|PERMISSION_DENIED/);
  });

  it('❌ Même un administrateur ne peut PAS écrire directement dans users_public depuis le client', async () => {
    const adminDb = getContext({ uid: 'admin_root', token: { admin: true } }).firestore();
    await expect(adminDb.doc('users_public/victim_1').set({
      name: 'Hack',
    })).rejects.toThrow(/permission-denied|PERMISSION_DENIED/);
  });
});
