import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Camera, Upload, CheckCircle2,
  Sparkles, X, ChevronRight, RefreshCw, Lock
} from 'lucide-react';

export default function KycModal({ isOpen, onClose, onComplete, profile, darkMode }) {
  const [step, setStep] = useState(1); // 1: Document, 2: Selfie, 3: Processing & Success
  const [docType, setDocType] = useState('cni'); // 'cni' | 'passport' | 'license'
  const [, setDocFile] = useState(null);
  const [docPreview, setDocPreview] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef(null);
  const selfieInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset state on close
      setStep(1);
      setDocFile(null);
      setDocPreview(null);
      setSelfiePreview(null);
      setIsScanning(false);
      setScanProgress(0);
      setIsSuccess(false);
    }
  }, [isOpen]);

  const handleDocUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocFile(file);
      const reader = new FileReader();
      reader.onload = () => setDocPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSelfieUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelfiePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSimulateSelfie = () => {
    // If user doesn't upload a real file, we use their profile avatar or a sample selfie
    const sampleSelfie = profile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
    setSelfiePreview(sampleSelfie);
  };

  const startVerificationProcess = () => {
    setStep(3);
    setIsScanning(true);
    setScanProgress(15);

    const timer1 = setTimeout(() => setScanProgress(45), 600);
    const timer2 = setTimeout(() => setScanProgress(78), 1200);
    const timer3 = setTimeout(() => {
      setScanProgress(100);
      setIsScanning(false);
      setIsSuccess(true);
    }, 1800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  };

  const handleFinalize = () => {
    if (onComplete) {
      onComplete();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: darkMode ? '#1E293B' : '#FFFFFF',
          color: darkMode ? '#F8FAFC' : '#0F172A',
          borderRadius: '28px',
          maxWidth: '520px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
          border: darkMode ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(226, 232, 240, 0.9)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* EN-TÊTE MODALE */}
        <div style={{
          padding: '24px 24px 16px',
          borderBottom: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(16,185,129,0.35)'
            }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: darkMode ? '#FFF' : '#0F172A' }}>
                Vérification d'Identité (KYC)
              </h3>
              <span style={{ fontSize: '12px', color: darkMode ? '#94A3B8' : '#64748B', fontWeight: '500' }}>
                Échanges 100% sécurisés & Badge Vérifié ✅
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
              color: darkMode ? '#CBD5E1' : '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ÉTAPES (STEPPERS) */}
        <div style={{
          display: 'flex',
          padding: '12px 24px',
          backgroundColor: darkMode ? 'rgba(15,23,42,0.4)' : '#F8FAFC',
          gap: '8px',
          borderBottom: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid #F1F5F9'
        }}>
          {[
            { num: 1, label: 'Pièce d’identité' },
            { num: 2, label: 'Selfie contrôle' },
            { num: 3, label: 'Validation' }
          ].map(s => {
            const isActive = step === s.num;
            const isDone = step > s.num || (s.num === 3 && isSuccess);
            return (
              <div
                key={s.num}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: isActive || isDone ? 1 : 0.4
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: isDone ? '#10B981' : (isActive ? '#04265A' : (darkMode ? '#334155' : '#CBD5E1')),
                  color: '#FFF',
                  fontSize: '11px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {isDone ? '✓' : s.num}
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: isActive ? '800' : '600',
                  color: isActive ? (darkMode ? '#60A5FA' : '#04265A') : (darkMode ? '#94A3B8' : '#64748B'),
                  whiteSpace: 'nowrap'
                }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* CORPS DE LA MODALE */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* ÉTAPE 1 : CHOIX & UPLOAD DU DOCUMENT */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '800', color: darkMode ? '#FFF' : '#111827', display: 'block', marginBottom: '8px' }}>
                  1. Sélectionne ton type de pièce d'identité
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { id: 'cni', label: 'Carte d\'identité', icon: '🪪' },
                    { id: 'passport', label: 'Passeport', icon: '🛂' },
                    { id: 'license', label: 'Permis', icon: '🚗' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDocType(item.id)}
                      style={{
                        padding: '12px 8px',
                        borderRadius: '16px',
                        border: docType === item.id
                          ? (darkMode ? '2px solid #60A5FA' : '2px solid #04265A')
                          : (darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0'),
                        backgroundColor: docType === item.id
                          ? (darkMode ? 'rgba(4,38,90,0.5)' : '#EFF6FF')
                          : (darkMode ? 'rgba(15,23,42,0.4)' : '#FFF'),
                        color: docType === item.id
                          ? (darkMode ? '#93C5FD' : '#04265A')
                          : (darkMode ? '#CBD5E1' : '#475569'),
                        cursor: 'pointer',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>{item.icon}</span>
                      <span style={{ fontSize: '12px', fontWeight: '700' }}>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ZONE D'UPLOAD / PHOTO */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: '800', color: darkMode ? '#FFF' : '#111827', display: 'block', marginBottom: '8px' }}>
                  2. Photo nette du recto de ta pièce
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleDocUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />

                {docPreview ? (
                  <div style={{
                    position: 'relative',
                    borderRadius: '18px',
                    overflow: 'hidden',
                    border: darkMode ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid #CBD5E1',
                    maxHeight: '180px'
                  }}>
                    <img
                      src={docPreview}
                      alt="Document preview"
                      style={{ width: '100%', height: '180px', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        padding: '6px 12px',
                        borderRadius: '999px',
                        border: 'none',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        color: '#FFF',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <RefreshCw size={12} /> Changer la photo
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: darkMode ? '2px dashed rgba(255,255,255,0.2)' : '2px dashed #CBD5E1',
                      borderRadius: '18px',
                      padding: '30px 20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      backgroundColor: darkMode ? 'rgba(15,23,42,0.3)' : '#F8FAFC',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: darkMode ? 'rgba(4,38,90,0.5)' : '#EFF6FF',
                      color: darkMode ? '#93C5FD' : '#04265A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Upload size={22} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: darkMode ? '#FFF' : '#111827' }}>
                      Clique pour importer ta pièce d'identité
                    </span>
                    <span style={{ fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B' }}>
                      JPG, PNG ou PDF lisible (max 10 Mo)
                    </span>
                  </div>
                )}
              </div>

              {/* RASSURANCE RGPD */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '12px',
                backgroundColor: darkMode ? 'rgba(16,185,129,0.1)' : '#ECFDF5',
                color: darkMode ? '#6EE7B7' : '#065F46',
                fontSize: '11px',
                fontWeight: '600'
              }}>
                <Lock size={14} flexShrink={0} />
                <span>Tes documents sont chiffrés de bout en bout et protégés conformément au RGPD.</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  disabled={!docPreview}
                  onClick={() => setStep(2)}
                  className="premium-button"
                  style={{
                    padding: '12px 24px',
                    borderRadius: '14px',
                    border: 'none',
                    backgroundColor: docPreview ? '#04265A' : (darkMode ? '#334155' : '#CBD5E1'),
                    color: '#FFF',
                    fontWeight: '800',
                    fontSize: '13px',
                    cursor: docPreview ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  Continuer vers le Selfie <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 : SELFIE DE CONTRÔLE */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '800', color: darkMode ? '#FFF' : '#111827' }}>
                  Selfie de vérification en direct
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: darkMode ? '#94A3B8' : '#64748B', lineHeight: 1.5 }}>
                  Positionne ton visage dans le cadre pour prouver que tu es bien le titulaire du document.
                </p>
              </div>

              <input
                type="file"
                ref={selfieInputRef}
                onChange={handleSelfieUpload}
                accept="image/*"
                capture="user"
                style={{ display: 'none' }}
              />

              <div style={{
                position: 'relative',
                borderRadius: '24px',
                height: '240px',
                backgroundColor: '#0F172A',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: darkMode ? '2px solid rgba(255,255,255,0.2)' : '2px solid #04265A'
              }}>
                {selfiePreview ? (
                  <>
                    <img
                      src={selfiePreview}
                      alt="Selfie preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {/* CADRE BIOMÉTRIQUE VERT */}
                    <div style={{
                      position: 'absolute',
                      width: '150px',
                      height: '190px',
                      borderRadius: '999px',
                      border: '3px solid #10B981',
                      boxShadow: '0 0 20px rgba(16,185,129,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        position: 'absolute',
                        bottom: '-12px',
                        backgroundColor: '#10B981',
                        color: '#FFF',
                        padding: '2px 10px',
                        borderRadius: '999px',
                        fontSize: '10px',
                        fontWeight: '800'
                      }}>
                        VISAGE ALIGNÉ ✅
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    color: '#FFF',
                    padding: '20px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      width: '140px',
                      height: '170px',
                      borderRadius: '999px',
                      border: '2px dashed #38BDF8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(56,189,248,0.05)'
                    }}>
                      <Camera size={36} color="#38BDF8" />
                    </div>
                    <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                      Prends un selfie ou utilise la caméra
                    </span>
                  </div>
                )}
              </div>

              {/* BOUTONS PRISE DE PHOTO */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => selfieInputRef.current?.click()}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '14px',
                    border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #CBD5E1',
                    backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                    color: darkMode ? '#FFF' : '#111827',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Camera size={16} /> Prendre un selfie
                </button>
                <button
                  type="button"
                  onClick={handleSimulateSelfie}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '14px',
                    border: 'none',
                    backgroundColor: darkMode ? 'rgba(4,38,90,0.6)' : '#EFF6FF',
                    color: darkMode ? '#93C5FD' : '#04265A',
                    fontWeight: '800',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  ✨ Auto-capture
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: darkMode ? '#94A3B8' : '#64748B',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Retour
                </button>
                <button
                  type="button"
                  disabled={!selfiePreview}
                  onClick={startVerificationProcess}
                  className="premium-button"
                  style={{
                    padding: '12px 24px',
                    borderRadius: '14px',
                    border: 'none',
                    backgroundColor: selfiePreview ? '#10B981' : (darkMode ? '#334155' : '#CBD5E1'),
                    color: '#FFF',
                    fontWeight: '800',
                    fontSize: '13px',
                    cursor: selfiePreview ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: selfiePreview ? '0 4px 14px rgba(16,185,129,0.3)' : 'none'
                  }}
                >
                  Lancer l'analyse biométrique <Sparkles size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ÉTAPE 3 : ANALYSE & RÉSULTAT */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px', padding: '10px 0' }}>
              {isScanning ? (
                <>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    border: '4px solid #38BDF8',
                    borderTopColor: 'transparent',
                    animation: 'spin 1s linear infinite',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Sparkles size={32} color="#38BDF8" />
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '800', color: darkMode ? '#FFF' : '#111827' }}>
                      Analyse de conformité en cours...
                    </h4>
                    <p style={{ margin: 0, fontSize: '13px', color: darkMode ? '#94A3B8' : '#64748B' }}>
                      Vérification holographique et matching biométrique instantané
                    </p>
                  </div>

                  {/* BARRE DE PROGRESSION */}
                  <div style={{ width: '100%', height: '8px', borderRadius: '999px', backgroundColor: darkMode ? '#334155' : '#E2E8F0', overflow: 'hidden' }}>
                    <div style={{
                      width: `${scanProgress}%`,
                      height: '100%',
                      borderRadius: '999px',
                      background: 'linear-gradient(90deg, #38BDF8 0%, #10B981 100%)',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>
                    <div style={{ color: scanProgress >= 30 ? '#10B981' : '#94A3B8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {scanProgress >= 30 ? '✓' : '•'} Détection des sécurités du document ({docType.toUpperCase()})
                    </div>
                    <div style={{ color: scanProgress >= 70 ? '#10B981' : '#94A3B8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {scanProgress >= 70 ? '✓' : '•'} Correspondance faciale et test de vivacité (Liveness)
                    </div>
                    <div style={{ color: scanProgress >= 100 ? '#10B981' : '#94A3B8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {scanProgress >= 100 ? '✓' : '•'} Attribution du badge Officiel Troco
                    </div>
                  </div>
                </>
              ) : isSuccess ? (
                <>
                  <div style={{
                    width: '76px',
                    height: '76px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 25px rgba(16,185,129,0.4)',
                    animation: 'scaleIn 0.3s ease-out'
                  }}>
                    <CheckCircle2 size={44} />
                  </div>

                  <div>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: darkMode ? 'rgba(16,185,129,0.2)' : '#D1FAE5',
                      color: '#10B981',
                      padding: '4px 12px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: '800',
                      marginBottom: '8px'
                    }}>
                      <ShieldCheck size={14} /> IDENTITÉ 100% VÉRIFIÉE
                    </span>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: '900', color: darkMode ? '#FFF' : '#111827' }}>
                      Félicitations {profile?.name || ''} !
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: darkMode ? '#CBD5E1' : '#475569', lineHeight: 1.6 }}>
                      Ton profil dispose désormais du badge officiel <strong>Certifié Vérifié ✅</strong>. Tes annonces et propositions inspirent une confiance maximale dans la communauté.
                    </p>
                  </div>

                  <div style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '16px',
                    backgroundColor: darkMode ? 'rgba(4,38,90,0.4)' : '#EFF6FF',
                    border: darkMode ? '1px solid rgba(96,165,250,0.3)' : '1px solid #BFDBFE',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    textAlign: 'left'
                  }}>
                    <img
                      src={profile?.avatar || selfiePreview}
                      alt="avatar"
                      style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #10B981' }}
                    />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: darkMode ? '#FFF' : '#04265A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {profile?.name}
                        <span style={{ fontSize: '10px', backgroundColor: '#10B981', color: '#FFF', padding: '1px 6px', borderRadius: '999px' }}>
                          ✓ Vérifié
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: darkMode ? '#93C5FD' : '#64748B' }}>
                        Document validé le {new Date().toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleFinalize}
                    className="premium-button"
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '16px',
                      border: 'none',
                      backgroundColor: '#10B981',
                      color: '#FFF',
                      fontWeight: '800',
                      fontSize: '14px',
                      cursor: 'pointer',
                      boxShadow: '0 8px 20px rgba(16,185,129,0.35)',
                      marginTop: '8px'
                    }}
                  >
                    Activer mon badge sur mon profil
                  </button>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
