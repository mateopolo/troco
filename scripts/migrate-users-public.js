/**
 * 📦 scripts/migrate-users-public.js
 * Script local de migration (backfill) one-shot vers la collection users_public.
 * Conforme RGPD (Article 5 - Minimisation des données).
 *
 * Utilisation :
 *   node scripts/migrate-users-public.js [chemin_cle_service_account.json]
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const providedKeyPath = process.argv[2];

function initializeAdminSDK() {
  if (providedKeyPath && fs.existsSync(providedKeyPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(providedKeyPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log(`🔑 Service Account chargé depuis : ${providedKeyPath}`);
    return;
  }

  const candidatePaths = [
    path.join(__dirname, '..', 'serviceAccountKey.json'),
    path.join(__dirname, '..', 'troco-firebase-adminsdk.json'),
    path.join(__dirname, '..', 'service-account.json'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      const serviceAccount = JSON.parse(fs.readFileSync(p, 'utf8'));
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      console.log(`🔑 Service Account auto-détecté depuis : ${p}`);
      return;
    }
  }

  try {
    admin.initializeApp({
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'troco-8a6eb',
      credential: admin.credential.applicationDefault(),
    });
    console.log('🌐 Connexion via Application Default Credentials (ADC)');
  } catch (err) {
    console.error('\n❌ ERREUR: Impossible de charger les identifiants Firebase Admin.');
    console.error('Veuillez fournir la clé de compte de service :');
    console.error('  node scripts/migrate-users-public.js <chemin/vers/serviceAccountKey.json>\n');
    process.exit(1);
  }
}

function extractPublicFields(source) {
  const data = source || {};
  return {
    name: typeof data.name === 'string' ? data.name : '',
    username: typeof data.username === 'string' ? data.username : '',
    avatar: typeof data.avatar === 'string' ? data.avatar : '',
    city: typeof data.city === 'string' ? data.city : (typeof data.location === 'string' ? data.location : ''),
    country: typeof data.country === 'string' ? data.country : '',
    languages: Array.isArray(data.languages) && data.languages.length > 0 ? data.languages : ['FR'],
    kycVerified: Boolean(data.kycVerified),
    rating: typeof data.rating === 'number' ? data.rating : null,
    dealsCompleted: Number(data.dealsCompleted || 0),
    isTrocoPlus: Boolean(data.isTrocoPlus || data.subscriptionPlan === 'plus'),
    shadowBannedPublic: Boolean(data.isShadowBanned),
    createdAt: data.createdAt || admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

async function runMigration() {
  console.log('====================================================');
  console.log('🚀 TROCO — MIGRATION RGPD : USERS -> USERS_PUBLIC');
  console.log('====================================================');

  initializeAdminSDK();
  const db = admin.firestore();

  console.log('📡 Récupération de la collection "users"...');
  const snapshot = await db.collection('users').get();
  const total = snapshot.size;

  console.log(`📊 ${total} utilisateur(s) trouvé(s) à migrer.`);

  if (total === 0) {
    console.log('✅ Aucun utilisateur à migrer. Terminé.');
    process.exit(0);
  }

  const BATCH_SIZE = 400;
  let batch = db.batch();
  let ops = 0;
  let migrated = 0;

  for (const doc of snapshot.docs) {
    const uid = doc.id;
    const raw = doc.data();
    const publicProfile = extractPublicFields(raw);

    const ref = db.collection('users_public').doc(uid);
    batch.set(ref, publicProfile, { merge: true });
    ops++;
    migrated++;

    if (ops >= BATCH_SIZE) {
      await batch.commit();
      console.log(`⏳ Batch validé (${migrated}/${total})...`);
      batch = db.batch();
      ops = 0;
    }
  }

  if (ops > 0) {
    await batch.commit();
  }

  console.log(`\n🎉 SUCCÈS ! ${migrated} profils publics synchronisés dans "users_public".`);
  console.log('🔒 Les champs sensibles (emails, soldes, rôle) sont strictement protégés.\n');
  process.exit(0);
}

runMigration().catch((err) => {
  console.error('\n❌ Erreur critique lors de la migration :', err);
  process.exit(1);
});
