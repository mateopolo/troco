import React, { useState, useEffect } from 'react';
import {
  X, Star, ShieldCheck, MapPin, Sparkles, MessageSquare,
  CheckCircle, Briefcase, Award, Camera, Wrench, ExternalLink, FileText, Link as LinkIcon, History,
  PackageOpen, Loader2
} from 'lucide-react';
import MobileHeader from './common/MobileHeader';
import { SocialLinksDisplay } from './UserProfile';
import { ProgressiveImage } from './ui/ProgressiveImage';
import UniversalModal from './ui/UniversalModal';
import ReviewsSection from './ReviewsSection';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { resolveUserProfile, getCachedUserProfile, isRawUid, isGenericName, sanitizeProfileData } from '../services/userResolverService';
import logger from '../utils/logger';

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

  const isValidUserUid = (v) =>
    v &&
    typeof v === 'string' &&
    !v.startsWith('chat_') &&
    !v.startsWith('group-') &&
    !v.includes(' ') &&
    !v.includes('@') &&
    v.length >= 3;

  // Extraction propre de l'UID cible (jamais un email, un nom brut, ou un ID de salon de chat)
  const targetUid =
    (isValidUserUid(targetUser?.uid) && targetUser.uid) ||
    (isValidUserUid(targetUser?.partnerUid) && targetUser.partnerUid) ||
    (isValidUserUid(targetUser?.peerUid) && targetUser.peerUid) ||
    (isValidUserUid(targetUser?.userId) && targetUser.userId) ||
    (isValidUserUid(userProp?.uid) && userProp.uid) ||
    (isValidUserUid(targetUser?.authorUid) && targetUser.authorUid) ||
    (isValidUserUid(targetUser?.id) && targetUser.id) ||
    (isValidUserUid(userProp?.id) && userProp.id) ||
    null;

  const [profileData, setProfileData] = useState(() => {
    if (targetUid) {
      return getCachedUserProfile(targetUid) || null;
    }
    return null;
  });
  const [userListings, setUserListings] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingListings, setLoadingListings] = useState(false);

  // Synchronisation avec le cache et Firestore à l'ouverture de la modale
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    if (targetUid && db) {
      // 1. Résolution du profil utilisateur réel
      const cached = getCachedUserProfile(targetUid);
      if (cached && cached.name && !isGenericName(cached.name)) {
        setProfileData(cached);
      } else {
        setLoadingProfile(true);
        resolveUserProfile(targetUid, db)
          .then((resolved) => {
            if (isMounted && resolved) {
              setProfileData(resolved);
            }
          })
          .catch((err) => {
            logger.warn('[PublicProfileModal] Erreur lors de la résolution du profil:', err);
          })
          .finally(() => {
            if (isMounted) setLoadingProfile(false);
          });
      }

      // 2. Récupération des annonces réelles de l'utilisateur (Firestore query)
      setLoadingListings(true);
      const listingsRef = collection(db, 'listings');
      const q = query(listingsRef, where('authorUid', '==', targetUid));
      getDocs(q)
        .then((snapshot) => {
          if (!isMounted) return;
          if (!snapshot.empty) {
            const fetched = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            setUserListings(fetched);
          } else {
            // Correspondance secondaire dans allListings si déjà chargé
            const fromAll = allListings.filter((l) =>
              (l.authorUid && l.authorUid === targetUid) ||
              (l.userId && l.userId === targetUid)
            );
            setUserListings(fromAll);
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          logger.warn('[PublicProfileModal] Erreur Firestore listings:', err);
          const fromAll = allListings.filter((l) =>
            (l.authorUid && l.authorUid === targetUid) ||
            (l.userId && l.userId === targetUid)
          );
          setUserListings(fromAll);
        })
        .finally(() => {
          if (isMounted) setLoadingListings(false);
        });
    } else {
      // Fallback par nom textuel si pas d'UID direct
      const rawName = targetUser?.name || targetUser?.displayName || targetUser?.user || userProp?.displayName || '';
      if (rawName && !isRawUid(rawName) && !isGenericName(rawName) && db) {
        setLoadingProfile(true);
        // Recherche dans users par nom
        const searchUserByName = async () => {
          try {
            const clean = rawName.trim();
            let uSnap = await getDocs(query(collection(db, 'users'), where('name', '==', clean)));
            if (uSnap.empty) {
              uSnap = await getDocs(query(collection(db, 'users'), where('displayName', '==', clean)));
            }
            if (uSnap.empty) {
              const handle = clean.replace(/^@/, '');
              uSnap = await getDocs(query(collection(db, 'users'), where('username', '==', `@${handle}`)));
            }
            if (!uSnap.empty && isMounted) {
              const foundDoc = uSnap.docs[0];
              const resolved = sanitizeProfileData(foundDoc.id, foundDoc.data());
              setProfileData(resolved);

              // Charger ses annonces avec l'UID découvert
              const lSnap = await getDocs(query(collection(db, 'listings'), where('authorUid', '==', foundDoc.id)));
              if (!lSnap.empty && isMounted) {
                setUserListings(lSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
                return;
              }
            }
          } catch (e) {
            logger.warn('[PublicProfileModal] Recherche utilisateur par nom échouée:', e);
          } finally {
            if (isMounted) setLoadingProfile(false);
          }

          // Filtrer allListings par nom en mémoire
          if (isMounted) {
            const fromAll = allListings.filter((l) =>
              (l.author && l.author.trim().toLowerCase() === rawName.trim().toLowerCase()) ||
              (l.user && l.user.trim().toLowerCase() === rawName.trim().toLowerCase())
            );
            setUserListings(fromAll);
          }
        };
        searchUserByName();
      } else {
        setUserListings([]);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetUid, allListings]);

  if (!isOpen || (!targetUser && !userProp)) return null;

  // Données résolues et consolidées
  const resolved = profileData || targetUser?.peerProfile || {};
  const rawDisplayName = resolved.displayName || resolved.name || targetUser?.displayName || targetUser?.name || targetUser?.user || userProp?.displayName || userProp?.name || '';
  const userName = (!rawDisplayName || isRawUid(rawDisplayName) || isGenericName(rawDisplayName))
    ? (targetUser?.name && !isGenericName(targetUser.name) && !isRawUid(targetUser.name) ? targetUser.name : 'Membre Troco')
    : rawDisplayName;
  const avatar = resolved.photoURL || resolved.avatar || targetUser?.avatar || (userName !== 'Membre Troco' ? `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userName)}` : 'https://api.dicebear.com/7.x/bottts/svg?seed=Troco');
  const isKycVerified = Boolean(resolved.kycVerified ?? targetUser?.kycVerified ?? false);
  const username = resolved.username || targetUser?.username || (userName !== 'Membre Troco' ? `@${userName.toLowerCase().replace(/[^a-z0-9]/g, '')}` : '@membre');
  const location = resolved.location || targetUser?.location || '';
  const reviewsCount = resolved.reviewsCount || targetUser?.reviewsCount || 0;
  const averageRating = resolved.rating !== undefined ? resolved.rating : (resolved.averageRating !== undefined ? resolved.averageRating : (targetUser?.averageRating || targetUser?.rating || 0));
  const dealsCompleted = resolved.dealsCompleted || targetUser?.dealsCompleted || 0;
  const activeDeals = resolved.activeDeals ?? targetUser?.activeDeals ?? targetUser?.dealsInProgress ?? 0;

  // Bio réelle sans fallback fantaisiste
  const bio = resolved.bio || targetUser?.bio || `Membre de la communauté Troco.`;

  // Liens sociaux réels
  const socialLinks = Array.isArray(resolved.socialLinks) && resolved.socialLinks.length > 0
    ? resolved.socialLinks
    : (Array.isArray(targetUser?.socialLinks) && targetUser.socialLinks.length > 0 ? targetUser.socialLinks : []);

  // Compétences & Matériel réels
  const skills = Array.isArray(resolved.skills) && resolved.skills.length > 0
    ? resolved.skills
    : (Array.isArray(targetUser?.skills) && targetUser.skills.length > 0 ? targetUser.skills : []);

  const equipment = Array.isArray(resolved.equipment) && resolved.equipment.length > 0
    ? resolved.equipment
    : (Array.isArray(targetUser?.equipment) && targetUser.equipment.length > 0 ? targetUser.equipment : []);

  // Portfolio réel
  const portfolio = Array.isArray(resolved.portfolio) && resolved.portfolio.length > 0
    ? resolved.portfolio
    : (Array.isArray(targetUser?.portfolio) && targetUser.portfolio.length > 0 ? targetUser.portfolio : []);

  // Annonces affichées (Firestore pure, aucun mock)
  const displayListings = userListings;

  const customFont = targetUser?.customFont || 'Inter';
  const customThemeColor = targetUser?.customThemeColor || '#C67D5B';
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

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={`Profil public de ${userName}`}
      showCloseButton={false}
      overlayStyle={{
        backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
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
          boxSizing: 'border-box',
          fontFamily: customFontFamily,
          '--accent-primary': customThemeColor,
          '--accent-primary-hover': customThemeColor,
          '--shadow-accent': `0 4px 14px ${customThemeColor}33`,
        }}
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
                title="Membre Troco"
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

              {/* BOUTON PROÉMINENT CV / RESUME SI PRÉSENT */}
              {targetUser?.cvUrl && (
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
                    <span>📄 Consulter le CV</span>
                    <ExternalLink size={12} style={{ opacity: 0.7 }} />
                  </a>
                </div>
              )}

              {/* LIENS SOCIAUX VÉRIFIÉS DU PROFIL */}
              {socialLinks.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <SocialLinksDisplay links={socialLinks} size="small" />
                </div>
              )}

              {/* STATS DE CONFIANCE & LOCALISATION */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {/* Note moyenne : affichée uniquement si l'utilisateur a des avis réels */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: reviewsCount > 0 ? '700' : '400', color: reviewsCount > 0 ? '#F59E0B' : 'var(--text-secondary)', fontStyle: reviewsCount > 0 ? 'normal' : 'italic' }}>
                  {reviewsCount > 0 && <Star size={14} fill="#F59E0B" />}
                  <span>
                    {reviewsCount > 0 ? (Math.round(averageRating * 10) / 10).toFixed(1) + ' ⭐' : t('profile.no_reviews', 'Pas d\'évaluation pour l\'instant')}
                  </span>
                  {reviewsCount > 0 && (
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>({reviewsCount} avis)</span>
                  )}
                </div>

                {location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={13} color="var(--accent-primary)" />
                    <span>{location}</span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: dealsCompleted > 0 ? 'var(--accent-success)' : 'var(--text-secondary)', fontWeight: dealsCompleted > 0 ? '700' : '400' }}>
                  <CheckCircle size={13} style={{ opacity: dealsCompleted > 0 ? 1 : 0.35 }} />
                  <span>Deal clôturé: {dealsCompleted}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: activeDeals > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: activeDeals > 0 ? '700' : '400' }}>
                  <span>En cours: {activeDeals}</span>
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
              { id: 'bio', label: 'Présentation & Infos', icon: Briefcase },
              { id: 'portfolio', label: `Portfolio (${portfolio.length})`, icon: Camera },
              { id: 'reviews', label: `Avis & Évaluations`, icon: Star },
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

          {/* 1. ANNONCES ACTIVES (FIRESTORE SEULEMENT) */}
          {activeTab === 'listings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                Toutes les offres et annonces publiées par {userName} :
              </div>

              {loadingListings ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '8px', color: 'var(--text-secondary)' }}>
                  <Loader2 size={20} className="animate-spin" />
                  <span style={{ fontSize: '13px' }}>Chargement des annonces...</span>
                </div>
              ) : displayListings.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '44px 20px',
                    borderRadius: '20px',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px dashed var(--border-color)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <PackageOpen size={40} style={{ opacity: 0.35, margin: '0 auto 12px', display: 'block' }} />
                  <div style={{ fontWeight: '800', fontSize: '14.5px', color: 'var(--text-main)', marginBottom: '4px' }}>
                    Aucune annonce active
                  </div>
                  <div style={{ fontSize: '12.5px', maxWidth: '340px', margin: '0 auto', lineHeight: 1.5 }}>
                    {userName} n'a pas encore publié d'offres ou toutes ses annonces ont été conclues.
                  </div>
                </div>
              ) : (
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
                          src={item.image || item.photos?.[0] || 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=600&q=80'}
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
              )}
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
                  {bio}
                </p>
              </div>

              {/* RÉSEAUX SOCIAUX & LIENS EXTERNES */}
              {socialLinks.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <LinkIcon size={15} color="var(--accent-primary)" />
                    <span>Réseaux sociaux & Profils vérifiés :</span>
                  </div>
                  <SocialLinksDisplay links={socialLinks} size="medium" />
                </div>
              )}

              {/* COMPÉTENCES & ÉQUIPEMENTS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Award size={15} color="var(--accent-primary)" />
                  <span>Compétences proposées à l'échange :</span>
                </div>
                {skills.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '4px 0' }}>
                    Aucune compétence renseignée pour le moment.
                  </div>
                ) : (
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
                )}

                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                  <Wrench size={15} color="var(--accent-primary)" />
                  <span>Matériel & Espaces disponibles :</span>
                </div>
                {equipment.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '4px 0' }}>
                    Aucun matériel répertorié pour le moment.
                  </div>
                ) : (
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
                )}
              </div>
            </div>
          )}

          {/* 3. PORTFOLIO & PHOTOS */}
          {activeTab === 'portfolio' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                Galerie de réalisations et photos :
              </div>
              {portfolio.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '44px 20px',
                    borderRadius: '20px',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px dashed var(--border-color)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <Camera size={38} style={{ opacity: 0.35, margin: '0 auto 10px', display: 'block' }} />
                  <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-main)', marginBottom: '4px' }}>
                    Portfolio vide
                  </div>
                  <div style={{ fontSize: '12.5px' }}>
                    Aucune photo dans le portfolio pour le moment.
                  </div>
                </div>
              ) : (
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
              )}
            </div>
          )}

          {/* 4. AVIS ET ÉVALUATIONS FIRESTORE */}
          {activeTab === 'reviews' && (
            <ReviewsSection
              profileUid={targetUid}
              ownerName={userName}
              currentUser={userProp || null}
              darkMode={darkMode}
              t={t}
              initialReviews={[]}
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
                {/* DEAL CLÔTURÉ */}
                <div style={{ flex: 1, minWidth: '130px', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '12px 14px', backgroundColor: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Deal clôturé</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>
                    {dealsCompleted}
                  </div>
                </div>

                {/* NOTE MOYENNE */}
                <div style={{ flex: 1, minWidth: '140px', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '12px 14px', backgroundColor: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Note moyenne</div>
                  <div style={{ fontSize: reviewsCount > 0 ? '20px' : '12.5px', fontWeight: reviewsCount > 0 ? '800' : '500', color: reviewsCount > 0 ? '#F59E0B' : 'var(--text-secondary)', fontStyle: reviewsCount > 0 ? 'normal' : 'italic', display: 'flex', alignItems: 'center', gap: '4px', minHeight: '28px' }}>
                    {reviewsCount > 0 ? (Math.round(averageRating * 10) / 10).toFixed(1) + ' ⭐' : t('profile.no_reviews', 'Pas d\'évaluation pour l\'instant')}
                  </div>
                </div>

                {/* EN COURS PLANIFIÉ */}
                <div style={{ flex: 1, minWidth: '130px', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '12px 14px', backgroundColor: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>En cours planifié</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                    {activeDeals}
                  </div>
                </div>
              </div>

              <div style={{ padding: '20px', textAlign: 'center', borderRadius: '18px', backgroundColor: 'var(--bg-subtle)', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                <span>Transactions réelles vérifiées par le tiers de confiance Troco.</span>
              </div>

              {/* SECTION AVIS ET ÉVALUATIONS EN BAS DU PROFIL */}
              <ReviewsSection
                profileUid={targetUid}
                ownerName={userName}
                currentUser={userProp || null}
                darkMode={darkMode}
                t={t}
                initialReviews={[]}
              />
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
    </UniversalModal>
  );
}
