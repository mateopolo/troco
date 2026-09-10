/**
 * DealMessageCard.jsx — Composant sécurisé de carte de négociation de Deal
 * Workflow conversationnel : Boutons réactifs « Accepter », « Contre-offre », « Refuser »
 * Double validation de Troc : Validation bilatérale (1/2 et 2/2) pour les échanges sans devise
 * Gamification : Bouton de notation post-clôture, retour haptique et conformité A11Y.
 */

import React from 'react';
import { Sparkles, Clock, Check, RefreshCw, X, CheckCircle2, Star, ShieldCheck } from 'lucide-react';

export default function DealMessageCard({
  msg: rawMsg = null,
  message = null,
  messageId = null,
  terms: directTerms = null,
  status: directStatus = null,
  completionConfirmations: directConfirmations = null,
  isMine = false,
  isSender = false,
  isRecipient = true,
  partnerName = 'l’interlocuteur',
  currentUserId = null,
  currentUid = null,
  onAcceptDeal = null,
  openCounterOffer = null,
  onOpenCounterOffer = null,
  onDeclineDeal = null,
  onConfirmTrocCompletion = null,
  onOpenRatingModal = null,
  hapticSuccess = () => {},
  playSuccessChime = () => {},
  hapticLight = () => {},
  hapticWarning = () => {},
  t = (key) => key,
  isMobile = false,
}) {
  const msg = rawMsg || message || {};
  const effectiveMessageId = messageId || msg?.id || msg?.messageId || null;
  const terms = directTerms || (msg && (msg.dealTerms || msg.terms || msg.proposal || msg.deal)) || {};
  const expectedHours = typeof terms?.hours === 'number'
    ? terms.hours
    : (Number(terms?.hours ?? terms?.expectedHours ?? (terms?.durationValue ? Number(terms.durationValue) : 0)) || 0);
  const expectedTokens = typeof terms?.tokens === 'number'
    ? terms.tokens
    : (Number(terms?.tokens ?? terms?.expectedTokens ?? terms?.trocoTokens ?? 0) || 0);
  const fiatAmount = typeof terms?.fiatAmount === 'number'
    ? terms.fiatAmount
    : (Number(terms?.fiatAmount ?? terms?.fiat ?? terms?.euroAmount ?? 0) || 0);
  const serviceTitle = terms?.title || terms?.serviceTitle || terms?.itemName || msg?.listing || "Prestation de service";
  const rawDescription = terms?.conditions || terms?.description || terms?.notes || msg?.text || msg?.content || "";
  const isCounterOffer = Boolean(terms?.isCounterOffer || msg?.type === 'deal_counter_offer');

  const isDirectTroc = (expectedTokens === 0 && fiatAmount === 0);

  const currentDealStatus = String(directStatus || msg?.status || 'pending').toLowerCase();
  const isAccepted = (currentDealStatus === 'confirmed' || currentDealStatus === 'accepted' || currentDealStatus === 'validated');
  const isRejected = (currentDealStatus === 'declined' || currentDealStatus === 'rejected' || currentDealStatus === 'refused' || currentDealStatus === 'cancelled');
  const isTrocInProgress = (currentDealStatus === 'troc_in_progress' || currentDealStatus === 'in_progress');
  const isDealPending = !isAccepted && !isRejected && !isTrocInProgress;

  const handleCounter = onOpenCounterOffer || openCounterOffer;

  // Gestion de la double validation pour le troc sans devise
  const completions = directConfirmations || msg?.completionConfirmations || {};
  const myUid = String(currentUserId || currentUid || (isMine ? 'me' : 'partner'));
  const myConfirmed = Boolean(completions[myUid] || (isMine && completions.buyer) || (!isMine && completions.seller));
  const confirmedCount = Object.keys(completions).filter(k => Boolean(completions[k])).length;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMine ? 'flex-end' : 'flex-start',
        width: '100%',
        margin: '8px 0',
        boxSizing: 'border-box'
      }}
    >
      <div style={{
        width: isMobile ? '94%' : '85%',
        maxWidth: '520px',
        border: isMine
          ? '1.5px solid var(--accent-primary)'
          : '1.5px solid var(--border-color)',
        borderRadius: '24px',
        borderBottomRightRadius: isMine ? '6px' : '24px',
        borderBottomLeftRadius: !isMine ? '6px' : '24px',
        padding: isMobile ? '14px 14px 12px' : '18px',
        backgroundColor: 'var(--bg-card)',
        boxShadow: 'var(--shadow-card)',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: '800', color: 'var(--accent-primary)' }}>
            <Sparkles size={15} color="var(--accent-primary)" />
            {isMine
              ? (isCounterOffer ? 'Ma contre-proposition de Deal' : (t('myDealProposal') || 'Ma proposition de Deal'))
              : (isCounterOffer ? `Contre-offre reçue de ${msg?.senderName || partnerName}` : `Proposition de Deal reçue de ${msg?.senderName || partnerName}`)}
          </div>

          {/* BADGES DE STATUT */}
          {isDealPending && !isSender && (
            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', padding: '3px 8px', borderRadius: '999px', border: '1.5px solid var(--accent-primary)' }}>
              ⚡ Réponse attendue
            </span>
          )}
          {isDealPending && isSender && (
            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: '999px', border: '1px solid var(--border-color)' }}>
              ⏳ En attente
            </span>
          )}
          {isTrocInProgress && (
            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', padding: '3px 8px', borderRadius: '999px', border: '1px solid #F59E0B' }}>
              ⏳ Prestation en cours ({confirmedCount}/2)
            </span>
          )}
          {isAccepted && (
            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', padding: '3px 8px', borderRadius: '999px', border: '1px solid #10B981' }}>
              ✅ Deal validé
            </span>
          )}
          {isRejected && (
            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', padding: '3px 8px', borderRadius: '999px', border: '1px solid #EF4444' }}>
              ❌ Deal décliné
            </span>
          )}
        </div>

        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
          {serviceTitle}
        </div>

        {rawDescription && (
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', fontStyle: 'italic' }}>
            "{rawDescription}"
          </div>
        )}

        {/* PILLULES DE CONDITIONS */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {expectedHours > 0 && (
            <span style={{
              backgroundColor: 'var(--bg-subtle)',
              border: '1.5px solid var(--accent-primary)',
              color: 'var(--accent-primary)',
              borderRadius: '999px', padding: '3px 9px', fontSize: '11px', fontWeight: '800',
              display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}>
              ⏱️ {expectedHours}h de service
            </span>
          )}
          {expectedTokens > 0 && (
            <span style={{
              backgroundColor: 'var(--bg-subtle)',
              border: '1.5px solid var(--accent-primary)',
              color: 'var(--accent-primary)',
              borderRadius: '999px', padding: '3px 9px', fontSize: '11px', fontWeight: '800',
              display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}>
              🪙 {expectedTokens} Jeton{expectedTokens > 1 ? 's' : ''} Troco
            </span>
          )}
          {fiatAmount > 0 && (
            <span style={{
              backgroundColor: 'var(--bg-subtle)',
              border: '1.5px solid var(--accent-primary)',
              color: 'var(--accent-primary)',
              borderRadius: '999px', padding: '3px 9px', fontSize: '11px', fontWeight: '800',
              display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}>
              💶 + {Number(fiatAmount).toFixed(2).replace('.00', '')} €
            </span>
          )}
          {isDirectTroc && (
            <span style={{
              backgroundColor: 'var(--bg-subtle)',
              border: '1.5px solid #10B981',
              color: '#10B981',
              borderRadius: '999px', padding: '3px 9px', fontSize: '11px', fontWeight: '800',
              display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}>
              🤝 Troc direct / Service
            </span>
          )}
        </div>

        {/* WORKFLOW CONVERSATIONNEL : LES 3 BOUTONS NÉGOCIATION (ACCEPTER / CONTRE-OFFRE / REFUSER) */}
        {isDealPending && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            {isSender ? (
              /* ÉTAT EXPÉDITEUR : ATTENTE DU PARTENAIRE */
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px dashed var(--border-color)',
                color: 'var(--text-secondary)',
                borderRadius: '999px',
                padding: '10px 14px',
                fontSize: '12px',
                fontWeight: '700',
                opacity: 0.85,
                cursor: 'not-allowed'
              }}>
                <Clock size={14} color="var(--accent-primary)" />
                <span>En attente de la réponse de {partnerName || 'votre partenaire'}...</span>
              </div>
            ) : (
              /* ÉTAT DESTINATAIRE : LES 3 BOUTONS RÉACTIFS */
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                {/* BOUTON 1 : ACCEPTER */}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      hapticSuccess();
                      playSuccessChime();
                      if (typeof onAcceptDeal === 'function') {
                        onAcceptDeal(effectiveMessageId, terms);
                      }
                    } catch (err) {
                      console.warn('[DealMessageCard] Accept deal error:', err);
                    }
                  }}
                  className="premium-button focus:ring-2 focus:ring-[#10B981] focus:outline-none transition-all rounded-full"
                  style={{
                    border: 'none',
                    borderRadius: '999px',
                    padding: '10px 6px',
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    color: '#FFFFFF',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                    whiteSpace: 'nowrap',
                  }}
                  title="Accepter les termes et sceller le deal contractuel"
                  aria-label="Accepter et sceller le deal"
                >
                  <Check size={14} strokeWidth={2.5} />
                  <span>Accepter & sceller le deal</span>
                </button>

                {/* BOUTON 2 : CONTRE-OFFRE */}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      hapticLight();
                      if (typeof handleCounter === 'function') {
                        handleCounter(terms, effectiveMessageId);
                      }
                    } catch (err) {
                      console.warn('[DealMessageCard] Counter offer error:', err);
                    }
                  }}
                  className="premium-button focus:ring-2 focus:ring-[#C67D5B] focus:outline-none transition-all rounded-full"
                  style={{
                    border: '1.5px solid var(--accent-primary)',
                    borderRadius: '999px',
                    padding: '10px 6px',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--accent-primary)',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                  }}
                  title="Proposer des conditions alternatives"
                  aria-label="Faire une contre-offre"
                >
                  <RefreshCw size={13} strokeWidth={2.5} />
                  <span>Contre-offre</span>
                </button>

                {/* BOUTON 3 : REFUSER */}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      hapticWarning();
                      if (typeof onDeclineDeal === 'function') {
                        onDeclineDeal(effectiveMessageId);
                      }
                    } catch (err) {
                      console.warn('[DealMessageCard] Decline deal error:', err);
                    }
                  }}
                  className="premium-button focus:ring-2 focus:ring-[#EF4444] focus:outline-none transition-all rounded-full"
                  style={{
                    border: '1.5px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '999px',
                    padding: '10px 6px',
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    color: '#EF4444',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                  }}
                  title="Décliner définitivement cette proposition"
                  aria-label="Décliner l'offre"
                >
                  <X size={14} strokeWidth={2.5} />
                  <span>Décliner l'offre</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* SECTION DOUBLE VALIDATION DE TROC SANS DEVISE (1/2 ET 2/2) */}
        {isTrocInProgress && (
          <div
            style={{
              marginTop: '10px',
              padding: '12px 14px',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1.5px solid #F59E0B',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: '800', color: '#F59E0B' }}>
                <ShieldCheck size={16} />
                <span>Troc en cours : {confirmedCount}/2 validations</span>
              </div>
              <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-secondary)' }}>
                Double validation
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Pour sceller ce troc sans monnaie, chaque participant doit certifier la bonne réalisation de sa prestation.
            </p>

            {myConfirmed ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 12px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  color: '#10B981',
                  fontSize: '11.5px',
                  fontWeight: '800',
                }}
              >
                <CheckCircle2 size={15} />
                <span>Vous avez certifié la prestation (En attente du partenaire {confirmedCount}/2)</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  try {
                    hapticSuccess();
                    playSuccessChime();
                    if (typeof onConfirmTrocCompletion === 'function') {
                      onConfirmTrocCompletion(effectiveMessageId);
                    }
                  } catch (e) {
                    console.warn('[DealMessageCard] confirm troc error:', e);
                  }
                }}
                aria-label="Prestation terminée"
                className="premium-button focus:ring-2 focus:ring-[#10B981] focus:ring-offset-2 focus:outline-none transition-all rounded-full"
                style={{
                  width: '100%',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                }}
              >
                <CheckCircle2 size={16} />
                <span>Prestation terminée ({confirmedCount === 0 ? 'Valider 1/2' : 'Confirmer final 2/2'}) ✓</span>
              </button>
            )}
          </div>
        )}

        {/* GAMIFICATION : BOUTON LAISSER UN AVIS APRÈS CLÔTURE */}
        {isAccepted && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: '800', color: '#10B981' }}>
              <CheckCircle2 size={15} />
              <span>✓ Deal accepté et validé</span>
            </div>

            {typeof onOpenRatingModal === 'function' && (
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  onOpenRatingModal({
                    dealId: effectiveMessageId,
                    partnerName,
                    serviceTitle,
                  });
                }}
                aria-label="Évaluer l'échange"
                className="focus:ring-2 focus:ring-[#C67D5B] focus:outline-none transition-all rounded-full"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  border: '1.5px solid #C67D5B',
                  backgroundColor: 'rgba(198, 125, 91, 0.1)',
                  color: '#C67D5B',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  fontSize: '11.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                }}
              >
                <Star size={13} fill="#C67D5B" />
                <span>Évaluer l'échange</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
