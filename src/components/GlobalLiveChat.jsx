import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Flame, Zap,
  TrendingUp, AtSign, ChevronDown, Trash2
} from 'lucide-react';
import {
  collection, addDoc, query, orderBy, limit,
  onSnapshot, serverTimestamp, deleteDoc, doc
} from 'firebase/firestore';
import { db } from '../firebase';
import { validateChatMessage } from '../utils/moderationBlacklist';

// Messages initiaux riches
const INITIAL_GLOBAL_MESSAGES = [
  {
    id: 'm-init-1',
    author: 'Mateo P.',
    authorUsername: '@mateopolo',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    text: 'Bienvenue sur le Chat Global Troco Live ! Posez vos questions ou lancez vos demandes urgentes en direct 🚀',
    badge: 'FONDATEUR',
    isUrgent: false,
    timestamp: Date.now() - 360000,
  },
  {
    id: 'm-init-2',
    author: 'Emma R.',
    authorUsername: '@emmar',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    text: '@mateopolo Je recherche un photographe pour un shooting produit ce jeudi à Paris 11e, troc contre cours de design !',
    badge: 'PRO',
    isUrgent: false,
    timestamp: Date.now() - 240000,
  },
  {
    id: 'm-init-3',
    author: 'Thomas V.',
    authorUsername: '@thomasv',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
    text: '⚡ URGENT : Quelqu’un de dispo pour un coup de main sur un script Python / FastApi ce soir ? 15 Jetons Troco offerts !',
    badge: 'VIP',
    isUrgent: true,
    timestamp: Date.now() - 90000,
  },
  {
    id: 'm-init-4',
    author: 'Sofia L.',
    authorUsername: '@sofial',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    text: '@thomasv Je suis dispo dans 30 min ! Je t’envoie un MP dans l’onglet Chat 💬',
    badge: 'VÉRIFIÉ',
    isUrgent: false,
    timestamp: Date.now() - 30000,
  }
];

export default function GlobalLiveChat({
  currentUser = null,
  onOpenProfile = null,
  darkMode = false,
  isCompact = false,
}) {
  const [messages, setMessages] = useState(INITIAL_GLOBAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isUrgentMode, setIsUrgentMode] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1428);
  const [hasNewMessagesBelow, setHasNewMessagesBelow] = useState(false);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

  const scrollContainerRef = useRef(null);
  const inputRef = useRef(null);

  const myName = currentUser?.name || 'Moi';
  const myUsername = currentUser?.username || '@moi';
  const myAvatar = currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
  const myBadge = currentUser?.kycVerified ? 'VÉRIFIÉ' : 'MEMBRE';
  const isAdmin = currentUser?.email === 'mateopolo91@gmail.com' || currentUser?.role === 'admin';

  // Fluctuation naturelle du nombre de membres en ligne
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineCount(prev => Math.max(1200, prev + Math.floor(Math.random() * 7) - 3));
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Défilement automatique vers le bas ISOLÉ AU CONTENEUR INTERNE (ne scrolle JAMAIS la page globale)
  const scrollToBottom = (behavior = 'smooth') => {
    if (scrollContainerRef.current) {
      if (behavior === 'smooth') {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      } else {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }
    setHasNewMessagesBelow(false);
  };

  // Écoute en temps réel des messages dans Firestore
  useEffect(() => {
    if (!db) return;

    try {
      const q = query(
        collection(db, 'global_chat'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const fetched = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            fetched.push({
              id: docSnap.id,
              author: data.author || 'Membre Troco',
              authorUsername: data.authorUsername || '@membre',
              avatar: data.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
              text: data.text || '',
              badge: data.badge || (data.verified ? 'VÉRIFIÉ' : 'MEMBRE'),
              isUrgent: !!data.isUrgent,
              timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : (data.createdAt || Date.now()),
            });
          });
          fetched.reverse();

          // Si la base contient moins de 3 messages, on fusionne les messages initiaux de démo
          if (fetched.length < 3) {
            const existingIds = new Set(fetched.map(m => m.id));
            const baseList = INITIAL_GLOBAL_MESSAGES.filter(m => !existingIds.has(m.id));
            setMessages([...baseList, ...fetched]);
          } else {
            setMessages(fetched);
          }

          if (isAutoScrollEnabled) {
            setTimeout(() => scrollToBottom('smooth'), 50);
          } else {
            setHasNewMessagesBelow(true);
          }
        }
      }, (err) => {
        console.warn('[GlobalChat] Firestore listener notice:', err);
      });

      return () => unsubscribe();
    } catch (_) {}
  }, [isAutoScrollEnabled]);

  // Détection du défilement manuel
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 60;
    setIsAutoScrollEnabled(isNearBottom);
    if (isNearBottom) {
      setHasNewMessagesBelow(false);
    }
  };

  // Envoi de message avec mise à jour optimiste instantanée & filtre de modération
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    // ---- MODÉRATION DE SÉCURITÉ (LISTE NOIRE & ANTI-ARNAQUE) ----
    const messageCheck = validateChatMessage(text);
    if (!messageCheck.isValid) {
      alert(messageCheck.errorMessage);
      return;
    }

    const optimisticMsg = {
      id: `local-${Date.now()}`,
      author: myName,
      authorUsername: myUsername,
      avatar: myAvatar,
      text: text,
      badge: myBadge,
      isUrgent: isUrgentMode,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setInputText('');
    setIsUrgentMode(false);
    setIsAutoScrollEnabled(true);
    setTimeout(() => scrollToBottom('smooth'), 20);

    // Sauvegarde Firestore
    try {
      await addDoc(collection(db, 'global_chat'), {
        author: myName,
        authorUsername: myUsername,
        avatar: myAvatar,
        text: text,
        badge: myBadge,
        isUrgent: isUrgentMode,
        timestamp: serverTimestamp(),
        createdAt: Date.now(),
      });
    } catch (err) {
      console.warn('[GlobalChat] Firestore send error:', err);
    }
  };

  // Suppression d'un message par l'administrateur
  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm("Supprimer ce message public ?")) return;
    try {
      setMessages(prev => prev.filter(m => m.id !== messageId));
      if (db && messageId && typeof messageId === 'string' && !messageId.startsWith('m-init-') && !messageId.startsWith('local-')) {
        await deleteDoc(doc(db, 'global_chat', messageId));
      }
    } catch (err) {
      console.warn('[GlobalChat] Erreur suppression message admin:', err);
    }
  };

  // Mentionner un utilisateur en cliquant dessus
  const handleMentionUser = (username) => {
    const cleanHandle = username.startsWith('@') ? username : `@${username}`;
    setInputText(prev => `${prev.trim()} ${cleanHandle} `.trimStart());
    inputRef.current?.focus();
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: isCompact ? 'calc(100dvh - env(safe-area-inset-bottom, 0px) - 75px)' : '100%',
        maxHeight: isCompact ? 'calc(100dvh - env(safe-area-inset-bottom, 0px) - 75px)' : '100%',
        backgroundColor: darkMode ? '#151210' : '#FAF8F5',
        borderRadius: isCompact ? '18px' : '24px',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.06)',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. EN-TÊTE COMPACT TWITCH-STYLE */}
      <div
        style={{
          padding: isCompact ? '8px 12px' : '10px 16px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: darkMode ? 'rgba(24, 20, 18, 0.98)' : 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: '#EF4444',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)',
              animation: 'pulse 2s infinite',
              flexShrink: 0,
            }}
          >
            <Zap size={14} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontWeight: '800', fontSize: '13px', color: 'var(--text-main)' }}>
                Troco Live Chat
              </span>
              <span style={{ fontSize: '8.5px', fontWeight: '900', backgroundColor: '#EF4444', color: '#FFF', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                DIRECT
              </span>
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
              <span>{onlineCount.toLocaleString()} connectés</span>
            </div>
          </div>
        </div>

        {/* BADGES TICKER STATUS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10.5px',
              fontWeight: '700',
              backgroundColor: darkMode ? 'rgba(198, 125, 91, 0.15)' : '#F5EAE4',
              color: 'var(--accent-primary)',
              padding: '3px 8px',
              borderRadius: '999px',
            }}
          >
            <TrendingUp size={12} />
            <span>Flux 50 ms</span>
          </div>
        </div>
      </div>

      {/* 2. ZONE DE DÉFILEMENT DES MESSAGES */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{
          flex: '1 1 0%',
          minHeight: 0,
          overflowY: 'auto',
          padding: isCompact ? '10px 8px' : '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          scrollBehavior: 'smooth',
          overscrollBehaviorY: 'contain',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
          boxSizing: 'border-box',
        }}
      >
        {/* BANNIÈRE DE BIENVENUE DU CHAT GLOBAL */}
        <div
          style={{
            padding: '8px 12px',
            borderRadius: '12px',
            backgroundColor: darkMode ? 'rgba(198, 125, 91, 0.08)' : 'rgba(198, 125, 91, 0.06)',
            border: '1px dashed var(--accent-primary)',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            marginBottom: '2px',
            lineHeight: 1.4,
          }}
        >
          💡 <strong>Astuce :</strong> Cliquez sur un pseudo pour mentionner avec <code>@</code>. Activez <strong>⚡ Alerte</strong> pour les demandes urgentes.
        </div>

        {messages.map((msg) => {
          const isUrgent = msg.isUrgent;
          const formattedTime = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '8px 10px',
                borderRadius: '14px',
                backgroundColor: isUrgent
                  ? (darkMode ? 'rgba(239, 68, 68, 0.16)' : 'rgba(254, 226, 226, 0.7)')
                  : (darkMode ? '#1E1A17' : '#FFFFFF'),
                border: isUrgent
                  ? '1.5px solid #EF4444'
                  : '1px solid var(--border-color)',
                boxShadow: isUrgent
                  ? '0 4px 14px rgba(239, 68, 68, 0.15)'
                  : '0 2px 6px rgba(0, 0, 0, 0.02)',
                transition: 'all 0.15s ease',
                animation: 'fadeSlideUp 0.15s ease both',
              }}
            >
              {/* AVATAR CLIQUABLE */}
              <img
                src={msg.avatar}
                alt={msg.author}
                onClick={() => onOpenProfile?.(msg)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  cursor: 'pointer',
                  flexShrink: 0,
                  border: isUrgent ? '2px solid #EF4444' : '1.5px solid var(--border-color)',
                }}
                title={`Voir le profil de ${msg.author}`}
              />

              {/* CORPS DU MESSAGE */}
              <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {/* LIGNE D'EN-TÊTE DU MESSAGE */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                  {/* PSEUDO CLIQUABLE */}
                  <button
                    type="button"
                    onClick={() => handleMentionUser(msg.authorUsername || msg.author)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: 0,
                      fontWeight: '800',
                      color: isUrgent ? '#EF4444' : 'var(--text-main)',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                    title="Cliquer pour mentionner"
                  >
                    {msg.author}
                  </button>

                  {/* BADGE RÔLE */}
                  {msg.badge && (
                    <span
                      style={{
                        fontSize: '8.5px',
                        fontWeight: '800',
                        padding: '1px 5px',
                        borderRadius: '5px',
                        backgroundColor: msg.badge === 'FONDATEUR' ? '#F59E0B' : msg.badge === 'VIP' ? '#8B5CF6' : msg.badge === 'PRO' ? '#3B82F6' : 'rgba(16, 185, 129, 0.15)',
                        color: msg.badge === 'MEMBRE' ? '#10B981' : '#FFFFFF',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px',
                      }}
                    >
                      {msg.badge}
                    </span>
                  )}

                  {isUrgent && (
                    <span
                      style={{
                        fontSize: '8.5px',
                        fontWeight: '900',
                        padding: '1px 5px',
                        borderRadius: '5px',
                        backgroundColor: '#EF4444',
                        color: '#FFFFFF',
                        textTransform: 'uppercase',
                        animation: 'pulse 1.8s infinite',
                      }}
                    >
                      ⚡ URGENT
                    </span>
                  )}

                  {/* HEURE & BOUTON SUPPRESSION ADMIN */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.8 }}>
                      {formattedTime}
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMessage(msg.id);
                        }}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#EF4444',
                          cursor: 'pointer',
                          padding: '2px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          opacity: 0.75,
                          transition: 'opacity 0.15s ease',
                        }}
                        title="Supprimer ce message (Admin)"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* TEXTE DU MESSAGE */}
                <div style={{ color: 'var(--text-main)', fontSize: '12.5px', lineHeight: 1.4, wordBreak: 'break-word', fontWeight: isUrgent ? '600' : '400' }}>
                  {msg.text.split(' ').map((word, i) => {
                    if (word.startsWith('@')) {
                      return (
                        <span key={i} style={{ color: '#3B82F6', fontWeight: '800', backgroundColor: 'rgba(59, 130, 246, 0.12)', padding: '1px 4px', borderRadius: '4px', marginRight: '2px' }}>
                          {word}{' '}
                        </span>
                      );
                    }
                    return word + ' ';
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* BOUTON FLOTTANT : NOUVEAUX MESSAGES EN BAS */}
      {hasNewMessagesBelow && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="premium-button"
          style={{
            position: 'absolute',
            bottom: '70px',
            left: '50%',
            transform: 'translateX(-50%)',
            border: 'none',
            borderRadius: '999px',
            padding: '6px 14px',
            backgroundColor: 'var(--accent-primary)',
            color: '#FFF',
            fontSize: '11px',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            zIndex: 10,
          }}
        >
          <ChevronDown size={13} />
          <span>Nouveaux messages</span>
        </button>
      )}

      {/* 3. ZONE DE SAISIE FIXÉE DIRECTEMENT SANS MARGE INFÉRIEURE */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          padding: '8px 12px',
          paddingBottom: '8px',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: darkMode ? '#181412' : '#FFFFFF',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          flexShrink: 0,
          zIndex: 30,
          boxSizing: 'border-box',
          margin: 0,
        }}
      >
        {/* BARRE D'ÉMOJIS RAPIDES & MODE ALERTE */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', paddingBottom: '1px' }}>
            {['🔥', '🚀', '👏', '💎', '❤️', '⚡', '💡', '🎉'].map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setInputText(prev => `${prev} ${emoji}`.trimStart());
                  inputRef.current?.focus();
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '1px 3px',
                  borderRadius: '5px',
                  transition: 'transform 0.1s ease',
                }}
                className="premium-button"
                title={`Insérer ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* BOUTON BASCULE : MODE ALERTE URGENTE ⚡ */}
          <button
            type="button"
            onClick={() => setIsUrgentMode(!isUrgentMode)}
            className="premium-button"
            style={{
              border: isUrgentMode ? '1px solid #EF4444' : '1px solid var(--border-color)',
              backgroundColor: isUrgentMode ? '#EF4444' : 'transparent',
              color: isUrgentMode ? '#FFFFFF' : 'var(--text-secondary)',
              borderRadius: '999px',
              padding: '3px 8px',
              fontSize: '10.5px',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            <Flame size={11} color={isUrgentMode ? '#FFFFFF' : '#EF4444'} />
            <span>Mode Alerte</span>
          </button>
        </div>

        {/* CHAMP DE SAISIE */}
        <form onSubmit={handleSendMessage} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              backgroundColor: darkMode ? '#221D1A' : '#F5F0E8',
              borderRadius: '999px',
              padding: '0 12px',
              border: isUrgentMode ? '1.5px solid #EF4444' : '1px solid var(--border-color)',
              transition: 'border-color 0.2s ease',
            }}
          >
            <AtSign size={13} color="var(--text-secondary)" style={{ marginRight: '5px', opacity: 0.6 }} />
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isUrgentMode ? "Demande urgente (ex: Cherche dev ce soir...)" : "Envoyer un message à la communauté..."}
              maxLength={300}
              style={{
                flex: 1,
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--text-main)',
                fontSize: '12.5px',
                padding: '8px 0',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="premium-button"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: isUrgentMode ? '#EF4444' : 'var(--accent-primary)',
              color: '#FFFFFF',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: inputText.trim() ? 'pointer' : 'not-allowed',
              opacity: inputText.trim() ? 1 : 0.5,
              transition: 'all 0.15s ease',
              flexShrink: 0,
              boxShadow: inputText.trim() ? 'var(--shadow-accent)' : 'none',
            }}
            title="Envoyer (Entrée)"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
