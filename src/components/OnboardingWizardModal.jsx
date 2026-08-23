import React, { useState, useRef } from 'react';
import {
  Sparkles,
  User,
  Briefcase,
  Building2,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Upload,
  Check,
  Tag,
  Wrench,
  X,
  Plus
} from 'lucide-react';
import {
  SKILL_CATEGORIES,
  EQUIPMENT_CATEGORIES,
  BIO_SUGGESTIONS,
  ACCOUNT_TYPES,
  DIVERSE_AVATARS
} from '../data/categoriesData';

export default function OnboardingWizardModal({
  isOpen,
  darkMode,
  currentUser,
  onComplete,
}) {
  // Stepper actif (1: CGU & Pacte, 2: Identité & Profil, 3: Compétences & Matériel, 4: Bio)
  const [step, setStep] = useState(1);

  // Étape 1 : Consentements légaux & CGU
  const [cguConsent, setCguConsent] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);

  // Étape 2 : Type de compte & Identité
  const [accountType, setAccountType] = useState('particular');
  const [avatar, setAvatar] = useState(currentUser?.avatar || DIVERSE_AVATARS[0]);
  const [name, setName] = useState(currentUser?.name || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [location, setLocation] = useState(currentUser?.location || 'Paris, France');
  const fileInputRef = useRef(null);

  // Étape 3 : Compétences & Matériel (Presets par catégories + Custom)
  const [activeSkillCategory, setActiveSkillCategory] = useState('bricolage');
  const [selectedSkills, setSelectedSkills] = useState(currentUser?.skills || ['Bricolage', 'Jardinage']);
  const [customSkillInput, setCustomSkillInput] = useState('');

  const [activeEquipCategory, setActiveEquipCategory] = useState('outillage');
  const [selectedEquipment, setSelectedEquipment] = useState(currentUser?.equipment || ['Perceuse à percussion', 'Tondeuse']);
  const [customEquipInput, setCustomEquipInput] = useState('');

  // Étape 4 : Biographie & Proposition de valeur
  const [bio, setBio] = useState(
    currentUser?.bio || BIO_SUGGESTIONS.particular[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Gestion de l'upload photo local
  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Toggle compétence
  const toggleSkill = (skill) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  // Ajout compétence sur-mesure
  const addCustomSkill = (e) => {
    if (e) e.preventDefault();
    const clean = customSkillInput.trim();
    if (clean && !selectedSkills.includes(clean)) {
      setSelectedSkills([...selectedSkills, clean]);
      setCustomSkillInput('');
    }
  };

  // Supprimer compétence
  const removeSkill = (skillToRemove) => {
    setSelectedSkills(selectedSkills.filter(s => s !== skillToRemove));
  };

  // Toggle matériel
  const toggleEquipment = (item) => {
    if (selectedEquipment.includes(item)) {
      setSelectedEquipment(selectedEquipment.filter(i => i !== item));
    } else {
      setSelectedEquipment([...selectedEquipment, item]);
    }
  };

  // Ajout matériel sur-mesure
  const addCustomEquipment = (e) => {
    if (e) e.preventDefault();
    const clean = customEquipInput.trim();
    if (clean && !selectedEquipment.includes(clean)) {
      setSelectedEquipment([...selectedEquipment, clean]);
      setCustomEquipInput('');
    }
  };

  // Supprimer matériel
  const removeEquipment = (itemToRemove) => {
    setSelectedEquipment(selectedEquipment.filter(i => i !== itemToRemove));
  };

  // Finalisation et enregistrement du profil complet
  const handleFinalize = () => {
    setIsSubmitting(true);
    const finalProfileData = {
      accountType,
      avatar,
      name: name.trim() || 'Membre Troco',
      username: username.trim().startsWith('@') ? username.trim() : `@${username.trim() || 'user'}`,
      location: location.trim() || 'France',
      skills: selectedSkills,
      equipment: selectedEquipment,
      bio: bio.trim(),
      cguAcceptedAt: new Date().toISOString(),
      onboardingCompleted: true,
      trocoTokens: 10,
      euroBalance: 50.00,
    };

    setTimeout(() => {
      setIsSubmitting(false);
      if (onComplete) {
        onComplete(finalProfileData);
      }
    }, 400);
  };

  const canProceedStep1 = cguConsent && privacyConsent;
  const canProceedStep2 = name.trim().length >= 2 && username.trim().length >= 2;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'var(--overlay-bg)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      zIndex: 100,
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text-main)',
        borderRadius: '28px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-modal)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* BARRE DE PROGRESSION EN HAUT */}
        <div style={{
          padding: '24px 28px 18px',
          borderBottom: '1px solid var(--border-color)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
              }}>
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '18px', fontWeight: '600', letterSpacing: '-0.01em', color: 'var(--text-main)' }}>
                  Bienvenue sur Troco
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Étape {step} sur 4
                </span>
              </div>
            </div>
            <span style={{
              fontSize: '11px',
              fontWeight: '800',
              padding: '4px 10px',
              borderRadius: '999px',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--accent-primary)',
            }}>
              {step === 1 && '📜 Conditions & Règles'}
              {step === 2 && '👤 Identité & Profil'}
              {step === 3 && '🎯 Compétences & Matériel'}
              {step === 4 && '✍️ Ma Biographie'}
            </span>
          </div>

          {/* Stepper Dots & Line */}
          <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: '6px',
                  borderRadius: '999px',
                  backgroundColor: s <= step
                    ? 'var(--accent-primary)'
                    : 'var(--border-color)',
                  transition: 'background-color 0.3s ease',
                }}
              />
            ))}
          </div>
        </div>

        {/* CORPS DE LA MODALE SELON L'ÉTAPE */}
        <div style={{ padding: '24px 28px', flex: 1, overflowY: 'auto' }}>

          {/* ================================================================ */}
          {/* ÉTAPE 1 : CONDITIONS D'UTILISATION & CADRE JURIDIQUE             */}
          {/* ================================================================ */}
          {step === 1 && (
            <div>
              <h2 className="font-editorial-heading" style={{ fontSize: '22px', fontWeight: '600', margin: '0 0 8px', color: 'var(--text-main)' }}>
                Le Pacte de Confiance Troco (v2026.1)
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 18px', lineHeight: 1.6 }}>
                Pour garantir une expérience 100% sécurisée, bienveillante et transparente, chaque membre s’engage à respecter nos 6 piliers fondamentaux.
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px',
                marginBottom: '20px',
              }}>
                <div style={{
                  padding: '12px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-primary)', marginBottom: '4px' }}>
                    ⏳ 1h = 1 Jeton Troco
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    La valeur du temps est universelle. 1 heure de partage équivaut strictement à 1 Jeton de service.
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-success)', marginBottom: '4px' }}>
                    🛡️ Sécurité & Cautions
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Les prêts de matériel sont couverts par des pré-autorisations bancaires virtuelles libérées au retour.
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#EF4444', marginBottom: '4px' }}>
                    🚫 Tolérance Zéro Fraude
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Interdiction formelle des faux coupons et arnaques. Tout manquement entraîne un Shadow-Ban irréversible.
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-primary)', marginBottom: '4px' }}>
                    🔒 Conformité RGPD Totale
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Chiffrement bancaire, export complet de vos données JSON et droit à l’oubli en 1 clic dans vos paramètres.
                  </div>
                </div>
              </div>

              {/* Checkboxes contractuelles obligatoires */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '14px',
                borderRadius: '16px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
              }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '12px', lineHeight: 1.5, color: 'var(--text-main)' }}>
                  <input
                    type="checkbox"
                    checked={cguConsent}
                    onChange={(e) => setCguConsent(e.target.checked)}
                    style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                  />
                  <span>
                    J'ai pris connaissance et j'accepte sans réserve les <strong>Conditions Générales d'Utilisation (CGU v2026.1)</strong> et le barème d'échange 1h = 1 Jeton.
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '12px', lineHeight: 1.5, color: 'var(--text-main)' }}>
                  <input
                    type="checkbox"
                    checked={privacyConsent}
                    onChange={(e) => setPrivacyConsent(e.target.checked)}
                    style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                  />
                  <span>
                    J'accepte la <strong>Politique de Confidentialité</strong> relative à la protection de mes données personnelles conformément au Règlement Général sur la Protection des Données (RGPD).
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* ÉTAPE 2 : TYPE DE PROFIL, IDENTITÉ & AVATAR                      */}
          {/* ================================================================ */}
          {step === 2 && (
            <div>
              <h2 className="font-editorial-heading" style={{ fontSize: '22px', fontWeight: '600', margin: '0 0 6px', color: 'var(--text-main)' }}>
                Quel est votre profil sur Troco ?
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Sélectionnez votre type d'activité pour adapter vos propositions et badges.
              </p>

              {/* Sélection du type de compte */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {ACCOUNT_TYPES.map((t) => {
                  const isSelected = accountType === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setAccountType(t.id);
                        if (BIO_SUGGESTIONS[t.id]) {
                          setBio(BIO_SUGGESTIONS[t.id][0]);
                        }
                      }}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '18px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: isSelected
                          ? 'var(--bg-subtle)'
                          : 'var(--bg-card)',
                        border: isSelected
                          ? '2px solid var(--accent-primary)'
                          : '1px solid var(--border-color)',
                        boxShadow: isSelected ? 'var(--shadow-accent)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '12px',
                          backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                          color: isSelected ? '#FFF' : 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {t.id === 'particular' && <User size={20} />}
                          {t.id === 'professional' && <Briefcase size={20} />}
                          {t.id === 'company' && <Building2 size={20} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-main)' }}>
                            {t.label}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {t.desc}
                          </div>
                        </div>
                      </div>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: isSelected ? '5px solid var(--accent-primary)' : '2px solid var(--border-color)',
                        backgroundColor: isSelected ? 'var(--bg-card)' : 'transparent',
                      }} />
                    </div>
                  );
                })}
              </div>

              {/* Photo de profil & Identifiants */}
              <div style={{
                display: 'flex',
                gap: '16px',
                alignItems: 'center',
                padding: '16px',
                borderRadius: '18px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                marginBottom: '16px',
              }}>
                <div style={{ position: 'relative' }}>
                  <img
                    src={avatar}
                    alt="Avatar"
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--accent-primary)',
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    style={{
                      position: 'absolute',
                      right: '-4px',
                      bottom: '-4px',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                      color: '#FFF',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-accent)',
                    }}
                    title="Importer une photo"
                  >
                    <Upload size={13} />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', marginBottom: '6px', color: 'var(--text-main)' }}>
                    Choisissez un avatar ou importez votre photo :
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px', maxHeight: '110px', overflowY: 'auto', padding: '4px' }}>
                    {DIVERSE_AVATARS.map((av) => (
                      <img
                        key={av}
                        src={av}
                        alt="option"
                        onClick={() => setAvatar(av)}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          cursor: 'pointer',
                          border: avatar === av ? '3px solid var(--accent-primary)' : '2px solid transparent',
                          transform: avatar === av ? 'scale(1.1)' : 'scale(1)',
                          transition: 'all 0.2s',
                          boxShadow: avatar === av ? 'var(--shadow-accent)' : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Nom & Pseudo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Nom affiché :
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Mateo Polo"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '14px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      fontSize: '13px',
                      fontWeight: '700',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Identifiant public :
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="@monpseudo"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '14px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--accent-primary)',
                      fontSize: '13px',
                      fontWeight: '700',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Ville / Localisation :
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ex: Paris, France ou Lyon, France"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '14px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      fontSize: '13px',
                      fontWeight: '700',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* ÉTAPE 3 : PRESETS INTELLIGENTS (COMPÉTENCES & MATÉRIEL)           */}
          {/* ================================================================ */}
          {step === 3 && (
            <div>
              <h2 className="font-editorial-heading" style={{ fontSize: '22px', fontWeight: '600', margin: '0 0 6px', color: 'var(--text-main)' }}>
                Que souhaitez-vous échanger ou prêter ?
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Sélectionnez vos savoir-faire et le matériel disponible chez vous. Vous pourrez en ajouter d'autres à tout moment.
              </p>

              {/* 1. Compétences & Savoir-faire */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary)' }}>
                    <Tag size={15} /> Mes Compétences ({selectedSkills.length}) :
                  </div>
                </div>

                {/* Bulles sélectionnées actives */}
                {selectedSkills.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px', padding: '10px', backgroundColor: 'var(--bg-subtle)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                    {selectedSkills.map(skill => (
                      <span
                        key={skill}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 10px',
                          borderRadius: '999px',
                          background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                          color: '#FFFFFF',
                          fontSize: '11px',
                          fontWeight: '700',
                          boxShadow: 'var(--shadow-accent)'
                        }}
                      >
                        <Check size={11} />
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          style={{
                            border: 'none',
                            background: 'rgba(255,255,255,0.2)',
                            borderRadius: '50%',
                            width: '16px',
                            height: '16px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#FFF',
                            padding: 0,
                            marginLeft: '2px'
                          }}
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Onglets catégories de compétences */}
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '10px' }}>
                  {SKILL_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveSkillCategory(cat.id)}
                      style={{
                        whiteSpace: 'nowrap',
                        padding: '6px 12px',
                        borderRadius: '999px',
                        border: activeSkillCategory === cat.id ? 'none' : '1px solid var(--border-color)',
                        backgroundColor: activeSkillCategory === cat.id
                          ? 'var(--accent-primary)'
                          : 'var(--bg-subtle)',
                        color: activeSkillCategory === cat.id ? '#FFF' : 'var(--text-secondary)',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Badges de compétences cliquables */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                  {(SKILL_CATEGORIES.find(c => c.id === activeSkillCategory)?.skills || []).map(skill => {
                    const isSelected = selectedSkills.includes(skill);
                    return (
                      <button
                        key={skill}
                        onClick={() => toggleSkill(skill)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 11px',
                          borderRadius: '999px',
                          border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                          backgroundColor: isSelected
                            ? 'var(--bg-subtle)'
                            : 'var(--bg-card)',
                          color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          fontSize: '11px',
                          fontWeight: isSelected ? '800' : '600',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? 'var(--shadow-card)' : 'none'
                        }}
                      >
                        {isSelected && <Check size={12} />}
                        {skill}
                      </button>
                    );
                  })}
                </div>

                {/* Ajout compétence personnalisée */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={customSkillInput}
                    onChange={(e) => setCustomSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomSkill(e);
                      }
                    }}
                    placeholder="Autre compétence sur-mesure (ex: violon, chant lyrique...)"
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={addCustomSkill}
                    style={{
                      border: 'none',
                      borderRadius: '12px',
                      padding: '0 14px',
                      background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                      color: '#FFF',
                      fontWeight: '800',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: 'var(--shadow-accent)'
                    }}
                  >
                    <Plus size={13} /> Ajouter
                  </button>
                </div>
              </div>

              {/* 2. Matériel & Équipements */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary)' }}>
                    <Wrench size={15} /> Matériel & Équipement disponible ({selectedEquipment.length}) :
                  </div>
                </div>

                {/* Bulles sélectionnées actives */}
                {selectedEquipment.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px', padding: '10px', backgroundColor: 'var(--bg-subtle)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                    {selectedEquipment.map(item => (
                      <span
                        key={item}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 10px',
                          borderRadius: '999px',
                          backgroundColor: 'var(--accent-primary)',
                          color: '#FFFFFF',
                          fontSize: '11px',
                          fontWeight: '700',
                          boxShadow: 'var(--shadow-accent)'
                        }}
                      >
                        <Check size={11} color="#FFF" />
                        {item}
                        <button
                          type="button"
                          onClick={() => removeEquipment(item)}
                          style={{
                            border: 'none',
                            background: 'rgba(255,255,255,0.2)',
                            borderRadius: '50%',
                            width: '16px',
                            height: '16px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#FFF',
                            padding: 0,
                            marginLeft: '2px'
                          }}
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Onglets catégories de matériel */}
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '10px' }}>
                  {EQUIPMENT_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveEquipCategory(cat.id)}
                      style={{
                        whiteSpace: 'nowrap',
                        padding: '6px 12px',
                        borderRadius: '999px',
                        border: activeEquipCategory === cat.id ? 'none' : '1px solid var(--border-color)',
                        backgroundColor: activeEquipCategory === cat.id
                          ? 'var(--accent-primary)'
                          : 'var(--bg-subtle)',
                        color: activeEquipCategory === cat.id ? '#FFF' : 'var(--text-secondary)',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Badges de matériel cliquables */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                  {(EQUIPMENT_CATEGORIES.find(c => c.id === activeEquipCategory)?.items || []).map(item => {
                    const isSelected = selectedEquipment.includes(item);
                    return (
                      <button
                        key={item}
                        onClick={() => toggleEquipment(item)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 11px',
                          borderRadius: '999px',
                          border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                          backgroundColor: isSelected
                            ? 'var(--bg-subtle)'
                            : 'var(--bg-card)',
                          color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          fontSize: '11px',
                          fontWeight: isSelected ? '800' : '600',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? 'var(--shadow-card)' : 'none'
                        }}
                      >
                        {isSelected && <Check size={12} />}
                        {item}
                      </button>
                    );
                  })}
                </div>

                {/* Ajout matériel personnalisé */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={customEquipInput}
                    onChange={(e) => setCustomEquipInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomEquipment(e);
                      }
                    }}
                    placeholder="Autre matériel spécifique (ex: Tente 4 places, GoPro Hero...)"
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={addCustomEquipment}
                    style={{
                      border: 'none',
                      borderRadius: '12px',
                      padding: '0 14px',
                      backgroundColor: 'var(--accent-primary)',
                      color: '#FFF',
                      fontWeight: '800',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: 'var(--shadow-accent)'
                    }}
                  >
                    <Plus size={13} /> Ajouter
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* ÉTAPE 4 : PERSONNALISATION DE LA BIOGRAPHIE                     */}
          {/* ================================================================ */}
          {step === 4 && (
            <div>
              <h2 className="font-editorial-heading" style={{ fontSize: '22px', fontWeight: '600', margin: '0 0 6px', color: 'var(--text-main)' }}>
                Personnalisez votre biographie
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Présentez-vous en quelques mots à la communauté. Choisissez une suggestion rapide ou écrivez votre propre texte.
              </p>

              {/* Suggestions en 1 clic */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', marginBottom: '8px', color: 'var(--accent-primary)' }}>
                  💡 Suggestions rapides selon votre profil ({accountType}) :
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(BIO_SUGGESTIONS[accountType] || BIO_SUGGESTIONS.particular).map((sug, idx) => (
                    <button
                      key={idx}
                      onClick={() => setBio(sug)}
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: bio === sug ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        backgroundColor: bio === sug
                          ? 'var(--bg-subtle)'
                          : 'var(--bg-card)',
                        color: 'var(--text-main)',
                        fontSize: '12px',
                        lineHeight: 1.5,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: bio === sug ? 'var(--shadow-accent)' : 'none'
                      }}
                    >
                      « {sug} »
                    </button>
                  ))}
                </div>
              </div>

              {/* Zone de texte libre */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '6px', color: 'var(--text-main)' }}>
                  Votre texte personnalisé :
                </label>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Décrivez vos passions, ce que vous aimez partager, vos disponibilités..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    resize: 'vertical',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Cadeau de bienvenue */}
              <div style={{
                marginTop: '16px',
                padding: '14px',
                borderRadius: '16px',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-primary)',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: 'var(--text-main)' }}>
                    🎁 Bonus de Bienvenue Débloqué !
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Votre compte sera immédiatement crédité de <strong>10 Jetons Troco</strong> et <strong>50 €</strong> pour débuter vos échanges en toute liberté.
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* PIED DE PAGE AVEC BOUTONS PRÉCÉDENT / SUIVANT / TERMINER */}
        <div style={{
          padding: '18px 28px 24px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {step > 1 ? (
            <button
              onClick={() => setStep(prev => prev - 1)}
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '999px',
                padding: '11px 20px',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ArrowLeft size={15} /> Précédent
            </button>
          ) : <span />}

          {step < 4 ? (
            <button
              onClick={() => setStep(prev => prev + 1)}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              className="premium-button"
              style={{
                border: 'none',
                borderRadius: '999px',
                padding: '12px 24px',
                background: (step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)
                  ? 'var(--border-color)'
                  : 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                color: '#FFF',
                fontWeight: '800',
                fontSize: '13px',
                cursor: (step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)
                  ? 'not-allowed'
                  : 'pointer',
                boxShadow: (step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)
                  ? 'none'
                  : 'var(--shadow-accent)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              Continuer <ArrowRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleFinalize}
              disabled={isSubmitting}
              className="premium-button"
              style={{
                border: 'none',
                borderRadius: '999px',
                padding: '12px 28px',
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                color: '#FFF',
                fontWeight: '800',
                fontSize: '14px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: 'var(--shadow-accent)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle size={16} /> Finaliser & Explorer Troco
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
