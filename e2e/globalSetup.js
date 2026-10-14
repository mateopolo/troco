const fs = require('fs');
const path = require('path');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

module.exports = async () => {
  // Connecter le SDK Admin aux émulateurs locaux
  process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199';

  const app = getApps().length === 0 ? initializeApp({ projectId: 'troco-8a6eb' }) : getApps()[0];
  const auth = getAuth(app);
  const db = getFirestore(app);

  // 1. Créer ou récupérer les 2 utilisateurs de test
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail('user@test.troco');
  } catch (_) {
    userRecord = await auth.createUser({
      email: 'user@test.troco',
      password: 'test1234',
      displayName: 'Test User',
    });
  }

  let adminRecord;
  try {
    adminRecord = await auth.getUserByEmail('admin@test.troco');
  } catch (_) {
    adminRecord = await auth.createUser({
      email: 'admin@test.troco',
      password: 'test1234',
      displayName: 'Test Admin',
    });
  }

  // 2. Assigner le claim admin au compte administrateur
  await auth.setCustomUserClaims(adminRecord.uid, { admin: true });

  // 3. Générer les custom tokens
  const userToken = await auth.createCustomToken(userRecord.uid);
  const adminToken = await auth.createCustomToken(adminRecord.uid);

  // 4. Écrire les profils Firestore dans l'émulateur
  try {
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      name: 'Test User',
      username: '@testuser',
      email: 'user@test.troco',
      trocoTokens: 50,
      euroBalance: 120.00,
      onboardingCompleted: true,
      tutorialCompleted: true,
      welcomeBonusClaimed: true,
      cguAcceptedAt: new Date().toISOString(),
      cguVersion: '2026.1',
      isAdmin: false,
      role: 'user',
      skills: ['Développement Web', 'Design UI'],
      equipment: ['MacBook Pro'],
      updatedAt: new Date(),
    }, { merge: true });

    await db.collection('users').doc(adminRecord.uid).set({
      uid: adminRecord.uid,
      name: 'Test Admin',
      username: '@testadmin',
      email: 'admin@test.troco',
      trocoTokens: 100,
      euroBalance: 500.00,
      onboardingCompleted: true,
      tutorialCompleted: true,
      welcomeBonusClaimed: true,
      cguAcceptedAt: new Date().toISOString(),
      cguVersion: '2026.1',
      isAdmin: true,
      role: 'admin',
      skills: ['Administration', 'Modération'],
      equipment: ['PC Admin'],
      updatedAt: new Date(),
    }, { merge: true });

    // 5. Créer une discussion de test entre user et admin
    await db.collection('chats').doc('test-chat-e2e').set({
      id: 'test-chat-e2e',
      participants: [userRecord.uid, adminRecord.uid],
      participantUids: [userRecord.uid, adminRecord.uid],
      participantNames: {
        [userRecord.uid]: 'Test User',
        [adminRecord.uid]: 'Test Admin',
      },
      lastMessage: 'Bonjour ! Bienvenue sur Troco.',
      lastMessageTime: new Date().toISOString(),
      updatedAt: new Date(),
    }, { merge: true });

    // Message dans la discussion
    await db.collection('chats').doc('test-chat-e2e').collection('messages').doc('msg-init').set({
      id: 'msg-init',
      senderId: adminRecord.uid,
      text: 'Bonjour ! Bienvenue sur Troco.',
      createdAt: new Date(),
    }, { merge: true });

    // 6. Créer une annonce de test
    await db.collection('listings').doc('test-listing-e2e').set({
      id: 'test-listing-e2e',
      title: 'Cours de dev React & Firebase',
      description: 'Session de coaching et programmation collaborative.',
      createdBy: userRecord.uid,
      authorUid: userRecord.uid,
      authorName: 'Test User',
      category: 'Services',
      price: 25,
      tokens: 2,
      createdAt: new Date(),
      status: 'active',
    }, { merge: true });

    // 7. Créer un signalement de test pour l'Admin Panel
    await db.collection('reports').doc('test-report-e2e').set({
      id: 'test-report-e2e',
      targetType: 'message',
      targetId: 'msg-spam-1',
      reason: 'Spam potentiel',
      reporterUid: userRecord.uid,
      status: 'pending',
      createdAt: new Date(),
    }, { merge: true });

    // 8. Créer un message dans le Global Chat
    await db.collection('globalChat').doc('test-global-msg-1').set({
      id: 'test-global-msg-1',
      senderUid: userRecord.uid,
      senderName: 'Test User',
      text: 'Bienvenue dans la communauté Troco !',
      createdAt: new Date(),
    }, { merge: true });
  } catch (err) {
    console.warn('[E2E Global Setup] Firestore seeding warning:', err.message);
  }

  // Écrire les tokens dans e2e/.test-credentials.json
  const credsPath = path.join(__dirname, '.test-credentials.json');
  fs.writeFileSync(
    credsPath,
    JSON.stringify(
      {
        userToken,
        adminToken,
        userUid: userRecord.uid,
        adminUid: adminRecord.uid,
        userEmail: 'user@test.troco',
        adminEmail: 'admin@test.troco',
      },
      null,
      2
    )
  );

  console.log('[E2E Global Setup] Test credentials & Firestore seeds ready at:', credsPath);
};
