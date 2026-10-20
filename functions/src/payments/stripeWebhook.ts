import { Firestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { stripeProvider } from './providers';
import { structLog } from '../utils/logger';
import Stripe from 'stripe';

/**
 * Webhook HTTPS pour écouter et traiter les événements asynchrones Stripe.
 * Sécurisé par vérification cryptographique de signature Stripe.
 */
export async function handleStripeWebhook(req: any, res: any, db: Firestore): Promise<void> {
  const sig = req.headers['stripe-signature'] as string | undefined;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (webhookSecret && sig && stripeProvider.isConfigured()) {
      // Vérification de la signature cryptographique du webhook
      event = stripeProvider.constructWebhookEvent(req.rawBody, sig, webhookSecret);
    } else {
      // En environnement de test ou émulateur sans secret configuré
      event = (req.body as Stripe.Event) || {};
    }
  } catch (err: any) {
    console.error(`[StripeWebhook] ⚠️ Webhook signature verification failed: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  const eventId = event.id;
  const eventType = event.type;

  if (!eventId || !eventType) {
    res.status(400).json({ error: 'Événement Stripe invalide' });
    return;
  }

  // Contrôle d'idempotence au niveau du webhook
  const idemRef = db.doc(`idempotency_keys/webhook_${eventId}`);
  const idemSnap = await idemRef.get();
  if (idemSnap.exists) {
    console.info(`[StripeWebhook] Event ${eventId} déjà traité (idempotence).`);
    res.status(200).json({ received: true, alreadyProcessed: true });
    return;
  }

  try {
    switch (eventType) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = (session.metadata as Record<string, string>) || {};
        const targetUid = session.client_reference_id || metadata.userId;
        const mode = metadata.mode || 'topup-cash';
        const numAmount = (session.amount_total || 0) / 100;
        const numTokens = Number(metadata.tokens || 0);
        const paymentIntentId = (session.payment_intent as string) || session.id;

        if (targetUid) {
          const userRef = db.doc(`users/${targetUid}`);
          const updates: Record<string, any> = {
            updatedAt: FieldValue.serverTimestamp(),
          };

          if (mode === 'topup-cash' && numAmount > 0) {
            updates.euroBalance = FieldValue.increment(numAmount);
            updates.walletBalanceFiat = FieldValue.increment(numAmount);
          } else if ((mode === 'troco-plus' || mode === 'pack-tokens') && numTokens > 0) {
            updates.trocoTokens = FieldValue.increment(numTokens);
            updates.isTrocoPlus = true;
          }

          await userRef.set(updates, { merge: true });

          // Si boost d'annonce
          if (mode === 'boost' && metadata.listingId) {
            try {
              const boostDays = Number(metadata.boostDays || 7);
              const listingRef = db.doc(`listings/${metadata.listingId}`);
              await listingRef.update({
                isBoosted: true,
                boostedAt: FieldValue.serverTimestamp(),
                boostedUntil: new Date(Date.now() + boostDays * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: FieldValue.serverTimestamp(),
              });
            } catch (boostErr: any) {
              console.warn('[StripeWebhook] Could not update boosted listing:', boostErr.message);
            }
          }

          // Enregistrement de la transaction financière
          const txRef = db.collection('transactions').doc();
          await txRef.set({
            type: mode,
            userId: targetUid,
            amountTtc: numAmount,
            tokens: numTokens,
            currency: (session.currency || 'eur').toUpperCase(),
            paymentProvider: 'stripe',
            paymentIntentId,
            sessionId: session.id,
            status: 'completed',
            metadata: metadata || {},
            createdAt: FieldValue.serverTimestamp(),
          });
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const piId = paymentIntent.id;
        // Mise à jour de la transaction correspondante si trouvée
        const txQuery = await db.collection('transactions').where('paymentIntentId', '==', piId).limit(1).get();
        if (!txQuery.empty) {
          await txQuery.docs[0].ref.update({
            status: 'completed',
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const userId = account.metadata?.userId;
        if (userId) {
          const userRef = db.doc(`users/${userId}`);
          await userRef.set(
            {
              stripeConnectedAccountId: account.id,
              stripeOnboardingComplete: Boolean(account.details_submitted),
              stripePayoutsEnabled: Boolean(account.payouts_enabled),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }
        break;
      }

      default:
        console.info(`[StripeWebhook] Événement non géré : ${eventType}`);
        break;
    }

    // Sauvegarde de l'idempotence pour 24h
    await idemRef.set({
      eventType,
      processedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
    });

    await structLog('stripeWebhook', {
      eventId,
      eventType,
      status: 'success',
    });

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error(`[StripeWebhook] Erreur de traitement de l'événement ${eventId}:`, error);
    res.status(500).json({ error: 'Erreur serveur lors du traitement du webhook' });
  }
}
