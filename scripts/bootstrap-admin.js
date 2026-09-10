/**
 * 👑 scripts/bootstrap-admin.js
 * Script local Node.js pour initialiser le premier administrateur suprême de Troco via Firebase Admin SDK.
 * À exécuter UNE SEULE FOIS par le fondateur.
 *
 * Utilisation :
 *   node scripts/bootstrap-admin.js [email_ou_uid] [chemin_cle_service_account.json]
 * Exemple :
 *   node scripts/bootstrap-admin.js mateopolo91@gmail.com
 *   node scripts/bootstrap-admin.js mateopolo91@gmail.com ./serviceAccountKey.json
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const targetIdentifier = process.argv[2] || 'mateopolo91@gmail.com';
const providedKeyPath = process.argv[3];

function initializeAdminSDK() {
  // 1. Clé spécifiée en argument
  if (providedKeyPath && fs.existsSync(providedKeyPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(providedKeyPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log(`🔑 Service Account chargé depuis : ${providedKeyPath}`);
    return;
  }

  // 2. Recherche de clés locales standards (dans la racine ou config)
  const candidatePaths = [
    path.join(__dirname, '..', 'serviceAccountKey.json'),
    path.join(__dirname, '..', 'troco-firebase-adminsdk.json'),
    path.join(__dirname, '..', 'service-account.json'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      const serviceAccount = JSON.parse(fs.readFileSync(p, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log(`🔑 Service Account auto-détecté depuis : ${p}`);
      return;
    }
  }

  // 3. Fallback sur les Application Default Credentials (gcloud auth application-default login)
  try {
    admin.initializeApp({
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'troco-8a6eb',
      credential: admin.credential.applicationDefault(),
    });
    console.log('🌐 Connexion via Application Default Credentials (ADC)');
  } catch (err) {
    console.error('\n❌ ERREUR: Impossible de charger les identifiants Firebase Admin.');
    console.error('Veuillez fournir la clé de compte de service :');
    console.error('  node scripts/bootstrap-admin.js <email> <chemin/vers/serviceAccountKey.json>\n');
    console.error('Ou téléchargez votre clé depuis Firebase Console -> Project Settings -> Service accounts.');
    process.exit(1);
  }
}

async function bootstrapAdmin() {
  console.log('====================================================');
  console.log('🚀 TROCO — BOOTSTRAP INITIAL ADMINISTRATEUR');
  console.log('====================================================');
  console.log(`Cible : ${targetIdentifier}`);

  initializeAdminSDK();
  const db = admin.firestore();

  let userRecord;
  try {
    if (targetIdentifier.includes('@')) {
      userRecord = await admin.auth().getUserByEmail(targetIdentifier);
    } else {
      userRecord = await admin.auth().getUser(targetIdentifier);
    }
  } catch (err) {
    console.error(`\n❌ Utilisateur introuvable pour "${targetIdentifier}":`, err.message);
    process.exit(1);
  }

  const uid = userRecord.uid;
  console.log(`👤 Utilisateur identifié : ${userRecord.email || 'Sans email'} (UID: ${uid})`);

  // 1. Définition du custom claim 'admin: true'
  const currentClaims = userRecord.customClaims || {};
  const newClaims = {
    ...currentClaims,
    admin: true,
  };

  await admin.auth().setCustomUserClaims(uid, newClaims);
  console.log('✅ Custom Claim { admin: true } appliqué avec succès.');

  // 2. Synchronisation du profil Firestore users/{uid}
  try {
    const userDocRef = db.collection('users').doc(uid);
    await userDocRef.set({
      isAdmin: true,
      role: 'admin',
      adminBootstrapDate: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log('✅ Profil Firestore synchronisé (isAdmin: true, role: "admin").');
  } catch (dbErr) {
    console.warn('⚠️ Avertissement : Impossible d’écrire dans Firestore:', dbErr.message);
  }

  console.log('\n🎉 SUCCÈS ! L’utilisateur est désormais Administrateur certifié.');
  console.log('NOTE : Si l’utilisateur est actuellement connecté dans l’application,');
  console.log('il doit se déconnecter puis se reconnecter (ou attendre le refresh du token) pour activer ses droits.\n');
  process.exit(0);
}

bootstrapAdmin().catch((err) => {
  console.error('\n❌ Échec critique du script bootstrap :', err);
  process.exit(1);
});
