import React, { useState } from 'react';
import {
  Heart, Flame, ThumbsUp, Star, Coins, Handshake,
  ShieldCheck, Rocket, Send,
  Share2, Sparkles
} from 'lucide-react';

const INITIAL_ACTIVITIES = [];

export default function CommunityActivityFeed({
  currentUser = null,
  onOpenProfile = null,
  darkMode = false,
}) {
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'deal' | 'review' | 'tip' | 'project'
  const [statusText, setStatusText] = useState('');

  // Gestion des réactions en direct
  const handleToggleReaction = (activityId, reactionKey) => {
    setActivities(prev => prev.map(item => {
      if (item.id !== activityId) return item;
      const isAlreadyReacted = item.userReacted === reactionKey;
      const updatedReactions = { ...item.reactions };

      if (isAlreadyReacted) {
        updatedReactions[reactionKey] = Math.max(0, updatedReactions[reactionKey] - 1);
        return { ...item, reactions: updatedReactions, userReacted: null };
      } else {
        if (item.userReacted) {
          updatedReactions[item.userReacted] = Math.max(0, updatedReactions[item.userReacted] - 1);
        }
        updatedReactions[reactionKey] = (updatedReactions[reactionKey] || 0) + 1;
        return { ...item, reactions: updatedReactions, userReacted: reactionKey };
      }
    }));
  };

  // Publication d'un statut rapide
  const handlePostStatus = (e) => {
    e.preventDefault();
    if (!statusText.trim()) return;

    const authorName = currentUser?.displayName || currentUser?.name || 'Membre';
    const authorUsername = currentUser?.username || (authorName ? `@${authorName.toLowerCase().replace(/[^a-z0-9]/g, '')}` : '@membre');
    const authorAvatar = currentUser?.photoURL || currentUser?.avatar || '';

    const newPost = {
      id: `act-${Date.now()}`,
      type: 'post',
      actor: {
        name: authorName,
        username: authorUsername,
        avatar: authorAvatar,
        verified: Boolean(currentUser?.kycVerified),
      },
      actionText: 'a partagé une mise à jour avec la communauté :',
      detail: `« ${statusText.trim()} »`,
      time: 'À l’instant',
      reactions: { love: 1, fire: 0, clap: 0 },
      userReacted: 'love',
    };

    setActivities([newPost, ...activities]);
    setStatusText('');
  };

  const filteredActivities = activities.filter(item => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* 1. CARTE DE PUBLICATION RAPIDE */}
      <div
        style={{
          padding: '16px 18px',
          borderRadius: '20px',
          backgroundColor: darkMode ? '#1F1B18' : '#FAF8F5',
          border: '1px solid var(--border-color)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {currentUser?.photoURL || currentUser?.avatar ? (
            <img
              src={currentUser.photoURL || currentUser.avatar}
              alt="Moi"
              style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--accent-primary)' }}
            />
          ) : (
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-primary)',
                color: '#FFF',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
              }}
            >
              {(currentUser?.displayName || currentUser?.name || 'M')[0].toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <form onSubmit={handlePostStatus} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                placeholder="Partager un remerciement, une réussite ou un besoin..."
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '999px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!statusText.trim()}
                className="premium-button"
                style={{
                  border: 'none',
                  borderRadius: '999px',
                  padding: '10px 18px',
                  backgroundColor: 'var(--accent-primary)',
                  color: '#FFF',
                  fontWeight: '800',
                  fontSize: '12px',
                  cursor: statusText.trim() ? 'pointer' : 'not-allowed',
                  opacity: statusText.trim() ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Send size={13} />
                <span>Publier</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 2. FILTRES THÉMATIQUES */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { id: 'all', label: 'Tous les flux', icon: Sparkles },
          { id: 'deal', label: 'Deals & Troc', icon: Handshake },
          { id: 'review', label: 'Avis 5 Étoiles', icon: Star },
          { id: 'tip', label: 'Pourboires', icon: Coins },
          { id: 'project', label: 'Projets Collectifs', icon: Rocket },
        ].map((f) => {
          const Icon = f.icon;
          const isSelected = filterType === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterType(f.id)}
              className="premium-button"
              style={{
                border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-card)',
                color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                borderRadius: '999px',
                padding: '6px 14px',
                fontSize: '11.5px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={13} />
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. LISTE DES ACTIVITÉS EN TEMPS RÉEL */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredActivities.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              borderRadius: '20px',
              backgroundColor: darkMode ? '#1F1B18' : '#FAF8F5',
              border: '1px dashed var(--border-color)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            <Sparkles size={32} style={{ color: 'var(--accent-primary)', opacity: 0.8 }} />
            <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-main)' }}>
              Aucune activité récente pour le moment
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', maxWidth: '380px' }}>
              Soyez le premier à partager une actualité, valider un échange ou encourager la communauté Troco !
            </div>
          </div>
        ) : filteredActivities.map((act) => {
          const isDeal = act.type === 'deal';
          const isReview = act.type === 'review';
          const isTip = act.type === 'tip';
          const isProject = act.type === 'project';

          return (
            <div
              key={act.id}
              style={{
                padding: '16px 18px',
                borderRadius: '20px',
                backgroundColor: darkMode ? '#1F1B18' : '#FAF8F5',
                border: '1px solid var(--border-color)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                animation: 'fadeSlideUp 0.2s ease both',
              }}
            >
              {/* EN-TÊTE : AVATARS, NOMS, ICÔNE TYPE */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* AVATAR ACTEUR */}
                  <img
                    src={act.actor?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                    alt={act.actor?.name || 'Membre'}
                    onClick={() => act.actor && onOpenProfile?.(act.actor)}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: '1px solid var(--border-color)' }}
                  />

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', fontSize: '13px' }}>
                      <button
                        type="button"
                        onClick={() => act.actor && onOpenProfile?.(act.actor)}
                        style={{ border: 'none', background: 'transparent', padding: 0, fontWeight: '800', color: 'var(--text-main)', cursor: 'pointer', fontSize: '13px' }}
                      >
                        {act.actor?.name || 'Membre'}
                      </button>

                      <span style={{ color: 'var(--text-secondary)' }}>{act.actionText || ''}</span>

                      {act.targetUser && (
                        <button
                          type="button"
                          onClick={() => onOpenProfile?.(act.targetUser)}
                          style={{ border: 'none', background: 'transparent', padding: 0, fontWeight: '800', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '13px' }}
                        >
                          {act.targetUser?.name || 'Membre'}
                        </button>
                      )}
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {act.time || ''}
                    </div>
                  </div>
                </div>

                {/* BADGE ICÔNE DE TYPE */}
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '10px',
                    backgroundColor: isDeal ? 'rgba(59, 130, 246, 0.12)' : isReview ? 'rgba(245, 158, 11, 0.12)' : isTip ? 'rgba(198, 125, 91, 0.12)' : isProject ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-subtle)',
                    color: isDeal ? '#3B82F6' : isReview ? '#F59E0B' : isTip ? 'var(--accent-primary)' : isProject ? '#10B981' : 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isDeal ? <Handshake size={16} /> : isReview ? <Star size={16} /> : isTip ? <Coins size={16} /> : isProject ? <Rocket size={16} /> : <ShieldCheck size={16} />}
                </div>
              </div>

              {/* DÉTAIL DU CONTENU / ÉVÉNEMENT */}
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '14px',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12.5px',
                  lineHeight: 1.5,
                  color: 'var(--text-main)',
                  fontWeight: isReview ? '500' : '600',
                  fontStyle: isReview ? 'italic' : 'normal',
                }}
              >
                {act.detail}
              </div>

              {/* BARRE D'INTERACTIONS & RÉACTIONS */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleReaction(act.id, 'love')}
                    className="premium-button"
                    style={{
                      border: act.userReacted === 'love' ? '1px solid #EF4444' : '1px solid var(--border-color)',
                      backgroundColor: act.userReacted === 'love' ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
                      color: act.userReacted === 'love' ? '#EF4444' : 'var(--text-secondary)',
                      borderRadius: '999px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <Heart size={12} color={act.userReacted === 'love' ? '#EF4444' : 'currentColor'} />
                    <span>{act.reactions.love}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleReaction(act.id, 'fire')}
                    className="premium-button"
                    style={{
                      border: act.userReacted === 'fire' ? '1px solid #F59E0B' : '1px solid var(--border-color)',
                      backgroundColor: act.userReacted === 'fire' ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                      color: act.userReacted === 'fire' ? '#F59E0B' : 'var(--text-secondary)',
                      borderRadius: '999px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <Flame size={12} color={act.userReacted === 'fire' ? '#F59E0B' : 'currentColor'} />
                    <span>{act.reactions.fire}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleReaction(act.id, 'clap')}
                    className="premium-button"
                    style={{
                      border: act.userReacted === 'clap' ? '1px solid #10B981' : '1px solid var(--border-color)',
                      backgroundColor: act.userReacted === 'clap' ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                      color: act.userReacted === 'clap' ? '#10B981' : 'var(--text-secondary)',
                      borderRadius: '999px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <ThumbsUp size={12} color={act.userReacted === 'clap' ? '#10B981' : 'currentColor'} />
                    <span>{act.reactions.clap}</span>
                  </button>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Share2 size={12} />
                  <span>Partager</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
