import React, { useState, useRef } from 'react';
import { ProgressiveImage } from '../../components/ui/ProgressiveImage';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  ShieldCheck,
  Pencil,
  ShieldAlert,
  LogOut,
  Upload,
  MapPin,
  Globe,
  FileText,
  ExternalLink,
  Sparkles,
  Crown,
  CheckCircle,
  Check,
  Palette,
  Image as ImageIcon,
  Plus,
  History,
  Star,
  ChevronRight,
  Repeat,
  Sliders,
  Coins,
  Scale,
  Lock,
} from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useTheme } from '../../contexts/ThemeContext';
import { validateProfileContent } from '../../utils/moderationBlacklist';
import { AnimatedEuroBalance, AnimatedTokenBalance } from '../../components/AnimatedBalances';
import MobileHeader from '../../components/common/MobileHeader';
import InclusiveAvatarBuilder from '../../components/profile/InclusiveAvatarBuilder';
import ProfileAppearanceCustomizer from '../../components/profile/ProfileAppearanceCustomizer';
import DesignStudioModal from '../../components/DesignStudioModal';
import {
  getBioTranslation as getBioTranslationUtil,
  getReviewTranslation as getReviewTranslationUtil,
  getListingTitleTranslation as getListingTitleTranslationUtil,
} from '../../utils/translationHelpers';
import { SocialLinksDisplay, SocialLinksEditor } from '../../components/UserProfile';

export default function ProfileFeature({
  profile = {},
  setProfile,
  profileDraft = {},
  setProfileDraft,
  isEditingProfile = false,
  setIsEditingProfile,
  skills = [],
  setSkills,
  equipment = [],
  setEquipment,
  portfolioImages = [],
  setPortfolioImages,
  darkMode = false,
  currentLang = 'FR',
  t = (k) => k,
  isMobile = false,
  handleSignOut,
  handleOpenPayment,
  setIsKycModalOpen,
  setIsAdminPanelOpen,
  setIsTransactionsModalOpen,
  setIsPrivacyCenterOpen,
  setIsCguViewerOpen,
  setActiveTab,
  formatStatus,
  formatTokenCount,
  formatCompensation,
}) {
  const [isDesignStudioOpen, setIsDesignStudioOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [portfolioUrlInput, setPortfolioUrlInput] = useState('');
  const [showingOriginalBio, setShowingOriginalBio] = useState(false);
  const [showingOriginalReviews, setShowingOriginalReviews] = useState({});

  const profileAvatarFileInputRef = useRef(null);

  const toggleOriginalReview = (id) => {
    setShowingOriginalReviews((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const compressImage = (file, maxWidth = 300, maxHeight = 300, quality = 0.75) => {
    return new Promise((resolve) => {
      if (!file || !file.type || !file.type.startsWith('image/')) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                width = maxHeight;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          } catch (err) {
            resolve(uploadEvent.target.result);
          }
        };
        img.onerror = () => resolve(uploadEvent.target.result);
        img.src = uploadEvent.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarFileUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const compressedDataUrl = await compressImage(file, 300, 300, 0.75);
      if (compressedDataUrl) {
        if (setProfileDraft) setProfileDraft((prev) => ({ ...prev, avatar: compressedDataUrl }));
        if (setProfile) setProfile((prev) => ({ ...prev, avatar: compressedDataUrl }));
      }
    }
  };

  const handleStartEdit = () => {
    if (setProfileDraft) setProfileDraft({ ...profile });
    if (setIsEditingProfile) setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    const socialLinksToSave = profileDraft.socialLinks !== undefined 
      ? profileDraft.socialLinks 
      : (profile.socialLinks || []);

    const profileCheck = validateProfileContent({
      name: profileDraft.name,
      username: profileDraft.username,
      bio: profileDraft.bio,
      skills,
      equipment,
      socialLinks: socialLinksToSave,
    });
    if (!profileCheck.isValid) {
      alert(profileCheck.errorMessage);
      return;
    }

    const updated = {
      ...profile,
      ...profileDraft,
      skills,
      equipment,
      socialLinks: socialLinksToSave,
      portfolioImages,
      updatedAt: serverTimestamp(),
    };
    if (setProfile) setProfile(updated);
    window.localStorage.setItem('troco_user_profile', JSON.stringify(updated));
    if (setIsEditingProfile) setIsEditingProfile(false);
    setSaveMessage('Profil mis à jour avec succès !');
    setTimeout(() => setSaveMessage(''), 3000);

    const uid = profile.uid || auth.currentUser?.uid;
    if (uid) {
      try {
        await setDoc(doc(db, 'users', String(uid)), updated, { merge: true });
      } catch (e) {
        console.warn('[Firestore] Profile save failed:', e);
      }
    }
  };

  const handleAddPortfolioImage = async (url) => {
    if (!url || typeof url !== 'string' || !url.trim()) return;
    const newImages = [...portfolioImages, url.trim()];
    if (setPortfolioImages) setPortfolioImages(newImages);
    const uid = profile.uid || auth.currentUser?.uid;
    if (uid) {
      try {
        await setDoc(doc(db, 'users', String(uid)), { portfolioImages: newImages }, { merge: true });
      } catch (e) {
        console.warn('[Firestore] Portfolio add failed:', e);
      }
    }
  };

  const handleRemovePortfolioImage = async (idx) => {
    const newImages = portfolioImages.filter((_, i) => i !== idx);
    if (setPortfolioImages) setPortfolioImages(newImages);
    const uid = profile.uid || auth.currentUser?.uid;
    if (uid) {
      try {
        await setDoc(doc(db, 'users', String(uid)), { portfolioImages: newImages }, { merge: true });
      } catch (e) {
        console.warn('[Firestore] Portfolio remove failed:', e);
      }
    }
  };

  const toggleLanguage = (language) => {
    if (!setProfile) return;
    setProfile((prev) => ({
      ...prev,
      languages: (prev.languages || []).includes(language)
        ? (prev.languages || []).filter((entry) => entry !== language)
        : [...(prev.languages || []), language],
    }));
  };

  const statusStyles = {
    'Clôturé': { bg: '#EBF0E6', text: '#3D4A35' },
    'En cours': { bg: '#F5EAE4', text: '#A8644A' },
    'Planifié': { bg: '#FEF3C7', text: '#92400E' },
    'En attente': { bg: '#F5F0E8', text: '#6B5E54' },
  };

  const userSwapHistory = Array.isArray(profile?.swapHistory) ? profile.swapHistory : [];
  const closedDealsCount = userSwapHistory.filter((entry) => entry.status === 'Clôturé').length || (profile?.dealsCompleted ?? 0);
  const inProgressCount = userSwapHistory.filter((entry) => entry.status === 'En cours' || entry.status === 'Planifié').length || (profile?.dealsInProgress ?? 0);
  const ratedEntries = userSwapHistory.filter((entry) => entry.rating);
  const averageRating = ratedEntries.length
    ? (ratedEntries.reduce((sum, entry) => sum + entry.rating, 0) / ratedEntries.length).toFixed(1)
    : (profile?.rating ? Number(profile.rating).toFixed(1) : '—');

  return (
    <div style={{ backgroundColor: darkMode ? '#231E1B' : '#FAF7F2', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', padding: '22px', borderRadius: '28px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', boxShadow: '0 10px 30px rgba(61,53,48,0.06)', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
      {/* EN-TÊTE MOBILE RETOUR TACTILE 44x44px (APPLE HIG) */}
      {isMobile && (
        <div style={{ margin: '-22px -22px 18px -22px' }}>
          <MobileHeader
            title={isEditingProfile ? "Modifier le profil" : (profile.name || "Mon Profil")}
            subtitle={profile.username || "@troco"}
            onBack={() => {
              if (isEditingProfile) {
                setIsEditingProfile(false);
              } else if (typeof setActiveTab === 'function') {
                setActiveTab('feed');
              }
            }}
            darkMode={darkMode}
          />
        </div>
      )}

      {/* EN-TÊTE DU PROFIL (AVATAR + INFORMATIONS ALIGNÉES) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input type="file" ref={profileAvatarFileInputRef} onChange={handleAvatarFileUpload} accept="image/*" style={{ display: "none" }} />
        <div
          style={{ position: "relative", display: "inline-block", cursor: isEditingProfile ? "pointer" : "default", flexShrink: 0 }}
          onClick={() => isEditingProfile && profileAvatarFileInputRef.current && profileAvatarFileInputRef.current.click()}
        >
          <img
            src={isEditingProfile ? profileDraft.avatar : profile.avatar}
            alt={profile.name}
            style={{ width: "88px", height: "88px", borderRadius: "50%", objectFit: "cover", border: "3px solid var(--accent-primary)", boxShadow: "var(--shadow-card)", transition: "all 0.3s ease" }}
          />
          {isEditingProfile && (
            <button
              type="button"
              title={t("uploadProfilePhoto")}
              onClick={(e) => { e.stopPropagation(); profileAvatarFileInputRef.current && profileAvatarFileInputRef.current.click(); }}
              style={{ position: "absolute", right: "0", bottom: "0", width: "30px", height: "30px", borderRadius: "50%", border: "none", backgroundColor: "var(--accent-primary)", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "var(--shadow-accent)" }}
            >
              <Pencil size={14} />
            </button>
          )}
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            {profile.kycVerified ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', fontWeight: '800', padding: '4px 10px', borderRadius: '999px', backgroundColor: darkMode ? 'rgba(156,175,136,0.25)' : '#EBF0E6', color: '#3D4A35', border: '1px solid #D4DFCE' }}>
                <ShieldCheck size={12} /> {t('verifiedProfile') || 'Identité Vérifiée'} ✅
              </span>
            ) : null}
            {profile.accountType && (
              <span style={{
                fontSize: '10.5px',
                fontWeight: '800',
                padding: '4px 10px',
                borderRadius: '999px',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--accent-primary)',
                border: '1px solid var(--border-color)'
              }}>
                {profile.accountType === 'professional' && '💼 Pro / Freelance'}
                {profile.accountType === 'company' && '🏢 Organisation / Asso'}
                {profile.accountType === 'particular' && '👤 Particulier'}
              </span>
            )}
          </div>
          <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: 'var(--text-main)', letterSpacing: '-0.01em', wordBreak: 'break-word' }}>
            {isEditingProfile ? profileDraft.name : profile.name}
          </h3>
          <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-primary)', marginTop: '2px' }}>
            {isEditingProfile ? (profileDraft.username || '@user') : (profile.username || '@mateopolo')}
          </div>
        </div>
      </div>

      {/* GRILLE DE BOUTONS D'ACTION DU PROFIL */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-start', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => setIsDesignStudioOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-card)] border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium cursor-pointer"
        >
          🎨 Personnaliser l'apparence
        </button>

        {!isEditingProfile && !profile.kycVerified && (
          <button
            type="button"
            onClick={() => setIsKycModalOpen(true)}
            className="premium-button"
            style={{
              border: '1.5px solid var(--accent-primary)',
              borderRadius: '999px',
              padding: '8px 14px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--accent-primary)',
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: 'var(--shadow-accent)'
            }}
          >
            <ShieldCheck size={14} color="var(--accent-primary)" /> Vérifier mon identité (+ Badge ✅)
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsAdminPanelOpen(true)}
          className="premium-button"
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: '999px',
            padding: '8px 14px',
            backgroundColor: 'var(--bg-subtle)',
            color: 'var(--text-main)',
            fontWeight: '800',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: 'var(--shadow-card)'
          }}
        >
          <ShieldAlert size={14} color="var(--accent-primary)" /> Panel Modération
        </button>

        <button
          type="button"
          onClick={() => isEditingProfile ? handleSaveProfile() : handleStartEdit()}
          className="premium-button"
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: '999px',
            padding: '8px 14px',
            backgroundColor: isEditingProfile ? 'var(--accent-primary)' : 'var(--bg-card)',
            color: isEditingProfile ? '#FFF' : 'var(--text-main)',
            fontWeight: '700',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: 'var(--shadow-card)'
          }}
        >
          {isEditingProfile ? t('saveProfile') : t('editProfile')}
        </button>

        {!isEditingProfile && (
          <button
            type="button"
            onClick={handleSignOut}
            className="premium-button"
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: '999px',
              padding: '8px 14px',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              fontWeight: '700',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={13} /> Se déconnecter
          </button>
        )}
      </div>

      {isEditingProfile && (
        <>
          {/* GÉNÉRATEUR D'AVATARS INCLUSIF DYNAMIQUE (DICEBEAR AVATAAARS) */}
          <InclusiveAvatarBuilder
            currentAvatar={profileDraft.avatar || profile.avatar}
            initialName={profileDraft.name || profile.name || 'Membre'}
            onSelectAvatar={(avatarUrl) => setProfileDraft(prev => ({ ...prev, avatar: avatarUrl }))}
          />

          {/* OPTION UPLOAD PHOTO PERSONNELLE OU URL */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "14px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => profileAvatarFileInputRef.current && profileAvatarFileInputRef.current.click()}
              className="premium-button"
              style={{
                flex: "1 1 200px",
                border: "1.5px dashed var(--accent-primary)",
                borderRadius: "14px",
                padding: "10px 14px",
                backgroundColor: "var(--bg-subtle)",
                color: "var(--accent-primary)",
                fontWeight: "800",
                fontSize: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "var(--shadow-card)"
              }}
            >
              <Upload size={15} /> Importer ma propre photo
            </button>
            <div style={{ flex: "2 1 240px" }}>
              <input
                value={profileDraft.avatar || ''}
                onChange={(e) => setProfileDraft(prev => ({ ...prev, avatar: e.target.value }))}
                placeholder="https://exemple.com/avatar.jpg ou lien DiceBear"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "1px solid var(--border-color)",
                  backgroundColor: "var(--bg-subtle)",
                  color: "var(--text-main)",
                  borderRadius: "12px",
                  fontSize: "12px"
                }}
              />
            </div>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
        {isEditingProfile ? (
          <>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>Nom complet</label>
                <input value={profileDraft.name} onChange={(e) => setProfileDraft(prev => ({ ...prev, name: e.target.value }))} placeholder="Nom" style={{ width: '100%', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', borderRadius: '12px', padding: '10px 12px', fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>Pseudo (@)</label>
                <input value={profileDraft.username || ''} onChange={(e) => setProfileDraft(prev => ({ ...prev, username: e.target.value }))} placeholder="@pseudo" style={{ width: '100%', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', borderRadius: '12px', padding: '10px 12px', fontSize: '14px', fontWeight: '700', color: 'var(--accent-primary)' }} />
              </div>
            </div>
            <textarea value={profileDraft.bio} onChange={(e) => setProfileDraft(prev => ({ ...prev, bio: e.target.value }))} rows={3} style={{ width: '100%', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', borderRadius: '14px', padding: '12px 14px', resize: 'vertical', fontSize: '13px', color: 'var(--text-main)' }} />
            <input value={profileDraft.location} onChange={(e) => setProfileDraft(prev => ({ ...prev, location: e.target.value }))} style={{ width: '100%', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', borderRadius: '14px', padding: '12px 14px', fontSize: '13px', color: 'var(--text-main)' }} />
            
            {/* Champ CV / Resume */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', textTransform: 'uppercase' }}>
                <FileText size={13} color="var(--accent-primary)" /> Lien vers votre CV (PDF, Drive, Notion, Portfolio)
              </label>
              <input
                type="url"
                value={profileDraft.cvUrl !== undefined ? profileDraft.cvUrl : (profile.cvUrl || '')}
                onChange={(e) => setProfileDraft(prev => ({ ...prev, cvUrl: e.target.value }))}
                placeholder="Ex : https://drive.google.com/... ou https://notion.so/mon-cv"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  fontSize: '13px',
                  color: 'var(--text-main)'
                }}
              />
            </div>

            {/* Gestionnaire d'édition des Réseaux Sociaux & Portfolio Sécurisés */}
            <SocialLinksEditor
              socialLinks={profileDraft.socialLinks !== undefined ? profileDraft.socialLinks : (profile.socialLinks || [])}
              onChange={(newLinks) => setProfileDraft(prev => ({ ...prev, socialLinks: newLinks }))}
              darkMode={darkMode}
            />

            {/* PERSONNALISATION DE L'APPARENCE DU PROFIL (POLICE & COULEUR DU THÈME) */}
            <ProfileAppearanceCustomizer
              customFont={profileDraft.customFont || profile.customFont || 'Inter'}
              customThemeColor={profileDraft.customThemeColor || profile.customThemeColor || '#C67D5B'}
              onFontChange={(font) => setProfileDraft(prev => ({ ...prev, customFont: font }))}
              onColorChange={(color) => setProfileDraft(prev => ({ ...prev, customThemeColor: color }))}
            />
          </>
        ) : (
          <>
            <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '14px 16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text-main)' }}>
                {getBioTranslationUtil(profile.bio, currentLang, showingOriginalBio)}
              </div>
              {currentLang !== 'FR' && (
                <button
                  onClick={() => setShowingOriginalBio(prev => !prev)}
                  className="premium-button"
                  style={{ border: 'none', backgroundColor: 'transparent', color: 'var(--accent-primary)', fontSize: '11px', fontWeight: '800', cursor: 'pointer', marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: 0 }}
                >
                  <Globe size={12} color="var(--accent-primary)" />
                  {showingOriginalBio ? t('showTranslation') : t('showOriginal')}
                </button>
              )}
            </div>
            
            {/* Bouton de consultation du CV */}
            {profile.cvUrl && (
              <div style={{ marginTop: '2px', marginBottom: '2px' }}>
                <a
                  href={profile.cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="premium-button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1.5px solid var(--accent-primary)',
                    color: 'var(--accent-primary)',
                    fontSize: '12.5px',
                    fontWeight: '800',
                    textDecoration: 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <FileText size={15} />
                  <span>📄 Consulter le CV</span>
                  <ExternalLink size={12} style={{ opacity: 0.7 }} />
                </a>
              </div>
            )}

            {/* Affichage des badges de réseaux sociaux officiels */}
            {profile.socialLinks && profile.socialLinks.length > 0 && (
              <div style={{ marginTop: '2px', marginBottom: '2px' }}>
                <SocialLinksDisplay links={profile.socialLinks} size="medium" />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}><MapPin size={14} color="var(--accent-primary)" /> {profile.location}</div>
          </>
        )}
      </div>

      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>{t('spokenLanguages')}</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { code: 'FR', label: 'FR 🇫🇷' },
            { code: 'EN', label: 'EN 🇬🇧' },
            { code: 'ES', label: 'ES 🇪🇸' },
            { code: 'IT', label: 'IT 🇮🇹' },
            { code: 'DE', label: 'DE 🇩🇪' },
            { code: 'PT', label: 'PT 🇵🇹' },
            { code: 'AR', label: 'AR 🇸🇦' },
            { code: 'ZH', label: 'ZH 🇨🇳' },
            { code: 'JA', label: 'JA 🇯🇵' },
            { code: 'RU', label: 'RU 🇷🇺' },
            { code: 'NL', label: 'NL 🇳🇱' },
            { code: 'KO', label: 'KO 🇰🇷' },
          ].map(({ code, label }) => {
            const active = (isEditingProfile ? (profileDraft.languages || []) : (profile.languages || [])).includes(code);
            return (
              <button
                key={code}
                onClick={() => isEditingProfile ? toggleLanguage(code) : null}
                style={{
                  border: active ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  backgroundColor: active ? 'var(--bg-subtle)' : 'var(--bg-card)',
                  color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  padding: '7px 12px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: isEditingProfile ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  boxShadow: active ? 'var(--shadow-card)' : 'none'
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', borderRadius: '20px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('euroBalance')}</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', position: 'relative', overflow: 'visible' }}>
              <AnimatedEuroBalance value={profile.euroBalance} suffix=" €" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => handleOpenPayment('topup-cash')} className="premium-button" style={{ border: 'none', borderRadius: '999px', padding: '9px 16px', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', color: '#FFF', fontWeight: '800', fontSize: '12px', cursor: 'pointer', boxShadow: 'var(--shadow-accent)' }}>
              + Recharger (€)
            </button>
            <button onClick={() => setIsTransactionsModalOpen(true)} className="premium-button" style={{ border: '1px solid var(--border-color)', borderRadius: '999px', padding: '9px 14px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FileText size={13} /> Factures
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('trocoTokensLabel')}</div>
            <div style={{ fontSize: '19px', fontWeight: '800', color: 'var(--text-main)', position: 'relative', overflow: 'visible' }}>
              <AnimatedTokenBalance value={profile.trocoTokens} formatFn={(v) => formatTokenCount(v, currentLang)} style={{ fontSize: '19px', fontWeight: '800', color: 'var(--text-main)' }} />
            </div>
          </div>
          <button
            onClick={() => handleOpenPayment('troco-plus')}
            className="premium-button"
            style={{
              border: 'none',
              borderRadius: 'var(--border-radius-main, 999px)',
              padding: '9px 16px',
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
              color: 'var(--accent-contrast-text, #FFF)',
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-accent)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Sparkles size={14} /> {profile.isTrocoPlus ? '⭐ Gérer Troco Plus' : '+ S\'abonner à Troco Plus'}
          </button>
        </div>
      </div>

      {/* ---- SECTION MON ABONNEMENT (VISIBLE UNIQUEMENT SI ABONNÉ) ---- */}
      {profile.isTrocoPlus && (
        <div style={{
          borderRadius: '20px',
          padding: '20px',
          backgroundColor: 'var(--bg-subtle)',
          border: '1.5px solid var(--accent-primary)',
          boxShadow: 'var(--shadow-card)',
          marginBottom: '18px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF'
              }}>
                <Crown size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 className="font-editorial-heading" style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text-main)' }}>
                    Mon Abonnement : {profile.subscriptionPlan === 'pro' || profile.subscriptionPlan === 'premium' ? 'Troco Plus Illimité & Pro' : 'Troco Plus Essentiel'}
                  </h4>
                  <span style={{
                    backgroundColor: '#10B981', color: '#FFF', fontSize: '10.5px', fontWeight: '900',
                    padding: '2px 8px', borderRadius: '999px'
                  }}>
                    ✓ ACTIF
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: '600' }}>
                  📅 Renouvellement le {(() => {
                    try {
                      const d = profile.subscriptionRenewalDate ? new Date(profile.subscriptionRenewalDate) : new Date(Date.now() + 30 * 86400000);
                      return d.toLocaleDateString(currentLang === 'FR' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long' });
                    } catch (_) {
                      return '26 Septembre';
                    }
                  })()} • Sans engagement
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {(profile.subscriptionPlan === 'essential' || profile.subscriptionPlan === 'basic' || !profile.subscriptionPlan) && (
                <button
                  onClick={() => handleOpenPayment('troco-plus')}
                  className="premium-button"
                  style={{
                    border: 'none', borderRadius: '999px', padding: '8px 14px',
                    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                    color: '#FFF', fontWeight: '800', fontSize: '11.5px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '5px', boxShadow: 'var(--shadow-accent)'
                  }}
                >
                  <Sparkles size={13} /> ⚡ Upgrade vers Pro
                </button>
              )}
            </div>
          </div>

          {/* LISTE DES AVANTAGES INCLUS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
            {(profile.subscriptionPlan === 'pro' || profile.subscriptionPlan === 'premium' ? [
              '15 Jetons crédités par mois',
              '3 Boosts d\'annonces inclus',
              'Badge 👑 Membre Pro vérifié',
              'Support prioritaire VIP 7j/7'
            ] : [
              '5 Jetons crédités par mois',
              '1 Boost d\'annonce inclus',
              'Badge ⭐ Membre Plus',
              'Priorité de contact sur les deals'
            ]).map((advantage, aIdx) => (
              <div key={aIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-main)', fontWeight: '600' }}>
                <CheckCircle size={14} color="#10B981" />
                <span>{advantage}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {saveMessage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-success)', fontSize: '12px', fontWeight: '800', marginTop: '10px' }}>
          <Check size={14} /> {saveMessage}
        </div>
      )}

      {/* ---- PORTFOLIO PHOTOS ---- */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <ImageIcon size={17} color="var(--accent-primary)" />
          <h4 className="font-editorial-heading" style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-main)' }}>📸 Mon Portfolio</h4>
          <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700' }}>{portfolioImages.length} photo{portfolioImages.length !== 1 ? 's' : ''}</span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
          Ajoute des photos authentiques pour mettre en valeur ton savoir-faire.
        </p>

        {portfolioImages.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
            {portfolioImages.map((src, idx) => (
              <div key={idx} style={{ position: 'relative', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                <ProgressiveImage
                  src={src}
                  alt={`Portfolio ${idx + 1}`}
                  style={{ width: '100%', height: '100%' }}
                  imgStyle={{ objectFit: 'cover' }}
                />
                <button
                  onClick={() => handleRemovePortfolioImage(idx)}
                  style={{
                    position: 'absolute', top: '5px', right: '5px',
                    border: 'none', width: '24px', height: '24px', borderRadius: '50%',
                    backgroundColor: 'var(--overlay-bg)', color: '#FFF', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(4px)', fontSize: '12px', fontWeight: '800',
                    zIndex: 10
                  }}
                  title="Supprimer"
                >✕</button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '12px 0', marginBottom: '14px' }}>
            <EmptyState
              compact={true}
              icon={<ImageIcon size={24} strokeWidth={2.2} />}
              title="Aucune photo dans ton portfolio"
              description="Ajoute des photos authentiques pour mettre en valeur ton savoir-faire et tes compétences."
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            id="portfolio-url-input"
            type="text"
            value={portfolioUrlInput}
            onChange={(e) => setPortfolioUrlInput(e.target.value)}
            placeholder="Colle une URL d'image..."
            style={{
              flex: 1, minWidth: '180px', padding: '10px 14px',
              border: '1px solid var(--border-color)',
              borderRadius: '12px', fontSize: '13px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)', outline: 'none'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && portfolioUrlInput.trim()) {
                handleAddPortfolioImage(portfolioUrlInput.trim());
                setPortfolioUrlInput('');
              }
            }}
          />
          <button
            onClick={() => {
              if (portfolioUrlInput.trim()) {
                handleAddPortfolioImage(portfolioUrlInput.trim());
                setPortfolioUrlInput('');
              }
            }}
            className="premium-button"
            style={{
              border: 'none', borderRadius: '12px', padding: '10px 14px',
              background: portfolioUrlInput.trim() ? 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)' : 'var(--bg-subtle)',
              color: portfolioUrlInput.trim() ? '#FFF' : 'var(--text-muted)',
              fontWeight: '800', cursor: portfolioUrlInput.trim() ? 'pointer' : 'not-allowed', fontSize: '13px',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <Plus size={16} /> Ajouter
          </button>
          <button
            onClick={() => document.getElementById('portfolio-file-input')?.click()}
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: '12px', padding: '10px 14px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--accent-primary)',
              fontWeight: '800', cursor: 'pointer', fontSize: '13px',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            📷 Photo
          </button>
          <input
            id="portfolio-file-input"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => handleAddPortfolioImage(ev.target.result);
              reader.readAsDataURL(file);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {/* ---- HISTORIQUE DES SWAPS & DEALS ---- */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <History size={17} color="var(--accent-primary)" />
          <h4 className="font-editorial-heading" style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-main)' }}>{t('swapHistory')}</h4>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px' }}>{t('swapHistorySub')}</p>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '130px', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '12px 14px', backgroundColor: 'var(--bg-subtle)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('closedDeals')}</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>{closedDealsCount}</div>
          </div>
          <div style={{ flex: 1, minWidth: '130px', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '12px 14px', backgroundColor: 'var(--bg-subtle)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('averageRating')}</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {averageRating} {averageRating !== '—' && <Star size={15} fill="#F59E0B" color="#F59E0B" />}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '130px', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '12px 14px', backgroundColor: 'var(--bg-subtle)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('inProgressPlanned')}</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-primary)' }}>{inProgressCount}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {userSwapHistory.length === 0 ? (
            <div style={{ padding: '28px 20px', textAlign: 'center', borderRadius: '20px', backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border-color)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Sparkles size={22} />
              </div>
              <div className="font-editorial-heading" style={{ fontWeight: '600', fontSize: '16px', color: 'var(--text-main)', marginBottom: '6px' }}>
                Nouveau profil (0 deal clôturé)
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '380px', margin: '0 auto 16px', lineHeight: 1.6 }}>
                Vous n'avez pas encore d'échange clôturé. Parcourez l'explorateur ou proposez un deal sur une annonce pour démarrer !
              </p>
              <button
                onClick={() => setActiveTab('feed')}
                className="premium-button"
                style={{
                  border: 'none',
                  borderRadius: '999px',
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                  color: '#FFF',
                  fontWeight: '800',
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-accent)'
                }}
              >
                Explorer les annonces
              </button>
            </div>
          ) : (
            userSwapHistory.map((entry) => {
              const isClosed = entry.status === 'Clôturé';
              const statusStyle = statusStyles[entry.status] || { bg: 'var(--bg-subtle)', text: 'var(--text-secondary)' };
              return (
                <div key={entry.id} className="premium-card" style={{ border: '1px solid var(--border-color)', borderRadius: '18px', padding: '14px', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '6px' }}>
                    <div>
                      <div className="font-editorial-heading" style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-main)', lineHeight: 1.4 }}>{getListingTitleTranslationUtil(entry.deal, currentLang)}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>{entry.counterparty} • {entry.date}</div>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: '800', padding: '5px 10px', borderRadius: '999px', backgroundColor: statusStyle.bg, color: statusStyle.text, whiteSpace: 'nowrap' }}>{formatStatus ? formatStatus(entry.status) : entry.status}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '800', marginBottom: '8px' }}>{formatCompensation ? formatCompensation(entry.compensation) : entry.compensation}</div>
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                    {isClosed ? (() => {
                      const isRevOrig = !!showingOriginalReviews[entry.id];
                      const revTxt = entry.review ? getReviewTranslationUtil(entry.review, currentLang, isRevOrig) : null;
                      return (
                        <>
                          {entry.rating != null && (
                            <div style={{ display: 'flex', gap: '2px', marginBottom: '6px' }}>
                              {[1, 2, 3, 4, 5].map(star => (
                                <Star key={star} size={13} fill={star <= entry.rating ? '#F59E0B' : 'none'} color={star <= entry.rating ? '#F59E0B' : '#E2E8F0'} />
                              ))}
                            </div>
                          )}
                          {revTxt && (
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>« {revTxt} »</div>
                          )}
                          {!entry.rating && !revTxt && (
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Deal clôturé — aucun avis laissé.</div>
                          )}
                          {currentLang !== 'FR' && revTxt && (
                            <button
                              onClick={() => toggleOriginalReview(entry.id)}
                              className="premium-button"
                              style={{ border: 'none', backgroundColor: 'transparent', color: 'var(--accent-primary)', fontSize: '10px', fontWeight: '800', cursor: 'pointer', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px', padding: 0 }}
                            >
                              <Globe size={10} color="var(--accent-primary)" />
                              {showingOriginalReviews[entry.id] ? t('showTranslation') : t('showOriginal')}
                            </button>
                          )}
                        </>
                      );
                    })() : (
                      <div style={{ fontSize: '12px', color: entry.status === 'En cours' ? 'var(--accent-primary)' : 'var(--accent-warning)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {entry.status === 'En cours' ? '🔄' : '📅'} {entry.status === 'En cours' ? 'Échange en cours...' : 'Rendez-vous planifié'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ---- BOUTON D'ACCÈS AU STUDIO DE DESIGN DÉDIÉ ---- */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '16px 20px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--border-radius-main, 18px)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-card)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Sparkles size={18} color="var(--accent-primary)" />
              <h4 className="font-editorial-heading" style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>
                🎨 Studio de Design & Apparence
              </h4>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
              Personnalisez les thèmes, le générateur magique HSL, les typographies, la forme des boutons et les contrastes WCAG.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsDesignStudioOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-card)] border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium cursor-pointer"
            style={{
              borderRadius: '999px',
              padding: '8px 18px',
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-contrast-text, #FFF)',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-accent)',
            }}
          >
            🎨 Personnaliser l'apparence
          </button>
        </div>
      </div>

      {/* MODALE DÉDIÉE DU STUDIO DE DESIGN */}
      <DesignStudioModal
        isOpen={isDesignStudioOpen}
        onClose={() => setIsDesignStudioOpen(false)}
        isMobile={isMobile}
      />
      </div>

      {/* ---- CADRE JURIDIQUE & RGPD ---- */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <ShieldCheck size={17} color="var(--accent-primary)" />
          <h4 className="font-editorial-heading" style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-main)' }}>Sécurité, Juridique & RGPD</h4>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
          Gérez vos données personnelles, exportez vos archives ou consultez les Conditions Générales de Troco.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => setIsPrivacyCenterOpen(true)}
            className="premium-button"
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '14px 16px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontWeight: '700',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Lock size={16} color="var(--accent-primary)" /> Centre de Confidentialité & Export RGPD (JSON)
            </span>
            <ChevronRight size={16} color="var(--accent-primary)" />
          </button>

          <button
            onClick={() => setIsCguViewerOpen(true)}
            className="premium-button"
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '14px 16px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontWeight: '700',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Scale size={16} color="var(--accent-primary)" /> Conditions Générales & Charte Communautaire (v2026.1)
            </span>
            <ChevronRight size={16} color="var(--accent-primary)" />
          </button>

          <button
            onClick={() => setIsAdminPanelOpen(true)}
            className="premium-button"
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '14px 16px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontWeight: '700',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldAlert size={16} color="var(--accent-success)" /> Panel Administrateur & Modération
            </span>
            <ChevronRight size={16} color="var(--accent-primary)" />
          </button>
        </div>
      </div>
    </div>
  );
}
