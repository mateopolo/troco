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

    // 6. Créer des annonces de test (12 annonces pour tester la pagination et le scroll infini)
    const testListingsData = [
      { id: 'test-listing-e2e', title: 'Cours de dev React & Firebase', category: 'Services', desc: 'Session de coaching et programmation collaborative.' },
      { id: 'test-listing-e2e-2', title: 'Réparation meuble et montage étagère', category: 'Bricolage', desc: 'Outillage complet et aide au montage de meubles.' },
      { id: 'test-listing-e2e-3', title: 'Jardinage et taille de haies', category: 'Maison', desc: 'Entretien de jardin, tonte et taille.' },
      { id: 'test-listing-e2e-4', title: 'Dépannage informatique et smartphone', category: 'Technologie', desc: 'Assistance logicielle et réparation.' },
      { id: 'test-listing-e2e-5', title: 'Cours d’anglais conversationnel', category: 'Cours', desc: 'Pratique orale fluide et préparation d’entretiens.' },
      { id: 'test-listing-e2e-6', title: 'Aide au déménagement et transport', category: 'Services', desc: 'Bras forts et diable de transport disponible.' },
      { id: 'test-listing-e2e-7', title: 'Peinture murale et finitions intérieures', category: 'Bricolage', desc: 'Préparation des murs et peinture soignée.' },
      { id: 'test-listing-e2e-8', title: 'Création de logo et charte graphique', category: 'Art & Design', desc: 'Identité visuelle moderne sur Figma/Illustrator.' },
      { id: 'test-listing-e2e-9', title: 'Initiation à la guitare acoustique', category: 'Musique', desc: 'Premiers accords et morceaux simples.' },
      { id: 'test-listing-e2e-10', title: 'Garde de chat et promenade de chien', category: 'Services', desc: 'Amoureux des animaux disponible les weekends.' },
      { id: 'test-listing-e2e-11', title: 'Animation musicale et sono pour soirée', category: 'Événements', desc: 'Enceintes de fête et playlist festive.' },
      { id: 'test-listing-e2e-12', title: 'Séance de yoga doux et relaxation', category: 'Bien-être', desc: 'Respiration et étirements guidés.' },
    ];

    for (let i = 0; i < testListingsData.length; i++) {
      const item = testListingsData[i];
      await db.collection('listings').doc(item.id).set({
        id: item.id,
        title: item.title,
        description: item.desc,
        createdBy: userRecord.uid,
        authorUid: userRecord.uid,
        authorName: 'Test User',
        category: item.category,
        price: 25,
        tokens: 2,
        createdAt: new Date(Date.now() - i * 60000),
        status: 'active',
      }, { merge: true });
    }

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
