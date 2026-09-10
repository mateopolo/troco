import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { structLog } from '../utils/logger';

export interface ClaimBonusData {
  campaignId: string;
}

export interface ClaimBonusResponse {
  success: boolean;
  rewardType: 'EUR' | 'TOKENS';
  rewardAmount: number;
  newBalance: number;
  transactionId: string;
}

// Récompenses par défaut pour les partenaires sponsorisés connus
const DEFAULT_PARTNER_REWARDS: Record<string, { rewardAmount: number; rewardType: 'EUR' | 'TOKENS' }> = {
  'sponsor-brico-1': { rewardAmount: 5.0, rewardType: 'EUR' },
  'sponsor-cowork-2': { rewardAmount: 5.0, rewardType: 'EUR' },
  'sponsor-audio-3': { rewardAmount: 2, rewardType: 'TOKENS' },
  'sponsor-mentor-4': { rewardAmount: 10.0, rewardType: 'EUR' },
};

export async function handleClaimBonus(
  request: CallableRequest<ClaimBonusData>,
  db: Firestore
): Promise<ClaimBonusResponse> {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentification requise pour réclamer un bonus.');
  }

  const { campaignId } = request.data || {};
  if (!campaignId || typeof campaignId !== 'string') {
    throw new HttpsError('invalid-argument', 'L\'identifiant de la campagne (campaignId) est requis.');
  }

  // 1. Vérification d'une réclamation préalable (Anti-double-réclamation)
  const claimRef = db.doc(`bonus_claims/${uid}_${campaignId}`);
  const existingClaim = await claimRef.get();
  if (existingClaim.exists) {
    throw new HttpsError(
      'already-exists',
      'Ce bonus partenaire a déjà été réclamé pour votre compte.'
    );
  }

  // 2. Détermination de la récompense (campagne Firestore ou défaut partenaire)
  let rewardAmount = 5.0;
  let rewardType: 'EUR' | 'TOKENS' = 'EUR';

  const campaignRef = db.doc(`campaigns/${campaignId}`);
  const campaignSnap = await campaignRef.get();

  if (campaignSnap.exists) {
    const data = campaignSnap.data() || {};
    if (data.active === false) {
      throw new HttpsError('failed-precondition', 'Cette offre partenaire n\'est plus active.');
    }
    rewardAmount = Number(data.rewardAmount ?? 5.0);
    rewardType = (data.rewardType as 'EUR' | 'TOKENS') || 'EUR';
  } else if (DEFAULT_PARTNER_REWARDS[campaignId]) {
    rewardAmount = DEFAULT_PARTNER_REWARDS[campaignId].rewardAmount;
    rewardType = DEFAULT_PARTNER_REWARDS[campaignId].rewardType;
  }

  // 3. Exécution de la transaction atomique Firestore
  const result = await db.runTransaction(async (tx) => {
    // Double vérification au sein de la transaction
    const inTxClaim = await tx.get(claimRef);
    if (inTxClaim.exists) {
      throw new HttpsError('already-exists', 'Ce bonus partenaire a déjà été réclamé.');
    }

    const userRef = db.doc(`users/${uid}`);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) {
      throw new HttpsError('not-found', 'Utilisateur introuvable.');
    }

    const userData = userSnap.data() || {};
    const curEuro = Number(userData.euroBalance || 0);
    const curTokens = Number(userData.trocoTokens || 0);

    let newBalance = 0;
    if (rewardType === 'EUR') {
      newBalance = Number((curEuro + rewardAmount).toFixed(2));
      tx.update(userRef, {
        euroBalance: newBalance,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      newBalance = curTokens + rewardAmount;
      tx.update(userRef, {
        trocoTokens: newBalance,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Création du verrou de réclamation
    tx.set(claimRef, {
      uid,
      campaignId,
      rewardAmount,
      rewardType,
      claimedAt: FieldValue.serverTimestamp(),
    });

    // Création de l'enregistrement de transaction
    const txRef = db.collection('transactions').doc();
    tx.set(txRef, {
      type: 'bonus_claim',
      userId: uid,
      amountTtc: rewardType === 'EUR' ? rewardAmount : 0,
      tokensPurchased: rewardType === 'TOKENS' ? rewardAmount : 0,
      currency: rewardType,
      campaignId,
      status: 'completed',
      metadata: { campaignId },
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      rewardType,
      rewardAmount,
      newBalance,
      transactionId: txRef.id,
    };
  });

  await structLog('claimBonus', {
    uid,
    campaignId,
    rewardAmount,
    rewardType,
    transactionId: result.transactionId,
  });

  return result;
}
