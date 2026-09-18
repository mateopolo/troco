import logger from '../utils/logger';
import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard, ShieldCheck, Lock, X,
  Sparkles, Coins, Zap, Smartphone,
  Check, CheckCircle, Loader2, Award
} from 'lucide-react';
import { getLocalizedTrocoPlusPlans, detectUserCountry, PPP_COUNTRY_MATRIX } from '../utils/pricingEngine';
import { outboxService } from '../services/outboxService';
import { hapticSuccess, hapticError } from '../utils/haptics';
import { convertCurrency, formatCurrencyAmount } from '../services/pricingService';
import { useWalletStore } from '../stores';
import UniversalModal from './ui/UniversalModal';

function isValidLuhn(numStr) {
  const sanitized = numStr.replace(/\D/g, '');
  if (sanitized.length < 13 || sanitized.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function detectCardBrand(numStr) {
  const sanitized = numStr.replace(/\D/g, '');
  if (/^4/.test(sanitized)) return 'visa';
  if (/^5[1-5]/.test(sanitized) || /^2[2-7]/.test(sanitized)) return 'mastercard';
  if (/^3[47]/.test(sanitized)) return 'amex';
  return 'generic';
}

export default function PaymentModal({
  isOpen,
  onClose,
  darkMode = false,
  currentUser = null,
  initialMode = 'troco-plus',
  initialPayload = null,
  onSuccess = null,
  playBetclicSound = null,
  playApplePaySound = null,
}) {
  const [mode, setMode] = useState(initialMode === 'pack-tokens' ? 'troco-plus' : initialMode);
  const [paymentMethod, setPaymentMethod] = useState('applePay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [show3DSecure, setShow3DSecure] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [successDetails, setSuccessDetails] = useState(null);

  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState(currentUser?.name || '');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const currency = useWalletStore(state => state.currency);
  const storeCountryCode = useWalletStore(state => state.countryCode);
  const selectedCountry = useMemo(() => {
    if (storeCountryCode && PPP_COUNTRY_MATRIX[storeCountryCode]) {
      return storeCountryCode;
    }
    const matched = Object.entries(PPP_COUNTRY_MATRIX).find(([_, cData]) => cData.currency === currency);
    if (matched) return matched[0];
    return detectUserCountry();
  }, [storeCountryCode, currency]);

  const trocoPlusPlans = useMemo(() => getLocalizedTrocoPlusPlans(selectedCountry), [selectedCountry]);
  const [selectedTrocoPlusPlan, setSelectedTrocoPlusPlan] = useState(() => getLocalizedTrocoPlusPlans(selectedCountry)[0]);

  useEffect(() => {
    const updated = trocoPlusPlans.find(p => p.id === selectedTrocoPlusPlan?.id) || trocoPlusPlans[0];
    setSelectedTrocoPlusPlan(updated);
  }, [trocoPlusPlans, selectedTrocoPlusPlan?.id]);

  const cashAmounts = [10, 20, 50, 100];
  const [selectedCashAmount, setSelectedCashAmount] = useState(20);
  const [customCashAmount, setCustomCashAmount] = useState('');

  const boostOptions = [
    { id: 'boost-7d', title: 'Boost 7 jours', price: 1.99, duration: '7 jours', icon: Zap, desc: 'Remonte en tête de liste dans les résultats de recherche' },
    { id: 'boost-urgent', title: 'Boost Urgent 48h', price: 2.99, duration: '48 heures', icon: Sparkles, desc: 'Badge Flamme exclusif + notification de proximité' },
    { id: 'boost-max', title: 'Pack Visibilité Max', price: 4.99, duration: '14 jours', icon: Award, desc: 'Visibilité maximale prioritaire + mise en avant carrousel' },
  ];
  const [selectedBoost, setSelectedBoost] = useState(boostOptions[0]);

  useEffect(() => {
    if (isOpen) {
      const normalizedMode = (initialMode === 'pack-tokens' || initialMode === 'troco-plus')
        ? 'troco-plus'
        : (initialMode === 'pay-deal' || initialMode === 'deal')
          ? 'deal'
          : initialMode;
      setMode(normalizedMode || 'troco-plus');
      setIsProcessing(false);
      setShow3DSecure(false);
      setIsSuccess(false);
      setOtpCode('');
      setOtpError('');
      setFormErrors({});

      const euroRequired = Number(initialPayload?.euroRequired ?? initialPayload?.amount ?? initialPayload?.terms?.euroAmount ?? 0);
      const userEuro = Number(currentUser?.euroBalance || 0);

      if (normalizedMode === 'troco-plus' || normalizedMode === 'topup-cash') {
        setPaymentMethod('applePay');
      } else if (normalizedMode === 'deal') {
        if (euroRequired > 0 && userEuro >= euroRequired) {
          setPaymentMethod('wallet');
        } else {
          setPaymentMethod('applePay');
        }
      }
      if (currentUser?.name && !cardHolder) {
        setCardHolder(currentUser.name);
      }
    }
  }, [isOpen, initialMode, initialPayload]);

  if (!isOpen) return null;

  const isDealMode = mode === 'deal' || mode === 'pay-deal';
  const dealTokensRequired = isDealMode ? Number(initialPayload?.tokensRequired ?? initialPayload?.tokens ?? initialPayload?.terms?.trocoTokens ?? 0) : 0;
  const dealEuroRequired = isDealMode ? Number(initialPayload?.euroRequired ?? initialPayload?.amount ?? initialPayload?.terms?.euroAmount ?? 0) : 0;
  const userTokens = Number(currentUser?.trocoTokens || 0);
  const userEuro = Number(currentUser?.euroBalance || 0);
  const hasEnoughTokens = userTokens >= dealTokensRequired;
  const hasEnoughEuro = userEuro >= dealEuroRequired;

  const userHasSubscription = Boolean(currentUser?.isTrocoPlus);
  const userPlanKey = currentUser?.subscriptionPlan || (userHasSubscription ? 'essential' : null);
  const isUserPro = userHasSubscription && (userPlanKey === 'pro' || userPlanKey === 'premium');
  const isUserEssential = userHasSubscription && (userPlanKey === 'essential' || userPlanKey === 'basic');

  const isSelectedPlanCurrent = (isUserPro && selectedTrocoPlusPlan.planKey === 'pro') || (isUserEssential && selectedTrocoPlusPlan.planKey === 'essential');
  const isSelectedPlanDowngrade = isUserPro && selectedTrocoPlusPlan.planKey === 'essential';
  const isUpgradeAction = isUserEssential && selectedTrocoPlusPlan.planKey === 'pro';
  const isSubscriptionDisabled = (mode === 'troco-plus' || mode === 'pack-tokens') && (isSelectedPlanCurrent || isSelectedPlanDowngrade);

  const essentialPlanPrice = trocoPlusPlans.find(p => p.planKey === 'essential')?.price || 9.99;
  const upgradePrice = Math.max(0, Number((selectedTrocoPlusPlan.price - essentialPlanPrice).toFixed(2)));

  const getAmountToPay = () => {
    if (mode === 'troco-plus' || mode === 'pack-tokens') {
      if (isSubscriptionDisabled) return 0;
      if (isUpgradeAction) {
        return upgradePrice > 0 ? upgradePrice : selectedTrocoPlusPlan.price;
      }
      return selectedTrocoPlusPlan.price;
    }
    if (mode === 'topup-cash') {
      return customCashAmount ? parseFloat(customCashAmount) || 0 : selectedCashAmount;
    }
    if (mode === 'boost') {
      return initialPayload?.price || selectedBoost.price;
    }
    if (mode === 'caution') {
      return initialPayload?.amount || 50.00;
    }
    if (mode === 'deal' || mode === 'pay-deal') {
      return dealEuroRequired;
    }
    return 0.00;
  };

  const amountToPay = getAmountToPay();
  const cardBrand = detectCardBrand(cardNumber);

  const handleCardNumberChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    let formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
    if (formErrors.cardNumber) setFormErrors(prev => ({ ...prev, cardNumber: null }));
  };

  const handleExpiryChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    let formatted = raw;
    if (raw.length >= 2) {
      const month = parseInt(raw.slice(0, 2), 10);
      const validMonth = Math.min(Math.max(month, 1), 12).toString().padStart(2, '0');
      formatted = validMonth + (raw.length > 2 ? '/' + raw.slice(2, 4) : '');
    }
    setCardExpiry(formatted);
    if (formErrors.cardExpiry) setFormErrors(prev => ({ ...prev, cardExpiry: null }));
  };

  const validateCardForm = () => {
    const errors = {};
    const cleanNum = cardNumber.replace(/\s+/g, '');
    if (!cleanNum || cleanNum.length < 15) {
      errors.cardNumber = 'Numéro de carte invalide (16 chiffres requis)';
    } else if (!isValidLuhn(cleanNum)) {
      errors.cardNumber = 'Numéro de carte non conforme (échec Luhn)';
    }

    if (!cardHolder.trim()) {
      errors.cardHolder = 'Nom du titulaire requis';
    }

    if (!cardExpiry || cardExpiry.length < 5) {
      errors.cardExpiry = 'Date invalide (MM/AA)';
    } else {
      const [m, y] = cardExpiry.split('/').map(n => parseInt(n, 10));
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      if (y < currentYear || (y === currentYear && m < currentMonth)) {
        errors.cardExpiry = 'Carte expirée';
      }
    }

    if (!cardCvc || cardCvc.length < 3) {
      errors.cardCvc = 'CVC invalide (3 chiffres)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInitiatePayment = () => {
    if (isDealMode) {
      if (dealTokensRequired > 0 && !hasEnoughTokens) {
        hapticError();
        alert('Solde de Jetons Troco insuffisant pour finaliser ce deal.');
        return;
      }
      if (amountToPay <= 0) {
        setIsProcessing(true);
        setTimeout(() => {
          finalizePayment({
            method: 'Jetons Troco',
            authRef: 'TKN-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
          });
        }, 600);
        return;
      }
    }

    if (amountToPay <= 0) return;

    if (paymentMethod === 'card') {
      if (!validateCardForm()) {
        hapticError();
        return;
      }
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setShow3DSecure(true);
      }, 900);
      return;
    }

    if (paymentMethod === 'applePay') {
      setIsProcessing(true);
      setTimeout(() => {
        finalizePayment({
          method: 'Apple Pay',
          authRef: 'APL-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        });
      }, 1400);
      return;
    }

    if (paymentMethod === 'wallet') {
      if ((currentUser?.euroBalance || 0) < amountToPay) {
        hapticError();
        alert('Solde Euros insuffisant dans votre portefeuille.');
        return;
      }
      setIsProcessing(true);
      setTimeout(() => {
        finalizePayment({
          method: 'Solde Portefeuille Troco',
          authRef: 'WAL-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        });
      }, 600);
    }
  };

  const handleVerify3DS = () => {
    if (otpCode.trim() !== '1234' && otpCode.trim().length !== 4) {
      hapticError();
      setOtpError('Code OTP incorrect (Pour la démo, utilisez : 1234)');
      return;
    }
    setOtpError('');
    setIsProcessing(true);
    setTimeout(() => {
      setShow3DSecure(false);
      finalizePayment({
        method: `Carte Bancaire (${cardBrand.toUpperCase()} •••• ${cardNumber.slice(-4)})`,
        authRef: 'STR-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      });
    }, 1000);
  };

  const finalizePayment = (paymentMeta) => {
    setIsProcessing(false);
    hapticSuccess();
    if (playApplePaySound && paymentMeta.method.includes('Apple')) {
      playApplePaySound();
    } else if (playBetclicSound) {
      playBetclicSound(true);
    }

    const transactionId = `TRK-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const taxRate = 0.20;
    const totalTtc = amountToPay;
    const totalHt = Number((totalTtc / (1 + taxRate)).toFixed(2));
    const tva = Number((totalTtc - totalHt).toFixed(2));

    const isSubscriptionMode = (mode === 'pack-tokens' || mode === 'troco-plus');
    const tokensCredited = isSubscriptionMode
      ? (isUpgradeAction ? Math.max(0, selectedTrocoPlusPlan.tokensMonthly - 5) : selectedTrocoPlusPlan.tokensMonthly)
      : 0;
    const subscriptionStartDate = currentUser?.subscriptionStartDate || new Date().toISOString();
    const subscriptionRenewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const resultPayload = {
      transactionId,
      mode: isSubscriptionMode ? 'troco-plus' : mode,
      amountTtc: totalTtc,
      amountHt: totalHt,
      tva,
      currency: 'EUR',
      paymentMethod: paymentMeta.method,
      authRef: paymentMeta.authRef,
      date: new Date().toISOString(),
      tokensPurchased: tokensCredited,
      subscriptionPlan: isSubscriptionMode ? selectedTrocoPlusPlan : null,
      isTrocoPlus: isSubscriptionMode ? true : (currentUser?.isTrocoPlus || false),
      subscriptionStartDate: isSubscriptionMode ? subscriptionStartDate : (currentUser?.subscriptionStartDate || null),
      subscriptionRenewalDate: isSubscriptionMode ? subscriptionRenewalDate : (currentUser?.subscriptionRenewalDate || null),
      isUpgrade: isUpgradeAction,
      cashTopUp: mode === 'topup-cash' ? amountToPay : 0,
      boostDetails: mode === 'boost' ? (initialPayload || selectedBoost) : null,
      cautionDetails: mode === 'caution' ? initialPayload : null,
      dealDetails: mode === 'deal' ? initialPayload : null,
      label: isSubscriptionMode
        ? (isUpgradeAction
          ? `Mise à niveau vers ${selectedTrocoPlusPlan.title} (${amountToPay.toFixed(2)} €)`
          : `Abonnement Mensuel ${selectedTrocoPlusPlan.title} (${selectedTrocoPlusPlan.price.toFixed(2)} €/mois)`)
        : mode === 'topup-cash'
          ? `Recharge Portefeuille Troco (${amountToPay.toFixed(2)} €)`
          : mode === 'boost'
            ? `Boost d'annonce : ${initialPayload?.title || selectedBoost.title}`
            : mode === 'caution'
              ? `Empreinte de caution (${amountToPay.toFixed(2)} €)`
              : `Paiement Deal (${amountToPay.toFixed(2)} €)`,
    };

    try {
      outboxService.queueTransaction({
        ...resultPayload,
        userId: currentUser?.uid || currentUser?.id || 'demo_user',
        authorUid: currentUser?.uid || currentUser?.id || 'demo_user',
        type: isSubscriptionMode ? 'subscription' : mode === 'topup-cash' ? 'topup' : mode === 'boost' ? 'boost' : 'deal_payout',
      });
    } catch (_) {}

    setSuccessDetails(resultPayload);
    setIsSuccess(true);
  };

  const handleCloseModal = () => {
    if (isSuccess && successDetails && typeof onSuccess === 'function') {
      try {
        onSuccess(successDetails);
      } catch (err) {
        logger.warn('[PaymentModal] onSuccess error:', err);
      }
    }
    onClose?.();
  };

  const modalHeader = (
    <div style={{
      padding: '20px 24px',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFF',
          boxShadow: 'var(--shadow-accent)',
        }}>
          {(mode === 'troco-plus' || mode === 'pack-tokens') ? <Sparkles size={20} /> : <CreditCard size={20} />}
        </div>
        <div>
          <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '20px', fontWeight: '600', letterSpacing: '-0.01em', color: 'var(--text-main)' }}>
            {(mode === 'troco-plus' || mode === 'pack-tokens') && 'Abonnement Troco Plus'}
            {mode === 'topup-cash' && 'Recharger mon Portefeuille'}
            {mode === 'boost' && 'Booster une Annonce'}
            {mode === 'caution' && 'Empreinte de Caution'}
            {mode === 'deal' && 'Paiement Sécurisé du Deal'}
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={13} color="var(--accent-success)" /> Paiement 100% chiffré & sécurisé SSL 256 bits
          </p>
        </div>
      </div>
      <button
        onClick={handleCloseModal}
        style={{
          border: 'none',
          background: 'var(--bg-subtle)',
          color: 'var(--text-main)',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <X size={18} />
      </button>
    </div>
  );

  const modalFooter = isSuccess ? (
    <button
      onClick={handleCloseModal}
      className="premium-button"
      style={{
        width: '100%',
        padding: '14px',
        borderRadius: '14px',
        border: 'none',
        background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
        color: '#FFF',
        fontWeight: '800',
        fontSize: '14px',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-accent)'
      }}
    >
      Terminer & Retourner à Troco
    </button>
  ) : (
    <>
      <div style={{
        padding: '16px',
        borderRadius: '16px',
        backgroundColor: 'var(--bg-subtle)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        margin: '0 24px 16px 24px',
      }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {isDealMode ? 'Total du deal' : 'Montant total TTC'}
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{amountToPay.toFixed(2)} €</span>
            {isDealMode && dealTokensRequired > 0 && (
              <span style={{ fontSize: '14px', color: 'var(--accent-warning)', fontWeight: '800' }}>
                + {dealTokensRequired} Jeton(s)
              </span>
            )}
          </div>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'right' }}>
          {isDealMode
            ? (dealTokensRequired > 0 ? `${dealTokensRequired} Jeton(s) débité(s)` : 'Troc direct')
            : `Dont TVA 20% : ${(amountToPay * 0.20 / 1.20).toFixed(2)} €`}
        </div>
      </div>

      <div style={{ padding: '0 24px 16px 24px' }}>
        <button
          type="button"
          onClick={handleInitiatePayment}
          disabled={isProcessing || isSubscriptionDisabled || (isDealMode ? (dealTokensRequired > 0 && !hasEnoughTokens) : amountToPay <= 0)}
          className="premium-button"
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '16px',
            border: 'none',
            background: (isSubscriptionDisabled || (isDealMode && dealTokensRequired > 0 && !hasEnoughTokens))
              ? 'var(--bg-subtle)'
              : (paymentMethod === 'applePay' && amountToPay > 0)
                ? 'var(--text-main)'
                : 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
            color: (isSubscriptionDisabled || (isDealMode && dealTokensRequired > 0 && !hasEnoughTokens))
              ? 'var(--text-secondary)'
              : (paymentMethod === 'applePay' && amountToPay > 0)
                ? 'var(--bg-card)'
                : '#FFF',
            fontWeight: '800',
            fontSize: '15px',
            cursor: (isProcessing || isSubscriptionDisabled || (isDealMode ? (dealTokensRequired > 0 && !hasEnoughTokens) : amountToPay <= 0)) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: (isSubscriptionDisabled || (isDealMode && dealTokensRequired > 0 && !hasEnoughTokens)) ? 'none' : 'var(--shadow-accent)',
            transition: 'all 0.2s ease',
            opacity: (isProcessing || isSubscriptionDisabled || (isDealMode ? (dealTokensRequired > 0 && !hasEnoughTokens) : amountToPay <= 0)) ? 0.7 : 1,
          }}
        >
          {isProcessing ? (
            <>
              <Loader2 size={18} className="spin-animation" />
              Traitement sécurisé en cours...
            </>
          ) : isSubscriptionDisabled ? (
            <>
              <CheckCircle size={16} color="#10B981" />
              Abonnement Déjà Actif ({isSelectedPlanCurrent ? 'Votre Formule' : 'Inclus dans votre offre Pro'})
            </>
          ) : isUpgradeAction ? (
            <>
              <Sparkles size={16} />
              ⚡ Mettre à niveau vers Troco Plus Pro ({amountToPay.toFixed(2)} € avec obligation de paiement)
            </>
          ) : isDealMode ? (
            dealTokensRequired > 0 && !hasEnoughTokens ? (
              <>
                <Coins size={16} />
                Solde Jetons Insuffisant ({userTokens}/{dealTokensRequired})
              </>
            ) : amountToPay <= 0 ? (
              <>
                <Lock size={16} />
                Confirmer le transfert et sceller le deal ({dealTokensRequired > 0 ? `${dealTokensRequired} Jeton(s)` : 'Troc Direct'})
              </>
            ) : (
              <>
                <Lock size={16} />
                Confirmer le paiement de {amountToPay.toFixed(2)} € et sceller le deal (obligation de paiement)
              </>
            )
          ) : (
            <>
              <Lock size={16} />
              Confirmer et payer {amountToPay.toFixed(2)} € avec {paymentMethod === 'applePay' ? 'Apple Pay' : paymentMethod === 'card' ? 'Carte Bancaire' : 'Solde Portefeuille'} (avec obligation de paiement)
            </>
          )}
        </button>
      </div>
    </>
  );

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={handleCloseModal}
      ariaLabel="Passerelle de paiement Troco"
      showCloseButton={false}
      maxWidth={560}
      header={modalHeader}
      footer={modalFooter}
      contentStyle={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: '24px',
        boxShadow: 'var(--shadow-modal)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-main)',
        position: 'relative',
        padding: 0,
      }}
      overlayStyle={{
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
      }}
    >
      <div style={{ padding: '24px', position: 'relative' }}>

        {(mode === 'troco-plus' || mode === 'pack-tokens' || mode === 'topup-cash') && (
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: '16px',
            padding: '5px',
            marginBottom: '22px',
            border: '1px solid var(--border-color)',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)'
          }}>
            <button
              type="button"
              onClick={() => {
                setMode('topup-cash');
                setPaymentMethod('applePay');
                setFormErrors({});
              }}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: mode === 'topup-cash' ? 'var(--accent-primary)' : 'transparent',
                color: mode === 'topup-cash' ? '#FFFFFF' : 'var(--text-secondary)',
                fontWeight: mode === 'topup-cash' ? '800' : '600',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: mode === 'topup-cash' ? 'var(--shadow-accent)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <CreditCard size={15} /> Recharger mon solde (€)
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('troco-plus');
                setPaymentMethod('applePay');
                setFormErrors({});
              }}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: (mode === 'troco-plus' || mode === 'pack-tokens') ? 'var(--accent-primary)' : 'transparent',
                color: (mode === 'troco-plus' || mode === 'pack-tokens') ? '#FFFFFF' : 'var(--text-secondary)',
                fontWeight: (mode === 'troco-plus' || mode === 'pack-tokens') ? '800' : '600',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: (mode === 'troco-plus' || mode === 'pack-tokens') ? 'var(--shadow-accent)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <Sparkles size={15} /> Abonnement Troco Plus
            </button>
          </div>
        )}

        {isSuccess ? (
          <div style={{ textAlign: 'center', padding: '20px 10px' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--accent-success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              border: '4px solid var(--accent-success)',
            }}>
              <Check size={38} strokeWidth={3} />
            </div>
            <h4 className="font-editorial-heading" style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: '600', color: 'var(--text-main)' }}>
              Paiement Validé avec Succès !
            </h4>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Votre transaction a été enregistrée et votre compte mis à jour instantanément.
            </p>

            <div style={{
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: '16px',
              padding: '16px',
              border: '1px solid var(--border-color)',
              textAlign: 'left',
              fontSize: '13px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Référence :</span>
                <strong style={{ fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{successDetails?.transactionId}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Objet :</span>
                <strong>{successDetails?.label}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Moyen utilisé :</span>
                <span>{successDetails?.paymentMethod}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-color)', fontSize: '15px' }}>
                <span style={{ fontWeight: '800' }}>Total TTC débité :</span>
                <strong style={{ color: 'var(--accent-success)', fontWeight: '800' }}>{successDetails?.amountTtc.toFixed(2)} €</strong>
              </div>
            </div>
          </div>
        ) : (
          <>
            {(mode === 'troco-plus' || mode === 'pack-tokens') && (
              <div style={{ marginBottom: '22px' }}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                    1. Choisissez votre abonnement mensuel Troco Plus
                  </label>
                </div>

                {userHasSubscription && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '14px',
                    backgroundColor: isUserPro ? 'rgba(16, 185, 129, 0.12)' : 'rgba(198, 125, 91, 0.12)',
                    border: isUserPro ? '1.5px solid #10B981' : '1.5px solid var(--accent-primary)',
                    marginBottom: '14px',
                    fontSize: '12px',
                    color: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <CheckCircle size={16} color={isUserPro ? '#10B981' : 'var(--accent-primary)'} />
                    <div>
                      <strong>{isUserPro ? '👑 Offre Troco Plus Pro Active' : '⭐ Offre Troco Plus Essentielle Active'}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {isUserPro
                          ? 'Vous bénéficiez déjà du palier maximal (15 jetons/mois, 3 boosts). Le réachat en boucle est verrouillé.'
                          : 'Passez à l\'offre Pro pour débloquer +10 jetons supplémentaires et des boosts exclusifs.'}
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {trocoPlusPlans.map(plan => {
                    const isSelected = selectedTrocoPlusPlan.id === plan.id;
                    const isThisPlanCurrent = (isUserPro && plan.planKey === 'pro') || (isUserEssential && plan.planKey === 'essential');
                    const isThisPlanIncluded = isUserPro && plan.planKey === 'essential';
                    const isThisPlanUpgrade = isUserEssential && plan.planKey === 'pro';

                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedTrocoPlusPlan(plan)}
                        style={{
                          padding: '16px',
                          borderRadius: '18px',
                          border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                          backgroundColor: isThisPlanCurrent ? 'rgba(16, 185, 129, 0.06)' : isSelected ? 'var(--bg-subtle)' : 'var(--bg-card)',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? 'var(--shadow-accent)' : 'none'
                        }}
                      >
                        {isThisPlanCurrent && (
                          <span style={{
                            position: 'absolute',
                            top: '-9px',
                            right: '16px',
                            backgroundColor: '#10B981',
                            color: '#FFF',
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                          }}>
                            ✓ Abonnement Actif
                          </span>
                        )}

                        {!isThisPlanCurrent && isThisPlanUpgrade && (
                          <span style={{
                            position: 'absolute',
                            top: '-9px',
                            right: '16px',
                            backgroundColor: 'var(--accent-primary)',
                            color: '#FFF',
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            boxShadow: 'var(--shadow-accent)'
                          }}>
                            ⚡ Mise à niveau (Upgrade)
                          </span>
                        )}

                        {!isThisPlanCurrent && !isThisPlanUpgrade && isThisPlanIncluded && (
                          <span style={{
                            position: 'absolute',
                            top: '-9px',
                            right: '16px',
                            backgroundColor: 'var(--text-secondary)',
                            color: '#FFF',
                            fontSize: '10.5px',
                            fontWeight: '800',
                            padding: '2px 8px',
                            borderRadius: '999px',
                          }}>
                            Inclus dans votre offre
                          </span>
                        )}

                        {!userHasSubscription && plan.popular && (
                          <span style={{
                            position: 'absolute',
                            top: '-9px',
                            right: '16px',
                            backgroundColor: 'var(--accent-primary)',
                            color: '#FFF',
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            boxShadow: 'var(--shadow-accent)'
                          }}>
                            ⭐ Le plus populaire
                          </span>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong className="font-editorial-heading" style={{ fontSize: '17px', color: 'var(--text-main)' }}>{plan.title}</strong>
                              <span style={{
                                fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '999px',
                                backgroundColor: isThisPlanCurrent ? '#EBF0E6' : 'var(--bg-subtle)',
                                color: isThisPlanCurrent ? '#3D4A35' : 'var(--accent-primary)'
                              }}>
                                {isThisPlanCurrent ? 'Actuel' : plan.badge}
                              </span>
                            </div>
                            <p style={{ margin: '4px 0 10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {plan.desc}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '20px', fontWeight: '900', color: isSelected ? 'var(--accent-primary)' : 'var(--text-main)' }}>
                              {isThisPlanUpgrade && upgradePrice > 0
                                ? `${upgradePrice.toFixed(2)} €`
                                : (plan.formattedPrice || `${plan.price.toFixed(2)} €`)}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                              {isThisPlanUpgrade ? 'différence/mois' : plan.period}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                          {plan.features.map((feat, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                              <Check size={14} color="var(--accent-success)" />
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '10px', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', fontSize: '11px', fontWeight: '700', textAlign: 'center' }}>
                  💡 Les abonnements Troco Plus sont renouvelés automatiquement chaque mois et résiliables à tout instant en un clic.
                </div>
              </div>
            )}

            {mode === 'topup-cash' && (
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', marginBottom: '10px', color: 'var(--text-main)' }}>
                  1. Choisissez le montant de votre recharge réelle (€)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '12px' }}>
                  {cashAmounts.map(amt => {
                    const isSelected = selectedCashAmount === amt && !customCashAmount;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => { setSelectedCashAmount(amt); setCustomCashAmount(''); }}
                        style={{
                          padding: '14px 10px',
                          borderRadius: '14px',
                          border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                          backgroundColor: isSelected ? 'var(--bg-subtle)' : 'var(--bg-card)',
                          color: isSelected ? 'var(--accent-primary)' : 'var(--text-main)',
                          fontWeight: '800',
                          fontSize: '16px',
                          cursor: 'pointer',
                          boxShadow: isSelected ? 'var(--shadow-card)' : 'none'
                        }}
                      >
                        +{amt} €
                      </button>
                    );
                  })}
                </div>
                <div>
                  <input
                    type="number"
                    min="5"
                    max="1000"
                    placeholder="Ou montant libre en € (ex: 75)"
                    value={customCashAmount}
                    onChange={(e) => setCustomCashAmount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: customCashAmount ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            )}

            {mode === 'boost' && (
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', marginBottom: '10px', color: 'var(--text-main)' }}>
                  1. Choisissez votre formule de visibilité
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {boostOptions.map(b => {
                    const isSelected = selectedBoost.id === b.id;
                    const IconComponent = b.icon;
                    return (
                      <div
                        key={b.id}
                        onClick={() => setSelectedBoost(b)}
                        style={{
                          padding: '14px',
                          borderRadius: '16px',
                          border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                          backgroundColor: isSelected ? 'var(--bg-subtle)' : 'var(--bg-card)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: isSelected ? 'var(--shadow-accent)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                            color: isSelected ? '#FFF' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <IconComponent size={18} />
                          </div>
                          <div>
                            <strong className="font-editorial-heading" style={{ fontSize: '15px' }}>{b.title}</strong>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{b.desc}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: isSelected ? 'var(--accent-primary)' : 'var(--text-main)' }}>
                          {b.price.toFixed(2)} €
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {isDealMode && (
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', marginBottom: '10px', color: 'var(--text-main)' }}>
                  1. Récapitulatif et conditions du Deal
                </label>

                <div style={{
                  padding: '16px',
                  borderRadius: '18px',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))',
                        color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: '800', fontSize: '12px'
                      }}>
                        {(initialPayload?.partnerName || 'P').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>
                          {initialPayload?.partnerName || 'Partenaire de troc'}
                        </strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {initialPayload?.terms?.conditions || initialPayload?.label || 'Accord convenu'}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)',
                      padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '800', color: 'var(--accent-primary)'
                    }}>
                      🤝 Deal en cours
                    </span>
                  </div>

                  {dealTokensRequired > 0 && (
                    <div style={{
                      padding: '12px',
                      borderRadius: '14px',
                      border: hasEnoughTokens ? '1px solid var(--border-color)' : '1.5px solid var(--accent-warning)',
                      backgroundColor: hasEnoughTokens ? 'var(--bg-card)' : 'rgba(245, 158, 11, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: '800', color: 'var(--text-main)' }}>
                          <Coins size={16} color="var(--accent-warning)" />
                          <span>Jetons requis : <strong>{dealTokensRequired} Jeton(s)</strong></span>
                        </div>
                        <span style={{ fontSize: '11.5px', fontWeight: '700', color: hasEnoughTokens ? 'var(--accent-primary)' : 'var(--accent-warning)' }}>
                          Solde actuel : {userTokens} Jeton(s)
                        </span>
                      </div>

                      {!hasEnoughTokens && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            ⚠️ Votre solde de jetons est insuffisant pour finaliser cet accord. Vous pouvez vous abonner à <strong>Troco Plus</strong> pour obtenir instantanément des jetons mensuels.
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setMode('troco-plus');
                              setPaymentMethod('applePay');
                            }}
                            className="premium-button"
                            style={{
                              padding: '8px 12px',
                              borderRadius: '10px',
                              border: 'none',
                              background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                              color: '#FFF',
                              fontSize: '11.5px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <Sparkles size={13} /> S'abonner à Troco Plus (+5 Jetons)
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {dealEuroRequired > 0 && (
                    <div style={{
                      padding: '12px',
                      borderRadius: '14px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-card)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: '800', color: 'var(--text-main)' }}>
                          <CreditCard size={16} color="var(--accent-primary)" />
                          <span>Montant : <strong>{formatCurrencyAmount(dealEuroRequired, 'EUR')}</strong></span>
                        </div>
                        <span style={{ fontSize: '11.5px', fontWeight: '700', color: hasEnoughEuro ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                          Solde dispo : {userEuro.toFixed(2)} € {hasEnoughEuro ? '✓' : '(complément requis)'}
                        </span>
                      </div>

                      {initialPayload?.deal?.terms?.sellerCurrency && initialPayload?.deal?.terms?.sellerCurrency !== 'EUR' && (
                        <div style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(59, 130, 246, 0.08)',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: '#3B82F6',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}>
                          <span>🌐 Vous allez payer ~{formatCurrencyAmount(convertCurrency(dealEuroRequired, initialPayload.deal.terms.sellerCurrency, 'EUR'), 'EUR')} (Équivalent demandé : {formatCurrencyAmount(dealEuroRequired, initialPayload.deal.terms.sellerCurrency)})</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {amountToPay > 0 && (
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', marginBottom: '10px', color: 'var(--text-main)' }}>
                  2. Moyen de Paiement Sécurisé
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: (mode === 'troco-plus' || mode === 'pack-tokens' || mode === 'topup-cash') ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('applePay')}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '14px',
                      border: paymentMethod === 'applePay' ? '2px solid var(--text-main)' : '1px solid var(--border-color)',
                      backgroundColor: paymentMethod === 'applePay' ? 'var(--text-main)' : 'var(--bg-subtle)',
                      color: paymentMethod === 'applePay' ? 'var(--bg-card)' : 'var(--text-secondary)',
                      fontWeight: '800',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Smartphone size={16} /> Apple Pay
                  </button>

                                    <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '14px',
                      border: paymentMethod === 'card' ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                      backgroundColor: paymentMethod === 'card' ? 'var(--accent)' : 'var(--bg-subtle)',
                      color: paymentMethod === 'card' ? '#FFF' : 'var(--text-secondary)',
                      fontWeight: '800',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                                        }}
                  >
                    <CreditCard size={16} /> Carte Bancaire
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </UniversalModal>
  );
}
