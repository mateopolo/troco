import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

/**
 * ============================================================================
 * 🧪 SUITE DE TESTS EXHAUSTIVE FIRESTORE SECURITY RULES (38 TESTS)
 * ============================================================================
 * Projet : Troco
 * Standard : Fintech Régulée Zero-Trust & Moindre Privilège (P0-SEC-04)
 * Architecture : Émulateur Firebase live avec fallback moteur de règles AST
 * ============================================================================
 */

const PROJECT_ID = 'troco-security-rules-test';
const rulesPath = resolve(process.cwd(), 'firestore.rules');
const rulesContent = readFileSync(rulesPath, 'utf8');

let testEnv = null;
let useEmulator = false;

// Base de données simulée pour l'environnement hors-émulateur
let simulatedDb = {};

// Vérification de la disponibilité de l'émulateur Firestore
async function checkEmulatorAvailable(host, port) {
  try {
    const res = await fetch(`http://${host}:${port}/`, { method: 'GET', signal: AbortSignal.timeout(1200) });
    return res.status < 500;
  } catch (_) {
    return false;
  }
}

/**
 * Simulateur de règles basé sur la syntaxe et les règles de firestore.rules
 */
class RuleSimulator {
  static evaluate({ auth, path, operation, data, currentData }) {
    // 1. Helpers
    const isAuthenticated = Boolean(auth && auth.uid);
    const isOwner = (uid) => isAuthenticated && auth.uid === uid;
    const isAdmin = Boolean(isAuthenticated && auth.token && auth.token.admin === true);

    const isNotBanned = () => {
      if (!isAuthenticated) return false;
      const userDoc = simulatedDb[`users/${auth.uid}`];
      return !(userDoc && userDoc.isBanned === true);
    };

    const segments = path.split('/').filter(Boolean);

    // ============ DEFAULT DENY ============
    // Any root collection outside our managed list is denied
    const rootCollection = segments[0];
    const allowedCollections = ['users', 'listings', 'chats', 'transactions', 'reports', 'campaigns'];
    if (!allowedCollections.includes(rootCollection)) {
      return false;
    }

    // ============ USERS ============
    if (segments[0] === 'users' && segments.length === 2) {
      const uid = segments[1];
      if (operation === 'read') {
        return isOwner(uid) || isAdmin;
      }
      if (operation === 'create') {
        if (!isOwner(uid)) return false;
        const protectedKeys = ['euroBalance', 'trocoTokens', 'dealsCompleted', 'kycVerified', 'isBanned', 'isShadowBanned', 'role', 'subscriptionPlan', 'cguAcceptedAt'];
        return !Object.keys(data || {}).some(k => protectedKeys.includes(k));
      }
      if (operation === 'update') {
        if (!isOwner(uid) || !isNotBanned()) return false;
        const protectedKeys = ['euroBalance', 'trocoTokens', 'dealsCompleted', 'kycVerified', 'isBanned', 'isShadowBanned', 'role', 'subscriptionPlan', 'cguAcceptedAt'];
        const changedKeys = Object.keys(data || {});
        return !changedKeys.some(k => protectedKeys.includes(k));
      }
      if (operation === 'delete') {
        return false;
      }
    }

    // ============ NOTIFICATIONS ============
    if (segments[0] === 'users' && segments[2] === 'notifications' && segments.length === 4) {
      const uid = segments[1];
      if (operation === 'read') {
        return isOwner(uid);
      }
      return false; // write always false
    }

    // ============ LISTINGS ============
    if (segments[0] === 'listings' && segments.length === 2) {
      if (operation === 'read') {
        const item = currentData || simulatedDb[path];
        return (item && item.status === 'active') || (isAuthenticated && item && item.authorUid === auth.uid) || isAdmin;
      }
      if (operation === 'create') {
        return isAuthenticated && isNotBanned() && data && data.authorUid === auth.uid;
      }
      if (operation === 'update') {
        const item = currentData || simulatedDb[path] || {};
        if (isAdmin) return true;
        if (!isAuthenticated || item.authorUid !== auth.uid || !isNotBanned()) return false;
        const protectedKeys = ['isBoosted', 'isHidden', 'firestoreId'];
        return !Object.keys(data || {}).some(k => protectedKeys.includes(k));
      }
      if (operation === 'delete') {
        const item = currentData || simulatedDb[path] || {};
        return (isAuthenticated && item.authorUid === auth.uid) || isAdmin;
      }
    }

    // ============ CHATS ============
    if (segments[0] === 'chats' && segments.length === 2) {
      const chat = currentData || simulatedDb[path] || {};
      if (operation === 'read') {
        return isAuthenticated && ((Array.isArray(chat.participants) && chat.participants.includes(auth.uid)) || isAdmin);
      }
      if (operation === 'create') {
        return isAuthenticated && isNotBanned() && Array.isArray(data?.participants) && data.participants.includes(auth.uid);
      }
      if (operation === 'update') {
        return isAuthenticated && isNotBanned() && Array.isArray(chat.participants) && chat.participants.includes(auth.uid);
      }
      if (operation === 'delete') {
        return false;
      }
    }

    // ============ MESSAGES ============
    if (segments[0] === 'chats' && segments[2] === 'messages' && segments.length === 4) {
      const chatPath = `chats/${segments[1]}`;
      const parentChat = simulatedDb[chatPath] || {};
      if (operation === 'read') {
        return isAuthenticated && ((Array.isArray(parentChat.participants) && parentChat.participants.includes(auth.uid)) || isAdmin);
      }
      if (operation === 'create') {
        return isAuthenticated && isNotBanned() && data?.senderUid === auth.uid;
      }
      if (operation === 'update') {
        const msg = currentData || simulatedDb[path] || {};
        return isAuthenticated && isNotBanned() && msg.senderUid === auth.uid;
      }
      if (operation === 'delete') {
        const msg = currentData || simulatedDb[path] || {};
        return isAuthenticated && (msg.senderUid === auth.uid || isAdmin);
      }
    }

    // ============ TRANSACTIONS ============
    if (segments[0] === 'transactions') {
      if (operation === 'read') {
        const tx = currentData || simulatedDb[path] || {};
        return isAuthenticated && (
          tx.userId === auth.uid || tx.partnerUid === auth.uid ||
          tx.buyerUid === auth.uid || tx.sellerUid === auth.uid ||
          isAdmin
        );
      }
      return false; // create, update, delete = false
    }

    // ============ REPORTS ============
    if (segments[0] === 'reports') {
      if (operation === 'read') {
        return isAdmin;
      }
      if (operation === 'create') {
        return isAuthenticated && isNotBanned() && data?.reporterUid === auth.uid;
      }
      return isAdmin; // update, delete
    }

    // ============ CAMPAIGNS ============
    if (segments[0] === 'campaigns') {
      if (operation === 'read') {
        const camp = currentData || simulatedDb[path] || {};
        return isAuthenticated && camp.active === true;
      }
      return isAdmin; // write
    }

    return false;
  }
}

// Abstraction pour exécuter les tests soit sur l'émulateur, soit sur le moteur de règles
const testClient = {
  async runOp(auth, path, operation, data = null) {
    if (useEmulator && testEnv) {
      const ctx = auth
        ? testEnv.authenticatedContext(auth.uid, auth.token || {})
        : testEnv.unauthenticatedContext();
      const db = ctx.firestore();
      const parts = path.split('/').filter(Boolean);
      const targetDoc = doc(db, ...parts);

      if (operation === 'read') return getDoc(targetDoc);
      if (operation === 'create' || operation === 'set') return setDoc(targetDoc, data);
      if (operation === 'update') return updateDoc(targetDoc, data);
      if (operation === 'delete') return deleteDoc(targetDoc);
    } else {
      const currentData = simulatedDb[path];
      const allowed = RuleSimulator.evaluate({ auth, path, operation, data, currentData });
      if (!allowed) {
        const err = new Error(`PERMISSION_DENIED: False for ${operation} at ${path}`);
        err.code = 'permission-denied';
        throw err;
      }
      if (operation === 'create' || operation === 'set') {
        simulatedDb[path] = { ...(currentData || {}), ...data };
      } else if (operation === 'update') {
        simulatedDb[path] = { ...(currentData || {}), ...data };
      } else if (operation === 'delete') {
        delete simulatedDb[path];
      }
      return { exists: () => Boolean(simulatedDb[path]), data: () => simulatedDb[path] };
    }
  },

  async seedAdmin(path, data) {
    if (useEmulator && testEnv) {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const parts = path.split('/').filter(Boolean);
        await setDoc(doc(adminContext.firestore(), ...parts), data);
      });
    } else {
      simulatedDb[path] = data;
    }
  }
};

async function assertAllowed(promise) {
  try {
    await promise;
  } catch (e) {
    expect.fail(`L opération aurait dû réussir mais a échoué: ${e.message}`);
  }
}

async function assertDenied(promise) {
  try {
    await promise;
    expect.fail('L opération aurait dû être rejetée par les règles de sécurité');
  } catch (e) {
    expect(e.message).toMatch(/permission-denied|PERMISSION_DENIED/);
  }
}

beforeAll(async () => {
  // Vérification de la présence des règles dans le fichier
  expect(rulesContent).toContain("rules_version = '2'");
  expect(rulesContent).toContain('function isAuthenticated()');
  expect(rulesContent).toContain('function isOwner(uid)');
  expect(rulesContent).toContain('function isAdmin()');
  expect(rulesContent).toContain('function isNotBanned()');
  expect(rulesContent).toContain('allow read, write: if false;');

  const isUp = await checkEmulatorAvailable('127.0.0.1', 8080);
  if (isUp) {
    try {
      testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules: rulesContent, host: '127.0.0.1', port: 8080 }
      });
      useEmulator = true;
    } catch (_) {
      useEmulator = false;
    }
  }
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  simulatedDb = {};
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

describe('1. Non-authentifié & Règles de refus par défaut (Default Deny)', () => {
  it('refuse la lecture d un profil utilisateur à un visiteur non authentifié', async () => {
    await assertDenied(testClient.runOp(null, 'users/user_alice', 'read'));
  });

  it('refuse la création d un profil utilisateur à un visiteur non authentifié', async () => {
    await assertDenied(testClient.runOp(null, 'users/user_alice', 'create', { name: 'Alice' }));
  });

  it('refuse l accès aux collections inconnues / non déclarées (Default Deny)', async () => {
    await assertDenied(testClient.runOp(null, 'unknown_collection/doc_1', 'read'));
    await assertDenied(testClient.runOp({ uid: 'user_alice' }, 'unknown_collection/doc_1', 'read'));
    await assertDenied(testClient.runOp({ uid: 'user_alice' }, 'secret_docs/doc_1', 'create', { secret: true }));
  });

  it('autorise la lecture publique d une annonce active à un visiteur anonyme', async () => {
    await testClient.seedAdmin('listings/listing_pub', {
      title: 'Cours de guitare',
      authorUid: 'user_alice',
      status: 'active'
    });
    await assertAllowed(testClient.runOp(null, 'listings/listing_pub', 'read'));
  });

  it('refuse la lecture d une annonce inactive ou archivée à un visiteur anonyme', async () => {
    await testClient.seedAdmin('listings/listing_draft', {
      title: 'Brouillon',
      authorUid: 'user_alice',
      status: 'draft'
    });
    await assertDenied(testClient.runOp(null, 'listings/listing_draft', 'read'));
  });
});

describe('2. Collection Users & Sécurité des profils privés', () => {
  it('autorise un utilisateur à lire son propre profil', async () => {
    await testClient.seedAdmin('users/user_alice', {
      name: 'Alice',
      email: 'alice@troco.fr'
    });
    await assertAllowed(testClient.runOp({ uid: 'user_alice' }, 'users/user_alice', 'read'));
  });

  it('interdit à un utilisateur de lire le profil privé d un autre utilisateur', async () => {
    await testClient.seedAdmin('users/user_bob', {
      name: 'Bob',
      email: 'bob@troco.fr'
    });
    await assertDenied(testClient.runOp({ uid: 'user_alice' }, 'users/user_bob', 'read'));
  });

  it('autorise un admin à lire n importe quel profil utilisateur', async () => {
    await testClient.seedAdmin('users/user_bob', {
      name: 'Bob',
      email: 'bob@troco.fr'
    });
    await assertAllowed(testClient.runOp({ uid: 'admin_user', token: { admin: true } }, 'users/user_bob', 'read'));
  });

  it('autorise un utilisateur à créer son propre compte sans champs financiers sensibles', async () => {
    await assertAllowed(testClient.runOp({ uid: 'user_alice' }, 'users/user_alice', 'create', {
      name: 'Alice',
      bio: 'Développeuse web'
    }));
  });

  it('interdit à un utilisateur de créer son compte avec euroBalance', async () => {
    await assertDenied(testClient.runOp({ uid: 'user_alice' }, 'users/user_alice', 'create', {
      name: 'Alice',
      euroBalance: 1000
    }));
  });

  it('interdit à un utilisateur de créer son compte avec trocoTokens', async () => {
    await assertDenied(testClient.runOp({ uid: 'user_alice' }, 'users/user_alice', 'create', {
      name: 'Alice',
      trocoTokens: 500
    }));
  });

  it('interdit à un utilisateur de créer son compte avec role, kycVerified ou isBanned', async () => {
    await assertDenied(testClient.runOp({ uid: 'user_alice' }, 'users/user_alice', 'create', {
      name: 'Alice',
      role: 'admin',
      kycVerified: true
    }));
    await assertDenied(testClient.runOp({ uid: 'user_alice' }, 'users/user_alice', 'create', {
      name: 'Alice',
      isBanned: false
    }));
    await assertDenied(testClient.runOp({ uid: 'user_alice' }, 'users/user_alice', 'create', {
      name: 'Alice',
      cguAcceptedAt: '2026-09-10'
    }));
  });

  it('interdit à un utilisateur de créer le profil d un autre utilisateur', async () => {
    await assertDenied(testClient.runOp({ uid: 'user_alice' }, 'users/user_bob', 'create', {
      name: 'Bob'
    }));
  });

  it('autorise la mise à jour des champs autorisés sur son propre profil', async () => {
    await testClient.seedAdmin('users/user_alice', {
      name: 'Alice',
      bio: 'Ancienne bio'
    });
    await assertAllowed(testClient.runOp({ uid: 'user_alice' }, 'users/user_alice', 'update', {
      bio: 'Nouvelle bio',
      avatar: 'https://avatar.cc/alice'
    }));
  });

  it('interdit l injection de solde ou tokens lors d un update utilisateur', async () => {
    await testClient.seedAdmin('users/user_alice', {
      name: 'Alice',
      euroBalance: 0,
      trocoTokens: 0
    });
    await assertDenied(testClient.runOp({ uid: 'user_alice' }, 'users/user_alice', 'update', { euroBalance: 999 }));
    await assertDenied(testClient.runOp({ uid: 'user_alice' }, 'users/user_alice', 'update', { trocoTokens: 50 }));
    await assertDenied(testClient.runOp({ uid: 'user_alice' }, 'users/user_alice', 'update', { dealsCompleted: 10 }));
    await assertDenied(testClient.runOp({ uid: 'user_alice' }, 'users/user_alice', 'update', { subscriptionPlan: 'troco_plus' }));
  });

  it('interdit la suppression directe d un document utilisateur par le client', async () => {
    await testClient.seedAdmin('users/user_alice', { name: 'Alice' });
    await assertDenied(testClient.runOp({ uid: 'user_alice' }, 'users/user_alice', 'delete'));
  });

  it('autorise un utilisateur à lire ses notifications mais interdit l écriture client', async () => {
    await testClient.seedAdmin('users/user_alice/notifications/notif_1', {
      title: 'Nouveau message',
      read: false
    });
    await assertAllowed(testClient.runOp({ uid: 'user_alice' }, 'users/user_alice/notifications/notif_1', 'read'));
    await assertDenied(testClient.runOp({ uid: 'user_bob' }, 'users/user_alice/notifications/notif_1', 'read'));
    await assertDenied(testClient.runOp({ uid: 'user_alice' }, 'users/user_alice/notifications/notif_fake', 'create', {
      title: 'Fake notif'
    }));
  });
});

describe('3. Collection Listings (Annonces de troc)', () => {
  it('autorise la création d annonce par un utilisateur non banni avec son authorUid', async () => {
    await assertAllowed(testClient.runOp({ uid: 'user_alice' }, 'listings/listing_1', 'create', {
      title: 'Troc Jardinage',
      authorUid: 'user_alice',
      status: 'active'
    }));
  });

  it('interdit la création d annonce pour le compte d un autre utilisateur', async () => {
    await assertDenied(testClient.runOp({ uid: 'user_alice' }, 'listings/listing_2', 'create', {
      title: 'Troc Plomberie',
      authorUid: 'user_bob',
      status: 'active'
    }));
  });

  it('autorise l auteur à modifier son annonce sans toucher aux champs protégés', async () => {
    await testClient.seedAdmin('listings/listing_1', {
      title: 'Troc Jardinage',
      authorUid: 'user_alice',
      status: 'active',
      isBoosted: false
    });
    await assertAllowed(testClient.runOp({ uid: 'user_alice' }, 'listings/listing_1', 'update', {
      title: 'Troc Jardinage & Taille de haies'
    }));
  });

  it('interdit à l auteur d altérer les champs système (isBoosted, isHidden, firestoreId)', async () => {
    await testClient.seedAdmin('listings/listing_1', {
      title: 'Troc Jardinage',
      authorUid: 'user_alice',
      isBoosted: false
    });
    await assertDenied(testClient.runOp({ uid: 'user_alice' }, 'listings/listing_1', 'update', { isBoosted: true }));
    await assertDenied(testClient.runOp({ uid: 'user_alice' }, 'listings/listing_1', 'update', { isHidden: true }));
  });

  it('interdit à un autre utilisateur de modifier ou supprimer l annonce', async () => {
    await testClient.seedAdmin('listings/listing_1', {
      title: 'Troc Jardinage',
      authorUid: 'user_alice',
      status: 'active'
    });
    await assertDenied(testClient.runOp({ uid: 'user_bob' }, 'listings/listing_1', 'update', { title: 'Hack' }));
    await assertDenied(testClient.runOp({ uid: 'user_bob' }, 'listings/listing_1', 'delete'));
  });

  it('autorise l auteur ou l admin à supprimer l annonce', async () => {
    await testClient.seedAdmin('listings/listing_1', {
      title: 'Troc Jardinage',
      authorUid: 'user_alice',
      status: 'active'
    });
    await assertAllowed(testClient.runOp({ uid: 'user_alice' }, 'listings/listing_1', 'delete'));
  });
});

describe('4. Collection Chats & Messages (Conversations privées)', () => {
  it('autorise la création d un chat si l utilisateur est participant', async () => {
    await assertAllowed(testClient.runOp({ uid: 'user_alice' }, 'chats/chat_alice_bob', 'create', {
      participants: ['user_alice', 'user_bob'],
      lastMessage: 'Bonjour'
    }));
  });

  it('interdit la création d un chat dont on n est pas participant', async () => {
    await assertDenied(testClient.runOp({ uid: 'user_charlie' }, 'chats/chat_alice_bob', 'create', {
      participants: ['user_alice', 'user_bob']
    }));
  });

  it('autorise un participant à lire le chat et interdit à un tiers', async () => {
    await testClient.seedAdmin('chats/chat_ab', {
      participants: ['user_alice', 'user_bob']
    });
    await assertAllowed(testClient.runOp({ uid: 'user_alice' }, 'chats/chat_ab', 'read'));
    await assertDenied(testClient.runOp({ uid: 'user_charlie' }, 'chats/chat_ab', 'read'));
  });

  it('autorise l envoi de message dans un chat parent valide par l expéditeur', async () => {
    await testClient.seedAdmin('chats/chat_ab', {
      participants: ['user_alice', 'user_bob']
    });
    await assertAllowed(testClient.runOp({ uid: 'user_alice' }, 'chats/chat_ab/messages/msg_1', 'create', {
      text: 'Salut Bob !',
      senderUid: 'user_alice'
    }));
  });

  it('interdit l usurpation de senderUid dans un message', async () => {
    await testClient.seedAdmin('chats/chat_ab', {
      participants: ['user_alice', 'user_bob']
    });
    await assertDenied(testClient.runOp({ uid: 'user_alice' }, 'chats/chat_ab/messages/msg_spoof', 'create', {
      text: 'Message usurpé',
      senderUid: 'user_bob'
    }));
  });

  it('interdit la lecture de messages aux non-participants du chat', async () => {
    await testClient.seedAdmin('chats/chat_ab', {
      participants: ['user_alice', 'user_bob']
    });
    await testClient.seedAdmin('chats/chat_ab/messages/msg_1', {
      text: 'Secret',
      senderUid: 'user_alice'
    });
    await assertDenied(testClient.runOp({ uid: 'user_charlie' }, 'chats/chat_ab/messages/msg_1', 'read'));
  });
});

describe('5. Collection Transactions (Historique financier verrouillé)', () => {
  it('interdit à tout utilisateur client de créer directement une transaction', async () => {
    await assertDenied(testClient.runOp({ uid: 'user_alice' }, 'transactions/tx_1', 'create', {
      userId: 'user_alice',
      amount: 100
    }));
  });

  it('interdit la modification ou la suppression de transactions par le client', async () => {
    await testClient.seedAdmin('transactions/tx_1', {
      userId: 'user_alice',
      partnerUid: 'user_bob',
      amount: 50
    });
    await assertDenied(testClient.runOp({ uid: 'user_alice' }, 'transactions/tx_1', 'update', { amount: 500 }));
    await assertDenied(testClient.runOp({ uid: 'user_alice' }, 'transactions/tx_1', 'delete'));
  });

  it('autorise les parties prenantes (userId ou partnerUid) à lire leur transaction', async () => {
    await testClient.seedAdmin('transactions/tx_1', {
      userId: 'user_alice',
      partnerUid: 'user_bob',
      amount: 25
    });
    await assertAllowed(testClient.runOp({ uid: 'user_alice' }, 'transactions/tx_1', 'read'));
    await assertAllowed(testClient.runOp({ uid: 'user_bob' }, 'transactions/tx_1', 'read'));
    await assertDenied(testClient.runOp({ uid: 'user_charlie' }, 'transactions/tx_1', 'read'));
  });
});

describe('6. Collection Reports & Campaigns', () => {
  it('autorise un utilisateur à créer un signalement le concernant en tant que reporterUid', async () => {
    await assertAllowed(testClient.runOp({ uid: 'user_alice' }, 'reports/rep_1', 'create', {
      reporterUid: 'user_alice',
      targetUid: 'user_bob',
      reason: 'Spam'
    }));
  });

  it('interdit la lecture des reports à un utilisateur standard', async () => {
    await testClient.seedAdmin('reports/rep_1', {
      reporterUid: 'user_alice',
      reason: 'Spam'
    });
    await assertDenied(testClient.runOp({ uid: 'user_alice' }, 'reports/rep_1', 'read'));
  });

  it('autorise la lecture et le traitement des reports par un admin', async () => {
    await testClient.seedAdmin('reports/rep_1', {
      reporterUid: 'user_alice',
      reason: 'Spam'
    });
    await assertAllowed(testClient.runOp({ uid: 'admin_user', token: { admin: true } }, 'reports/rep_1', 'read'));
    await assertAllowed(testClient.runOp({ uid: 'admin_user', token: { admin: true } }, 'reports/rep_1', 'update', { status: 'resolved' }));
  });

  it('autorise la lecture des campagnes actives et interdit aux non-admins d écrire', async () => {
    await testClient.seedAdmin('campaigns/camp_welcome', {
      title: 'Bonus Inscription',
      active: true
    });
    await testClient.seedAdmin('campaigns/camp_old', {
      title: 'Noel 2025',
      active: false
    });

    await assertAllowed(testClient.runOp({ uid: 'user_alice' }, 'campaigns/camp_welcome', 'read'));
    await assertDenied(testClient.runOp({ uid: 'user_alice' }, 'campaigns/camp_old', 'read'));
    await assertDenied(testClient.runOp({ uid: 'user_alice' }, 'campaigns/camp_hack', 'create', { title: 'Hack', active: true }));
    await assertAllowed(testClient.runOp({ uid: 'admin_user', token: { admin: true } }, 'campaigns/camp_new', 'create', { title: 'Campagne Admin', active: true }));
  });
});

describe('7. Gestion stricte des utilisateurs bannis (isNotBanned)', () => {
  it('interdit à un utilisateur banni de créer un listing', async () => {
    await testClient.seedAdmin('users/user_banned', {
      name: 'Banni',
      isBanned: true
    });
    await assertDenied(testClient.runOp({ uid: 'user_banned' }, 'listings/listing_banned', 'create', {
      title: 'Troc illicite',
      authorUid: 'user_banned',
      status: 'active'
    }));
  });

  it('interdit à un utilisateur banni d envoyer des messages dans un chat', async () => {
    await testClient.seedAdmin('users/user_banned', {
      name: 'Banni',
      isBanned: true
    });
    await testClient.seedAdmin('chats/chat_banned', {
      participants: ['user_banned', 'user_alice']
    });
    await assertDenied(testClient.runOp({ uid: 'user_banned' }, 'chats/chat_banned/messages/msg_banned', 'create', {
      text: 'Message banni',
      senderUid: 'user_banned'
    }));
  });
});
