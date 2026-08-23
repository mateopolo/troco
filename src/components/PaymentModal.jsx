import React, { useState, useEffect } from 'react';
import {
  CreditCard, ShieldCheck, Lock, X,
  Sparkles, Coins, Zap, Smartphone,
  Check, Loader2, Award
} from 'lucide-react';

// Algorithme de Luhn pour la validation des numéros de carte bancaire
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

// Détection de la marque de la carte
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
  initialMode = 'troco-plus', // 'troco-plus' | 'topup-cash' | 'boost' | 'caution' | 'deal'
  initialPayload = null,
  onSuccess = null,
  playBetclicSound = null,
  playApplePaySound = null,
}) {
  const [mode, setMode] = useState(initialMode === 'pack-tokens' ? 'troco-plus' : initialMode);
  const [paymentMethod, setPaymentMethod] = useState('applePay'); // 'applePay' | 'card' | 'wallet'
  const [isProcessing, setIsProcessing] = useState(false);
  const [show3DSecure, setShow3DSecure] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [successDetails, setSuccessDetails] = useState(null);

  // Formulaire Carte Bancaire
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState(currentUser?.name || '');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // Plans d'abonnement Troco Plus (remplace l'achat unitaire de jetons)
  const trocoPlusPlans = [
    {
      id: 'plus-essential',
      planKey: 'essential',
      title: 'Troco Plus Essentiel',
      price: 9.99,
      period: '/ mois',
      tokensMonthly: 5,
      boostsMonthly: 1,
      badge: '⭐ Membre Plus',
      popular: true,
      features: [
        '5 Jetons Troco crédités chaque mois',
        '1 Boost d\'annonce offert par mois',
        'Badge ⭐ Membre Plus sur le profil',
        'Priorité de contact sur les deals',
        'Sans engagement • Annulable en 1 clic'
      ],
      desc: 'Parfait pour échanger régulièrement et booster vos services'
    },
    {
      id: 'plus-pro',
      planKey: 'pro',
      title: 'Troco Plus Illimité & Pro',
      price: 19.99,
      period: '/ mois',
      tokensMonthly: 15,
      boostsMonthly: 3,
      badge: '👑 VIP Pro',
      popular: false,
      features: [
        '15 Jetons Troco crédités chaque mois',
        '3 Boosts d\'annonces offerts par mois',
        'Badge exclusif 👑 VIP Pro',
        'Visibilité maximale carte & feed',
        'Support prioritaire 7j/7 & 0 commission',
        'Sans engagement • Annulable en 1 clic'
      ],
      desc: 'Idéal pour les experts, artisans et utilisateurs intensifs'
    },
  ];
  const [selectedTrocoPlusPlan, setSelectedTrocoPlusPlan] = useState(trocoPlusPlans[0]);

  // Sélection Recharge Cash
  const cashAmounts = [10, 20, 50, 100];
  const [selectedCashAmount, setSelectedCashAmount] = useState(20);
  const [customCashAmount, setCustomCashAmount] = useState('');

  // Options de Boosts
  const boostOptions = [
    { id: 'boost-7d', title: 'Boost 7 jours', price: 1.99, duration: '7 jours', icon: Zap, desc: 'Remonte en tête de liste dans les résultats de recherche' },
    { id: 'boost-urgent', title: 'Boost Urgent 48h', price: 2.99, duration: '48 heures', icon: Sparkles, desc: 'Badge Flamme exclusif + notification de proximité' },
    { id: 'boost-max', title: 'Pack Visibilité Max', price: 4.99, duration: '14 jours', icon: Award, desc: 'Visibilité maximale prioritaire + mise en avant carrousel' },
  ];
  const [selectedBoost, setSelectedBoost] = useState(boostOptions[0]);

  // Réinitialisation lors de l'ouverture
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

      // Si rechargement ou abonnement, le mode doit être bancaire
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialMode, currentUser, initialPayload]);

  if (!isOpen) return null;

  // Données du deal
  const isDealMode = mode === 'deal' || mode === 'pay-deal';
  const dealTokensRequired = isDealMode ? Number(initialPayload?.tokensRequired ?? initialPayload?.tokens ?? initialPayload?.terms?.trocoTokens ?? 0) : 0;
  const dealEuroRequired = isDealMode ? Number(initialPayload?.euroRequired ?? initialPayload?.amount ?? initialPayload?.terms?.euroAmount ?? 0) : 0;
  const userTokens = Number(currentUser?.trocoTokens || 0);
  const userEuro = Number(currentUser?.euroBalance || 0);
  const hasEnoughTokens = userTokens >= dealTokensRequired;
  const hasEnoughEuro = userEuro >= dealEuroRequired;

  // Calcul du montant total
  const getAmountToPay = () => {
    if (mode === 'troco-plus' || mode === 'pack-tokens') {
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

  // Formatage du numéro de carte
  const handleCardNumberChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    let formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
    if (formErrors.cardNumber) setFormErrors(prev => ({ ...prev, cardNumber: null }));
  };

  // Formatage de la date d'expiration
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

  // Validation du formulaire CB
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

  // Traitement du paiement
  const handleInitiatePayment = () => {
    if (isDealMode) {
      if (dealTokensRequired > 0 && !hasEnoughTokens) {
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
      if (!validateCardForm()) return;
      setIsProcessing(true);
      // Simulation appel passerelle Stripe / 3D Secure
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

  // Validation 3D Secure
  const handleVerify3DS = () => {
    if (otpCode.trim() !== '1234' && otpCode.trim().length !== 4) {
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

  // Finalisation du paiement et retour au parent
  const finalizePayment = (paymentMeta) => {
    setIsProcessing(false);
    if (playApplePaySound && paymentMeta.method.includes('Apple')) {
      playApplePaySound();
    } else if (playBetclicSound) {
      playBetclicSound(true);
    }

    const transactionId = `TRK-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const taxRate = 0.20; // TVA 20%
    const totalTtc = amountToPay;
    const totalHt = Number((totalTtc / (1 + taxRate)).toFixed(2));
    const tva = Number((totalTtc - totalHt).toFixed(2));

    const resultPayload = {
      transactionId,
      mode: (mode === 'pack-tokens' || mode === 'troco-plus') ? 'troco-plus' : mode,
      amountTtc: totalTtc,
      amountHt: totalHt,
      tva,
      currency: 'EUR',
      paymentMethod: paymentMeta.method,
      authRef: paymentMeta.authRef,
      date: new Date().toISOString(),
      tokensPurchased: (mode === 'pack-tokens' || mode === 'troco-plus') ? selectedTrocoPlusPlan.tokensMonthly : 0,
      subscriptionPlan: (mode === 'pack-tokens' || mode === 'troco-plus') ? selectedTrocoPlusPlan : null,
      cashTopUp: mode === 'topup-cash' ? amountToPay : 0,
      boostDetails: mode === 'boost' ? (initialPayload || selectedBoost) : null,
      cautionDetails: mode === 'caution' ? initialPayload : null,
      dealDetails: mode === 'deal' ? initialPayload : null,
      label: (mode === 'pack-tokens' || mode === 'troco-plus')
        ? `Abonnement Mensuel ${selectedTrocoPlusPlan.title} (${selectedTrocoPlusPlan.price.toFixed(2)} €/mois)`
        : mode === 'topup-cash'
          ? `Recharge Portefeuille Troco (${amountToPay.toFixed(2)} €)`
          : mode === 'boost'
            ? `Boost d'annonce : ${initialPayload?.title || selectedBoost.title}`
            : mode === 'caution'
              ? `Empreinte de caution (${amountToPay.toFixed(2)} €)`
              : `Paiement Deal (${amountToPay.toFixed(2)} €)`,
    };

    setSuccessDetails(resultPayload);
    setIsSuccess(true);

    if (onSuccess) {
      onSuccess(resultPayload);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      backgroundColor: 'var(--overlay-bg)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      paddingTop: 'max(16px, env(safe-area-inset-top, 16px))',
      paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      animation: 'fadeIn 0.2s ease',
      boxSizing: 'border-box'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: 'calc(100dvh - 32px)',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-modal)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-main)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}>

        {/* HEADER MODAL */}
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
            onClick={onClose}
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

        {/* CORPS DE LA MODAL */}
        <div style={{ padding: '24px', overflowY: 'auto' }}>

          {/* SÉLECTEUR D'ONGLET DU PORTEFEUILLE (GÉRER MON SOLDE EURO / ABONNEMENT TROCO PLUS) */}
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

          {/* ÉCRAN DE SUCCÈS */}
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
                marginBottom: '24px',
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

              <button
                onClick={onClose}
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
            </div>
          ) : (
            <>
              {/* ÉTAPE 1 : SÉLECTION DE L'OFFRE / DU MONTANT */}
              {(mode === 'troco-plus' || mode === 'pack-tokens') && (
                <div style={{ marginBottom: '22px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', marginBottom: '10px', color: 'var(--text-main)' }}>
                    1. Choisissez votre abonnement mensuel Troco Plus
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {trocoPlusPlans.map(plan => {
                      const isSelected = selectedTrocoPlusPlan.id === plan.id;
                      return (
                        <div
                          key={plan.id}
                          onClick={() => setSelectedTrocoPlusPlan(plan)}
                          style={{
                            padding: '16px',
                            borderRadius: '18px',
                            border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                            backgroundColor: isSelected ? 'var(--bg-subtle)' : 'var(--bg-card)',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'all 0.2s ease',
                            boxShadow: isSelected ? 'var(--shadow-accent)' : 'none'
                          }}
                        >
                          {plan.popular && (
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
                                  backgroundColor: 'var(--bg-subtle)',
                                  color: 'var(--accent-primary)'
                                }}>
                                  {plan.badge}
                                </span>
                              </div>
                              <p style={{ margin: '4px 0 10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {plan.desc}
                              </p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '20px', fontWeight: '900', color: isSelected ? 'var(--accent-primary)' : 'var(--text-main)' }}>
                                {plan.price.toFixed(2)} €
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                {plan.period}
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

              {/* ÉTAPE 1 SPÉCIFIQUE AU DEAL */}
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

                    {/* VÉRIFICATION DU SOLDE DE JETONS */}
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

                    {/* VÉRIFICATION DU MONTANT EN EUROS */}
                    {dealEuroRequired > 0 && (
                      <div style={{
                        padding: '12px',
                        borderRadius: '14px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-card)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: '800', color: 'var(--text-main)' }}>
                          <CreditCard size={16} color="var(--accent-primary)" />
                          <span>Montant à régler : <strong>{dealEuroRequired.toFixed(2)} €</strong></span>
                        </div>
                        <span style={{ fontSize: '11.5px', fontWeight: '700', color: hasEnoughEuro ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                          Solde dispo : {userEuro.toFixed(2)} € {hasEnoughEuro ? '✓' : '(complément CB requis)'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ÉTAPE 2 : SÉLECTION DU MOYEN DE PAIEMENT */}
              {amountToPay > 0 && (
                <div style={{ marginBottom: '22px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', marginBottom: '10px', color: 'var(--text-main)' }}>
                    2. Moyen de Paiement Sécurisé
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: (mode === 'troco-plus' || mode === 'pack-tokens' || mode === 'topup-cash') ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '10px' }}>
                    {/* Option Apple Pay */}
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

                    {/* Option Carte Bancaire */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      style={{
                        padding: '12px 8px',
                        borderRadius: '14px',
                        border: paymentMethod === 'card' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        backgroundColor: paymentMethod === 'card' ? 'var(--bg-subtle)' : 'var(--bg-card)',
                        color: paymentMethod === 'card' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontWeight: '800',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: paymentMethod === 'card' ? 'var(--shadow-card)' : 'none'
                      }}
                    >
                      <CreditCard size={16} /> Carte CB
                    </button>

                    {/* Option Solde Portefeuille (uniquement pour deal, caution, boost) */}
                    {mode !== 'troco-plus' && mode !== 'pack-tokens' && mode !== 'topup-cash' && (
                      <button
                        type="button"
                        disabled={(currentUser?.euroBalance || 0) < amountToPay}
                        onClick={() => setPaymentMethod('wallet')}
                        style={{
                          padding: '12px 8px',
                          borderRadius: '14px',
                          border: paymentMethod === 'wallet' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                          backgroundColor: paymentMethod === 'wallet' ? 'var(--bg-subtle)' : 'var(--bg-card)',
                          color: paymentMethod === 'wallet' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          fontWeight: '800',
                          fontSize: '13px',
                          cursor: (currentUser?.euroBalance || 0) < amountToPay ? 'not-allowed' : 'pointer',
                          opacity: (currentUser?.euroBalance || 0) < amountToPay ? 0.5 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <Coins size={16} /> Solde ({currentUser?.euroBalance || 0}€)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* FORMULAIRE CARTE BANCAIRE INTERACTIF */}
              {paymentMethod === 'card' && (
                <div style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: '18px',
                  padding: '18px',
                  border: '1px solid var(--border-color)',
                  marginBottom: '22px',
                }}>
                  {/* APERÇU VISUEL DE LA CARTE */}
                  <div style={{
                    borderRadius: '16px',
                    padding: '16px 20px',
                    background: cardBrand === 'mastercard'
                      ? 'linear-gradient(135deg, #EB001B, #F79E1B)'
                      : cardBrand === 'amex'
                        ? 'linear-gradient(135deg, #0077A6, #00A3E0)'
                        : 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))',
                    color: '#FFF',
                    boxShadow: 'var(--shadow-card)',
                    marginBottom: '16px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.1em', opacity: 0.85 }}>TROCO PAY</span>
                      <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase' }}>
                        {cardBrand === 'visa' && 'VISA'}
                        {cardBrand === 'mastercard' && 'MASTERCARD'}
                        {cardBrand === 'amex' && 'AMEX'}
                        {cardBrand === 'generic' && 'CARTE BANCAIRE'}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '17px', letterSpacing: '2px', fontWeight: '700', marginBottom: '14px' }}>
                      {cardNumber || '•••• •••• •••• ••••'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '11px' }}>
                      <div>
                        <div style={{ opacity: 0.7, fontSize: '9px' }}>TITULAIRE</div>
                        <div style={{ fontWeight: '700', textTransform: 'uppercase' }}>{cardHolder || 'PRENOM NOM'}</div>
                      </div>
                      <div>
                        <div style={{ opacity: 0.7, fontSize: '9px' }}>EXPIRE</div>
                        <div style={{ fontWeight: '700' }}>{cardExpiry || 'MM/AA'}</div>
                      </div>
                    </div>
                  </div>

                  {/* CHAMPS DE SAISIE */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Numéro de carte
                      </label>
                      <input
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        maxLength={19}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: formErrors.cardNumber ? '1px solid #EF4444' : '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-main)',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                      {formErrors.cardNumber && <span style={{ fontSize: '11px', color: '#EF4444' }}>{formErrors.cardNumber}</span>}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Nom sur la carte
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Mateo Polo"
                        value={cardHolder}
                        onChange={(e) => { setCardHolder(e.target.value); setFormErrors(prev => ({ ...prev, cardHolder: null })); }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: formErrors.cardHolder ? '1px solid #EF4444' : '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-main)',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          Expiration (MM/AA)
                        </label>
                        <input
                          type="text"
                          placeholder="12/28"
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          maxLength={5}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: formErrors.cardExpiry ? '1px solid #EF4444' : '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-card)',
                            color: 'var(--text-main)',
                            fontSize: '14px',
                            outline: 'none',
                          }}
                        />
                        {formErrors.cardExpiry && <span style={{ fontSize: '11px', color: '#EF4444' }}>{formErrors.cardExpiry}</span>}
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          CVC / CVV
                        </label>
                        <input
                          type="password"
                          placeholder="123"
                          value={cardCvc}
                          onChange={(e) => { setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4)); setFormErrors(prev => ({ ...prev, cardCvc: null })); }}
                          maxLength={4}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: formErrors.cardCvc ? '1px solid #EF4444' : '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-card)',
                            color: 'var(--text-main)',
                            fontSize: '14px',
                            outline: 'none',
                          }}
                        />
                        {formErrors.cardCvc && <span style={{ fontSize: '11px', color: '#EF4444' }}>{formErrors.cardCvc}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* RÉCAPITULATIF & BOUTON D'ACTION */}
              <div style={{
                padding: '16px',
                borderRadius: '16px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
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

              <button
                type="button"
                onClick={handleInitiatePayment}
                disabled={isProcessing || (isDealMode ? (dealTokensRequired > 0 && !hasEnoughTokens) : amountToPay <= 0)}
                className="premium-button"
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '16px',
                  border: 'none',
                  background: (isDealMode && dealTokensRequired > 0 && !hasEnoughTokens)
                    ? 'var(--bg-subtle)'
                    : (paymentMethod === 'applePay' && amountToPay > 0)
                      ? 'var(--text-main)'
                      : 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                  color: (isDealMode && dealTokensRequired > 0 && !hasEnoughTokens)
                    ? 'var(--text-secondary)'
                    : (paymentMethod === 'applePay' && amountToPay > 0)
                      ? 'var(--bg-card)'
                      : '#FFF',
                  fontWeight: '800',
                  fontSize: '15px',
                  cursor: (isProcessing || (isDealMode ? (dealTokensRequired > 0 && !hasEnoughTokens) : amountToPay <= 0)) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: (isDealMode && dealTokensRequired > 0 && !hasEnoughTokens) ? 'none' : 'var(--shadow-accent)',
                  transition: 'all 0.2s ease',
                  opacity: (isProcessing || (isDealMode ? (dealTokensRequired > 0 && !hasEnoughTokens) : amountToPay <= 0)) ? 0.7 : 1,
                }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="spin-animation" />
                    Traitement sécurisé en cours...
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
                      Valider et Sceller le Deal ({dealTokensRequired > 0 ? `${dealTokensRequired} Jeton(s)` : 'Troc Direct'})
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      Régler {amountToPay.toFixed(2)} € & Sceller le Deal
                    </>
                  )
                ) : (
                  <>
                    <Lock size={16} />
                    Payer {amountToPay.toFixed(2)} € avec {paymentMethod === 'applePay' ? 'Apple Pay' : paymentMethod === 'card' ? 'Carte Bancaire' : 'Solde Portefeuille'}
                  </>
                )}
              </button>
            </>
          )}

        </div>

        {/* OVERLAY 3D SECURE / AUTHENTIFICATION BANCAIRE */}
        {show3DSecure && (
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 4100,
            backgroundColor: 'var(--overlay-bg)',
            backdropFilter: 'blur(8px)',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.2s ease-out',
          }}>
            <div style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: '20px',
              padding: '24px',
              width: '100%',
              maxWidth: '380px',
              textAlign: 'center',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-modal)',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <ShieldCheck size={26} />
              </div>
              <h4 className="font-editorial-heading" style={{ margin: '0 0 6px', fontSize: '19px', fontWeight: '600', color: 'var(--text-main)' }}>
                Authentification 3D Secure
              </h4>
              <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Votre banque demande une confirmation pour le paiement de <strong>{amountToPay.toFixed(2)} €</strong>.
              </p>

              <div style={{ marginBottom: '14px' }}>
                <input
                  type="text"
                  placeholder="Code OTP (ex: 1234)"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  maxLength={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontSize: '20px',
                    letterSpacing: '8px',
                    borderRadius: '12px',
                    border: otpError ? '2px solid #EF4444' : '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    outline: 'none',
                  }}
                />
                {otpError && <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}>{otpError}</div>}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShow3DSecure(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleVerify3DS}
                  className="premium-button"
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                    color: '#FFF',
                    fontWeight: '800',
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-accent)'
                  }}
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
