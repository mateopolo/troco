import React, { useState } from 'react';
import {
  Lock, Download, Trash2, X,
  AlertTriangle, Sliders
} from 'lucide-react';

export default function PrivacyCenterModal({
  isOpen,
  onClose,
  darkMode = false,
  currentUser = null,
  userListings = [],
  userTransactions = [],
  onDeleteAccount = null,
}) {
  const [activeTab, setActiveTab] = useState('data'); // 'data' | 'consents' | 'deletion'
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Consentements
  const [consents, setConsents] = useState(() => {
    try {
      const saved = localStorage.getItem('troco_privacy_settings');
      return saved ? JSON.parse(saved) : {
        necessary: true,
        analytics: true,
        proximityAlerts: true,
        marketingEmails: false,
      };
    } catch (e) {
      return { necessary: true, analytics: true, proximityAlerts: true, marketingEmails: false };
    }
  });

  // Suppression de compte
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  if (!isOpen) return null;

  const handleToggleConsent = (key) => {
    if (key === 'necessary') return; // Toujours actif
    const updated = { ...consents, [key]: !consents[key] };
    setConsents(updated);
    try {
      localStorage.setItem('troco_privacy_settings', JSON.stringify(updated));
    } catch (e) {}
  };

  // Export JSON des données personnelles (Article 20 RGPD)
  const handleExportPersonalData = () => {
    setIsExporting(true);
    setExportSuccess(false);

    setTimeout(() => {
      const exportObject = {
        exportDate: new Date().toISOString(),
        rgpdCompliance: 'Règlement UE 2016/679 (RGPD)',
        platform: 'Troco SAS',
        userProfile: {
          uid: currentUser?.uid,
          name: currentUser?.name,
          username: currentUser?.username,
          email: currentUser?.email,
          phoneNumber: currentUser?.phoneNumber,
          location: currentUser?.location,
          bio: currentUser?.bio,
          skills: currentUser?.skills || [],
          languages: currentUser?.languages || [],
          equipment: currentUser?.equipment || [],
          euroBalance: currentUser?.euroBalance || 0,
          trocoTokens: currentUser?.trocoTokens || 0,
          cguAcceptedAt: currentUser?.cguAcceptedAt || null,
          createdAt: currentUser?.createdAt || null,
        },
        userListings: userListings.filter(l => l.author === currentUser?.name || l.authorUid === currentUser?.uid),
        userTransactions: userTransactions,
        privacyConsents: consents,
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObject, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `troco_mes_donnees_${currentUser?.username?.replace('@','') || 'user'}_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setIsExporting(false);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    }, 800);
  };

  // Confirmation de suppression de compte
  const handleConfirmDeleteAccount = async () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'SUPPRIMER') {
      setDeleteError('Veuillez taper "SUPPRIMER" pour confirmer la suppression définitive.');
      return;
    }
    setDeleteError('');
    setIsDeleting(true);
    if (onDeleteAccount) {
      await onDeleteAccount();
    }
    setIsDeleting(false);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 4000,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      animation: 'fadeIn 0.25s ease-out',
    }}>
      <div style={{
        backgroundColor: darkMode ? '#1E293B' : '#FFFFFF',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: darkMode ? '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(96,165,250,0.15)' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0',
        color: darkMode ? '#F8FAFC' : '#0F172A',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* HEADER */}
        <div style={{
          padding: '20px 24px',
          borderBottom: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #04265A, #3B82F6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
            }}>
              <Lock size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', letterSpacing: '-0.01em' }}>
                Centre de Confidentialité & RGPD
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: darkMode ? '#94A3B8' : '#64748B' }}>
                Contrôlez vos données personnelles et vos préférences de confidentialité
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: darkMode ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
              color: darkMode ? '#94A3B8' : '#64748B',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ONGLETS */}
        <div style={{
          display: 'flex',
          borderBottom: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #F1F5F9',
          padding: '0 24px',
          gap: '8px',
        }}>
          {[
            { id: 'data', label: '📥 Mes Données & Portabilité', icon: Download },
            { id: 'consents', label: '⚙️ Consentements', icon: Sliders },
            { id: 'deletion', label: '🗑️ Droit à l’Oubli', icon: Trash2 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '14px 12px',
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                fontWeight: '800',
                color: activeTab === tab.id
                  ? (tab.id === 'deletion' ? '#EF4444' : (darkMode ? '#60A5FA' : '#04265A'))
                  : (darkMode ? '#94A3B8' : '#64748B'),
                borderBottom: activeTab === tab.id
                  ? (tab.id === 'deletion' ? '3px solid #EF4444' : '3px solid #3B82F6')
                  : '3px solid transparent',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* CORPS */}
        <div style={{ padding: '24px', overflowY: 'auto' }}>

          {/* ONGLET 1 : PORTABILITÉ DES DONNÉES */}
          {activeTab === 'data' && (
            <div>
              <div style={{
                padding: '16px',
                borderRadius: '16px',
                backgroundColor: darkMode ? 'rgba(59,130,246,0.12)' : '#EFF6FF',
                border: darkMode ? '1px solid rgba(59,130,246,0.25)' : '1px solid #DBEAFE',
                marginBottom: '20px',
              }}>
                <div style={{ fontWeight: '800', fontSize: '14px', color: darkMode ? '#93C5FD' : '#1E40AF', marginBottom: '4px' }}>
                  Droit à la portabilité des données (Art. 20 RGPD)
                </div>
                <div style={{ fontSize: '12px', color: darkMode ? '#BFDBFE' : '#3B82F6', lineHeight: 1.6 }}>
                  Conformément à la réglementation européenne, vous pouvez exporter à tout moment l'intégralité des données rattachées à votre compte Troco dans un format structuré et lisible par machine (.json).
                </div>
              </div>

              <div style={{
                backgroundColor: darkMode ? 'rgba(15,23,42,0.5)' : '#F8FAFC',
                borderRadius: '16px',
                padding: '18px',
                border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
                marginBottom: '24px',
              }}>
                <div style={{ fontSize: '13px', fontWeight: '800', marginBottom: '12px' }}>
                  Éléments inclus dans votre archive :
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: darkMode ? '#CBD5E1' : '#64748B', lineHeight: 1.8 }}>
                  <li><strong>Informations de profil :</strong> Nom, nom d'utilisateur, bio, localisation, compétences, langues, date d'inscription.</li>
                  <li><strong>Soldes & Jetons :</strong> Solde Euros (€), solde de Jetons Troco (🪙).</li>
                  <li><strong>Annonces créées :</strong> Titres, descriptions, prix, caution et photos.</li>
                  <li><strong>Historique de facturation :</strong> Toutes les transactions, factures, références #TRK- et moyens de paiement utilisés.</li>
                  <li><strong>Historique des échanges & deals :</strong> Horodatages et évaluations reçues.</li>
                </ul>
              </div>

              <button
                onClick={handleExportPersonalData}
                disabled={isExporting}
                className="premium-button"
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '16px',
                  border: 'none',
                  backgroundColor: '#04265A',
                  color: '#FFF',
                  fontWeight: '800',
                  fontSize: '14px',
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 10px 25px -5px rgba(4,38,90,0.3)',
                }}
              >
                <Download size={18} />
                {isExporting ? 'Génération de l’archive JSON...' : 'Télécharger l’intégralité de mes données (JSON)'}
              </button>

              {exportSuccess && (
                <div style={{
                  marginTop: '12px',
                  padding: '10px',
                  borderRadius: '12px',
                  backgroundColor: '#ECFDF5',
                  color: '#059669',
                  fontSize: '12px',
                  fontWeight: '700',
                  textAlign: 'center',
                }}>
                  ✅ Fichier exporté avec succès dans votre dossier de téléchargements !
                </div>
              )}
            </div>
          )}

          {/* ONGLET 2 : CONSENTEMENTS & PRÉFÉRENCES */}
          {activeTab === 'consents' && (
            <div>
              <div style={{ fontSize: '13px', color: darkMode ? '#CBD5E1' : '#64748B', marginBottom: '18px', lineHeight: 1.6 }}>
                Gérez vos consentements concernant l'utilisation des traceurs, cookies et communications de la plateforme Troco.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* COOKIES NÉCESSAIRES */}
                <div style={{
                  padding: '16px',
                  borderRadius: '16px',
                  backgroundColor: darkMode ? 'rgba(15,23,42,0.5)' : '#F8FAFC',
                  border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '14px' }}>Cookies Techniques & Sécurité</div>
                    <div style={{ fontSize: '12px', color: darkMode ? '#94A3B8' : '#64748B', marginTop: '2px' }}>
                      Indispensables à la session Firebase, au chiffrement et au bon fonctionnement de la plateforme.
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#10B981', backgroundColor: '#ECFDF5', padding: '4px 10px', borderRadius: '999px' }}>
                    Toujours actif
                  </span>
                </div>

                {/* MESURE D'AUDIENCE */}
                <div style={{
                  padding: '16px',
                  borderRadius: '16px',
                  backgroundColor: darkMode ? 'rgba(15,23,42,0.5)' : '#F8FAFC',
                  border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '14px' }}>Statistiques & Performance Anonymes</div>
                    <div style={{ fontSize: '12px', color: darkMode ? '#94A3B8' : '#64748B', marginTop: '2px' }}>
                      Permet d'améliorer la fluidité de l'application sans collecter de données identifiantes.
                    </div>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={consents.analytics}
                      onChange={() => handleToggleConsent('analytics')}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute', inset: 0,
                      backgroundColor: consents.analytics ? '#3B82F6' : (darkMode ? '#334155' : '#CBD5E1'),
                      borderRadius: '24px', transition: '0.2s',
                    }}>
                      <span style={{
                        position: 'absolute', height: '18px', width: '18px', left: consents.analytics ? '23px' : '3px', bottom: '3px',
                        backgroundColor: '#FFF', borderRadius: '50%', transition: '0.2s',
                      }} />
                    </span>
                  </label>
                </div>

                {/* ALERTES DE PROXIMITÉ */}
                <div style={{
                  padding: '16px',
                  borderRadius: '16px',
                  backgroundColor: darkMode ? 'rgba(15,23,42,0.5)' : '#F8FAFC',
                  border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '14px' }}>Alertes d'échanges de Proximité</div>
                    <div style={{ fontSize: '12px', color: darkMode ? '#94A3B8' : '#64748B', marginTop: '2px' }}>
                      Notifications lorsque de nouveaux trocs sont publiés près de chez vous.
                    </div>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={consents.proximityAlerts}
                      onChange={() => handleToggleConsent('proximityAlerts')}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute', inset: 0,
                      backgroundColor: consents.proximityAlerts ? '#3B82F6' : (darkMode ? '#334155' : '#CBD5E1'),
                      borderRadius: '24px', transition: '0.2s',
                    }}>
                      <span style={{
                        position: 'absolute', height: '18px', width: '18px', left: consents.proximityAlerts ? '23px' : '3px', bottom: '3px',
                        backgroundColor: '#FFF', borderRadius: '50%', transition: '0.2s',
                      }} />
                    </span>
                  </label>
                </div>

              </div>
            </div>
          )}

          {/* ONGLET 3 : DROIT À L'OUBLI / SUPPRESSION */}
          {activeTab === 'deletion' && (
            <div>
              <div style={{
                padding: '16px',
                borderRadius: '16px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FEE2E2',
                color: '#991B1B',
                marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '14px', marginBottom: '4px' }}>
                  <AlertTriangle size={18} color="#DC2626" /> Droit à l'effacement définitif (Art. 17 RGPD)
                </div>
                <div style={{ fontSize: '12px', lineHeight: 1.6 }}>
                  La suppression de votre compte est <strong>irréversible</strong>. Elle entraîne l'effacement immédiat de votre profil, de vos annonces actives, de vos jetons restants et la rupture de vos négociations en cours.
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', marginBottom: '8px' }}>
                  Pour confirmer, tapez le mot « SUPPRIMER » ci-dessous :
                </label>
                <input
                  type="text"
                  placeholder="Tapez SUPPRIMER"
                  value={deleteConfirmationText}
                  onChange={(e) => { setDeleteConfirmationText(e.target.value); setDeleteError(''); }}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: deleteError ? '2px solid #EF4444' : (darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #CBD5E1'),
                    backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF',
                    color: darkMode ? '#FFF' : '#0F172A',
                    fontSize: '14px',
                    fontWeight: '700',
                    outline: 'none',
                  }}
                />
                {deleteError && <div style={{ fontSize: '12px', color: '#EF4444', marginTop: '6px', fontWeight: '700' }}>{deleteError}</div>}
              </div>

              <button
                type="button"
                onClick={handleConfirmDeleteAccount}
                disabled={isDeleting || deleteConfirmationText.trim().toUpperCase() !== 'SUPPRIMER'}
                className="premium-button"
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '16px',
                  border: 'none',
                  backgroundColor: deleteConfirmationText.trim().toUpperCase() === 'SUPPRIMER' ? '#EF4444' : (darkMode ? '#334155' : '#CBD5E1'),
                  color: '#FFF',
                  fontWeight: '800',
                  fontSize: '14px',
                  cursor: (isDeleting || deleteConfirmationText.trim().toUpperCase() !== 'SUPPRIMER') ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: deleteConfirmationText.trim().toUpperCase() === 'SUPPRIMER' ? '0 10px 25px -5px rgba(239,68,68,0.4)' : 'none',
                }}
              >
                <Trash2 size={18} />
                {isDeleting ? 'Suppression en cours...' : 'Supprimer définitivement mon compte et mes données'}
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
