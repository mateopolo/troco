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
import Avatar from './common/Avatar';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { resolveUserProfile, getCachedUserProfile, isRawUid, isGenericName, sanitizeProfileData, setCachedUserProfile } from '../services/userResolverService';
import { useUserRealStats } from '../services/userStatsService';
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
  const { stats: dynamicStats } = useUserRealStats(isOpen ? targetUid : null);

  // Synchronisation avec le cache et Firestore à l'ouverture de la modale
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    let unsubUser = null;

    if (targetUid && db) {
      // 1. Initialisation par le cache s'il est valide
      const cached = getCachedUserProfile(targetUid);
      if (cached && cached.name && !isGenericName(cached.name)) {
        setProfileData(cached);
        setLoadingProfile(false);
      } else {
        setLoadingProfile(true);
      }

      // Écoute en temps réel et getDoc du document utilisateur Firestore users/{targetUid}
      try {
        getDoc(doc(db, 'users', String(targetUid))).then((snap) => {
          if (!isMounted) return;
          if (snap.exists()) {
            const resolved = sanitizeProfileData(targetUid, snap.data());
            setProfileData(resolved);
            setCachedUserProfile(targetUid, resolved);
          } else {
            // Tenter users_public
            getDoc(doc(db, 'users_public', String(targetUid))).then((pSnap) => {
              if (!isMounted) return;
              if (pSnap.exists()) {
                const resolved = sanitizeProfileData(targetUid, pSnap.data());
                setProfileData(resolved);
                setCachedUserProfile(targetUid, resolved);
              } else {
                resolveUserProfile(targetUid, db).then((res) => {
                  if (isMounted && res) setProfileData(res);
                });
              }
            });
          }
        }).catch((err) => {
          logger.warn('[PublicProfileModal] getDoc error:', err);
        });

        unsubUser = onSnapshot(doc(db, 'users', String(targetUid)), (snap) => {
          if (!isMounted) return;
          if (snap.exists()) {
            const raw = snap.data();
            const resolved = sanitizeProfileData(targetUid, raw);
            setProfileData(resolved);
            setCachedUserProfile(targetUid, resolved);
          } else {
            resolveUserProfile(targetUid, db).then((res) => {
              if (isMounted && res) setProfileData(res);
            });
          }
          setLoadingProfile(false);
        }, (err) => {
          logger.warn('[PublicProfileModal] onSnapshot user error:', err);
          if (isMounted) {
            resolveUserProfile(targetUid, db).then((res) => {
              if (isMounted && res) setProfileData(res);
            }).finally(() => {
              if (isMounted) setLoadingProfile(false);
            });
          }
        });
      } catch (e) {
        logger.warn('[PublicProfileModal] Subscription setup error:', e);
      }

      // 2. Récupération des annonces réelles de l'utilisateur (Firestore query)
      const effectiveAuthorUid = profileData?.uid || targetUid;
      if (effectiveAuthorUid) {
        setLoadingListings(true);
        const listingsRef = collection(db, 'listings');
        const q = query(listingsRef, where('authorUid', '==', String(effectiveAuthorUid)));
        getDocs(q)
          .then((snapshot) => {
            if (!isMounted) return;
            let docsList = [];
            if (!snapshot.empty) {
              docsList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            }
            // Correspondance avec allListings pour consolidation
            if (Array.isArray(allListings) && allListings.length > 0) {
              const fromAll = allListings.filter((l) =>
                (String(l.authorUid) === String(effectiveAuthorUid) || String(l.userId) === String(effectiveAuthorUid))
              );
              fromAll.forEach(item => {
                if (!docsList.some(d => String(d.id) === String(item.id))) {
                  docsList.push(item);
                }
              });
            }
            const activeOnly = docsList.filter((l) => !l.status || l.status === 'active');
            setUserListings(activeOnly.length > 0 ? activeOnly : docsList);
          })
          .catch((err) => {
            if (!isMounted) return;
            logger.warn('[PublicProfileModal] Erreur Firestore listings:', err);
            const fromAll = (allListings || []).filter((l) =>
              (String(l.authorUid) === String(effectiveAuthorUid) || String(l.userId) === String(effectiveAuthorUid)) &&
              (!l.status || l.status === 'active')
            );
            setUserListings(fromAll);
          })
          .finally(() => {
            if (isMounted) setLoadingListings(false);
          });
      }
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
              setCachedUserProfile(foundDoc.id, resolved);

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
      if (typeof unsubUser === 'function') unsubUser();
    };
  }, [isOpen, targetUid, profileData?.uid, allListings]);

  if (!isOpen || (!targetUser && !userProp)) return null;

  // Données résolues et consolidées
  const resolved = profileData || targetUser?.peerProfile || {};
  const rawDisplayName = resolved.displayName || resolved.name || targetUser?.displayName || targetUser?.name || targetUser?.user || userProp?.displayName || userProp?.name || '';
  const userName = (!rawDisplayName || isRawUid(rawDisplayName) || isGenericName(rawDisplayName))
    ? (targetUser?.name && !isGenericName(targetUser.name) && !isRawUid(targetUser.name) ? targetUser.name : (targetUser?.displayName || ''))
    : rawDisplayName;
  const avatar = resolved.photoURL || resolved.avatar || targetUser?.photoURL || targetUser?.avatar || '';
  const isKycVerified = Boolean(resolved.kycVerified ?? targetUser?.kycVerified ?? false);
  const username = resolved.username || targetUser?.username || (userName ? `@${userName.toLowerCase().replace(/[^a-z0-9]/g, '')}` : '');
  const location = resolved.location || targetUser?.location || '';
  const user = {
    ...resolved,
    dealsCompleted: dynamicStats?.dealsCompleted !== undefined ? dynamicStats.dealsCompleted : (resolved.dealsCompleted || targetUser?.dealsCompleted || 0),
    activeDeals: dynamicStats?.activeDeals !== undefined ? dynamicStats.activeDeals : (resolved.activeDeals ?? targetUser?.activeDeals ?? targetUser?.dealsInProgress ?? 0),
    reviewsCount: dynamicStats?.reviewsCount !== undefined ? dynamicStats.reviewsCount : (resolved.reviewsCount || targetUser?.reviewsCount || 0),
    averageRating: dynamicStats?.averageRating !== undefined
      ? dynamicStats.averageRating
      : (resolved.rating !== undefined ? resolved.rating : (resolved.averageRating !== undefined ? resolved.averageRating : (targetUser?.averageRating || targetUser?.rating || 0))),
  };
  const reviewsCount = user.reviewsCount;
  const averageRating = user.averageRating;
  const dealsCompleted = user.dealsCompleted;
  const activeDeals = user.activeDeals;

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
          maxHeight: 'min(780px, calc(100dvh - 120px))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
          boxSizing: 'border-box',
          fontFamily: customFontFamily,
          '--accent-primary': customThemeColor,
          '--accent-primary-hover': customThemeColor,
          '--shadow-accent': `0 4px 14px ${customThemeColor}33`,
          position: 'relative',
          zIndex: 10,
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

        {/* CORPS DU PROFIL PUBLIC : CHARGEMENT SPINNER TANT QUE LE VRAI PROFIL N'EST PAS RÉSOLU */}
        {loadingProfile && (!profileData || !userName || isGenericName(userName)) ? (
          <div
            style={{
              flex: 1,
              minHeight: '360px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              padding: '60px 20px',
            }}
          >
            <Loader2 size={44} className="animate-spin" style={{ color: 'var(--accent-primary, #C67D5B)' }} />
            <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {t('profile.loading', 'Chargement du profil...')}
            </span>
          </div>
        ) : (
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
              {/* AVATAR AVEC BADGE EN LIGNE (AUCUN ROBOT DE REMPLACEMENT) */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar
                  size={84}
                  src={avatar}
                  name={userName || 'Membre'}
                  alt={userName || 'Avatar'}
                  style={{
                    border: '3px solid var(--accent-primary)',
                    boxShadow: 'var(--shadow-accent)',
                  }}
                />
                <div
                  title="En ligne"
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: user.reviewsCount > 0 ? '700' : '400', color: user.reviewsCount > 0 ? '#F59E0B' : 'var(--text-secondary)', fontStyle: user.reviewsCount > 0 ? 'normal' : 'italic' }}>
                  {user.reviewsCount > 0 && <Star size={14} fill="#F59E0B" />}
                  <span>
                    {user.reviewsCount > 0 ? (Math.round(user.averageRating * 10) / 10).toFixed(1) + ' ⭐' : t('profile.no_reviews', 'Pas d\'évaluation pour l\'instant')}
                  </span>
                  {user.reviewsCount > 0 && (
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>({user.reviewsCount} avis)</span>
                  )}
                </div>

                {location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={13} color="var(--accent-primary)" />
                    <span>{location}</span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: (user.dealsCompleted || 0) > 0 ? 'var(--accent-success)' : 'var(--text-secondary)', fontWeight: (user.dealsCompleted || 0) > 0 ? '700' : '400' }}>
                  <CheckCircle size={13} style={{ opacity: (user.dealsCompleted || 0) > 0 ? 1 : 0.35 }} />
                  <span>{t('closedDeals', 'Deal clôturé')}: {user.dealsCompleted || 0}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: (user.activeDeals || 0) > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: (user.activeDeals || 0) > 0 ? '700' : '400' }}>
                  <span>{t('dealsInProgress', 'En cours')}: {user.activeDeals || 0}</span>
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
              { id: 'listings', label: `${t('listingsTab', 'Annonces')} (${displayListings.length})`, icon: Sparkles },
              { id: 'history', label: t('swapHistory', 'Historique des swaps & deals'), icon: History },
              { id: 'bio', label: t('presentationInfo', 'Présentation & Infos'), icon: Briefcase },
              { id: 'portfolio', label: `${t('portfolioTab', 'Portfolio')} (${portfolio.length})`, icon: Camera },
              { id: 'reviews', label: t('reviewsRatings', 'Avis & Évaluations'), icon: Star },
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
            <div
              className="swap-history-container"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                boxSizing: 'border-box',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} color="var(--accent-primary)" /> {t('swapHistory', 'Historique des swaps et deals')}
              </div>

              {/* STATISTIQUES DYNAMIQUES DEALS & NOTE MOYENNE */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', width: '100%', boxSizing: 'border-box' }}>
                {/* DEAL CLÔTURÉ */}
                <div style={{ flex: '1 1 120px', minWidth: '120px', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '12px 14px', backgroundColor: 'var(--bg-subtle)', boxSizing: 'border-box' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('closedDeals', 'Deal clôturé')}</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>
                    {user.dealsCompleted || 0}
                  </div>
                </div>

                {/* NOTE MOYENNE */}
                <div style={{ flex: '1 1 130px', minWidth: '130px', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '12px 14px', backgroundColor: 'var(--bg-subtle)', boxSizing: 'border-box' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('averageRating', 'Note moyenne')}</div>
                  <div style={{ fontSize: user.reviewsCount > 0 ? '20px' : '12.5px', fontWeight: user.reviewsCount > 0 ? '800' : '500', color: user.reviewsCount > 0 ? '#F59E0B' : 'var(--text-secondary)', fontStyle: user.reviewsCount > 0 ? 'normal' : 'italic', display: 'flex', alignItems: 'center', gap: '4px', minHeight: '28px' }}>
                    {user.reviewsCount > 0 ? (Math.round(user.averageRating * 10) / 10).toFixed(1) + ' ⭐' : t('profile.no_reviews', 'Pas d\'évaluation pour l\'instant')}
                  </div>
                </div>

                {/* EN COURS PLANIFIÉ */}
                <div style={{ flex: '1 1 120px', minWidth: '120px', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '12px 14px', backgroundColor: 'var(--bg-subtle)', boxSizing: 'border-box' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('dealsInProgress', 'En cours planifié')}</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                    {user.activeDeals || 0}
                  </div>
                </div>
              </div>

              {/* LISTE DES SWAPS HISTORIQUES SI DISPONIBLES */}
              {Array.isArray(user?.swapHistory) && user.swapHistory.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
                  {user.swapHistory.map((entry) => (
                    <div
                      key={entry.id || Math.random()}
                      className="premium-card"
                      style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: '16px',
                        padding: '12px 14px',
                        backgroundColor: 'var(--bg-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-main)' }}>
                          {entry.deal || entry.title || 'Deal Troco'}
                        </span>
                        <span style={{ fontSize: '10px', fontWeight: '800', padding: '3px 8px', borderRadius: '999px', backgroundColor: 'var(--bg-card)', color: 'var(--accent-primary)', border: '1px solid var(--border-color)' }}>
                          {entry.status || 'Clôturé'}
                        </span>
                      </div>
                      {entry.counterparty && (
                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                          Avec {entry.counterparty} {entry.date ? `• ${entry.date}` : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ padding: '16px 20px', textAlign: 'center', borderRadius: '16px', backgroundColor: 'var(--bg-subtle)', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', fontSize: '12px', width: '100%', boxSizing: 'border-box' }}>
                <span>{t('verifiedTransactionsTrust', 'Transactions réelles vérifiées par le tiers de confiance Troco.')}</span>
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
        )}

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
            {t('secureExchangeGuarantee', '🔒 Échange sécurisé avec garantie Troco')}
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
            <span>{t('resumeDiscussion', 'Reprendre la discussion')}</span>
          </button>
        </div>
      </div>
    </UniversalModal>
  );
}
