import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Handshake,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Clock,
  ShieldCheck,
  Coins,
  CreditCard,
  Repeat,
} from 'lucide-react';
import { useChatStore } from '../stores/useChatStore';
import haptics, { safeVibrate } from '../utils/haptics';

/**
 * Filtre les deals et négociations actifs nécessitant l'attention de l'utilisateur.
 * Supporte les listes de chats Zustand, Firestore et les messages de fil chatThreads.
 */
export const getActiveDealsFromChats = (chatsList = [], chatThreads = {}) => {
  if (!Array.isArray(chatsList)) return [];

  const ACTIVE_STATUSES = new Set([
    'pending',
    'proposed',
    'en_attente',
    'sent',
    'in_progress',
    'troc_in_progress',
    'escrow_locked',
    'countered',
    'confirmed',
    'accepted',
    'validated',
  ]);

  const INACTIVE_STATUSES = new Set([
    'declined',
    'rejected',
    'refused',
    'cancelled',
    'completed',
    'completed_by_admin',
    'refunded',
    'refunded_by_admin',
    'superseded',
  ]);

  const active = [];

  for (const chat of chatsList) {
    if (!chat || !chat.id) continue;
    const dealStatus = String(chat.lastDealStatus || chat.dealStatus || chat.deal?.status || '').toLowerCase();

    let isActive = false;
    let terms = chat.dealTerms || chat.deal?.terms || chat.proposal || null;
    let status = dealStatus || 'pending';

    if (dealStatus && ACTIVE_STATUSES.has(dealStatus) && !INACTIVE_STATUSES.has(dealStatus)) {
      isActive = true;
    } else if (chat.deal && typeof chat.deal === 'object' && !INACTIVE_STATUSES.has(String(chat.deal.status).toLowerCase())) {
      isActive = true;
      status = String(chat.deal.status || 'pending').toLowerCase();
      terms = chat.deal.terms || terms;
    } else if (chat.activeDeal) {
      isActive = true;
      if (typeof chat.activeDeal === 'object') {
        terms = chat.activeDeal.terms || terms;
        status = String(chat.activeDeal.status || 'pending').toLowerCase();
      }
    } else if (Number(chat.tokensAmount) > 0 || Number(chat.euroAmount) > 0) {
      if (!INACTIVE_STATUSES.has(dealStatus)) {
        isActive = true;
        status = status || 'pending';
      }
    }

    // Consultation complémentaire de chatThreads si disponible
    const thread = chatThreads[chat.id] || chatThreads[String(chat.id)];
    if (Array.isArray(thread) && thread.length > 0) {
      for (let i = thread.length - 1; i >= 0; i--) {
        const msg = thread[i];
        if (msg && (msg.type === 'deal_proposal' || msg.type === 'deal' || msg.type === 'deal_counter_offer' || msg.dealTerms)) {
          const msgStatus = String(msg.status || msg.dealTerms?.status || 'pending').toLowerCase();
          if (ACTIVE_STATUSES.has(msgStatus) && !INACTIVE_STATUSES.has(msgStatus)) {
            isActive = true;
            status = msgStatus;
            terms = msg.dealTerms || msg.terms || terms;
            break;
          } else if (INACTIVE_STATUSES.has(msgStatus)) {
            isActive = false;
            break;
          }
        }
      }
    }

    if (isActive) {
      const tokens = Number(terms?.tokens ?? chat.tokensAmount ?? (terms?.hours ? terms.hours : 0)) || 0;
      const euros = Number(terms?.fiatAmount ?? chat.euroAmount ?? 0) || 0;

      active.push({
        id: chat.id,
        chatId: chat.id,
        chat,
        partnerName: chat.user || chat.peerProfile?.name || 'Interlocuteur',
        partnerAvatar: chat.avatar || chat.peerProfile?.avatar || null,
        listingTitle: chat.listing || terms?.serviceTitle || terms?.title || terms?.itemName || 'Prestation de troc',
        status,
        tokensAmount: tokens,
        euroAmount: euros,
        updatedAt: chat.updatedAt || chat.timestamp || null,
        terms,
      });
    }
  }

  return active;
};

/**
 * ActiveDealsWidget — Widget de réengagement compact en tête du Feed
 * Affiche les deals et propositions d'échanges actifs avec accès direct à la conversation.
 */
export default function ActiveDealsWidget({
  deals: explicitDeals = null,
  chatsList: propChatsList = null,
  chatThreads: propChatThreads = null,
  onOpenChat = null,
  onSelectChat = null,
  darkMode = false,
  t: propT = null,
  currentLang = 'FR',
}) {
  // Récupération réactive depuis Zustand si non injecté par props
  const storeChatsList = useChatStore((state) => state.chatsList);
  const storeChatThreads = useChatStore((state) => state.chatThreads);
  const setSelectedChatInStore = useChatStore((state) => state.setSelectedChat);

  const effectiveChatsList = propChatsList || storeChatsList || [];
  const effectiveChatThreads = propChatThreads || storeChatThreads || {};

  // Résolution des traductions avec fallback immédiat
  const t = (key, fallback) => {
    if (typeof propT === 'function') {
      const res = propT(key, fallback);
      if (res && res !== key) return res;
    }
    return fallback || key;
  };

  const activeDeals = useMemo(() => {
    if (Array.isArray(explicitDeals)) {
      return explicitDeals;
    }
    return getActiveDealsFromChats(effectiveChatsList, effectiveChatThreads);
  }, [explicitDeals, effectiveChatsList, effectiveChatThreads]);

  // Si aucun deal actif n'est en cours, le widget s'efface totalement du DOM
  if (!activeDeals || activeDeals.length === 0) {
    return null;
  }

  const handleResumeChat = (deal) => {
    safeVibrate(15);
    if (haptics?.light) haptics.light();

    const targetChat = deal.chat || {
      id: deal.chatId || deal.id,
      user: deal.partnerName,
      avatar: deal.partnerAvatar,
      listing: deal.listingTitle,
    };

    if (typeof onOpenChat === 'function') {
      onOpenChat(targetChat);
    } else if (typeof onSelectChat === 'function') {
      onSelectChat(targetChat);
    }

    if (typeof setSelectedChatInStore === 'function') {
      setSelectedChatInStore(targetChat);
    }

    // Déclenchement de l'événement global troco:open_chat
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('troco:open_chat', {
          detail: {
            chatId: deal.chatId || deal.id,
            user: deal.partnerName,
            chat: targetChat,
          },
        })
      );
    }
  };

  const renderStatusBadge = (status) => {
    const s = String(status || 'pending').toLowerCase();
    if (s === 'escrow_locked') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: '800',
            color: 'var(--accent-success, #10B981)',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            padding: '4px 10px',
            borderRadius: '999px',
            border: '1px solid rgba(16, 185, 129, 0.25)',
          }}
        >
          <ShieldCheck size={12} />
          {t('dealsWidget.statusEscrow', 'Escrow sécurisé')}
        </span>
      );
    }

    if (s === 'in_progress' || s === 'troc_in_progress' || s === 'confirmed' || s === 'accepted') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: '800',
            color: 'var(--accent-primary, #D97706)',
            backgroundColor: 'rgba(217, 119, 6, 0.12)',
            padding: '4px 10px',
            borderRadius: '999px',
            border: '1px solid rgba(217, 119, 6, 0.25)',
          }}
        >
          <Repeat size={12} />
          {t('dealsWidget.statusInProgress', 'Troc en cours')}
        </span>
      );
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          fontWeight: '800',
          color: '#EAB308',
          backgroundColor: 'rgba(234, 179, 8, 0.12)',
          padding: '4px 10px',
          borderRadius: '999px',
          border: '1px solid rgba(234, 179, 8, 0.25)',
        }}
      >
        <Clock size={12} />
        {t('dealsWidget.statusPending', 'Proposition en attente')}
      </span>
    );
  };

  return (
    <motion.section
      data-testid="active-deals-widget"
      role="region"
      aria-label={t('dealsWidget.title', 'Mes deals en cours')}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
      style={{
        width: '100%',
        marginBottom: '20px',
        borderRadius: '24px',
        backgroundColor: darkMode ? 'rgba(26, 22, 19, 0.85)' : 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1.5px solid var(--border-subtle, rgba(214, 69, 110, 0.2))',
        boxShadow: darkMode
          ? '0 12px 32px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.04)'
          : '0 12px 32px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
        padding: '16px 20px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* En-tête du widget */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--accent-primary, #C67D5B), #E09F80)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(198, 125, 91, 0.35)',
              flexShrink: 0,
            }}
          >
            <Handshake size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '15px',
                  fontWeight: '900',
                  color: 'var(--text-main, #1F2937)',
                  letterSpacing: '-0.02em',
                }}
              >
                {t('dealsWidget.title', 'Mes deals en cours')}
              </h3>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  color: 'var(--accent-primary, #C67D5B)',
                  backgroundColor: 'rgba(198, 125, 91, 0.14)',
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                {activeDeals.length}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                color: 'var(--text-secondary, #6B7280)',
                fontWeight: '500',
              }}
            >
              {t('dealsWidget.subtitle', 'Échanges et négociations nécessitant votre attention')}
            </p>
          </div>
        </div>
      </div>

      {/* Grille / Défilement fluide des deals */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          paddingBottom: '4px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {activeDeals.map((deal) => {
          const initials = (deal.partnerName || 'U')
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

          return (
            <div
              key={deal.id || deal.chatId}
              data-testid="active-deal-item"
              style={{
                flex: activeDeals.length === 1 ? '1 1 100%' : '0 0 min(320px, 85%)',
                scrollSnapAlign: 'start',
                backgroundColor: darkMode ? 'rgba(38, 32, 28, 0.65)' : 'rgba(247, 245, 240, 0.85)',
                border: '1px solid var(--border-subtle, rgba(0, 0, 0, 0.06))',
                borderRadius: '18px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  {deal.partnerAvatar ? (
                    <img
                      src={deal.partnerAvatar}
                      alt={deal.partnerName}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid var(--accent-primary, #C67D5B)',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent-primary, #C67D5B)',
                        color: '#FFF',
                        fontSize: '13px',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13.5px',
                        fontWeight: '800',
                        color: 'var(--text-main, #1F2937)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {deal.partnerName}
                    </div>
                    <div
                      style={{
                        fontSize: '11.5px',
                        color: 'var(--text-secondary, #6B7280)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {deal.listingTitle}
                    </div>
                  </div>
                </div>

                {renderStatusBadge(deal.status)}
              </div>

              {/* Ligne contrepartie & bouton d'action */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '6px',
                  borderTop: darkMode ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {deal.tokensAmount > 0 ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: '800',
                        color: 'var(--accent-primary, #C67D5B)',
                      }}
                    >
                      <Coins size={13} />
                      {deal.tokensAmount} {t('dealsWidget.tokens', 'Jetons')}
                    </span>
                  ) : deal.euroAmount > 0 ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: '800',
                        color: 'var(--accent-success, #10B981)',
                      }}
                    >
                      <CreditCard size={13} />
                      {deal.euroAmount} €
                    </span>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: 'var(--text-secondary, #6B7280)',
                      }}
                    >
                      <Sparkles size={12} />
                      {t('dealsWidget.directTroc', 'Troc direct de service')}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  data-testid="resume-deal-btn"
                  onClick={() => handleResumeChat(deal)}
                  className="premium-button"
                  aria-label={`${t('dealsWidget.resumeChat', 'Reprendre la discussion')} avec ${deal.partnerName}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, var(--accent-primary, #C67D5B) 0%, var(--accent-primary-hover, #B36846) 100%)',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(198, 125, 91, 0.3)',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <MessageSquare size={13} />
                  <span>{t('dealsWidget.resumeChat', 'Reprendre la discussion')}</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
