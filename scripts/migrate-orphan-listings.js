/**
 * SCRIPT DE MIGRATION TROCO : Fusion des annonces orphelines vers le compte réel
 * 
 * 1. Recherche l'ID du compte Google Auth réel (mateopolo91@gmail.com).
 * 2. Recherche l'ID du compte factice (demo_mateopolo avec photo IA Dicebear).
 * 3. Met à jour authorId / authorUid / author / authorAvatar de toutes les annonces orphelines.
 * 4. Supprime le(s) compte(s) factice(s).
 * 5. Vérifie que toutes les annonces sont rattachées au compte réel avec la photo officielle.
 */

const fs = require('fs');
const path = require('path');

// Récupération des tokens d'authentification Google Cloud / Firebase CLI
function getAccessToken() {
  const configPath = path.join(process.env.USERPROFILE || process.env.HOME, '.config', 'configstore', 'firebase-tools.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`Fichier de configuration Firebase introuvable : ${configPath}`);
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const token = config.tokens && config.tokens.access_token;
  if (!token) {
    throw new Error('Aucun access_token trouvé dans la configuration Firebase CLI.');
  }
  return token;
}

const PROJECT_ID = 'troco-8a6eb';
const BASE_FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function firestoreFetch(endpoint, options = {}) {
  const token = getAccessToken();
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_FIRESTORE_URL}/${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (res.status === 404 && options.allow404) {
    return null;
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Erreur Firestore (${res.status} ${res.statusText}) sur ${url} : ${errorText}`);
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return true;
  }

  return await res.json();
}

async function runMigration() {
  console.log('================================================================');
  console.log('🚀 DÉMARRAGE DU SCRIPT DE MIGRATION : FUSION DES ANNONCES ORPHELINES');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // ÉTAPE 1 : Trouver le vrai compte Google Auth (mateopolo91@gmail.com)
  // -------------------------------------------------------------
  console.log('🔍 Étape 1 : Recherche du compte Google Auth réel (mateopolo91@gmail.com)...');
  const usersData = await firestoreFetch('users');
  const users = usersData.documents || [];

  let realUser = null;
  let fakeUsers = [];

  for (const doc of users) {
    const docId = doc.name.split('/').pop();
    const fields = doc.fields || {};
    const email = fields.email?.stringValue;
    const name = fields.name?.stringValue || fields.displayName?.stringValue;
    const avatar = fields.photoURL?.stringValue || fields.avatar?.stringValue;
    const isDemo = fields.isDemo?.booleanValue;

    // Compte Google Auth réel : email mateopolo91@gmail.com sans flag isDemo et avec photo lh3.googleusercontent.com
    if (email === 'mateopolo91@gmail.com' && !isDemo && avatar?.includes('googleusercontent.com')) {
      realUser = { id: docId, name, email, avatar };
    }

    // Comptes factices à identifier
    if (docId === 'demo_mateopolo' || (isDemo && name?.toUpperCase() === 'MATEO POLO') || docId === 'MATEO POLO') {
      fakeUsers.push({ id: docId, name, email, avatar, isDemo });
    }
  }

  if (!realUser) {
    throw new Error('❌ Compte Google Auth réel (mateopolo91@gmail.com) non trouvé !');
  }

  console.log('✅ Compte réel trouvé :');
  console.log(`   - ID : ${realUser.id}`);
  console.log(`   - Nom : ${realUser.name}`);
  console.log(`   - Email : ${realUser.email}`);
  console.log(`   - Photo : ${realUser.avatar}\n`);

  console.log('🔍 Étape 2 : Comptes factices identifiés :');
  fakeUsers.forEach(f => {
    console.log(`   - ID : ${f.id} | Nom : ${f.name} | isDemo : ${f.isDemo} | Avatar : ${(f.avatar || 'N/A').slice(0, 70)}...`);
  });
  console.log();

  // -------------------------------------------------------------
  // ÉTAPE 3 : Trouver les annonces orphelines / du compte factice
  // -------------------------------------------------------------
  console.log('🔍 Étape 3 : Analyse des annonces dans Firestore...');
  const listingsData = await firestoreFetch('listings');
  const listings = listingsData.documents || [];

  const fakeIds = fakeUsers.map(f => f.id);
  const orphanListings = [];

  for (const doc of listings) {
    const listingId = doc.name.split('/').pop();
    const fields = doc.fields || {};
    const title = fields.title?.stringValue || 'Sans titre';
    const author = fields.author?.stringValue || '';
    const authorUid = fields.authorUid?.stringValue || '';
    const authorId = fields.authorId?.stringValue || '';

    const isMatchByUid = fakeIds.includes(authorUid) || fakeIds.includes(authorId);
    const isMatchByName = author.toUpperCase() === 'MATEO POLO' && authorUid !== realUser.id;
    const isRealUserMissingAvatar = authorUid === realUser.id && !fields.authorAvatar?.stringValue;

    if (isMatchByUid || isMatchByName || isRealUserMissingAvatar) {
      orphanListings.push({
        id: listingId,
        title,
        author,
        authorUid,
        doc
      });
    }
  }

  console.log(`📋 Annonces orphelines trouvées (${orphanListings.length}) :`);
  orphanListings.forEach(l => {
    console.log(`   - [${l.id}] "${l.title}" (Auteur actuel: "${l.author}", authorUid: "${l.authorUid || 'non défini'}")`);
  });
  console.log();

  // -------------------------------------------------------------
  // ÉTAPE 4 : Mettre à jour les annonces vers le vrai compte
  // -------------------------------------------------------------
  console.log('⚡ Étape 4 : Migration et réassignation des annonces vers le vrai compte...');
  for (const orphan of orphanListings) {
    console.log(`   ➡️  Mise à jour de l'annonce [${orphan.id}] "${orphan.title}"...`);

    // Préparation du patch Firestore REST
    const updateMaskFields = [
      'author',
      'authorUid',
      'authorId',
      'userId',
      'authorAvatar',
      'authorPhotoURL',
      'authorProfile',
      'isDemo',
      'updatedAt'
    ];

    const patchBody = {
      fields: {
        ...orphan.doc.fields,
        author: { stringValue: realUser.name },
        authorUid: { stringValue: realUser.id },
        authorId: { stringValue: realUser.id },
        userId: { stringValue: realUser.id },
        authorAvatar: { stringValue: realUser.avatar },
        authorPhotoURL: { stringValue: realUser.avatar },
        authorProfile: {
          mapValue: {
            fields: {
              name: { stringValue: realUser.name },
              uid: { stringValue: realUser.id },
              avatar: { stringValue: realUser.avatar },
              email: { stringValue: realUser.email }
            }
          }
        },
        isDemo: { booleanValue: false },
        updatedAt: { timestampValue: new Date().toISOString() }
      }
    };

    const updateMaskQuery = updateMaskFields.map(f => `updateMask.fieldPaths=${f}`).join('&');
    const patchUrl = `listings/${orphan.id}?${updateMaskQuery}`;

    await firestoreFetch(patchUrl, {
      method: 'PATCH',
      body: JSON.stringify(patchBody)
    });

    console.log(`      ✅ Annonce [${orphan.id}] mise à jour avec succès (authorUid = ${realUser.id}, photo Google).`);
  }
  console.log();

  // -------------------------------------------------------------
  // ÉTAPE 5 : Supprimer les comptes factices
  // -------------------------------------------------------------
  console.log('🗑️ Étape 5 : Suppression des comptes factices...');
  for (const fake of fakeUsers) {
    console.log(`   ➡️  Suppression du compte factice [${fake.id}]...`);

    // Suppression des sous-collections éventuelles (ex: notifications)
    for (const sub of ['notifications', 'transactions', 'reviews']) {
      const subUrl = `users/${encodeURIComponent(fake.id)}/${sub}`;
      const subData = await firestoreFetch(subUrl, { allow404: true });
      if (subData && subData.documents) {
        for (const subDoc of subData.documents) {
          const subDocId = subDoc.name.split('/').pop();
          console.log(`      Suppression sous-document ${sub}/${subDocId}...`);
          await firestoreFetch(`users/${encodeURIComponent(fake.id)}/${sub}/${subDocId}`, {
            method: 'DELETE',
            allow404: true
          });
        }
      }
    }

    // Suppression du document utilisateur dans `users`
    await firestoreFetch(`users/${encodeURIComponent(fake.id)}`, {
      method: 'DELETE',
      allow404: true
    });
    console.log(`      ✅ Document users/${fake.id} supprimé.`);

    // Suppression du document dans `users_public` s'il existe
    await firestoreFetch(`users_public/${encodeURIComponent(fake.id)}`, {
      method: 'DELETE',
      allow404: true
    });
  }
  console.log();

  // -------------------------------------------------------------
  // ÉTAPE 6 : Vérification de conformité
  // -------------------------------------------------------------
  console.log('🛡️ Étape 6 : Vérification finale en base de données...');
  const refreshedListingsData = await firestoreFetch('listings');
  const allListings = refreshedListingsData.documents || [];

  console.log('\n--- État actuel des annonces de Mateo Polo ---');
  let mateoCount = 0;
  for (const doc of allListings) {
    const id = doc.name.split('/').pop();
    const f = doc.fields || {};
    const title = f.title?.stringValue;
    const author = f.author?.stringValue;
    const authorUid = f.authorUid?.stringValue;
    const authorAvatar = f.authorAvatar?.stringValue;

    if (authorUid === realUser.id || author?.toLowerCase().includes('mateo')) {
      mateoCount++;
      console.log(`✅ [${id}] "${title}"`);
      console.log(`   - Auteur : ${author}`);
      console.log(`   - UID : ${authorUid} (Conforme: ${authorUid === realUser.id})`);
      console.log(`   - Avatar : ${authorAvatar?.slice(0, 65)}... (Conforme: ${authorAvatar === realUser.avatar})`);
    }
  }

  console.log(`\nNombre total d'annonces rattachées à mateopolo91@gmail.com : ${mateoCount}`);

  // Vérifier la disparition des comptes factices
  console.log('\n--- Vérification de la suppression des comptes factices ---');
  for (const fake of fakeUsers) {
    const check = await firestoreFetch(`users/${encodeURIComponent(fake.id)}`, { allow404: true });
    if (!check || check.error) {
      console.log(`✅ users/${fake.id} est bien inexistant (supprimé).`);
    } else {
      console.warn(`⚠️ Attention : users/${fake.id} existe encore !`);
    }
  }

  console.log('\n================================================================');
  console.log('🎉 MIGRATION EFFECTUÉE AVEC SUCCÈS SANS ERREUR !');
  console.log('================================================================');
}

runMigration().catch(err => {
  console.error('\n❌ Échec de la migration :', err);
  process.exit(1);
});
