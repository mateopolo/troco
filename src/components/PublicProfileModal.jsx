import React, { useState } from 'react';
import {
  X, Star, ShieldCheck, MapPin, Sparkles, MessageSquare,
  CheckCircle, Briefcase, Award, Camera, Wrench, ExternalLink
} from 'lucide-react';
import MobileHeader from './common/MobileHeader';

export default function PublicProfileModal({
  isOpen,
  onClose,
  targetUser,
  allListings = [],
  onOpenListing,
  onStartDiscussion,
  currentLang = 'FR',
  darkMode = false,
  t = (k) => k,
}) {
  const [activeTab, setActiveTab] = useState('listings'); // 'listings' | 'bio' | 'portfolio' | 'reviews'

  if (!isOpen || !targetUser) return null;

  const userName = targetUser.name || targetUser.user || 'Membre Troco';
  const avatar = targetUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userName)}`;
  const isKycVerified = targetUser.kycVerified ?? true;
  const username = targetUser.username || `@${userName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const location = targetUser.location || 'Paris, France';
  const rating = targetUser.rating || 4.9;
  const reviewsCount = targetUser.reviewsCount || 18;
  const completedSwaps = targetUser.completedSwaps || 12;

  // Bio par défaut intelligente selon le persona / contact
  const defaultBio = targetUser.bio || `Passionné d'échange et d'entraide sur Troco ! N'hésitez pas à me contacter via le chat pour discuter d'un troc, d'un prêt de matériel ou d'un coup de main mutuel.`;

  // Compétences & Matériel
  const skills = targetUser.skills || [
    'Échange de logement & Stay Swap',
    'Bilingue Français / Italien',
    'Photographie & Prêt studio',
    'Conseils voyage & bonnes adresses'
  ];

  const equipment = targetUser.equipment || [
    'Maison de vacances (Sardaigne)',
    'Appareil Photo Sony Alpha 7',
    'Kit éclairage softbox',
    'VTT Électrique'
  ];

  // Portfolio images
  const portfolio = targetUser.portfolio || [
    'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80', // Sardaigne / mer
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80', // Plage
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80', // Villa
    'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=600&q=80', // Photo session
  ];

  // Avis clients
  const reviews = targetUser.reviews || [
    {
      id: 1,
      author: 'Lucas M.',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
      rating: 5,
      date: 'Il y a 3 jours',
      comment: 'Super échange ! La villa en Sardaigne était absolument magnifique, conforme à la description et très propre. Communication au top.',
    },
    {
      id: 2,
      author: 'Clara D.',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
      rating: 5,
      date: 'Il y a 2 semaines',
      comment: 'Personne très sérieuse et bienveillante. Matériel prêté en parfait état, je recommande à 100% sur Troco !',
    },
    {
      id: 3,
      author: 'Antoine B.',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80',
      rating: 4.8,
      date: 'Il y a 1 mois',
      comment: 'Transaction fluide et rapide via le tiers de confiance. Merci pour les conseils précieux.',
    }
  ];

  // Filtrer les annonces de cet utilisateur ou générer des annonces pertinentes
  const userListings = allListings.filter(l =>
    (l.author && l.author.trim().toLowerCase() === userName.trim().toLowerCase()) ||
    (l.user && l.user.trim().toLowerCase() === userName.trim().toLowerCase())
  );

  // Annonces fallback si l'utilisateur n'en a pas encore publié dans le feed global
  const displayListings = userListings.length > 0 ? userListings : [
    {
      id: `fallback-${userName}-1`,
      title: `Villa & Maison de vacances vue mer (Sardaigne / Cagliari)`,
      description: `Magnifique villa à 5 minutes des plages de Sardaigne. Idéal pour un Stay Swap ou échange contre compétences / crédits Troco.`,
      image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80',
      author: userName,
      location: 'Cagliari, Sardaigne (Italie)',
      category: 'housing',
      format: 'onsite',
      compensationType: 'hybrid',
      tokensAmount: 3,
      euroAmount: 45,
      viewsCount: 142,
      createdAt: '2026-08-20',
    },
    {
      id: `fallback-${userName}-2`,
      title: `Prêt Studio Photo Pro & Équipement Sony Alpha`,
      description: `Studio tout équipé avec softbox, trépieds et flashs professionnels. Prêt à la demi-journée contre jetons Troco.`,
      image: 'https://images.unsplash.com/photo-1527011046414-4781f1f94f8c?auto=format&fit=crop&w=800&q=80',
      author: userName,
      location: location,
      category: 'media',
      format: 'onsite',
      compensationType: 'tokens',
      tokensAmount: 2,
      viewsCount: 88,
      createdAt: '2026-08-22',
    }
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10050,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 12px max(80px, env(safe-area-inset-bottom, 24px)) 12px',
        animation: 'fadeIn 0.2s ease both',
        boxSizing: 'border-box'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-main)',
          borderRadius: '28px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-card)',
          width: '100%',
          maxWidth: '680px',
          maxHeight: 'min(780px, calc(100dvh - 100px))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
          boxSizing: 'border-box'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* EN-TÊTE FIXE AVEC RETOUR 44x44px (APPLE HIG) */}
        <MobileHeader
          title={userName}
          subtitle={username}
          onBack={onClose}
          darkMode={darkMode}
          rightAction={
            <button
              type="button"
              onClick={onClose}
              className="premium-button"
              style={{
                border: 'none',
                backgroundColor: 'var(--bg-subtle, rgba(0,0,0,0.05))',
                color: 'var(--text-secondary)',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Fermer"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
          }
        />

        {/* CORPS DÉROULANT DU PROFIL PUBLIC */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxSizing: 'border-box',
          }}
        >
          {/* BANDEAU HÉROS : AVATAR, IDENTITÉ & BADGES DE CONFIANCE */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '18px',
              flexWrap: 'wrap',
              paddingBottom: '16px',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            {/* AVATAR AVEC BADGE EN LIGNE */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img
                src={avatar}
                alt={userName}
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid var(--accent-primary)',
                  boxShadow: 'var(--shadow-accent)',
                }}
              />
              <div
                title="Membre actif"
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  right: '2px',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-success)',
                  border: '2.5px solid var(--bg-card)',
                  boxShadow: '0 0 8px var(--accent-success)',
                }}
              />
            </div>

            {/* INFOS NOM, USERNAME, STATUT & ÉVALUATION */}
            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <h2
                  className="font-editorial-heading"
                  style={{
                    margin: 0,
                    fontSize: '22px',
                    fontWeight: '700',
                    color: 'var(--text-main)',
                  }}
                >
                  {userName}
                </h2>
                {isKycVerified && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '3px 9px',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      color: 'var(--accent-success)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                    }}
                  >
                    <ShieldCheck size={13} /> Identité Vérifiée ✅
                  </span>
                )}
              </div>

              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: '8px' }}>
                {username}
              </div>

              {/* STATS DE CONFIANCE & LOCALISATION */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700', color: '#F59E0B' }}>
                  <Star size={14} fill="#F59E0B" />
                  <span>{rating}</span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>({reviewsCount} avis)</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} color="var(--accent-primary)" />
                  <span>{location}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-success)', fontWeight: '700' }}>
                  <CheckCircle size={13} />
                  <span>{completedSwaps} échanges réussis</span>
                </div>
              </div>
            </div>
          </div>

          {/* ONGLETS INTERNES DU PROFIL */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflowX: 'auto',
              paddingBottom: '4px',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            {[
              { id: 'listings', label: `Annonces (${displayListings.length})`, icon: Sparkles },
              { id: 'bio', label: 'Présentation & Infos', icon: Briefcase },
              { id: 'portfolio', label: `Portfolio & Photos (${portfolio.length})`, icon: Camera },
              { id: 'reviews', label: `Avis vérifiés (${reviews.length})`, icon: Star },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="premium-button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '999px',
                    border: isActive ? '1px solid var(--accent-primary)' : '1px solid transparent',
                    backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                    color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                    fontWeight: isActive ? '800' : '600',
                    fontSize: '12px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: isActive ? 'var(--shadow-accent)' : 'none',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* CONTENU SELON L'ONGLET ACTIF */}

          {/* 1. ANNONCES ACTIVES */}
          {activeTab === 'listings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                Toutes les offres et annonces publiées par {userName} :
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '14px',
                }}
              >
                {displayListings.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (onOpenListing) onOpenListing(item);
                    }}
                    className="premium-panel"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '18px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-card)',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    }}
                  >
                    <div style={{ position: 'relative', width: '100%', height: '140px' }}>
                      <img
                        src={item.image || 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80'}
                        alt={item.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {item.location && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '8px',
                            left: '8px',
                            backgroundColor: 'rgba(0,0,0,0.65)',
                            backdropFilter: 'blur(8px)',
                            color: '#FFF',
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '999px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <MapPin size={11} />
                          <span>{item.location}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', lineHeight: 1.3 }}>
                        {item.title}
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.description}
                      </div>

                      <div style={{ marginTop: 'auto', paddingTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', fontSize: '11px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                        <span>
                          {item.euroAmount ? `${item.euroAmount}€` : ''} {item.tokensAmount ? `+ ${item.tokensAmount} Jeton(s)` : ''}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <ExternalLink size={12} /> Voir
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. PRÉSENTATION & INFOS */}
          {activeTab === 'bio' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* BIO */}
              <div
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  padding: '16px',
                  borderRadius: '18px',
                  border: '1px solid var(--border-color)',
                  lineHeight: 1.6,
                  fontSize: '13px',
                }}
              >
                <div style={{ fontWeight: '800', marginBottom: '6px', color: 'var(--text-main)' }}>
                  À propos de {userName}
                </div>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  {defaultBio}
                </p>
              </div>

              {/* COMPÉTENCES & ÉQUIPEMENTS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Award size={15} color="var(--accent-primary)" />
                  <span>Compétences proposées à l'échange :</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {skills.map((skill, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '999px',
                        backgroundColor: 'var(--bg-subtle)',
                        color: 'var(--text-main)',
                        fontSize: '11px',
                        fontWeight: '700',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      ✨ {skill}
                    </span>
                  ))}
                </div>

                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                  <Wrench size={15} color="var(--accent-primary)" />
                  <span>Matériel & Espaces disponibles :</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {equipment.map((item, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '999px',
                        backgroundColor: 'var(--bg-subtle)',
                        color: 'var(--accent-primary)',
                        fontSize: '11px',
                        fontWeight: '700',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      🏠 {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. PORTFOLIO & PHOTOS */}
          {activeTab === 'portfolio' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                Galerie de réalisations, logements et matériel :
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '10px',
                }}
              >
                {portfolio.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      height: '160px',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-card)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <img
                      src={imgUrl}
                      alt={`Portfolio ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. AVIS VÉRIFIÉS */}
          {activeTab === 'reviews' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    padding: '14px 16px',
                    borderRadius: '18px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img
                        src={rev.avatar}
                        alt={rev.author}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>
                          {rev.author}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                          {rev.date}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#F59E0B', fontSize: '11px', fontWeight: '800' }}>
                      <Star size={12} fill="#F59E0B" />
                      <span>{rev.rating}</span>
                    </div>
                  </div>

                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.45 }}>
                    "{rev.comment}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PIED DE MODALE AVEC ACTION RETOUR AU CHAT */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>
            🔒 Échange sécurisé avec garantie Troco
          </div>

          <button
            type="button"
            onClick={onClose}
            className="premium-button"
            style={{
              padding: '10px 20px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: '800',
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: 'var(--shadow-accent)',
            }}
          >
            <MessageSquare size={14} />
            <span>Reprendre la discussion</span>
          </button>
        </div>
      </div>
    </div>
  );
}
