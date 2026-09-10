import { HttpsError } from 'firebase-functions/v2/https';

export function validateTransferParams(params: {
  fromUid: string;
  toUid: string;
  tokens?: number;
  euros?: number;
  idempotencyKey?: string;
}): void {
  const { fromUid, toUid, tokens = 0, euros = 0, idempotencyKey } = params;

  if (!fromUid || typeof fromUid !== 'string') {
    throw new HttpsError('unauthenticated', 'Identifiant émetteur manquant.');
  }

  if (!toUid || typeof toUid !== 'string' || toUid === fromUid) {
    throw new HttpsError('invalid-argument', 'Destinataire invalide ou identique à l\'émetteur.');
  }

  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    throw new HttpsError('invalid-argument', 'Clé d\'idempotence (idempotencyKey) obligatoire.');
  }

  if (tokens < 0 || euros < 0) {
    throw new HttpsError('invalid-argument', 'Les montants transférés ne peuvent pas être négatifs.');
  }

  if (tokens === 0 && euros === 0) {
    throw new HttpsError('invalid-argument', 'Le montant du transfert (jetons ou euros) doit être supérieur à zéro.');
  }
}
