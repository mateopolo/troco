/**
 * DealMessageCard.jsx — Composant sécurisé de carte de négociation de Deal
 * Affiche les conditions proposées (jetons, heures, euros) et les 3 boutons d'action.
 */

import React from 'react';
import { Sparkles, Clock, Check, RefreshCw, X } from 'lucide-react';

export default function DealMessageCard({
  msg,
  isMine = false,
  isSender = false,
  isRecipient = true,
  partnerName = 'l’interlocuteur',
  onAcceptDeal = null,
  openCounterOffer = null,
  onDeclineDeal = null,
  hapticSuccess = () => {},
  playSuccessChime = () => {},
  hapticLight = () => {},
  hapticWarning = () => {},
  t = (key) => key,
  isMobile = false,
}) {
  const terms = (msg && (msg.dealTerms || msg.terms || msg.proposal || msg.deal)) || {};
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

  const currentDealStatus = String(msg?.status || 'pending').toLowerCase();
  const isAccepted = (currentDealStatus === 'confirmed' || currentDealStatus === 'accepted' || currentDealStatus === 'validated');
  const isRejected = (currentDealStatus === 'declined' || currentDealStatus === 'rejected' || currentDealStatus === 'refused' || currentDealStatus === 'cancelled');
  const isDealPending = !isAccepted && !isRejected;

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
        borderRadius: '20px',
        borderBottomRightRadius: isMine ? '4px' : '20px',
        borderBottomLeftRadius: !isMine ? '4px' : '20px',
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
        </div>

        {/* 🚨 PHASE 101 : VERROUILLAGE ANTI-RÉGRESSION DES BOUTONS DE NÉGOCIATION */}
        {!isAccepted && !isRejected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            {isSender ? (
              /* ÉTAT EXPÉDITEUR : BOUTON EN ATTENTE DU PARTENAIRE (DISABLED) */
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px dashed var(--border-color)',
                color: 'var(--text-secondary)',
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '12px',
                fontWeight: '700',
                opacity: 0.85,
                cursor: 'not-allowed'
              }}>
                <Clock size={14} color="var(--accent-primary)" />
                <span>En attente de la réponse du partenaire...</span>
              </div>
            ) : (
              /* ÉTAT DESTINATAIRE : LES 3 BOUTONS ACTIFS AVEC CALLBACKS SÉCURISÉS */
              // @guard ANTI-REGRESSION: The 3 negotiation buttons MUST ALWAYS be rendered in the DOM. Disabled state logic dictates interactability, not unmounting.
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                {/* BOUTON 1 : ACCEPTER */}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      hapticSuccess();
                      playSuccessChime();
                      if (typeof onAcceptDeal === 'function') {
                        onAcceptDeal(msg?.id, terms);
                      }
                    } catch (err) {
                      console.warn('[DealMessageCard] Accept deal error:', err);
                    }
                  }}
                  className="premium-button"
                  style={{
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 4px',
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
                    transition: 'transform 0.15s ease, opacity 0.15s ease'
                  }}
                  title="Accepter la proposition de deal"
                >
                  <Check size={14} strokeWidth={2.5} />
                  <span>Accepter</span>
                </button>

                {/* BOUTON 2 : CONTRE-OFFRE */}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      hapticLight();
                      if (typeof openCounterOffer === 'function') {
                        openCounterOffer(terms, msg?.id);
                      }
                    } catch (err) {
                      console.warn('[DealMessageCard] Counter offer error:', err);
                    }
                  }}
                  className="premium-button"
                  style={{
                    border: '1.5px solid var(--accent-primary)',
                    borderRadius: '12px',
                    padding: '10px 4px',
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
                    transition: 'transform 0.15s ease, opacity 0.15s ease'
                  }}
                  title="Faire une contre-proposition"
                >
                  <RefreshCw size={13} strokeWidth={2.5} />
                  <span>Négocier</span>
                </button>

                {/* BOUTON 3 : REFUSER */}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      hapticWarning();
                      if (typeof onDeclineDeal === 'function') {
                        onDeclineDeal(msg?.id);
                      }
                    } catch (err) {
                      console.warn('[DealMessageCard] Decline deal error:', err);
                    }
                  }}
                  className="premium-button"
                  style={{
                    border: '1.5px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '12px',
                    padding: '10px 4px',
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
                    transition: 'transform 0.15s ease, opacity 0.15s ease'
                  }}
                  title="Décliner cette proposition"
                >
                  <X size={14} strokeWidth={2.5} />
                  <span>Refuser</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
