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
  initialMode = 'pack-tokens', // 'pack-tokens' | 'topup-cash' | 'boost' | 'caution' | 'deal'
  initialPayload = null,
  onSuccess = null,
  playBetclicSound = null,
  playApplePaySound = null,
}) {
  const [mode, setMode] = useState(initialMode);
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

  // Sélection Pack Jetons
  const tokenPacks = [
    { id: 'pack-1', tokens: 1, price: 12.00, discount: null, label: 'Unité', popular: false, desc: 'Idéal pour tester un premier échange' },
    { id: 'pack-3', tokens: 3, price: 29.99, unitPrice: 10.00, discount: '-16%', label: 'Découverte', popular: false, desc: 'Parfait pour un week-end d’activités' },
    { id: 'pack-5', tokens: 5, price: 49.99, unitPrice: 9.99, discount: '-17%', label: 'Essentiel', popular: true, desc: 'Le choix préféré des membres Troco' },
    { id: 'pack-10', tokens: 10, price: 89.99, unitPrice: 8.99, discount: '-25%', label: 'Pro / Communauté', popular: false, desc: 'Tarif le plus avantageux' },
  ];
  const [selectedTokenPack, setSelectedTokenPack] = useState(tokenPacks[2]); // Pack 5 par défaut

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
      setMode(initialMode || 'pack-tokens');
      setIsProcessing(false);
      setShow3DSecure(false);
      setIsSuccess(false);
      setOtpCode('');
      setOtpError('');
      setFormErrors({});
      if (currentUser?.name && !cardHolder) {
        setCardHolder(currentUser.name);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialMode, currentUser]);

  if (!isOpen) return null;

  // Calcul du montant total
  const getAmountToPay = () => {
    if (mode === 'pack-tokens') {
      return selectedTokenPack.price;
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
    if (mode === 'deal') {
      return initialPayload?.amount || 0.00;
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
      mode,
      amountTtc: totalTtc,
      amountHt: totalHt,
      tva,
      currency: 'EUR',
      paymentMethod: paymentMeta.method,
      authRef: paymentMeta.authRef,
      date: new Date().toISOString(),
      tokensPurchased: mode === 'pack-tokens' ? selectedTokenPack.tokens : 0,
      cashTopUp: mode === 'topup-cash' ? amountToPay : 0,
      boostDetails: mode === 'boost' ? (initialPayload || selectedBoost) : null,
      cautionDetails: mode === 'caution' ? initialPayload : null,
      dealDetails: mode === 'deal' ? initialPayload : null,
      label: mode === 'pack-tokens'
        ? `Achat ${selectedTokenPack.tokens} Jeton(s) Troco (${selectedTokenPack.label})`
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
      zIndex: 4000,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      animation: 'fadeIn 0.25s ease-out',
    }}>
      <div style={{
        backgroundColor: darkMode ? '#1E293B' : '#FFFFFF',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: darkMode ? '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(96,165,250,0.15)' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0',
        color: darkMode ? '#F8FAFC' : '#0F172A',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* HEADER MODAL */}
        <div style={{
          padding: '20px 24px',
          borderBottom: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #04265A, #3B82F6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
            }}>
              {mode === 'pack-tokens' ? <Coins size={20} /> : <CreditCard size={20} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', letterSpacing: '-0.01em' }}>
                {mode === 'pack-tokens' && 'Acheter des Jetons Troco'}
                {mode === 'topup-cash' && 'Recharger mon Portefeuille'}
                {mode === 'boost' && 'Booster une Annonce'}
                {mode === 'caution' && 'Empreinte de Caution'}
                {mode === 'deal' && 'Paiement Sécurisé du Deal'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: darkMode ? '#94A3B8' : '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={13} color="#10B981" /> Paiement 100% chiffré & sécurisé SSL 256 bits
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: darkMode ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
              color: darkMode ? '#94A3B8' : '#64748B',
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

            {/* SÉLECTEUR D'ONGLET DU PORTEFEUILLE (GÉRER MON SOLDE EURO / ACHETER DES JETONS) */}
            {(mode === 'pack-tokens' || mode === 'topup-cash') && (
              <div style={{
                display: 'flex',
                backgroundColor: darkMode ? 'rgba(15,23,42,0.6)' : '#F1F5F9',
                borderRadius: '16px',
                padding: '5px',
                marginBottom: '22px',
                border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setMode('topup-cash');
                    setFormErrors({});
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: mode === 'topup-cash' ? (darkMode ? '#04265A' : '#FFFFFF') : 'transparent',
                    color: mode === 'topup-cash' ? (darkMode ? '#FFFFFF' : '#04265A') : (darkMode ? '#94A3B8' : '#64748B'),
                    fontWeight: mode === 'topup-cash' ? '800' : '600',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: mode === 'topup-cash' ? '0 4px 12px rgba(4,38,90,0.15)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <CreditCard size={15} /> Gérer mon solde Euro (€)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('pack-tokens');
                    setFormErrors({});
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: mode === 'pack-tokens' ? (darkMode ? '#D97706' : '#FFFFFF') : 'transparent',
                    color: mode === 'pack-tokens' ? (darkMode ? '#FFFFFF' : '#D97706') : (darkMode ? '#94A3B8' : '#64748B'),
                    fontWeight: mode === 'pack-tokens' ? '800' : '600',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: mode === 'pack-tokens' ? '0 4px 12px rgba(217,119,6,0.2)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Coins size={15} /> Acheter des Jetons
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
                backgroundColor: '#ECFDF5',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                border: '4px solid #D1FAE5',
              }}>
                <Check size={38} strokeWidth={3} />
              </div>
              <h4 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#0F172A' }}>
                Paiement Validé avec Succès !
              </h4>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: darkMode ? '#94A3B8' : '#64748B' }}>
                Votre transaction a été enregistrée et votre compte mis à jour instantanément.
              </p>

              <div style={{
                backgroundColor: darkMode ? 'rgba(15,23,42,0.6)' : '#F8FAFC',
                borderRadius: '16px',
                padding: '16px',
                border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
                textAlign: 'left',
                marginBottom: '24px',
                fontSize: '13px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: darkMode ? '#94A3B8' : '#64748B' }}>Référence :</span>
                  <strong style={{ fontFamily: 'monospace', color: '#3B82F6' }}>{successDetails?.transactionId}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: darkMode ? '#94A3B8' : '#64748B' }}>Objet :</span>
                  <strong>{successDetails?.label}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: darkMode ? '#94A3B8' : '#64748B' }}>Moyen utilisé :</span>
                  <span>{successDetails?.paymentMethod}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0', fontSize: '15px' }}>
                  <span style={{ fontWeight: '800' }}>Total TTC débité :</span>
                  <strong style={{ color: '#10B981', fontWeight: '800' }}>{successDetails?.amountTtc.toFixed(2)} €</strong>
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
                  backgroundColor: '#04265A',
                  color: '#FFF',
                  fontWeight: '800',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Terminer & Retourner à Troco
              </button>
            </div>
          ) : (
            <>
              {/* ÉTAPE 1 : SÉLECTION DE L'OFFRE / DU MONTANT */}
              {mode === 'pack-tokens' && (
                <div style={{ marginBottom: '22px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', marginBottom: '10px', color: darkMode ? '#E2E8F0' : '#334155' }}>
                    1. Choisissez votre pack de Jetons Troco
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {tokenPacks.map(pack => {
                      const isSelected = selectedTokenPack.id === pack.id;
                      return (
                        <div
                          key={pack.id}
                          onClick={() => setSelectedTokenPack(pack)}
                          style={{
                            padding: '14px',
                            borderRadius: '16px',
                            border: isSelected ? '2px solid #3B82F6' : (darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0'),
                            backgroundColor: isSelected ? (darkMode ? 'rgba(59,130,246,0.15)' : '#EFF6FF') : (darkMode ? 'rgba(15,23,42,0.4)' : '#F8FAFC'),
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {pack.discount && (
                            <span style={{
                              position: 'absolute',
                              top: '-8px',
                              right: '10px',
                              backgroundColor: '#10B981',
                              color: '#FFF',
                              fontSize: '10px',
                              fontWeight: '800',
                              padding: '2px 6px',
                              borderRadius: '999px',
                            }}>
                              {pack.discount}
                            </span>
                          )}
                          {pack.popular && (
                            <span style={{
                              position: 'absolute',
                              top: '-8px',
                              left: '10px',
                              backgroundColor: '#F59E0B',
                              color: '#FFF',
                              fontSize: '10px',
                              fontWeight: '800',
                              padding: '2px 6px',
                              borderRadius: '999px',
                            }}>
                              ⭐ Recommandé
                            </span>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <Coins size={16} color="#F59E0B" />
                            <strong style={{ fontSize: '15px' }}>{pack.tokens} Jeton{pack.tokens > 1 ? 's' : ''}</strong>
                          </div>
                          <div style={{ fontSize: '18px', fontWeight: '800', color: darkMode ? '#60A5FA' : '#04265A', marginBottom: '4px' }}>
                            {pack.price.toFixed(2)} €
                          </div>
                          <div style={{ fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B' }}>
                            {pack.desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {mode === 'topup-cash' && (
                <div style={{ marginBottom: '22px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', marginBottom: '10px', color: darkMode ? '#E2E8F0' : '#334155' }}>
                    1. Choisissez le montant de votre recharge (€)
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
                            border: isSelected ? '2px solid #3B82F6' : (darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0'),
                            backgroundColor: isSelected ? (darkMode ? 'rgba(59,130,246,0.18)' : '#EFF6FF') : (darkMode ? 'rgba(15,23,42,0.4)' : '#F8FAFC'),
                            color: isSelected ? (darkMode ? '#60A5FA' : '#04265A') : (darkMode ? '#FFF' : '#1E293B'),
                            fontWeight: '800',
                            fontSize: '16px',
                            cursor: 'pointer',
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
                      placeholder="Ou montant libre (ex: 75 €)"
                      value={customCashAmount}
                      onChange={(e) => setCustomCashAmount(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: customCashAmount ? '2px solid #3B82F6' : (darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #D1D5DB'),
                        backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF',
                        color: darkMode ? '#FFF' : '#0F172A',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              )}

              {mode === 'boost' && (
                <div style={{ marginBottom: '22px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', marginBottom: '10px', color: darkMode ? '#E2E8F0' : '#334155' }}>
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
                            border: isSelected ? '2px solid #F59E0B' : (darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0'),
                            backgroundColor: isSelected ? (darkMode ? 'rgba(245,158,11,0.12)' : '#FFFBEB') : (darkMode ? 'rgba(15,23,42,0.4)' : '#F8FAFC'),
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              backgroundColor: isSelected ? '#F59E0B' : (darkMode ? 'rgba(255,255,255,0.1)' : '#E2E8F0'),
                              color: isSelected ? '#FFF' : (darkMode ? '#CBD5E1' : '#64748B'),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              <IconComponent size={18} />
                            </div>
                            <div>
                              <strong style={{ fontSize: '14px' }}>{b.title}</strong>
                              <div style={{ fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B' }}>{b.desc}</div>
                            </div>
                          </div>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: isSelected ? '#D97706' : (darkMode ? '#FFF' : '#0F172A') }}>
                            {b.price.toFixed(2)} €
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ÉTAPE 2 : SÉLECTION DU MOYEN DE PAIEMENT */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', marginBottom: '10px', color: darkMode ? '#E2E8F0' : '#334155' }}>
                  2. Moyen de Paiement
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {/* Option Apple Pay */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('applePay')}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '14px',
                      border: paymentMethod === 'applePay' ? '2px solid #000' : (darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0'),
                      backgroundColor: paymentMethod === 'applePay' ? (darkMode ? '#000' : '#000') : (darkMode ? 'rgba(15,23,42,0.4)' : '#F8FAFC'),
                      color: paymentMethod === 'applePay' ? '#FFF' : (darkMode ? '#CBD5E1' : '#334155'),
                      fontWeight: '800',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Smartphone size={16} /> Pay
                  </button>

                  {/* Option Carte Bancaire */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '14px',
                      border: paymentMethod === 'card' ? '2px solid #3B82F6' : (darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0'),
                      backgroundColor: paymentMethod === 'card' ? (darkMode ? 'rgba(59,130,246,0.18)' : '#EFF6FF') : (darkMode ? 'rgba(15,23,42,0.4)' : '#F8FAFC'),
                      color: paymentMethod === 'card' ? (darkMode ? '#60A5FA' : '#04265A') : (darkMode ? '#CBD5E1' : '#334155'),
                      fontWeight: '800',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <CreditCard size={16} /> Carte CB
                  </button>

                  {/* Option Solde Portefeuille (si disponible) */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('wallet')}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '14px',
                      border: paymentMethod === 'wallet' ? '2px solid #10B981' : (darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0'),
                      backgroundColor: paymentMethod === 'wallet' ? (darkMode ? 'rgba(16,185,129,0.18)' : '#ECFDF5') : (darkMode ? 'rgba(15,23,42,0.4)' : '#F8FAFC'),
                      color: paymentMethod === 'wallet' ? '#10B981' : (darkMode ? '#CBD5E1' : '#334155'),
                      fontWeight: '800',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Coins size={16} /> Solde ({currentUser?.euroBalance || 0}€)
                  </button>
                </div>
              </div>

              {/* FORMULAIRE CARTE BANCAIRE INTERACTIF */}
              {paymentMethod === 'card' && (
                <div style={{
                  backgroundColor: darkMode ? 'rgba(15,23,42,0.6)' : '#F8FAFC',
                  borderRadius: '18px',
                  padding: '18px',
                  border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0',
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
                        : 'linear-gradient(135deg, #04265A, #1E40AF)',
                    color: '#FFF',
                    boxShadow: '0 10px 20px -5px rgba(4,38,90,0.4)',
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
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: darkMode ? '#CBD5E1' : '#475569', marginBottom: '4px' }}>
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
                          border: formErrors.cardNumber ? '1px solid #EF4444' : (darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #D1D5DB'),
                          backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF',
                          color: darkMode ? '#FFF' : '#0F172A',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                      {formErrors.cardNumber && <span style={{ fontSize: '11px', color: '#EF4444' }}>{formErrors.cardNumber}</span>}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: darkMode ? '#CBD5E1' : '#475569', marginBottom: '4px' }}>
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
                          border: formErrors.cardHolder ? '1px solid #EF4444' : (darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #D1D5DB'),
                          backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF',
                          color: darkMode ? '#FFF' : '#0F172A',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: darkMode ? '#CBD5E1' : '#475569', marginBottom: '4px' }}>
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
                            border: formErrors.cardExpiry ? '1px solid #EF4444' : (darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #D1D5DB'),
                            backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF',
                            color: darkMode ? '#FFF' : '#0F172A',
                            fontSize: '14px',
                            outline: 'none',
                          }}
                        />
                        {formErrors.cardExpiry && <span style={{ fontSize: '11px', color: '#EF4444' }}>{formErrors.cardExpiry}</span>}
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: darkMode ? '#CBD5E1' : '#475569', marginBottom: '4px' }}>
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
                            border: formErrors.cardCvc ? '1px solid #EF4444' : (darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #D1D5DB'),
                            backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF',
                            color: darkMode ? '#FFF' : '#0F172A',
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
                backgroundColor: darkMode ? 'rgba(15,23,42,0.4)' : '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B' }}>Montant total TTC</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: darkMode ? '#60A5FA' : '#04265A' }}>
                    {amountToPay.toFixed(2)} €
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B', textAlign: 'right' }}>
                  Dont TVA 20% : {(amountToPay * 0.20 / 1.20).toFixed(2)} €
                </div>
              </div>

              <button
                type="button"
                onClick={handleInitiatePayment}
                disabled={isProcessing || amountToPay <= 0}
                className="premium-button"
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '16px',
                  border: 'none',
                  backgroundColor: paymentMethod === 'applePay' ? '#000' : '#04265A',
                  color: '#FFF',
                  fontWeight: '800',
                  fontSize: '15px',
                  cursor: (isProcessing || amountToPay <= 0) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 10px 25px -5px rgba(4,38,90,0.3)',
                  transition: 'all 0.2s ease',
                  opacity: (isProcessing || amountToPay <= 0) ? 0.7 : 1,
                }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="spin-animation" />
                    Traitement sécurisé en cours...
                  </>
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
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.2s ease-out',
          }}>
            <div style={{
              backgroundColor: darkMode ? '#1E293B' : '#FFFFFF',
              borderRadius: '20px',
              padding: '24px',
              width: '100%',
              maxWidth: '380px',
              textAlign: 'center',
              border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #E2E8F0',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#EFF6FF',
                color: '#3B82F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <ShieldCheck size={26} />
              </div>
              <h4 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: '800' }}>
                Authentification 3D Secure
              </h4>
              <p style={{ margin: '0 0 16px', fontSize: '12px', color: darkMode ? '#94A3B8' : '#64748B', lineHeight: 1.5 }}>
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
                    border: otpError ? '2px solid #EF4444' : (darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #CBD5E1'),
                    backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#F8FAFC',
                    color: darkMode ? '#FFF' : '#0F172A',
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
                    border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #CBD5E1',
                    backgroundColor: 'transparent',
                    color: darkMode ? '#CBD5E1' : '#64748B',
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
                    backgroundColor: '#04265A',
                    color: '#FFF',
                    fontWeight: '800',
                    fontSize: '13px',
                    cursor: 'pointer',
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
