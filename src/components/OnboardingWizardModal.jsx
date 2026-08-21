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
  const [step, setStep] = useState(1);
  const fileInputRef = useRef(null);

  // Étape 1 : CGU / RGPD
  const [cguConsent, setCguConsent] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);

  // Étape 2 : Type de compte & Identité
  const [accountType, setAccountType] = useState('particular');
  const [name, setName] = useState(currentUser?.name || 'Nouvel Utilisateur');
  const [username, setUsername] = useState(
    currentUser?.username || '@' + (currentUser?.name || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '')
  );
  const [avatar, setAvatar] = useState(
    currentUser?.avatar || DIVERSE_AVATARS[0]
  );
  const [location, setLocation] = useState(currentUser?.location || 'Paris, France');

  // Étape 3 : Compétences & Matériel (Presets par catégories)
  const [activeSkillCategory, setActiveSkillCategory] = useState(SKILL_CATEGORIES[0].id);
  const [selectedSkills, setSelectedSkills] = useState(currentUser?.skills || []);
  const [customSkillInput, setCustomSkillInput] = useState('');

  const [activeEquipCategory, setActiveEquipCategory] = useState(EQUIPMENT_CATEGORIES[0].id);
  const [selectedEquipment, setSelectedEquipment] = useState(currentUser?.equipment || []);
  const [customEquipInput, setCustomEquipInput] = useState('');

  // Étape 4 : Biographie
  const [bio, setBio] = useState(
    currentUser?.bio || BIO_SUGGESTIONS.particular[0]
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Gestion du téléversement d'avatar
  const handleAvatarUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const size = 300;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, size, size);
            setAvatar(canvas.toDataURL('image/jpeg', 0.85));
          } catch (err) {
            setAvatar(uploadEvent.target.result);
          }
        };
        img.src = uploadEvent.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // Toggle compétence
  const toggleSkill = (skill) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const removeSkill = (skill) => {
    setSelectedSkills(prev => prev.filter(s => s !== skill));
  };

  const addCustomSkill = (e) => {
    if (e) e.preventDefault();
    const val = customSkillInput.trim();
    if (val && !selectedSkills.includes(val)) {
      setSelectedSkills(prev => [...prev, val]);
      setCustomSkillInput('');
    }
  };

  // Toggle matériel
  const toggleEquipment = (item) => {
    setSelectedEquipment(prev =>
      prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item]
    );
  };

  const removeEquipment = (item) => {
    setSelectedEquipment(prev => prev.filter(e => e !== item));
  };

  const addCustomEquipment = (e) => {
    if (e) e.preventDefault();
    const val = customEquipInput.trim();
    if (val && !selectedEquipment.includes(val)) {
      setSelectedEquipment(prev => [...prev, val]);
      setCustomEquipInput('');
    }
  };

  // Soumission finale du parcours d'onboarding
  const handleFinalize = async () => {
    setIsSubmitting(true);
    const completedData = {
      onboardingCompleted: true,
      onboardingCompletedAt: new Date().toISOString(),
      accountType,
      name: name.trim() || 'Utilisateur Troco',
      username: (username.startsWith('@') ? username : '@' + username).toLowerCase().trim(),
      avatar,
      location,
      skills: selectedSkills,
      equipment: selectedEquipment,
      bio: bio.trim(),
      cguAcceptedAt: new Date().toISOString(),
      cguVersion: '2026.1',
      euroBalance: currentUser?.euroBalance ?? 50,
      trocoTokens: currentUser?.trocoTokens ?? 5,
    };

    try {
      await onComplete(completedData);
    } catch (e) {
      console.warn('Erreur finalisation onboarding:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedStep1 = cguConsent && privacyConsent;
  const canProceedStep2 = name.trim().length >= 2 && username.trim().length >= 3;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      zIndex: 100,
    }}>
      <div style={{
        backgroundColor: darkMode ? '#0F172A' : '#FFFFFF',
        color: darkMode ? '#F8FAFC' : '#0F172A',
        borderRadius: '28px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(226,232,240,0.9)',
        boxShadow: '0 30px 90px rgba(0, 0, 0, 0.4)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* BARRE DE PROGRESSION EN HAUT */}
        <div style={{
          padding: '24px 28px 18px',
          borderBottom: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #F1F5F9',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #04265A 0%, #14B8A6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
              }}>
                <Sparkles size={16} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', letterSpacing: '-0.01em' }}>
                  Bienvenue sur Troco
                </h3>
                <span style={{ fontSize: '12px', color: darkMode ? '#94A3B8' : '#64748B' }}>
                  Étape {step} sur 4
                </span>
              </div>
            </div>
            <span style={{
              fontSize: '11px',
              fontWeight: '800',
              padding: '4px 10px',
              borderRadius: '999px',
              backgroundColor: darkMode ? 'rgba(96,165,250,0.2)' : '#EFF6FF',
              color: darkMode ? '#93C5FD' : '#04265A',
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
                    ? (darkMode ? '#60A5FA' : '#04265A')
                    : (darkMode ? 'rgba(255,255,255,0.1)' : '#E2E8F0'),
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
              <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 8px' }}>
                Le Pacte de Confiance Troco (v2026.1)
              </h2>
              <p style={{ fontSize: '13px', color: darkMode ? '#94A3B8' : '#64748B', margin: '0 0 18px', lineHeight: 1.6 }}>
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
                  backgroundColor: darkMode ? 'rgba(30,41,59,0.7)' : '#F8FAFC',
                  border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: darkMode ? '#60A5FA' : '#04265A', marginBottom: '4px' }}>
                    ⏳ 1h = 1 Jeton Troco
                  </div>
                  <div style={{ fontSize: '11px', color: darkMode ? '#CBD5E1' : '#64748B', lineHeight: 1.5 }}>
                    La valeur du temps est universelle. 1 heure de partage équivaut strictement à 1 Jeton de service.
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  borderRadius: '16px',
                  backgroundColor: darkMode ? 'rgba(30,41,59,0.7)' : '#F8FAFC',
                  border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#10B981', marginBottom: '4px' }}>
                    🛡️ Sécurité & Cautions
                  </div>
                  <div style={{ fontSize: '11px', color: darkMode ? '#CBD5E1' : '#64748B', lineHeight: 1.5 }}>
                    Les prêts de matériel sont couverts par des pré-autorisations bancaires virtuelles libérées au retour.
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  borderRadius: '16px',
                  backgroundColor: darkMode ? 'rgba(30,41,59,0.7)' : '#F8FAFC',
                  border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#EF4444', marginBottom: '4px' }}>
                    🚫 Tolérance Zéro Fraude
                  </div>
                  <div style={{ fontSize: '11px', color: darkMode ? '#CBD5E1' : '#64748B', lineHeight: 1.5 }}>
                    Interdiction formelle des faux coupons et arnaques. Tout manquement entraîne un Shadow-Ban irréversible.
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  borderRadius: '16px',
                  backgroundColor: darkMode ? 'rgba(30,41,59,0.7)' : '#F8FAFC',
                  border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#8B5CF6', marginBottom: '4px' }}>
                    🔒 Conformité RGPD Totale
                  </div>
                  <div style={{ fontSize: '11px', color: darkMode ? '#CBD5E1' : '#64748B', lineHeight: 1.5 }}>
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
                backgroundColor: darkMode ? 'rgba(15,23,42,0.9)' : '#EFF6FF',
                border: darkMode ? '1px solid rgba(96,165,250,0.3)' : '1px solid #BFDBFE',
              }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '12px', lineHeight: 1.5 }}>
                  <input
                    type="checkbox"
                    checked={cguConsent}
                    onChange={(e) => setCguConsent(e.target.checked)}
                    style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: '#04265A', cursor: 'pointer' }}
                  />
                  <span>
                    J'ai pris connaissance et j'accepte sans réserve les <strong>Conditions Générales d'Utilisation (CGU v2026.1)</strong> et le barème d'échange 1h = 1 Jeton.
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '12px', lineHeight: 1.5 }}>
                  <input
                    type="checkbox"
                    checked={privacyConsent}
                    onChange={(e) => setPrivacyConsent(e.target.checked)}
                    style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: '#04265A', cursor: 'pointer' }}
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
              <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 6px' }}>
                Quel est votre profil sur Troco ?
              </h2>
              <p style={{ fontSize: '13px', color: darkMode ? '#94A3B8' : '#64748B', margin: '0 0 16px' }}>
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
                          ? (darkMode ? 'rgba(4,38,90,0.6)' : '#EFF6FF')
                          : (darkMode ? 'rgba(30,41,59,0.7)' : '#F8FAFC'),
                        border: isSelected
                          ? (darkMode ? '2px solid #60A5FA' : '2px solid #04265A')
                          : (darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0'),
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '12px',
                          backgroundColor: isSelected ? '#04265A' : (darkMode ? 'rgba(255,255,255,0.1)' : '#E2E8F0'),
                          color: isSelected ? '#FFF' : (darkMode ? '#94A3B8' : '#64748B'),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {t.id === 'particular' && <User size={20} />}
                          {t.id === 'professional' && <Briefcase size={20} />}
                          {t.id === 'company' && <Building2 size={20} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '14px', color: darkMode ? '#FFF' : '#111827' }}>
                            {t.label}
                          </div>
                          <div style={{ fontSize: '11px', color: darkMode ? '#CBD5E1' : '#64748B', marginTop: '2px' }}>
                            {t.desc}
                          </div>
                        </div>
                      </div>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: isSelected ? '5px solid #04265A' : '2px solid #D1D5DB',
                        backgroundColor: isSelected ? '#FFF' : 'transparent',
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
                backgroundColor: darkMode ? 'rgba(30,41,59,0.7)' : '#F8FAFC',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0',
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
                      border: darkMode ? '2px solid #60A5FA' : '2px solid #04265A',
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
                      backgroundColor: '#04265A',
                      color: '#FFF',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(4,38,90,0.3)',
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
                  <div style={{ fontSize: '12px', fontWeight: '800', marginBottom: '6px' }}>
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
                          border: avatar === av ? '3px solid #04265A' : '2px solid transparent',
                          transform: avatar === av ? 'scale(1.1)' : 'scale(1)',
                          transition: 'all 0.2s',
                          boxShadow: avatar === av ? '0 4px 10px rgba(4,38,90,0.3)' : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Nom & Pseudo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '6px' }}>
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
                      border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB',
                      backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF',
                      color: darkMode ? '#FFF' : '#111827',
                      fontSize: '13px',
                      fontWeight: '700',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '6px' }}>
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
                      border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB',
                      backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF',
                      color: darkMode ? '#FFF' : '#111827',
                      fontSize: '13px',
                      fontWeight: '700',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '6px' }}>
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
                      border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB',
                      backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF',
                      color: darkMode ? '#FFF' : '#111827',
                      fontSize: '13px',
                      fontWeight: '700',
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
              <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 6px' }}>
                Ce que vous proposez & ce que vous possédez
              </h2>
              <p style={{ fontSize: '13px', color: darkMode ? '#94A3B8' : '#64748B', margin: '0 0 16px' }}>
                Sélectionnez dans nos listes intelligentes ou ajoutez vos propres spécialités personnalisées.
              </p>

              {/* 1. Compétences & Savoir-faire */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Tag size={15} color="#04265A" /> Mes Compétences ({selectedSkills.length}) :
                  </div>
                </div>

                {/* Bulles sélectionnées actives (Presets + Personnalisées) */}
                {selectedSkills.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px', padding: '10px', backgroundColor: darkMode ? 'rgba(4,38,90,0.2)' : '#EFF6FF', borderRadius: '14px', border: darkMode ? '1px solid rgba(96,165,250,0.2)' : '1px solid #BFDBFE' }}>
                    {selectedSkills.map(skill => (
                      <span
                        key={skill}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 10px',
                          borderRadius: '999px',
                          backgroundColor: '#04265A',
                          color: '#FFFFFF',
                          fontSize: '11px',
                          fontWeight: '700',
                          boxShadow: '0 2px 6px rgba(4,38,90,0.2)'
                        }}
                      >
                        <Check size={11} color="#93C5FD" />
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
                        border: activeSkillCategory === cat.id ? 'none' : (darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0'),
                        backgroundColor: activeSkillCategory === cat.id
                          ? '#04265A'
                          : (darkMode ? 'rgba(30,41,59,0.7)' : '#F8FAFC'),
                        color: activeSkillCategory === cat.id ? '#FFF' : (darkMode ? '#CBD5E1' : '#64748B'),
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
                          border: isSelected ? '1px solid #04265A' : (darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0'),
                          backgroundColor: isSelected
                            ? (darkMode ? 'rgba(4,38,90,0.7)' : '#EFF6FF')
                            : (darkMode ? 'rgba(15,23,42,0.6)' : '#FFF'),
                          color: isSelected ? (darkMode ? '#93C5FD' : '#04265A') : (darkMode ? '#CBD5E1' : '#374151'),
                          fontSize: '11px',
                          fontWeight: isSelected ? '800' : '600',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
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
                      border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB',
                      backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF',
                      color: darkMode ? '#FFF' : '#111827',
                      fontSize: '12px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={addCustomSkill}
                    style={{
                      border: 'none',
                      borderRadius: '12px',
                      padding: '0 14px',
                      backgroundColor: '#04265A',
                      color: '#FFF',
                      fontWeight: '800',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={13} /> Ajouter
                  </button>
                </div>
              </div>

              {/* 2. Matériel & Équipements */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Wrench size={15} color="#D97706" /> Matériel & Équipement disponible ({selectedEquipment.length}) :
                  </div>
                </div>

                {/* Bulles sélectionnées actives (Presets + Personnalisées) */}
                {selectedEquipment.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px', padding: '10px', backgroundColor: darkMode ? 'rgba(217,119,6,0.15)' : '#FFFBEB', borderRadius: '14px', border: darkMode ? '1px solid rgba(245,158,11,0.2)' : '1px solid #FDE68A' }}>
                    {selectedEquipment.map(item => (
                      <span
                        key={item}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 10px',
                          borderRadius: '999px',
                          backgroundColor: '#D97706',
                          color: '#FFFFFF',
                          fontSize: '11px',
                          fontWeight: '700',
                          boxShadow: '0 2px 6px rgba(217,119,6,0.2)'
                        }}
                      >
                        <Check size={11} color="#FEF3C7" />
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
                        border: activeEquipCategory === cat.id ? 'none' : (darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0'),
                        backgroundColor: activeEquipCategory === cat.id
                          ? '#D97706'
                          : (darkMode ? 'rgba(30,41,59,0.7)' : '#F8FAFC'),
                        color: activeEquipCategory === cat.id ? '#FFF' : (darkMode ? '#CBD5E1' : '#64748B'),
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
                          border: isSelected ? '1px solid #D97706' : (darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0'),
                          backgroundColor: isSelected
                            ? (darkMode ? 'rgba(217,119,6,0.25)' : '#FEF3C7')
                            : (darkMode ? 'rgba(15,23,42,0.6)' : '#FFF'),
                          color: isSelected ? (darkMode ? '#FDE68A' : '#92400E') : (darkMode ? '#CBD5E1' : '#374151'),
                          fontSize: '11px',
                          fontWeight: isSelected ? '800' : '600',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
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
                      border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB',
                      backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF',
                      color: darkMode ? '#FFF' : '#111827',
                      fontSize: '12px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={addCustomEquipment}
                    style={{
                      border: 'none',
                      borderRadius: '12px',
                      padding: '0 14px',
                      backgroundColor: '#D97706',
                      color: '#FFF',
                      fontWeight: '800',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
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
              <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 6px' }}>
                Personnalisez votre biographie
              </h2>
              <p style={{ fontSize: '13px', color: darkMode ? '#94A3B8' : '#64748B', margin: '0 0 16px' }}>
                Présentez-vous en quelques mots à la communauté. Choisissez une suggestion rapide ou écrivez votre propre texte.
              </p>

              {/* Suggestions en 1 clic */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', marginBottom: '8px', color: darkMode ? '#93C5FD' : '#04265A' }}>
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
                        border: bio === sug ? (darkMode ? '1.5px solid #60A5FA' : '1.5px solid #04265A') : (darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0'),
                        backgroundColor: bio === sug
                          ? (darkMode ? 'rgba(4,38,90,0.5)' : '#EFF6FF')
                          : (darkMode ? 'rgba(30,41,59,0.7)' : '#F8FAFC'),
                        color: darkMode ? '#F1F5F9' : '#334155',
                        fontSize: '12px',
                        lineHeight: 1.5,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      « {sug} »
                    </button>
                  ))}
                </div>
              </div>

              {/* Zone de texte libre */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '6px' }}>
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
                    border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB',
                    backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF',
                    color: darkMode ? '#FFF' : '#111827',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Cadeau de bienvenue */}
              <div style={{
                marginTop: '16px',
                padding: '14px',
                borderRadius: '16px',
                background: darkMode ? 'rgba(16,185,129,0.15)' : '#ECFDF5',
                border: '1px solid #A7F3D0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: '#065F46' }}>
                    🎁 Bonus de Bienvenue Débloqué !
                  </div>
                  <div style={{ fontSize: '11px', color: '#047857', marginTop: '2px' }}>
                    Votre compte sera immédiatement crédité de <strong>5 Jetons Troco</strong> et <strong>50 €</strong> pour débuter vos échanges en toute liberté.
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* PIED DE PAGE AVEC BOUTONS PRÉCÉDENT / SUIVANT / TERMINER */}
        <div style={{
          padding: '18px 28px 24px',
          borderTop: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {step > 1 ? (
            <button
              onClick={() => setStep(prev => prev - 1)}
              style={{
                border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB',
                borderRadius: '999px',
                padding: '11px 20px',
                backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : '#FFF',
                color: darkMode ? '#FFF' : '#374151',
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
              style={{
                border: 'none',
                borderRadius: '999px',
                padding: '12px 24px',
                backgroundColor: (step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)
                  ? '#94A3B8'
                  : '#04265A',
                color: '#FFF',
                fontWeight: '800',
                fontSize: '13px',
                cursor: (step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)
                  ? 'not-allowed'
                  : 'pointer',
                boxShadow: '0 10px 24px rgba(4,38,90,0.25)',
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
              style={{
                border: 'none',
                borderRadius: '999px',
                padding: '12px 28px',
                background: 'linear-gradient(135deg, #04265A 0%, #10B981 100%)',
                color: '#FFF',
                fontWeight: '800',
                fontSize: '14px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 12px 28px rgba(16,185,129,0.3)',
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
