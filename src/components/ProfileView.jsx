import React, { useState, useRef } from 'react';
import { Star, ShieldCheck, Camera, Pencil, Check, Plus, Trash2, History, Image as ImageIcon, X, Upload } from 'lucide-react';
import KycModal from './KycModal';
import { PWAInstallProfileCard } from './PWAInstallBanner';
import { SocialLinksDisplay, SocialLinksEditor } from './UserProfile';
import { ProgressiveImage } from './ui/ProgressiveImage';
import { EmptyState } from './ui/EmptyState';

export default function ProfileView({
  activeTab,
  profile,
  setProfile,
  isEditingProfile,
  setIsEditingProfile,
  profileDraft,
  setProfileDraft,
  handleStartEdit,
  handleSaveProfile,
  saveMessage,
  profileAvatarFileInputRef,
  handleAvatarFileUpload,
  skills,
  setSkills,
  skillInput,
  setSkillInput,
  handleAddSkill,
  handleRemoveSkill,
  equipment,
  setEquipment,
  equipmentInput,
  setEquipmentInput,
  handleAddEquipment,
  handleRemoveEquipment,
  swapHistory,
  closedDealsCount,
  inProgressCount,
  averageRating,
  openCheckout,
  setIsCreditModalOpen,
  currentLang,
  t,
  darkMode,
  AnimatedEuroBalance,
  AnimatedTokenBalance,
  // Portfolio props
  portfolioImages = [],
  onAddPortfolioImage,
  onRemovePortfolioImage,
}) {
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [portfolioUrlInput, setPortfolioUrlInput] = useState('');
  const portfolioFileInputRef = useRef(null);

  if (activeTab !== 'profile') return null;

  const handleAddPortfolioUrl = () => {
    const url = portfolioUrlInput.trim();
    if (!url) return;
    if (onAddPortfolioImage) onAddPortfolioImage(url);
    setPortfolioUrlInput('');
  };

  const handlePortfolioFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (onAddPortfolioImage) onAddPortfolioImage(ev.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const cardStyle = {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '24px',
    padding: '24px',
    border: '1px solid var(--border-color)',
    boxShadow: 'var(--shadow-card)',
  };

  return (
    <div className="fade-up-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* BANNIÈRE PROFIL ET IDENTITÉ */}
      <div style={{
        ...cardStyle,
        borderRadius: '28px', padding: '28px',
        position: 'relative'
      }}>
        {saveMessage && (
          <div style={{
            position: 'absolute', top: '16px', right: '20px',
            backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-success)',
            padding: '6px 14px', borderRadius: '999px',
            fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px',
            border: '1px solid var(--border-color)'
          }}>
            <Check size={14} /> {saveMessage}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
          {/* AVATAR AVEC UPLOAD */}
          <div style={{ position: 'relative' }}>
            <div style={{ width: '96px', height: '96px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--accent-primary)', boxShadow: 'var(--shadow-accent)' }}>
              <ProgressiveImage
                src={isEditingProfile ? (profileDraft?.avatar || profile?.avatar) : (profile?.avatar || '')}
                alt={profile?.name || 'Profil'}
                style={{ width: '100%', height: '100%' }}
                imgStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            {isEditingProfile && (
              <>
                <button
                  onClick={() => profileAvatarFileInputRef.current?.click()}
                  style={{
                    position: 'absolute', bottom: '0', right: '0',
                    border: 'none', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', color: '#FFF',
                    width: '32px', height: '32px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: 'var(--shadow-accent)'
                  }}
                  title="Changer la photo de profil"
                >
                  <Camera size={16} />
                </button>
                <input
                  type="file"
                  ref={profileAvatarFileInputRef}
                  onChange={handleAvatarFileUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
              </>
            )}
          </div>

          {/* DÉTAILS PROFIL ET ÉDITION */}
          <div style={{ flex: 1, minWidth: '260px' }}>
            {!isEditingProfile ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <h1 className="font-editorial-heading" style={{ margin: 0, fontSize: '28px', fontWeight: '600', color: 'var(--text-main)' }}>
                    {profile?.name || 'Membre Troco'}
                  </h1>
                  <span style={{ fontSize: '13px', color: 'var(--accent-primary)', fontWeight: '700' }}>{profile?.username || '@membre'}</span>
                  {profile?.kycVerified ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-success)', fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '999px', border: '1px solid var(--border-color)' }}>
                      <ShieldCheck size={13} /> Identité Vérifiée ✅
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsKycModalOpen(true)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-success)', border: '1px solid var(--accent-success)', fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '999px', cursor: 'pointer' }}
                    >
                      <ShieldCheck size={13} /> Vérifier mon identité (+ Badge ✅)
                    </button>
                  )}
                </div>

                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '14px' }}>
                  {profile?.bio || ''}
                </div>

                {/* Liens Réseaux Sociaux & Portfolio Sécurisés */}
                {profile?.socialLinks && profile.socialLinks.length > 0 && (
                  <div style={{ marginBottom: '14px' }}>
                    <SocialLinksDisplay links={profile.socialLinks} size="medium" />
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: '800', color: 'var(--accent-warning)' }}>
                    {closedDealsCount > 0 && averageRating !== '—' ? (
                      <>
                        <Star size={18} fill="var(--accent-warning)" /> {averageRating}
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '12px' }}>({closedDealsCount} deals)</span>
                      </>
                    ) : (
                      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        Nouveau membre • Aucun échange
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                    📍 {profile?.location || 'France'}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {profile?.languages?.map(lang => (
                      <span key={lang} style={{ fontSize: '11px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', padding: '2px 6px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={profileDraft?.name || ''}
                    onChange={(e) => setProfileDraft(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nom complet"
                    style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: '14px', fontWeight: '700', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }}
                  />
                  <input
                    type="text"
                    value={profileDraft?.username || ''}
                    onChange={(e) => setProfileDraft(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="@nomdutilisateur"
                    style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: '14px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }}
                  />
                </div>

                <textarea
                  rows={3}
                  value={profileDraft.bio}
                  onChange={(e) => setProfileDraft(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Votre biographie..."
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: '13px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', resize: 'vertical', outline: 'none' }}
                />

                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={profileDraft?.location || ''}
                    onChange={(e) => setProfileDraft(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Localisation"
                    style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: '13px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }}
                  />
                </div>

                {/* Gestionnaire d'édition des réseaux sociaux */}
                <SocialLinksEditor
                  socialLinks={profileDraft?.socialLinks !== undefined ? profileDraft.socialLinks : (profile?.socialLinks || [])}
                  onChange={(newLinks) => setProfileDraft(prev => ({ ...prev, socialLinks: newLinks }))}
                  darkMode={darkMode}
                />
              </div>
            )}

            <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
              {!isEditingProfile ? (
                <button
                  onClick={handleStartEdit}
                  className="premium-button"
                  style={{ border: '1px solid var(--border-color)', borderRadius: '14px', padding: '10px 18px', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Pencil size={15} /> Modifier le profil
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="premium-button"
                    style={{ border: '1px solid var(--border-color)', borderRadius: '14px', padding: '10px 18px', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    className="premium-button"
                    style={{ border: 'none', borderRadius: '14px', padding: '10px 18px', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', color: '#FFF', fontWeight: '800', fontSize: '13px', cursor: 'pointer', boxShadow: 'var(--shadow-accent)' }}
                  >
                    Enregistrer
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PORTEFEUILLE DE CRÉDITS & SOLDE EUROS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {/* CARTE JETONS TROCO */}
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '4px' }}>
              Solde Crédits Temps
            </div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--accent-primary)' }}>
              {AnimatedTokenBalance ? (
                <AnimatedTokenBalance value={profile.trocoTokens} />
              ) : (
                `${profile.trocoTokens} Jetons`
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--accent-success)', fontWeight: '700', marginTop: '2px' }}>
              1 Jeton = 1 Heure de service rendu
            </div>
          </div>

          <button
            onClick={() => setIsCreditModalOpen(true)}
            className="premium-button"
            style={{ border: 'none', borderRadius: '14px', padding: '10px 16px', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', color: '#FFF', fontWeight: '800', fontSize: '13px', cursor: 'pointer', boxShadow: 'var(--shadow-accent)' }}
          >
            Obtenir des jetons
          </button>
        </div>

        {/* CARTE SOLDE EURO */}
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '4px' }}>
              Solde Porte-Monnaie (€)
            </div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--accent-success)' }}>
              {AnimatedEuroBalance ? (
                <AnimatedEuroBalance value={profile.euroBalance} />
              ) : (
                `${profile.euroBalance.toFixed(2)} €`
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '2px' }}>
              Disponible pour virements & prestations cash
            </div>
          </div>

          <button
            onClick={() => openCheckout({ mode: 'wallet-cash', amount: 50, label: 'Rechargement Solde Euro (50€)' })}
            className="premium-button"
            style={{ border: '1px solid var(--accent-success)', borderRadius: '14px', padding: '10px 16px', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-success)', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}
          >
            Recharger
          </button>
        </div>
      </div>

      {/* CARTE D'INSTALLATION PWA MOBILE & DESKTOP */}
      <PWAInstallProfileCard />

      {/* SKILLS ET MATÉRIEL */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* COMPÉTENCES & SERVICES */}
        <div style={cardStyle}>
          <h3 className="font-editorial-heading" style={{ margin: '0 0 14px', fontSize: '20px', fontWeight: '600', color: 'var(--text-main)' }}>
            🎯 Compétences & Services Proposés
          </h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {skills.map((skill, idx) => (
              <span key={idx} style={{ fontSize: '13px', fontWeight: '700', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', padding: '6px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border-color)' }}>
                {skill}
                <button onClick={() => handleRemoveSkill(skill)} style={{ border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <Trash2 size={13} />
                </button>
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
              placeholder="Ajouter une compétence..."
              style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: '13px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }}
            />
            <button onClick={handleAddSkill} style={{ border: 'none', borderRadius: '12px', padding: '10px 14px', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', color: '#FFF', fontWeight: '800', cursor: 'pointer', boxShadow: 'var(--shadow-accent)' }}>
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* OUTILS & MATÉRIEL AU PRÊT */}
        <div style={cardStyle}>
          <h3 className="font-editorial-heading" style={{ margin: '0 0 14px', fontSize: '20px', fontWeight: '600', color: 'var(--text-main)' }}>
            🧰 Matériel & Équipement au Prêt
          </h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {equipment.map((item, idx) => (
              <span key={idx} style={{ fontSize: '13px', fontWeight: '700', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-success)', padding: '6px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border-color)' }}>
                {item}
                <button onClick={() => handleRemoveEquipment(item)} style={{ border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <Trash2 size={13} />
                </button>
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={equipmentInput}
              onChange={(e) => setEquipmentInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddEquipment()}
              placeholder="Ajouter du matériel..."
              style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: '13px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }}
            />
            <button onClick={handleAddEquipment} style={{ border: 'none', borderRadius: '12px', padding: '10px 14px', backgroundColor: 'var(--accent-success)', color: '#FFF', fontWeight: '800', cursor: 'pointer', boxShadow: 'var(--shadow-accent)' }}>
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 📸 MON PORTFOLIO */}
      <div style={{ ...cardStyle, borderRadius: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '22px', fontWeight: '600', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ImageIcon size={20} color="var(--accent-primary)" /> Mon Portfolio
          </h3>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
            {portfolioImages.length} photo{portfolioImages.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Grille des photos */}
        {portfolioImages.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '18px' }}>
            {portfolioImages.map((src, idx) => (
              <div key={idx} style={{ position: 'relative', aspectRatio: '1', borderRadius: '14px', overflow: 'hidden', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border-color)' }}>
                <ProgressiveImage
                  src={src}
                  alt={`Portfolio ${idx + 1}`}
                  style={{ width: '100%', height: '100%' }}
                  imgStyle={{ objectFit: 'cover' }}
                />
                <button
                  onClick={() => onRemovePortfolioImage && onRemovePortfolioImage(idx)}
                  style={{
                    position: 'absolute', top: '6px', right: '6px',
                    border: 'none', width: '26px', height: '26px', borderRadius: '50%',
                    backgroundColor: 'var(--overlay-bg)',
                    color: '#FFF', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(4px)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    zIndex: 10
                  }}
                  title="Supprimer cette photo"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '12px 0', marginBottom: '16px' }}>
            <EmptyState
              compact={true}
              icon={<ImageIcon size={24} strokeWidth={2.2} />}
              title="Aucune photo dans ton portfolio"
              description="Ajoute des photos authentiques pour mettre en valeur ton savoir-faire et tes compétences."
            />
          </div>
        )}

        {/* Ajout d'une photo */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={portfolioUrlInput}
            onChange={(e) => setPortfolioUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddPortfolioUrl()}
            placeholder="Colle une URL d'image..."
            style={{
              flex: 1, minWidth: '180px', padding: '10px 14px',
              border: '1px solid var(--border-color)',
              borderRadius: '12px', fontSize: '13px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)', outline: 'none'
            }}
          />
          <button
            onClick={handleAddPortfolioUrl}
            disabled={!portfolioUrlInput.trim()}
            style={{
              border: 'none', borderRadius: '12px', padding: '10px 14px',
              background: portfolioUrlInput.trim() ? 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)' : 'var(--bg-subtle)',
              color: portfolioUrlInput.trim() ? '#FFF' : 'var(--text-muted)',
              fontWeight: '800', cursor: portfolioUrlInput.trim() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px',
              transition: 'all 0.2s ease',
              boxShadow: portfolioUrlInput.trim() ? 'var(--shadow-accent)' : 'none'
            }}
          >
            <Plus size={16} /> Ajouter
          </button>
          <button
            onClick={() => portfolioFileInputRef.current?.click()}
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: '12px', padding: '10px 14px',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--accent-primary)',
              fontWeight: '800', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px'
            }}
            title="Uploader une photo depuis ton appareil"
          >
            <Upload size={15} /> Photo
          </button>
          <input
            type="file"
            ref={portfolioFileInputRef}
            onChange={handlePortfolioFileUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* HISTORIQUE DES DEALS */}
      <div style={{ ...cardStyle, borderRadius: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '22px', fontWeight: '600', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={20} color="var(--accent-primary)" /> Historique des Deals & Évaluations
          </h3>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
            {closedDealsCount} clôturés • {inProgressCount} en cours
          </span>
        </div>

        {swapHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>🤝</div>
            <div>Pas encore d'échanges.</div>
            <div style={{ fontSize: '12px', marginTop: '6px', opacity: 0.7 }}>Tes deals et avis apparaîtront ici une fois clôturés.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {swapHistory.map(item => {
              const isClosed = item.status === 'Clôturé';
              return (
                <div key={item.id} style={{ padding: '16px', borderRadius: '16px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-main)' }}>{item.deal}</span>
                      <span style={{ fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '999px', backgroundColor: isClosed ? 'var(--bg-card)' : 'var(--bg-card)', color: isClosed ? 'var(--accent-success)' : 'var(--accent-primary)', border: '1px solid var(--border-color)' }}>
                        {item.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Avec <strong>{item.counterparty}</strong> • {item.date}
                    </div>
                    {/* Avis textuel : uniquement pour les deals CLÔTURÉS */}
                    {isClosed && item.review && (
                      <div style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        « {item.review} »
                      </div>
                    )}
                    {!isClosed && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        {item.status === 'En cours' ? 'Échange en cours...' : 'Rendez-vous planifié'}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-success)', marginBottom: '4px' }}>
                      {item.compensation}
                    </div>
                    {/* Étoiles : uniquement pour les deals CLÔTURÉS avec note */}
                    {isClosed && item.rating != null && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px', color: 'var(--accent-warning)', fontWeight: '800', fontSize: '13px' }}>
                        {[...Array(item.rating)].map((_, i) => (
                          <Star key={i} size={13} fill="var(--accent-warning)" />
                        ))}
                      </div>
                    )}
                    {!isClosed && (
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-primary)', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: '999px' }}>
                        {item.status === 'En cours' ? '🔄 En cours' : '📅 Planifié'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODALE DE VÉRIFICATION D'IDENTITÉ (KYC) */}
      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onComplete={() => {
          if (setProfile) {
            setProfile(prev => ({
              ...prev,
              kycVerified: true,
              kycVerifiedAt: new Date().toISOString()
            }));
          }
        }}
        profile={profile}
        darkMode={darkMode}
      />
    </div>
  );
}

