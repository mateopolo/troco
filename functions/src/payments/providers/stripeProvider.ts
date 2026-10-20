import Stripe from 'stripe';
import { Firestore } from 'firebase-admin/firestore';
import { PaymentProvider, PaymentVerificationResult } from './mockProvider';

export interface CreateConnectedAccountParams {
  userId: string;
  email?: string;
  country?: string;
  businessType?: 'individual' | 'company';
  refreshUrl?: string;
  returnUrl?: string;
  metadata?: Record<string, string>;
}

export interface CreateConnectedAccountResult {
  accountId: string;
  onboardingUrl?: string;
  detailsSubmitted?: boolean;
  payoutsEnabled?: boolean;
}

export interface CreatePaymentIntentParams {
  amount: number; // En EUR
  currency?: string;
  mode?: string;
  metadata?: Record<string, string>;
  customerEmail?: string;
  customerId?: string;
  connectedAccountId?: string;
  applicationFeeAmount?: number;
  description?: string;
  successUrl?: string;
  cancelUrl?: string;
  clientReferenceId?: string;
}

export interface CreatePaymentIntentResult {
  paymentIntentId: string;
  clientSecret?: string | null;
  status: string;
  amount: number;
  currency: string;
  checkoutUrl?: string | null;
  sessionId?: string;
}

export interface TransferFundsParams {
  amount: number; // En EUR
  destinationAccountId: string;
  currency?: string;
  sourceTransaction?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface TransferFundsResult {
  transferId: string;
  amount: number;
  destination: string;
  currency: string;
  created?: number;
}

/**
 * Fournisseur de paiement réel Stripe Connect Express.
 * Gère la conformité DSP2, les PaymentIntents, les Checkout Sessions,
 * l'onboarding des comptes connectés et les virements escrow.
 */
export class StripeProvider implements PaymentProvider {
  name = 'stripe';
  private stripe: Stripe | null = null;

  constructor(secretKey?: string) {
    const key = secretKey || process.env.STRIPE_SECRET_KEY;
    if (key) {
      this.stripe = new Stripe(key);
    }
  }

  /**
   * Indique si Stripe est initialisé avec une clé secrète valide.
   */
  isConfigured(): boolean {
    return Boolean(this.stripe);
  }

  /**
   * Obtient l'instance brute du client Stripe SDK.
   */
  getStripeClient(): Stripe | null {
    return this.stripe;
  }

  /**
   * Vérifie le statut d'un paiement auprès de Stripe.
   */
  async verifyPayment(paymentIntentId: string, db?: Firestore): Promise<PaymentVerificationResult | null> {
    if (!paymentIntentId) return null;

    // 1. Appel API Stripe si configuré
    if (this.stripe) {
      try {
        const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId);
        const status: 'succeeded' | 'failed' | 'pending' =
          pi.status === 'succeeded'
            ? 'succeeded'
            : pi.status === 'requires_payment_method' || pi.status === 'canceled'
            ? 'failed'
            : 'pending';

        return {
          paymentIntentId: pi.id,
          amount: (pi.amount_received || pi.amount || 0) / 100,
          currency: (pi.currency?.toUpperCase() as 'EUR' | 'TOKENS') || 'EUR',
          status,
          metadata: (pi.metadata as Record<string, unknown>) || {},
        };
      } catch (err: any) {
        console.warn(`[StripeProvider] PaymentIntent retrieve failed (${paymentIntentId}):`, err.message);
      }
    }

    // 2. Fallback de développement / émulateur si paymentIntentId est un mock
    const isDevOrTest = process.env.NODE_ENV !== 'production' || process.env.FUNCTIONS_EMULATOR === 'true';
    if (isDevOrTest && (paymentIntentId.startsWith('pi_mock_') || paymentIntentId.startsWith('mock_'))) {
      const isToken = paymentIntentId.includes('token') || paymentIntentId.includes('pack');
      const isFailed = paymentIntentId.includes('fail');
      return {
        paymentIntentId,
        amount: isToken ? 10 : 20.0,
        currency: isToken ? 'TOKENS' : 'EUR',
        status: isFailed ? 'failed' : 'succeeded',
        metadata: {},
      };
    }

    // 3. Fallback Firestore mock_payments si présent
    if (db) {
      try {
        const snap = await db.doc(`mock_payments/${paymentIntentId}`).get();
        if (snap.exists) {
          const data = snap.data() || {};
          return {
            paymentIntentId,
            amount: Number(data.amount ?? 10),
            currency: (data.currency as 'EUR' | 'TOKENS') || 'EUR',
            status: (data.status as 'succeeded' | 'failed' | 'pending') || 'succeeded',
            metadata: data.metadata || {},
          };
        }
      } catch (_) {}
    }

    return null;
  }

  /**
   * Crée un compte connecté Stripe Connect Express pour un vendeur ou prestataire.
   */
  async createConnectedAccount(params: CreateConnectedAccountParams): Promise<CreateConnectedAccountResult> {
    if (this.stripe) {
      const account = await this.stripe.accounts.create({
        type: 'express',
        country: params.country || 'FR',
        email: params.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: params.businessType || 'individual',
        metadata: {
          userId: params.userId,
          app: 'TROCO',
          ...(params.metadata || {}),
        },
      });

      let onboardingUrl: string | undefined;
      if (params.returnUrl && params.refreshUrl) {
        const accountLink = await this.stripe.accountLinks.create({
          account: account.id,
          refresh_url: params.refreshUrl,
          return_url: params.returnUrl,
          type: 'account_onboarding',
        });
        onboardingUrl = accountLink.url;
      }

      return {
        accountId: account.id,
        onboardingUrl,
        detailsSubmitted: account.details_submitted,
        payoutsEnabled: account.payouts_enabled,
      };
    }

    // Fallback Mock sans clé secrète
    return {
      accountId: `acct_mock_${params.userId}`,
      onboardingUrl: params.returnUrl || 'https://troco.fr/profile?stripe_connect=mock_success',
      detailsSubmitted: true,
      payoutsEnabled: true,
    };
  }

  /**
   * Crée une intention de paiement (PaymentIntent) ou une session Stripe Checkout.
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<CreatePaymentIntentResult> {
    if (this.stripe) {
      const amountCents = Math.max(50, Math.round(params.amount * 100)); // Minimum 0.50 EUR pour Stripe

      // Si des URLs de redirection sont spécifiées, générer une session Stripe Checkout
      if (params.successUrl && params.cancelUrl) {
        const session = await this.stripe.checkout.sessions.create({
          line_items: [
            {
              price_data: {
                currency: (params.currency || 'eur').toLowerCase(),
                product_data: {
                  name:
                    params.mode === 'topup-cash'
                      ? 'Recharge Portefeuille TROCO'
                      : params.mode === 'boost'
                      ? 'Boost Annonce TROCO'
                      : 'Paiement TROCO',
                  description: params.description || `Transaction sécurisée TROCO (${params.amount.toFixed(2)} €)`,
                },
                unit_amount: amountCents,
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: params.successUrl,
          cancel_url: params.cancelUrl,
          customer_email: params.customerEmail,
          client_reference_id: params.clientReferenceId,
          metadata: params.metadata || {},
          ...(params.connectedAccountId
            ? {
                payment_intent_data: {
                  transfer_data: {
                    destination: params.connectedAccountId,
                  },
                  ...(params.applicationFeeAmount
                    ? { application_fee_amount: Math.round(params.applicationFeeAmount * 100) }
                    : {}),
                },
              }
            : {}),
        });

        return {
          paymentIntentId: (session.payment_intent as string) || session.id,
          status: 'requires_payment_method',
          amount: params.amount,
          currency: params.currency || 'EUR',
          checkoutUrl: session.url,
          sessionId: session.id,
        };
      }

      // Sinon, créer un PaymentIntent direct
      const pi = await this.stripe.paymentIntents.create({
        amount: amountCents,
        currency: (params.currency || 'eur').toLowerCase(),
        metadata: params.metadata || {},
        description: params.description || 'Paiement TROCO',
        ...(params.customerId ? { customer: params.customerId } : {}),
        ...(params.connectedAccountId
          ? {
              transfer_data: {
                destination: params.connectedAccountId,
              },
              ...(params.applicationFeeAmount
                ? { application_fee_amount: Math.round(params.applicationFeeAmount * 100) }
                : {}),
            }
          : {}),
      });

      return {
        paymentIntentId: pi.id,
        clientSecret: pi.client_secret,
        status: pi.status,
        amount: params.amount,
        currency: params.currency || 'EUR',
        checkoutUrl: null,
      };
    }

    // Fallback Mock sans clé secrète
    const mockId = `pi_mock_${Date.now()}`;
    return {
      paymentIntentId: mockId,
      clientSecret: `${mockId}_secret_mock`,
      status: 'succeeded',
      amount: params.amount,
      currency: params.currency || 'EUR',
      checkoutUrl: params.successUrl ? `${params.successUrl}?session_id=cs_mock_${Date.now()}` : null,
      sessionId: `cs_mock_${Date.now()}`,
    };
  }

  /**
   * Effectue un virement direct vers un compte connecté Stripe Connect (Escrow release ou payout).
   */
  async transferFunds(params: TransferFundsParams): Promise<TransferFundsResult> {
    if (this.stripe) {
      const amountCents = Math.round(params.amount * 100);
      const transfer = await this.stripe.transfers.create({
        amount: amountCents,
        currency: (params.currency || 'eur').toLowerCase(),
        destination: params.destinationAccountId,
        description: params.description || 'Paiement / Transfert TROCO Connect Express',
        metadata: params.metadata || {},
        ...(params.sourceTransaction ? { source_transaction: params.sourceTransaction } : {}),
      });

      return {
        transferId: transfer.id,
        amount: params.amount,
        destination: params.destinationAccountId,
        currency: params.currency || 'EUR',
        created: transfer.created,
      };
    }

    // Fallback Mock sans clé secrète
    return {
      transferId: `tr_mock_${Date.now()}`,
      amount: params.amount,
      destination: params.destinationAccountId,
      currency: params.currency || 'EUR',
      created: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Valide la signature cryptographique d'un webhook Stripe entrant.
   */
  constructWebhookEvent(rawBody: Buffer | string, signature: string, webhookSecret: string): Stripe.Event {
    if (!this.stripe) {
      throw new Error('Client Stripe non initialisé. STRIPE_SECRET_KEY requise.');
    }
    return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }
}

export const stripeProvider = new StripeProvider();
