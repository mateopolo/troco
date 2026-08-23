import React, { useState } from 'react';
import {
  ShieldCheck, Lock, X,
  Scale, Clock, ShieldAlert, Sparkles,
  Check
} from 'lucide-react';

export default function CguModal({
  isOpen,
  onClose = null,
  onAccept = null,
  isMandatory = false, // Si true, l'utilisateur ne peut pas fermer sans accepter
  darkMode = false,
  currentUser = null,
}) {
  const [hasAgreedTerms, setHasAgreedTerms] = useState(false);
  const [hasAgreedPrivacy, setHasAgreedPrivacy] = useState(false);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'full'
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirmAcceptance = async () => {
    if (!hasAgreedTerms || !hasAgreedPrivacy) return;
    setIsSubmitting(true);
    if (onAccept) {
      await onAccept({
        cguVersion: '2026.1',
        acceptedAt: new Date().toISOString(),
      });
    }
    setIsSubmitting(false);
    if (onClose) onClose();
  };

  const pillars = [
    {
      icon: Clock,
      color: '#C67D5B',
      title: '1 Heure = 1 Jeton Troco',
      desc: 'La règle fondamentale de Troco repose sur l’égalité du temps partagé. Une heure d’aide ou de formation équivaut toujours à 1 Jeton Troco, garantissant une économie collaborative juste et décentralisée.',
    },
    {
      icon: ShieldCheck,
      color: '#9CAF88',
      title: 'Sécurité des Prêts & Cautions',
      desc: 'Pour tout prêt de matériel, une empreinte de caution par pré-autorisation bancaire peut être exigée sans débit immédiat, assurant la restitution des équipements en parfait état.',
    },
    {
      icon: ShieldAlert,
      color: '#C2574A',
      title: 'Tolérance Zéro Fraude & Arnaques',
      desc: 'Sont strictement interdits : coupons prépayés (Transcash, Neosurf), demandes de virements externes (Western Union), coordonnées bancaires en clair, contenus illicites et propos haineux.',
    },
    {
      icon: Scale,
      color: '#8A7A6D',
      title: 'Modération & Sanctions',
      desc: 'Tout manquement aux règles de la communauté peut entraîner une suspension temporaire, un Shadow-Ban (masquage automatique des annonces) ou un bannissement définitif du compte.',
    },
    {
      icon: Lock,
      color: '#D97706',
      title: 'Protection RGPD & Données',
      desc: 'Vos données personnelles sont chiffrées (SSL/TLS 256 bits), ne sont jamais revendues à des tiers et vous disposez d’un droit d’accès, de portabilité et de suppression totale à tout moment.',
    },
    {
      icon: Sparkles,
      color: '#A8644A',
      title: 'Courtoisie & Respect Mutuel',
      desc: 'Les échanges, visioconférences et discussions doivent se dérouler dans un cadre bienveillant, ponctuel et respectueux de la vie privée de chacun.',
    },
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 4500,
      backgroundColor: 'rgba(61, 53, 48, 0.72)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      animation: 'fadeIn 0.25s ease-out',
    }}>
      <div style={{
        backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: darkMode ? '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 35px rgba(198,125,91,0.2)' : '0 25px 50px -12px rgba(61, 53, 48, 0.25)',
        border: darkMode ? '1px solid rgba(232, 221, 211, 0.15)' : '1px solid #E8DDD3',
        color: darkMode ? '#FAF7F2' : '#3D3530',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* HEADER MODALE */}
        <div style={{
          padding: '22px 24px',
          borderBottom: darkMode ? '1px solid rgba(232,221,211,0.08)' : '1px solid #E8DDD3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #C67D5B, #A8644A)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              boxShadow: '0 4px 14px rgba(198,125,91,0.35)',
            }}>
              <Scale size={22} />
            </div>
            <div>
              <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '20px', fontWeight: '600', letterSpacing: '-0.01em' }}>
                Conditions Générales & Charte Troco
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>
                Version 2026.1 • Engagement communautaire & conformité légale
              </p>
            </div>
          </div>

          {!isMandatory && onClose && (
            <button
              onClick={onClose}
              style={{
                border: 'none',
                background: darkMode ? 'rgba(232,221,211,0.1)' : '#F5EAE4',
                color: darkMode ? '#FAF7F2' : '#3D3530',
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
          )}
        </div>

        {/* ONGLETS SYNTHÈSE / TEXTE INTÉGRAL */}
        <div style={{
          display: 'flex',
          borderBottom: darkMode ? '1px solid rgba(232,221,211,0.08)' : '1px solid #E8DDD3',
          padding: '0 24px',
        }}>
          <button
            onClick={() => setActiveTab('summary')}
            style={{
              padding: '14px 18px',
              border: 'none',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: '800',
              color: activeTab === 'summary' ? '#C67D5B' : (darkMode ? '#D4C5B5' : '#6B5E54'),
              borderBottom: activeTab === 'summary' ? '3px solid #C67D5B' : '3px solid transparent',
              cursor: 'pointer',
            }}
          >
            📋 Les 6 Piliers Fondamentaux
          </button>
          <button
            onClick={() => setActiveTab('full')}
            style={{
              padding: '14px 18px',
              border: 'none',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: '800',
              color: activeTab === 'full' ? '#C67D5B' : (darkMode ? '#D4C5B5' : '#6B5E54'),
              borderBottom: activeTab === 'full' ? '3px solid #C67D5B' : '3px solid transparent',
              cursor: 'pointer',
            }}
          >
            📜 Texte Juridique Intégral
          </button>
        </div>

        {/* CONTENU */}
        <div style={{ padding: '24px', overflowY: 'auto' }}>

          {activeTab === 'summary' ? (
            <div>
              <div style={{
                padding: '14px 16px',
                borderRadius: '16px',
                backgroundColor: darkMode ? 'rgba(198,125,91,0.15)' : '#F5EAE4',
                border: darkMode ? '1px solid rgba(198,125,91,0.25)' : '1px solid #E8DDD3',
                color: darkMode ? '#FAF7F2' : '#3D3530',
                fontSize: '13px',
                lineHeight: 1.6,
                marginBottom: '18px',
              }}>
                Bienvenue sur <strong>Troco</strong> ! Pour garantir une plateforme sûre, équitable et chaleureuse, nous vous demandons de prendre connaissance et d'approuver les règles de fonctionnement ci-dessous.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {pillars.map((p, idx) => {
                  const Icon = p.icon;
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '16px',
                        backgroundColor: darkMode ? '#1A1715' : '#FFF',
                        border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3',
                        display: 'flex',
                        gap: '14px',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: `${p.color}18`,
                        color: p.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="font-editorial-heading" style={{ fontWeight: '600', fontSize: '15px', marginBottom: '4px', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
                          {idx + 1}. {p.title}
                        </div>
                        <div style={{ fontSize: '12px', color: darkMode ? '#D4C5B5' : '#6B5E54', lineHeight: 1.6 }}>
                          {p.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{
              fontSize: '12px',
              lineHeight: 1.7,
              color: darkMode ? '#D4C5B5' : '#6B5E54',
              padding: '16px',
              borderRadius: '16px',
              backgroundColor: darkMode ? '#1A1715' : '#FFF',
              border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3',
              marginBottom: '20px',
              maxHeight: '340px',
              overflowY: 'auto',
            }}>
              <h4 className="font-editorial-heading" style={{ margin: '0 0 8px', fontSize: '15px', color: darkMode ? '#FAF7F2' : '#3D3530' }}>Article 1 — Objet & Définition de la Plateforme</h4>
              <p>Troco est une plateforme numérique d’intermédiation communautaire permettant l’échange de compétences, le prêt d’équipements entre particuliers et la réalisation d’échanges de services fondés sur l’unité de compte temporelle « Jeton Troco » ou sur des contreparties convenues d'un commun accord.</p>

              <h4 className="font-editorial-heading" style={{ margin: '14px 0 8px', fontSize: '15px', color: darkMode ? '#FAF7F2' : '#3D3530' }}>Article 2 — Compte & Exactitude des Informations</h4>
              <p>L’utilisateur s’engage à fournir des informations exactes lors de son inscription, à maintenir son profil à jour et à ne créer qu’un seul compte par personne physique.</p>

              <h4 className="font-editorial-heading" style={{ margin: '14px 0 8px', fontSize: '15px', color: darkMode ? '#FAF7F2' : '#3D3530' }}>Article 3 — Règle du Troc Temporel & Monétisation</h4>
              <p>Le Jeton Troco représente 1 heure de service ou de formation. Les achats de jetons ou d'options de visibilité (boosts) sont fermes et définitifs, exécutés conformément à l'article L.221-28 du Code de la Consommation.</p>

              <h4 className="font-editorial-heading" style={{ margin: '14px 0 8px', fontSize: '15px', color: darkMode ? '#FAF7F2' : '#3D3530' }}>Article 4 — Cautions & Responsabilité des Prêts</h4>
              <p>Les cautions demandées pour les prêts de biens matériels constituent une garantie financière pré-autorisée. En cas de non-restitution ou de détérioration constatée, le montant peut être débité après instruction contradictoire par l'équipe de médiation Troco.</p>

              <h4 className="font-editorial-heading" style={{ margin: '14px 0 8px', fontSize: '15px', color: darkMode ? '#FAF7F2' : '#3D3530' }}>Article 5 — Modération, Détection et Sanctions</h4>
              <p>Troco utilise des outils d'analyse automatisée pour détecter les tentatives de fraude, escroqueries et contenus répréhensibles. La société se réserve le droit de restreindre la visibilité (Shadow-Ban) ou de suspendre tout compte contrevenant sans préavis.</p>

              <h4 className="font-editorial-heading" style={{ margin: '14px 0 8px', fontSize: '15px', color: darkMode ? '#FAF7F2' : '#3D3530' }}>Article 6 — Données Personnelles (RGPD)</h4>
              <p>Les données sont traitées conformément au Règlement Général sur la Protection des Données (UE 2016/679). Chaque utilisateur dispose d'un droit d'accès, de rectification, de portabilité et d'effacement de ses données via son Centre de Confidentialité.</p>
            </div>
          )}

          {/* CASES À COCHER OBLIGATOIRES */}
          <div style={{
            padding: '16px',
            borderRadius: '16px',
            backgroundColor: darkMode ? '#1A1715' : '#F5F0E8',
            border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginBottom: '20px',
          }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={hasAgreedTerms}
                onChange={(e) => setHasAgreedTerms(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#C67D5B', marginTop: '2px', cursor: 'pointer' }}
              />
              <span style={{ color: darkMode ? '#FAF7F2' : '#3D3530', lineHeight: 1.5 }}>
                J'ai lu et <strong>j'accepte sans réserve les Conditions Générales d'Utilisation</strong> de Troco (Version 2026.1).
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={hasAgreedPrivacy}
                onChange={(e) => setHasAgreedPrivacy(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#C67D5B', marginTop: '2px', cursor: 'pointer' }}
              />
              <span style={{ color: darkMode ? '#FAF7F2' : '#3D3530', lineHeight: 1.5 }}>
                J'accepte la <strong>Politique de Confidentialité et le traitement de mes données</strong> dans le respect du RGPD.
              </span>
            </label>
          </div>

          {/* BOUTON D'ACCEPTATION */}
          <button
            type="button"
            onClick={handleConfirmAcceptance}
            disabled={!hasAgreedTerms || !hasAgreedPrivacy || isSubmitting}
            className="premium-button"
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '16px',
              border: 'none',
              background: (!hasAgreedTerms || !hasAgreedPrivacy) ? (darkMode ? '#3D3530' : '#E8DDD3') : 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)',
              color: '#FFF',
              fontWeight: '800',
              fontSize: '15px',
              cursor: (!hasAgreedTerms || !hasAgreedPrivacy || isSubmitting) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: (hasAgreedTerms && hasAgreedPrivacy) ? '0 10px 25px -5px rgba(198,125,91,0.35)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <Check size={18} strokeWidth={3} />
            Accepter les CGU & Rejoindre Troco
          </button>

        </div>

      </div>
    </div>
  );
}
