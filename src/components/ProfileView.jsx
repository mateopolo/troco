import React, { useState, useRef } from 'react';
import { Star, ShieldCheck, Camera, Pencil, Check, Plus, Trash2, History, Image as ImageIcon, X, Upload } from 'lucide-react';
import KycModal from './KycModal';

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
    backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
    borderRadius: '24px',
    padding: '24px',
    border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
    boxShadow: darkMode ? '0 16px 40px rgba(0,0,0,0.5)' : '0 16px 40px rgba(61,53,48,0.06)',
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
            backgroundColor: darkMode ? 'rgba(156,175,136,0.25)' : '#EBF0E6', color: '#3D4A35',
            padding: '6px 14px', borderRadius: '999px',
            fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <Check size={14} /> {saveMessage}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
          {/* AVATAR AVEC UPLOAD */}
          <div style={{ position: 'relative' }}>
            <div style={{ width: '96px', height: '96px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #C67D5B', boxShadow: '0 8px 24px rgba(198,125,91,0.25)' }}>
              <img src={isEditingProfile ? profileDraft.avatar : profile.avatar} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            {isEditingProfile && (
              <>
                <button
                  onClick={() => profileAvatarFileInputRef.current?.click()}
                  style={{
                    position: 'absolute', bottom: '0', right: '0',
                    border: 'none', background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', color: '#FFF',
                    width: '32px', height: '32px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
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
                  <h1 className="font-editorial-heading" style={{ margin: 0, fontSize: '28px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
                    {profile.name}
                  </h1>
                  <span style={{ fontSize: '13px', color: '#C67D5B', fontWeight: '700' }}>{profile.username}</span>
                  {profile.kycVerified ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: darkMode ? 'rgba(156,175,136,0.25)' : '#EBF0E6', color: '#3D4A35', fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '999px', boxShadow: '0 2px 8px rgba(156,175,136,0.2)' }}>
                      <ShieldCheck size={13} /> Identité Vérifiée ✅
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsKycModalOpen(true)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: darkMode ? 'rgba(156,175,136,0.2)' : '#EBF0E6', color: '#3D4A35', border: '1px solid #9CAF88', fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '999px', cursor: 'pointer' }}
                    >
                      <ShieldCheck size={13} /> Vérifier mon identité (+ Badge ✅)
                    </button>
                  )}
                </div>

                <div style={{ fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54', lineHeight: 1.6, marginBottom: '14px' }}>
                  {profile.bio}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: '800', color: '#D97706' }}>
                    {closedDealsCount > 0 && averageRating !== '—' ? (
                      <>
                        <Star size={18} fill="#D97706" /> {averageRating}
                        <span style={{ color: darkMode ? '#D4C5B5' : '#6B5E54', fontWeight: '600', fontSize: '12px' }}>({closedDealsCount} deals)</span>
                      </>
                    ) : (
                      <span style={{ fontSize: '12px', fontWeight: '600', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>
                        Nouveau membre • Aucun échange
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: darkMode ? '#D4C5B5' : '#6B5E54', fontWeight: '600' }}>
                    📍 {profile.location}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {profile.languages?.map(lang => (
                      <span key={lang} style={{ fontSize: '11px', fontWeight: '800', backgroundColor: darkMode ? 'rgba(198,125,91,0.2)' : '#F5EAE4', color: darkMode ? '#FAF7F2' : '#A8644A', padding: '2px 6px', borderRadius: '6px' }}>
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
                    value={profileDraft.name}
                    onChange={(e) => setProfileDraft(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nom complet"
                    style={{ flex: 1, padding: '10px 12px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '12px', fontSize: '14px', fontWeight: '700', backgroundColor: darkMode ? '#1A1715' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                  />
                  <input
                    type="text"
                    value={profileDraft.username}
                    onChange={(e) => setProfileDraft(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="@nomdutilisateur"
                    style={{ flex: 1, padding: '10px 12px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '12px', fontSize: '14px', backgroundColor: darkMode ? '#1A1715' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                  />
                </div>

                <textarea
                  rows={3}
                  value={profileDraft.bio}
                  onChange={(e) => setProfileDraft(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Votre biographie..."
                  style={{ width: '100%', padding: '10px 12px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '12px', fontSize: '13px', backgroundColor: darkMode ? '#1A1715' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530', resize: 'vertical', outline: 'none' }}
                />

                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={profileDraft.location}
                    onChange={(e) => setProfileDraft(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Localisation"
                    style={{ flex: 1, padding: '10px 12px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '12px', fontSize: '13px', backgroundColor: darkMode ? '#1A1715' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                  />
                </div>
              </div>
            )}

            <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
              {!isEditingProfile ? (
                <button
                  onClick={handleStartEdit}
                  className="premium-button"
                  style={{ border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '14px', padding: '10px 18px', backgroundColor: 'transparent', color: darkMode ? '#FAF7F2' : '#3D3530', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Pencil size={15} /> Modifier le profil
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="premium-button"
                    style={{ border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '14px', padding: '10px 18px', backgroundColor: 'transparent', color: darkMode ? '#D4C5B5' : '#6B5E54', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    className="premium-button"
                    style={{ border: 'none', borderRadius: '14px', padding: '10px 18px', background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', color: '#FFF', fontWeight: '800', fontSize: '13px', cursor: 'pointer', boxShadow: '0 6px 16px rgba(198,125,91,0.25)' }}
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
            <div style={{ fontSize: '12px', fontWeight: '800', color: darkMode ? '#D4C5B5' : '#6B5E54', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '4px' }}>
              Solde Crédits Temps
            </div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#C67D5B' }}>
              {AnimatedTokenBalance ? (
                <AnimatedTokenBalance value={profile.trocoTokens} />
              ) : (
                `${profile.trocoTokens} Jetons`
              )}
            </div>
            <div style={{ fontSize: '11px', color: '#7A8F6A', fontWeight: '700', marginTop: '2px' }}>
              1 Jeton = 1 Heure de service rendu
            </div>
          </div>

          <button
            onClick={() => setIsCreditModalOpen(true)}
            className="premium-button"
            style={{ border: 'none', borderRadius: '14px', padding: '10px 16px', background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', color: '#FFF', fontWeight: '800', fontSize: '13px', cursor: 'pointer', boxShadow: '0 8px 20px rgba(198,125,91,0.25)' }}
          >
            Obtenir des jetons
          </button>
        </div>

        {/* CARTE SOLDE EURO */}
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: darkMode ? '#D4C5B5' : '#6B5E54', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '4px' }}>
              Solde Porte-Monnaie (€)
            </div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#7A8F6A' }}>
              {AnimatedEuroBalance ? (
                <AnimatedEuroBalance value={profile.euroBalance} />
              ) : (
                `${profile.euroBalance.toFixed(2)} €`
              )}
            </div>
            <div style={{ fontSize: '11px', color: darkMode ? '#D4C5B5' : '#6B5E54', fontWeight: '600', marginTop: '2px' }}>
              Disponible pour virements & prestations cash
            </div>
          </div>

          <button
            onClick={() => openCheckout({ mode: 'wallet-cash', amount: 50, label: 'Rechargement Solde Euro (50€)' })}
            className="premium-button"
            style={{ border: '1px solid #9CAF88', borderRadius: '14px', padding: '10px 16px', backgroundColor: darkMode ? 'rgba(156,175,136,0.2)' : '#EBF0E6', color: '#3D4A35', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}
          >
            Recharger
          </button>
        </div>
      </div>

      {/* SKILLS ET MATÉRIEL */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* COMPÉTENCES & SERVICES */}
        <div style={cardStyle}>
          <h3 className="font-editorial-heading" style={{ margin: '0 0 14px', fontSize: '20px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
            🎯 Compétences & Services Proposés
          </h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {skills.map((skill, idx) => (
              <span key={idx} style={{ fontSize: '13px', fontWeight: '700', backgroundColor: darkMode ? 'rgba(198,125,91,0.2)' : '#F5EAE4', color: darkMode ? '#FAF7F2' : '#A8644A', padding: '6px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {skill}
                <button onClick={() => handleRemoveSkill(skill)} style={{ border: 'none', background: 'none', color: darkMode ? '#D4C5B5' : '#6B5E54', cursor: 'pointer', padding: 0, display: 'flex' }}>
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
              style={{ flex: 1, padding: '10px 12px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '12px', fontSize: '13px', backgroundColor: darkMode ? '#1A1715' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
            />
            <button onClick={handleAddSkill} style={{ border: 'none', borderRadius: '12px', padding: '10px 14px', background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', color: '#FFF', fontWeight: '800', cursor: 'pointer' }}>
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* OUTILS & MATÉRIEL AU PRÊT */}
        <div style={cardStyle}>
          <h3 className="font-editorial-heading" style={{ margin: '0 0 14px', fontSize: '20px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
            🧰 Matériel & Équipement au Prêt
          </h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {equipment.map((item, idx) => (
              <span key={idx} style={{ fontSize: '13px', fontWeight: '700', backgroundColor: darkMode ? 'rgba(156,175,136,0.2)' : '#EBF0E6', color: '#3D4A35', padding: '6px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {item}
                <button onClick={() => handleRemoveEquipment(item)} style={{ border: 'none', background: 'none', color: darkMode ? '#D4C5B5' : '#6B5E54', cursor: 'pointer', padding: 0, display: 'flex' }}>
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
              style={{ flex: 1, padding: '10px 12px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '12px', fontSize: '13px', backgroundColor: darkMode ? '#1A1715' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
            />
            <button onClick={handleAddEquipment} style={{ border: 'none', borderRadius: '12px', padding: '10px 14px', backgroundColor: '#7A8F6A', color: '#FFF', fontWeight: '800', cursor: 'pointer' }}>
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 📸 MON PORTFOLIO */}
      <div style={{ ...cardStyle, borderRadius: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '22px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ImageIcon size={20} color="#C67D5B" /> Mon Portfolio
          </h3>
          <span style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>
            {portfolioImages.length} photo{portfolioImages.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Grille des photos */}
        {portfolioImages.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '18px' }}>
            {portfolioImages.map((src, idx) => (
              <div key={idx} style={{ position: 'relative', aspectRatio: '1', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(61,53,48,0.1)', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3' }}>
                <img
                  src={src}
                  alt={`Portfolio ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <button
                  onClick={() => onRemovePortfolioImage && onRemovePortfolioImage(idx)}
                  style={{
                    position: 'absolute', top: '6px', right: '6px',
                    border: 'none', width: '26px', height: '26px', borderRadius: '50%',
                    backgroundColor: 'rgba(61,53,48,0.75)',
                    color: '#FFF', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(4px)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                  }}
                  title="Supprimer cette photo"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center', padding: '32px 16px', marginBottom: '16px',
            borderRadius: '16px',
            border: darkMode ? '2px dashed rgba(232,221,211,0.15)' : '2px dashed #D4C5B5',
            color: darkMode ? '#D4C5B5' : '#6B5E54',
            fontSize: '13px', fontWeight: '600', lineHeight: 1.5
          }}>
            <ImageIcon size={32} style={{ marginBottom: '10px', opacity: 0.4 }} color="#C67D5B" />
            <div>Aucune photo dans ton portfolio pour l'instant.</div>
            <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>Ajoute des photos pour mettre en valeur ton travail.</div>
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
              border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
              borderRadius: '12px', fontSize: '13px',
              backgroundColor: darkMode ? '#1A1715' : '#FFF',
              color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none'
            }}
          />
          <button
            onClick={handleAddPortfolioUrl}
            disabled={!portfolioUrlInput.trim()}
            style={{
              border: 'none', borderRadius: '12px', padding: '10px 14px',
              background: portfolioUrlInput.trim() ? 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)' : (darkMode ? '#3D3530' : '#D4C5B5'),
              color: portfolioUrlInput.trim() ? '#FFF' : (darkMode ? '#9A8E84' : '#6B5E54'),
              fontWeight: '800', cursor: portfolioUrlInput.trim() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px',
              transition: 'all 0.2s ease'
            }}
          >
            <Plus size={16} /> Ajouter
          </button>
          <button
            onClick={() => portfolioFileInputRef.current?.click()}
            style={{
              border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
              borderRadius: '12px', padding: '10px 14px',
              backgroundColor: darkMode ? '#1A1715' : '#FFF',
              color: '#C67D5B',
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
          <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '22px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={20} color="#C67D5B" /> Historique des Deals & Évaluations
          </h3>
          <span style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>
            {closedDealsCount} clôturés • {inProgressCount} en cours
          </span>
        </div>

        {swapHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: darkMode ? '#D4C5B5' : '#6B5E54', fontSize: '14px', fontWeight: '600' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>🤝</div>
            <div>Pas encore d'échanges.</div>
            <div style={{ fontSize: '12px', marginTop: '6px', opacity: 0.7 }}>Tes deals et avis apparaîtront ici une fois clôturés.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {swapHistory.map(item => {
              const isClosed = item.status === 'Clôturé';
              return (
                <div key={item.id} style={{ padding: '16px', borderRadius: '16px', backgroundColor: darkMode ? '#1A1715' : '#FFF', border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '800', fontSize: '14px', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{item.deal}</span>
                      <span style={{ fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '999px', backgroundColor: isClosed ? (darkMode ? 'rgba(156,175,136,0.25)' : '#EBF0E6') : (item.status === 'En cours' ? (darkMode ? 'rgba(198,125,91,0.2)' : '#F5EAE4') : '#FEF3C7'), color: isClosed ? '#3D4A35' : (item.status === 'En cours' ? '#A8644A' : '#92400E') }}>
                        {item.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: darkMode ? '#D4C5B5' : '#6B5E54', marginBottom: '6px' }}>
                      Avec <strong>{item.counterparty}</strong> • {item.date}
                    </div>
                    {/* Avis textuel : uniquement pour les deals CLÔTURÉS */}
                    {isClosed && item.review && (
                      <div style={{ fontSize: '12px', fontStyle: 'italic', color: darkMode ? '#D4C5B5' : '#6B5E54', lineHeight: 1.5 }}>
                        « {item.review} »
                      </div>
                    )}
                    {!isClosed && (
                      <div style={{ fontSize: '11px', color: darkMode ? '#D4C5B5' : '#6B5E54', fontStyle: 'italic' }}>
                        {item.status === 'En cours' ? 'Échange en cours...' : 'Rendez-vous planifié'}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#7A8F6A', marginBottom: '4px' }}>
                      {item.compensation}
                    </div>
                    {/* Étoiles : uniquement pour les deals CLÔTURÉS avec note */}
                    {isClosed && item.rating != null && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px', color: '#D97706', fontWeight: '800', fontSize: '13px' }}>
                        {[...Array(item.rating)].map((_, i) => (
                          <Star key={i} size={13} fill="#D97706" />
                        ))}
                      </div>
                    )}
                    {!isClosed && (
                      <span style={{ fontSize: '11px', fontWeight: '700', color: item.status === 'En cours' ? '#C67D5B' : '#D97706', backgroundColor: item.status === 'En cours' ? (darkMode ? 'rgba(198,125,91,0.2)' : '#F5EAE4') : (darkMode ? 'rgba(217,119,6,0.15)' : '#FEF3C7'), padding: '2px 8px', borderRadius: '999px' }}>
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
