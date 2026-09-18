import React, { useState } from 'react';
import {
  X, Star, ShieldCheck, MapPin, Sparkles, MessageSquare,
  CheckCircle, Briefcase, Award, Camera, Wrench, ExternalLink, FileText, Link as LinkIcon, History
} from 'lucide-react';
import MobileHeader from './common/MobileHeader';
import { SocialLinksDisplay } from './UserProfile';
import { ProgressiveImage } from './ui/ProgressiveImage';
import UniversalModal from './ui/UniversalModal';
import ReviewsSection from './ReviewsSection';

export default function PublicProfileModal({
  isOpen,
  onClose,
  targetUser,
  user: userProp,
  allListings = [],
  onOpenListing,
  onStartDiscussion,
  currentLang = 'FR',
  darkMode = false,
  t = (k, defaultVal) => defaultVal || k,
}) {
  const [activeTab, setActiveTab] = useState('listings'); // 'listings' | 'history' | 'bio' | 'portfolio' | 'reviews'

  if (!isOpen || (!targetUser && !userProp)) return null;

  const rawUser = targetUser || userProp || {};
  const user = {
    ...rawUser,
    dealsCompleted: rawUser.dealsCompleted || 0,
    activeDeals: rawUser.activeDeals ?? rawUser.dealsInProgress ?? 0,
    reviewsCount: rawUser.reviewsCount || 0,
    averageRating: rawUser.averageRating !== undefined ? rawUser.averageRating : (rawUser.rating || 0),
  };

  const isRawId = (v) => typeof v === 'string' && /^[A-Za-z0-9]{16,}$/.test(v.trim());
  const userName = (user.name && !isRawId(user.name)) ? user.name : (user.username || 'Utilisateur');
  const avatar = user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userName)}`;
  const isKycVerified = user.kycVerified ?? true;
  const username = user.username || `@${userName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const location = user.location || '';
  const rating = user.averageRating || user.rating || null;
  const reviewsCount = user.reviewsCount || 0;
  const completedSwaps = user.dealsCompleted || 0;

  // Bio 100% donnÃ©es rÃ©elles Firestore â€” aucun fallback fictif
  const defaultBio = targetUser.bio || user.bio || '';

  // Liens sociaux rÃ©els uniquement
  const socialLinks = Array.isArray(targetUser.socialLinks) && targetUser.socialLinks.length > 0
    ? targetUser.socialLinks
    : (targetUser.socialUrl ? [targetUser.socialUrl] : []);

  // CompÃ©tences & MatÃ©riel â€” donnÃ©es rÃ©elles uniquement
  const skills = Array.isArray(targetUser.skills) ? targetUser.skills : [];
  const equipment = Array.isArray(targetUser.equipment) ? targetUser.equipment : [];

  // Portfolio rÃ©el uniquement
  const portfolio = Array.isArray(targetUser.portfolio) ? targetUser.portfolio : [];

  // Avis rÃ©els uniquement (chargÃ©s par ReviewsSection depuis Firestore)
  const reviews = [];

  // Filtrer les annonces de cet utilisateur â€” aucune annonce fictive gÃ©nÃ©rÃ©e
  const userListings = allListings.filter(l =>
    (l.author && l.author.trim().toLowerCase() === userName.trim().toLowerCase()) ||
    (l.user && l.user.trim().toLowerCase() === userName.trim().toLowerCase())
  );
  const displayListings = userListings;

  const customFont = targetUser.customFont || 'Inter';
  const customThemeColor = targetUser.customThemeColor || '#C67D5B';
  const customFontFamily = customFont === 'Inter' ? "'Inter', sans-serif"
    : customFont === 'Playfair Display' ? "'Playfair Display', serif"
    : customFont === 'Roboto' ? "'Roboto', sans-serif"
    : customFont === 'Montserrat' ? "'Montserrat', sans-serif"
    : customFont === 'Poppins' ? "'Poppins', sans-serif"
    : customFont === 'Space Grotesk' ? "'Space Grotesk', sans-serif"
    : customFont === 'Caveat' ? "'Caveat', cursive"
    : customFont === 'Lora' ? "'Lora', serif"
    : customFont === 'Outfit' ? "'Outfit', sans-serif"
    : customFont === 'Plus Jakarta Sans' ? "'Plus Jakarta Sans', sans-serif"
    : `${customFont}, sans-serif`;

  const modalHeader = (
    <div style={{
      fontFamily: customFontFamily,
      '--accent-primary': customThemeColor,
      '--accent-primary-hover': customThemeColor,
      '--shadow-accent': `0 4px 14px ${customThemeColor}33`,
    }}>
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
    </div>
  );

  const modalFooter = (
    <div style={{
      padding: '14px 20px',
      backgroundColor: 'var(--bg-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      fontFamily: customFontFamily,
      '--accent-primary': customThemeColor,
      '--accent-primary-hover': customThemeColor,
      '--shadow-accent': `0 4px 14px ${customThemeColor}33`,
    }}>
      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>
        ðŸ”’ Ã‰change sÃ©curisÃ© avec garantie Troco
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
  );

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={`Profil public de ${userName}`}
      showCloseButton={false}
      maxWidth="lg"
      header={modalHeader}
      footer={modalFooter}
      contentStyle={{
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text-main)',
        borderRadius: '28px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-card)',
        fontFamily: customFontFamily,
        '--accent-primary': customThemeColor,
        '--accent-primary-hover': customThemeColor,
        '--shadow-accent': `0 4px 14px ${customThemeColor}33`,
      }}
      overlayStyle={{
        backgroundColor: 'rgba(0,0,0,0.65)',
      }}
    >
      {/* CORPS DÃ‰ROULANT DU PROFIL PUBLIC */}
      <div
        style={{
          padding: '20px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxSizing: 'border-box',
          fontFamily: customFontFamily,
          '--accent-primary': customThemeColor,
          '--accent-primary-hover': customThemeColor,
          '--shadow-accent': `0 4px 14px ${customThemeColor}33`,
        }}
      >
        {/* BANDEAU HÃ‰ROS : AVATAR, IDENTITÃ‰ & BADGES DE CONFIANCE */}
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
            <ProgressiveImage
              src={avatar}
              alt={userName}
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                border: '3px solid var(--accent-primary)',
                boxShadow: 'var(--shadow-accent)',
                overflow: 'hidden',
              }}
              imgStyle={{
                borderRadius: '50%',
                objectFit: 'cover',
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

          {/* INFOS NOM, USERNAME, STATUT & Ã‰VALUATION */}
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
                  <ShieldCheck size={13} /> IdentitÃ© VÃ©rifiÃ©e âœ…
                </span>
              )}
            </div>

            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: '8px' }}>
              {username}
            </div>

            {/* BOUTON PROÃ‰MINENT CV / RESUME SI PRÃ‰SENT */}
            {targetUser.cvUrl && (
              <div style={{ marginBottom: '10px' }}>
                <a
                  href={targetUser.cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="premium-button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1.5px solid var(--accent-primary)',
                    color: 'var(--accent-primary)',
                    fontSize: '12.5px',
                    fontWeight: '800',
                    textDecoration: 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <FileText size={15} />
                  <span>ðŸ“„ Consulter le CV</span>
                  <ExternalLink size={12} style={{ opacity: 0.7 }} />
                </a>
              </div>
            )}

            {/* LIENS SOCIAUX VÃ‰RIFIÃ‰S DU PROFIL */}
            {socialLinks.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <SocialLinksDisplay links={socialLinks} size="small" />
              </div>
            )}

            {/* STATS DE CONFIANCE & LOCALISATION */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-secondary)' }}>
              {/* Note moyenne : affichÃ©e uniquement si l'utilisateur a des avis rÃ©els */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: user.reviewsCount > 0 ? '700' : '400', color: user.reviewsCount > 0 ? '#F59E0B' : 'var(--text-secondary)', fontStyle: user.reviewsCount > 0 ? 'normal' : 'italic' }}>
                {user.reviewsCount > 0 && <Star size={14} fill="#F59E0B" />}
                <span>
                  {user.reviewsCount > 0 ? (Math.round(user.averageRating * 10) / 10).toFixed(1) + ' â­' : t('profile.no_reviews', 'Pas d\'Ã©valuation pour l\'instant')}
                </span>
                {user.reviewsCount > 0 && (
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>({user.reviewsCount} avis)</span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={13} color="var(--accent-primary)" />
                <span>{location}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: (user.dealsCompleted || 0) > 0 ? 'var(--accent-success)' : 'var(--text-secondary)', fontWeight: (user.dealsCompleted || 0) > 0 ? '700' : '400' }}>
                <CheckCircle size={13} style={{ opacity: (user.dealsCompleted || 0) > 0 ? 1 : 0.35 }} />
                <span>Deal clÃ´turÃ©: {user.dealsCompleted || 0}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: (user.activeDeals || 0) > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: (user.activeDeals || 0) > 0 ? '700' : '400' }}>
                <span>En cours planifiÃ©: {user.activeDeals || 0}</span>
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
            { id: 'history', label: `Historique des swaps & deals`, icon: History },
            { id: 'bio', label: 'PrÃ©sentation & Infos', icon: Briefcase },
            { id: 'portfolio', label: `Portfolio & Photos (${portfolio.length})`, icon: Camera },
            { id: 'reviews', label: `Avis & Ã‰valuations`, icon: Star },
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
              Toutes les offres et annonces publiÃ©es par {userName} :
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
                    <ProgressiveImage
                      src={item.image || ''}
                      alt={item.title}
                      style={{ width: '100%', height: '100%' }}
                      imgStyle={{ objectFit: 'cover' }}
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
                        {item.euroAmount ? `${item.euroAmount}â‚¬` : ''} {item.tokensAmount ? `+ ${item.tokensAmount} Jeton(s)` : ''}
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

        {/* 2. PRÃ‰SENTATION & INFOS */}
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
                Ã€ propos de {userName}
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                {defaultBio}
              </p>
            </div>

            {/* RÃ‰SEAUX SOCIAUX & LIENS EXTERNES */}
            {socialLinks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <LinkIcon size={15} color="var(--accent-primary)" />
                  <span>RÃ©seaux sociaux & Profils vÃ©rifiÃ©s :</span>
                </div>
                <SocialLinksDisplay links={socialLinks} size="medium" />
              </div>
            )}

            {/* COMPÃ‰TENCES & Ã‰QUIPEMENTS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={15} color="var(--accent-primary)" />
                <span>CompÃ©tences proposÃ©es Ã  l'Ã©change :</span>
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
                    âœ¨ {skill}
                  </span>
                ))}
              </div>

              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                <Wrench size={15} color="var(--accent-primary)" />
                <span>MatÃ©riel & Espaces disponibles :</span>
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
                    ðŸ  {item}
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
              Galerie de rÃ©alisations, logements et matÃ©riel :
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
                  <ProgressiveImage
                    src={imgUrl}
                    alt={`Portfolio ${idx + 1}`}
                    style={{ width: '100%', height: '100%' }}
                    imgStyle={{ objectFit: 'cover' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. AVIS ET Ã‰VALUATIONS FIRESTORE */}
        {activeTab === 'reviews' && (
          <ReviewsSection
            profileUid={user.uid || user.id || targetUser?.uid || targetUser?.id || userProp?.uid}
            ownerName={userName}
            currentUser={userProp || null}
            darkMode={darkMode}
            t={t}
            initialReviews={reviews}
          />
        )}

        {/* 5. HISTORIQUE DES SWAPS ET DEALS */}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={18} color="var(--accent-primary)" /> Historique des swaps et deals
            </div>

            {/* STATISTIQUES DYNAMIQUES DEALS & NOTE MOYENNE */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {/* DEAL CLÃ”TURÃ‰ */}
              <div style={{ flex: 1, minWidth: '130px', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '12px 14px', backgroundColor: 'var(--bg-subtle)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Deal clÃ´turÃ©</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>
                  {user.dealsCompleted || 0}
                </div>
              </div>

              {/* NOTE MOYENNE */}
              <div style={{ flex: 1, minWidth: '140px', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '12px 14px', backgroundColor: 'var(--bg-subtle)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Note moyenne</div>
                <div style={{ fontSize: user.reviewsCount > 0 ? '20px' : '12.5px', fontWeight: user.reviewsCount > 0 ? '800' : '500', color: user.reviewsCount > 0 ? '#F59E0B' : 'var(--text-secondary)', fontStyle: user.reviewsCount > 0 ? 'normal' : 'italic', display: 'flex', alignItems: 'center', gap: '4px', minHeight: '28px' }}>
                  {user.reviewsCount > 0 ? (Math.round(user.averageRating * 10) / 10).toFixed(1) + ' â­' : t('profile.no_reviews', 'Pas d\'Ã©valuation pour l\'instant')}
                </div>
              </div>

              {/* EN COURS PLANIFIÃ‰ */}
              <div style={{ flex: 1, minWidth: '130px', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '12px 14px', backgroundColor: 'var(--bg-subtle)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>En cours planifiÃ©</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                  {user.activeDeals || 0}
                </div>
              </div>
            </div>

            <div style={{ padding: '20px', textAlign: 'center', borderRadius: '18px', backgroundColor: 'var(--bg-subtle)', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
              <span>Transactions rÃ©elles vÃ©rifiÃ©es par le tiers de confiance Troco.</span>
            </div>

            {/* SECTION AVIS ET Ã‰VALUATIONS EN BAS DU PROFIL */}
            <ReviewsSection
              profileUid={user.uid || user.id || targetUser?.uid || targetUser?.id || userProp?.uid}
              ownerName={userName}
              currentUser={userProp || null}
              darkMode={darkMode}
              t={t}
              initialReviews={reviews}
            />
          </div>
        )}
      </div>
    </UniversalModal>
  );
}
