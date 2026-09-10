import { useState, useCallback, useEffect, useRef } from 'react';
import { paymentService } from '../services/paymentService';
import { walletService } from '../services/walletService';

export function useCheckout({ profile, setProfile, onPaymentSuccess, onOpenNotification }) {
  const [checkoutSession, setCheckoutSession] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'idle' | 'processing' | 'success' | 'failed' | 'cancelled'
  const appliedRef = useRef(false);

  // Open checkout session
  const openCheckout = useCallback((sessionConfig) => {
    appliedRef.current = false;
    setPaymentStatus('idle');
    setIsProcessing(false);
    setCheckoutSession({
      ...sessionConfig,
      applied: false,
      openedAt: Date.now(),
    });
  }, []);

  // Cancel checkout — PURE UI ONLY, ZERO FINANCIAL MUTATION
  const cancelCheckout = useCallback(() => {
    // Immediate close and cleanup
    setCheckoutSession(null);
    setPaymentStatus('cancelled');
    setIsProcessing(false);
    appliedRef.current = false;
  }, []);

  // Apply checkout — ONLY invoked upon explicit confirmation and payment success
  const applyCheckout = useCallback(async (paymentDetails = {}) => {
    if (!checkoutSession) return;
    if (appliedRef.current || checkoutSession.applied) {
      console.warn('[useCheckout] applyCheckout called multiple times. Prevented double execution.');
      return;
    }

    appliedRef.current = true;
    setIsProcessing(true);
    setPaymentStatus('processing');

    try {
      const mode = checkoutSession.mode; // 'topup-cash', 'pack-tokens', 'boost', 'deal', 'troco-plus'
      let result;

      if (mode === 'deal' || mode === 'pay-deal') {
        // Direct peer-to-peer transfer via Cloud Function
        result = await walletService.transferAtomically({
          receiverUid: checkoutSession.sellerUid || checkoutSession.partnerUid,
          currency: checkoutSession.tokensRequired > 0 ? 'tokens' : 'EUR',
          amount: checkoutSession.tokensRequired > 0 ? checkoutSession.tokensRequired : checkoutSession.euroRequired,
          type: 'deal',
          metadata: {
            chatId: checkoutSession.chatId,
            dealId: checkoutSession.dealId,
            terms: checkoutSession.terms,
            partnerName: checkoutSession.partnerName,
          },
        });
      } else {
        // Platform payment via Cloud Function applyPayment
        result = await paymentService.applyPayment({
          paymentIntentId: paymentDetails.paymentIntentId || `pi_mock_${Date.now()}`,
          mode: mode,
          amount: checkoutSession.amountTtc || checkoutSession.amount || 0,
          tokens: checkoutSession.tokensPurchased || 0,
          boostDays: checkoutSession.boostDays || 0,
          listingId: checkoutSession.listingId || null,
          currency: checkoutSession.currency || 'EUR',
          provider: paymentDetails.provider || 'mock',
        });
      }

      setPaymentStatus('success');

      if (onPaymentSuccess) {
        onPaymentSuccess({
          ...checkoutSession,
          ...paymentDetails,
          ...result,
        });
      }

      // Close modal smoothly after success state
      setTimeout(() => {
        setCheckoutSession(null);
        setIsProcessing(false);
      }, 1200);

      return result;
    } catch (err) {
      console.error('[useCheckout] applyCheckout error:', err);
      setPaymentStatus('failed');
      appliedRef.current = false;
      const errMsg = err?.message || 'Erreur lors de la finalisation du paiement.';
      if (onOpenNotification) {
        onOpenNotification(`❌ ${errMsg}`);
      } else {
        alert(errMsg);
      }
      setIsProcessing(false);
      throw err;
    }
  }, [checkoutSession, onPaymentSuccess, onOpenNotification]);

  // Back button / popstate handling (cancels checkout safely without side-effects)
  useEffect(() => {
    if (!checkoutSession) return;

    const handlePopState = (e) => {
      cancelCheckout();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [checkoutSession, cancelCheckout]);

  return {
    checkoutSession,
    isProcessing,
    paymentStatus,
    openCheckout,
    cancelCheckout,
    applyCheckout,
  };
}
