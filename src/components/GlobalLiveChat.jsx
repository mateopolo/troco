import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Flame, Zap,
  TrendingUp, AtSign, ChevronDown
} from 'lucide-react';
import {
  collection, addDoc, query, orderBy, limit,
  onSnapshot, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

const QUICK_EMOJIS = ['🔥', '🚀', '👏', '💎', '❤️', '⚡', '💡', '🎉'];

const MOCK_LIVE_MESSAGES = [
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
  const [messages, setMessages] = useState(MOCK_LIVE_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isUrgentMode, setIsUrgentMode] = useState(false);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [hasNewMessagesBelow, setHasNewMessagesBelow] = useState(false);
  const [onlineCount] = useState(1428);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const inputRef = useRef(null);

  // 1. Écoute Firestore temps réel OPTIMISÉE (strictement 50 derniers messages)
  useEffect(() => {
    try {
      const q = query(
        collection(db, 'global_chat'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const fetched = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            fetched.push({
              id: doc.id,
              author: data.author || 'Membre Troco',
              authorUsername: data.authorUsername || '@membre',
              avatar: data.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
              text: data.text || '',
              badge: data.badge || (data.verified ? 'VÉRIFIÉ' : 'MEMBRE'),
              isUrgent: !!data.isUrgent,
              timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : (data.createdAt || Date.now()),
            });
          });
          // On remet dans l'ordre chronologique croissant
          fetched.reverse();
          setMessages(fetched);

          if (!isAutoScrollEnabled) {
            setHasNewMessagesBelow(true);
          }
        }
      }, (err) => {
        console.warn('[GlobalChat] Firestore listener notice:', err);
      });

      return () => unsubscribe();
    } catch (_) {}
  }, [isAutoScrollEnabled]);

  // Défilement automatique vers le bas
  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setHasNewMessagesBelow(false);
  };

  useEffect(() => {
    if (isAutoScrollEnabled) {
      scrollToBottom('smooth');
    }
  }, [messages, isAutoScrollEnabled]);

  // Détection du scroll utilisateur (désactivation auto-scroll si on remonte)
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    setIsAutoScrollEnabled(isNearBottom);
    if (isNearBottom) setHasNewMessagesBelow(false);
  };

  // Envoi d'un message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    const myName = currentUser?.name || 'Mateo P.';
    const myUsername = currentUser?.username || '@mateopolo';
    const myAvatar = currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
    const myBadge = currentUser?.kycVerified ? 'VÉRIFIÉ' : currentUser?.trocoTokens > 20 ? 'VIP' : 'MEMBRE';

    const newMsg = {
      id: `local-${Date.now()}`,
      author: myName,
      authorUsername: myUsername,
      avatar: myAvatar,
      text: text,
      badge: myBadge,
      isUrgent: isUrgentMode,
      timestamp: Date.now(),
    };

    // Optimistic local UI update
    setMessages(prev => [...prev.slice(-49), newMsg]);
    setInputText('');
    setIsUrgentMode(false);
    setIsAutoScrollEnabled(true);
    scrollToBottom('smooth');

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
        height: '100%',
        backgroundColor: darkMode ? '#151210' : '#FAF8F5',
        borderRadius: isCompact ? '16px' : '24px',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.08)',
        position: 'relative',
      }}
    >
      {/* 1. TICKER / EN-TÊTE TWITCH-STYLE */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: darkMode ? 'rgba(24, 20, 18, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
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
              boxShadow: '0 0 12px rgba(239, 68, 68, 0.4)',
              animation: 'pulse 2s infinite',
            }}
          >
            <Zap size={15} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: '800', fontSize: '13px', color: 'var(--text-main)' }}>
                Troco Live Chat
              </span>
              <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: '#EF4444', color: '#FFF', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase' }}>
                DIRECT
              </span>
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
              <span>{onlineCount.toLocaleString()} membres connectés</span>
            </div>
          </div>
        </div>

        {/* BADGES TICKER BOURSE / STATUS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: '700',
              backgroundColor: darkMode ? 'rgba(198, 125, 91, 0.15)' : '#F5EAE4',
              color: 'var(--accent-primary)',
              padding: '4px 8px',
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
          flex: 1,
          overflowY: 'auto',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          scrollBehavior: 'smooth',
        }}
      >
        {/* BANNIÈRE DE BIENVENUE DU CHAT GLOBAL */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '14px',
            backgroundColor: darkMode ? 'rgba(198, 125, 91, 0.08)' : 'rgba(198, 125, 91, 0.06)',
            border: '1px dashed var(--accent-primary)',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            marginBottom: '6px',
          }}
        >
          💡 <strong>Astuce :</strong> Cliquez sur un pseudo pour le mentionner avec <code>@</code>. Activez le mode <strong>⚡ Alerte</strong> pour les demandes urgentes.
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
                padding: isUrgent ? '8px 10px' : '4px 6px',
                borderRadius: '12px',
                backgroundColor: isUrgent
                  ? (darkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(254, 226, 226, 0.6)')
                  : 'transparent',
                border: isUrgent ? '1px solid #EF4444' : '1px solid transparent',
                transition: 'background-color 0.15s ease',
                animation: 'fadeSlideUp 0.15s ease both',
              }}
            >
              {/* AVATAR CLIQUABLE */}
              <img
                src={msg.avatar}
                alt={msg.author}
                onClick={() => onOpenProfile?.(msg)}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  cursor: 'pointer',
                  flexShrink: 0,
                  marginTop: '2px',
                  border: isUrgent ? '1.5px solid #EF4444' : '1px solid var(--border-color)',
                }}
                title={`Voir le profil de ${msg.author}`}
              />

              {/* CORPS DU MESSAGE */}
              <div style={{ minWidth: 0, flex: 1, fontSize: '12.5px', lineHeight: 1.4 }}>
                {/* LIGNE D'EN-TÊTE : HEURE, NOM, BADGE */}
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginRight: '6px', opacity: 0.7 }}>
                  {formattedTime}
                </span>

                {/* BADGE SPÉCIAL */}
                {msg.badge && (
                  <span
                    style={{
                      fontSize: '8.5px',
                      fontWeight: '800',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      marginRight: '6px',
                      backgroundColor: msg.badge === 'FONDATEUR' ? '#F59E0B' : msg.badge === 'VIP' ? '#8B5CF6' : msg.badge === 'PRO' ? '#3B82F6' : '#10B981',
                      color: '#FFFFFF',
                      textTransform: 'uppercase',
                    }}
                  >
                    {msg.badge}
                  </span>
                )}

                {/* PSEUDO CLIQUABLE POUR MENTIONNER */}
                <button
                  type="button"
                  onClick={() => handleMentionUser(msg.authorUsername || msg.author)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    fontWeight: '800',
                    color: isUrgent ? '#EF4444' : 'var(--accent-primary)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    marginRight: '6px',
                  }}
                  title="Cliquer pour mentionner"
                >
                  {msg.author}
                </button>

                {/* TEXTE DU MESSAGE AVEC HIGHLIGHT DES MENTIONS */}
                <span style={{ color: 'var(--text-main)', wordBreak: 'break-word', fontWeight: isUrgent ? '600' : '400' }}>
                  {msg.text.split(' ').map((word, i) => {
                    if (word.startsWith('@')) {
                      return (
                        <span key={i} style={{ color: '#3B82F6', fontWeight: '700', backgroundColor: 'rgba(59, 130, 246, 0.12)', padding: '1px 4px', borderRadius: '4px', marginRight: '2px' }}>
                          {word}{' '}
                        </span>
                      );
                    }
                    return word + ' ';
                  })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* BOUTON FLOTTANT : NOUVEAUX MESSAGES EN BAS */}
      {hasNewMessagesBelow && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="premium-button"
          style={{
            position: 'absolute',
            bottom: '75px',
            left: '50%',
            transform: 'translateX(-50%)',
            border: 'none',
            borderRadius: '999px',
            padding: '6px 14px',
            backgroundColor: 'var(--accent-primary)',
            color: '#FFF',
            fontSize: '11px',
            fontWeight: '800',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            zIndex: 10,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <span>Nouveaux messages</span>
          <ChevronDown size={13} />
        </button>
      )}

      {/* 3. BARRE DE SAISIE & EMOJIS RAPIDES */}
      <div
        style={{
          borderTop: '1px solid var(--border-color)',
          backgroundColor: darkMode ? 'rgba(24, 20, 18, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        {/* BARRE D'EMOJIS RAPIDES */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto' }}>
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setInputText(prev => `${prev}${emoji}`)}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '2px 4px',
                  borderRadius: '6px',
                  transition: 'transform 0.1s ease',
                }}
                title={`Insérer ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* TOGGLE MODE ALERTE URGENTE */}
          <button
            type="button"
            onClick={() => setIsUrgentMode(u => !u)}
            style={{
              border: isUrgentMode ? '1px solid #EF4444' : '1px solid var(--border-color)',
              backgroundColor: isUrgentMode ? '#EF4444' : 'transparent',
              color: isUrgentMode ? '#FFFFFF' : 'var(--text-secondary)',
              borderRadius: '999px',
              padding: '2px 8px',
              fontSize: '10px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Mettre en avant une demande urgente"
          >
            <Flame size={11} color={isUrgentMode ? '#FFFFFF' : '#EF4444'} />
            <span>{isUrgentMode ? 'Alerte Active' : 'Mode Alerte'}</span>
          </button>
        </div>

        {/* FORMULAIRE DE SAISIE */}
        <form onSubmit={handleSendMessage} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              backgroundColor: isUrgentMode
                ? (darkMode ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2')
                : 'var(--bg-subtle)',
              border: isUrgentMode ? '1.5px solid #EF4444' : '1px solid var(--border-color)',
              borderRadius: '999px',
              padding: '0 14px',
              height: '38px',
            }}
          >
            <AtSign size={14} color="var(--text-secondary)" style={{ marginRight: '6px' }} />
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isUrgentMode ? "Écrivez votre alerte urgente en direct..." : "Envoyer un message à la communauté..."}
              maxLength={280}
              style={{
                flex: 1,
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--text-main)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="premium-button"
            style={{
              border: 'none',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              backgroundColor: isUrgentMode ? '#EF4444' : 'var(--accent-primary)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: inputText.trim() ? 'pointer' : 'not-allowed',
              opacity: inputText.trim() ? 1 : 0.45,
              boxShadow: isUrgentMode ? '0 0 12px rgba(239, 68, 68, 0.4)' : 'var(--shadow-accent)',
              flexShrink: 0,
            }}
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
