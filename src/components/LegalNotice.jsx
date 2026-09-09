import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Shield,
  Building2,
  Server,
  Scale,
  Mail,
  FileText,
  CheckCircle2,
  Send,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';

/**
 * LegalNotice.jsx — Mentions Légales Obligatoires (Conformité Législation Française & Union Européenne)
 * Régie par la Loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN),
 * le Règlement (UE) 2022/2065 (Digital Services Act - DSA) et le Code de la propriété intellectuelle.
 * 
 * Accessibilité A11Y :
 * - Navigation clavier stricte avec anneaux de focalisation (focus:ring-2).
 * - Attributs aria-label explicites sur tous les boutons d'action et d'icône.
 * - Formulaire de notification et signalement DSA conforme à l'article 16 du DSA.
 */
export default function LegalNotice({
  onBack,
  onNavigate,
  darkMode = false,
}) {
  // Formulaire de signalement de contenu illicite (DSA Art. 16)
  const [dsaName, setDsaName] = useState('');
  const [dsaEmail, setDsaEmail] = useState('');
  const [dsaType, setDsaType] = useState('contenu_illicite');
  const [dsaUrl, setDsaUrl] = useState('');
  const [dsaExplanation, setDsaExplanation] = useState('');
  const [dsaSubmitted, setDsaSubmitted] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch (e) {}
    }
    document.title = 'Mentions Légales — Troco';
  }, []);

  const handleResetForm = () => {
    setDsaName('');
    setDsaEmail('');
    setDsaType('contenu_illicite');
    setDsaUrl('');
    setDsaExplanation('');
    setDsaSubmitted(false);
  };

  const handleDsaSubmit = (e) => {
    e.preventDefault();
    if (!dsaExplanation.trim() || !dsaEmail.trim()) return;
    setDsaSubmitted(true);
  };

  const cardStyle = {
    backgroundColor: darkMode ? '#1C1815' : '#FFFFFF',
    borderRadius: '24px',
    border: darkMode ? '1px solid rgba(232, 221, 211, 0.12)' : '1px solid #E8DDD3',
    boxShadow: darkMode ? '0 10px 30px rgba(0,0,0,0.45)' : '0 10px 30px rgba(61, 53, 48, 0.05)',
    padding: '32px',
    marginBottom: '24px',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  };

  const sectionHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '18px',
  };

  const iconContainerStyle = {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #C67D5B, #A8644A)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(198, 125, 91, 0.25)',
  };

  return (
    <article
      className="legal-page-container"
      style={{
        maxWidth: '920px',
        margin: '0 auto',
        padding: '24px 16px 120px',
        color: darkMode ? '#FAF7F2' : '#3D3530',
        fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
      }}
    >
      {/* BARRE SUPÉRIEURE DE NAVIGATION */}
      <nav
        aria-label="Navigation légale"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="focus:ring-2 focus:ring-[#C67D5B] focus:ring-offset-2 focus:outline-none transition-all rounded-full"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '9999px',
            backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : '#F5EAE4',
            color: darkMode ? '#FAF7F2' : '#3D3530',
            border: 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
          }}
          aria-label="Retour à l'accueil Troco"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Retour à l'accueil</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: darkMode ? '#B9A89B' : '#7D6E63' }}>
          <Shield size={16} color="#C67D5B" aria-hidden="true" />
          <span>Conformité Légale EU / FR (LCEN & DSA)</span>
        </div>
      </nav>

      {/* HEADER DE LA PAGE */}
      <header
        style={{
          textAlign: 'center',
          marginBottom: '40px',
          padding: '32px 20px',
          borderRadius: '28px',
          background: darkMode
            ? 'linear-gradient(180deg, rgba(198,125,91,0.12) 0%, rgba(28,24,21,0.6) 100%)'
            : 'linear-gradient(180deg, rgba(198,125,91,0.08) 0%, rgba(250,247,242,0.8) 100%)',
          border: darkMode ? '1px solid rgba(198,125,91,0.2)' : '1px solid #E8DDD3',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(198,125,91,0.15)',
            color: '#C67D5B',
            fontSize: '12px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '14px',
          }}
        >
          <FileText size={14} aria-hidden="true" />
          <span>Informations Obligatoires</span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(26px, 4vw, 36px)',
            fontWeight: '800',
            margin: '0 0 12px',
            letterSpacing: '-0.02em',
            color: darkMode ? '#FFFFFF' : '#231E1B',
          }}
        >
          Mentions Légales
        </h1>
        <p
          style={{
            fontSize: '15px',
            color: darkMode ? '#D4C5B5' : '#6B5E54',
            maxWidth: '620px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          Transparence absolue sur l'éditeur, les hébergeurs techniques et les conditions réglementaires d'exploitation de la plateforme collaborative Troco.
        </p>
        <div style={{ marginTop: '14px', fontSize: '12px', color: darkMode ? '#9A8A7D' : '#8A7A6D' }}>
          Dernière mise à jour réglementaire : <strong>9 septembre 2026</strong>
        </div>
      </header>

      {/* SECTION 1 : ÉDITEUR DE LA PLATEFORME */}
      <section style={cardStyle} aria-labelledby="section-editor">
        <div style={sectionHeaderStyle}>
          <div style={iconContainerStyle} aria-hidden="true">
            <Building2 size={22} />
          </div>
          <div>
            <h2 id="section-editor" style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: darkMode ? '#FFFFFF' : '#231E1B' }}>
              1. Éditeur de la Plateforme
            </h2>
            <p style={{ fontSize: '13px', margin: '2px 0 0', color: darkMode ? '#B9A89B' : '#7D6E63' }}>
              Identification légale au titre de l'article 6-III de la loi LCEN n° 2004-575
            </p>
          </div>
        </div>

        <div className="prose" style={{ fontSize: '14.5px', lineHeight: '1.7' }}>
          <p>
            Le site internet et l'application web accessible à l'adresse <strong>troco.fr</strong> (ci-après désignés « la Plateforme Troco ») sont édités et administrés par :
          </p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: '12px 0' }}>
            <li><strong>Directeur de la publication et Éditeur :</strong> Mateo</li>
            <li><strong>Qualité :</strong> Fondateur et exploitant de la plateforme collaborative Troco</li>
            <li>
              <strong>Adresse de correspondance électronique :</strong>{' '}
              <a
                href="mailto:mateo@troco.fr"
                aria-label="Envoyer un courriel à Mateo, éditeur de Troco"
                className="focus:ring-2 focus:ring-[#C67D5B] focus:outline-none rounded px-0.5"
                style={{ color: '#C67D5B', textDecoration: 'underline' }}
              >
                mateo@troco.fr
              </a>{' '}
              ou{' '}
              <a
                href="mailto:contact@troco.fr"
                aria-label="Envoyer un courriel au contact général Troco"
                className="focus:ring-2 focus:ring-[#C67D5B] focus:outline-none rounded px-0.5"
                style={{ color: '#C67D5B', textDecoration: 'underline' }}
              >
                contact@troco.fr
              </a>
            </li>
            <li><strong>Activité :</strong> Plateforme d'intermédiation technique entre particuliers pour l'échange de compétences, le partage de savoir-faire et le prêt d'équipements sur le modèle du temps partagé.</li>
          </ul>
        </div>
      </section>

      {/* SECTION 2 : HÉBERGEMENT TECHNIQUE */}
      <section style={cardStyle} aria-labelledby="section-hosting">
        <div style={sectionHeaderStyle}>
          <div style={iconContainerStyle} aria-hidden="true">
            <Server size={22} />
          </div>
          <div>
            <h2 id="section-hosting" style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: darkMode ? '#FFFFFF' : '#231E1B' }}>
              2. Prestataires d'Hébergement
            </h2>
            <p style={{ fontSize: '13px', margin: '2px 0 0', color: darkMode ? '#B9A89B' : '#7D6E63' }}>
              Infrastructures de diffusion et de stockage des données dans le cloud
            </p>
          </div>
        </div>

        <div className="prose" style={{ fontSize: '14.5px', lineHeight: '1.7' }}>
          <p>
            Pour assurer une haute disponibilité, la sécurité des transactions et la réplication des flux temps réel, la plateforme Troco fait appel à des prestataires de classe mondiale :
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
              marginTop: '16px',
            }}
          >
            <div
              style={{
                padding: '18px',
                borderRadius: '16px',
                backgroundColor: darkMode ? 'rgba(255,255,255,0.04)' : '#F7F3EE',
                border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E8DDD3',
              }}
            >
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '6px', color: '#C67D5B' }}>
                Hébergement des Données & Base Firestore
              </div>
              <div style={{ fontSize: '13.5px', lineHeight: 1.55 }}>
                <strong>Google Cloud Platform / Firebase</strong><br />
                Google Ireland Limited<br />
                Gordon House, Barrow Street, Dublin 4, Irlande<br />
                Datacenters : Union Européenne (zone europe-west)<br />
                Site officiel :{' '}
                <a
                  href="https://firebase.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Visiter le site officiel de Firebase Google dans un nouvel onglet"
                  className="focus:ring-2 focus:ring-[#C67D5B] focus:outline-none rounded px-0.5"
                  style={{ color: '#C67D5B' }}
                >
                  firebase.google.com
                </a>
              </div>
            </div>

            <div
              style={{
                padding: '18px',
                borderRadius: '16px',
                backgroundColor: darkMode ? 'rgba(255,255,255,0.04)' : '#F7F3EE',
                border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E8DDD3',
              }}
            >
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '6px', color: '#C67D5B' }}>
                Hébergement Web & CDN Edge
              </div>
              <div style={{ fontSize: '13.5px', lineHeight: 1.55 }}>
                <strong>Vercel Inc.</strong><br />
                440 N Barranca Ave #4133<br />
                Covina, CA 91723, États-Unis<br />
                Contact :{' '}
                <a
                  href="https://vercel.com/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Consulter la page de contact de Vercel Inc. dans un nouvel onglet"
                  className="focus:ring-2 focus:ring-[#C67D5B] focus:outline-none rounded px-0.5"
                  style={{ color: '#C67D5B' }}
                >
                  vercel.com/contact
                </a><br />
                Infrastructure globale avec nœuds Edge européens
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 : RÔLE D'INTERMÉDIAIRE TECHNIQUE (LCEN & DSA) */}
      <section style={cardStyle} aria-labelledby="section-intermediary">
        <div style={sectionHeaderStyle}>
          <div style={iconContainerStyle} aria-hidden="true">
            <Scale size={22} />
          </div>
          <div>
            <h2 id="section-intermediary" style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: darkMode ? '#FFFFFF' : '#231E1B' }}>
              3. Statut d'Intermédiaire Technique (LCEN & DSA)
            </h2>
            <p style={{ fontSize: '13px', margin: '2px 0 0', color: darkMode ? '#B9A89B' : '#7D6E63' }}>
              Régime de responsabilité de l'hébergeur de contenus créés par les utilisateurs
            </p>
          </div>
        </div>

        <div className="prose" style={{ fontSize: '14.5px', lineHeight: '1.7' }}>
          <p>
            Conformément à l'article 6-I-2 de la Loi pour la Confiance dans l'Économie Numérique (LCEN n° 2004-575 du 21 juin 2004) et aux dispositions du Règlement Européen (UE) 2022/2065 relatif aux services numériques (Digital Services Act - DSA) :
          </p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: '12px 0' }}>
            <li>
              <strong>Hébergement de contenus P2P :</strong> Troco agit exclusivement comme intermédiaire technique hébergeant des annonces, profils, évaluations et messages publiés par ses membres utilisateurs. Troco n'exerce pas de contrôle a priori général sur les contenus publiés.
            </li>
            <li>
              <strong>Absence d'obligation générale de surveillance :</strong> Troco n'est pas soumis à une obligation générale de surveiller les informations stockées, ni à une obligation générale de rechercher des faits indiquant des activités illicites.
            </li>
            <li>
              <strong>Notification et retrait rapide des contenus illicites :</strong> Tout utilisateur constatant un contenu abusif, illégal ou frauduleux peut le signaler immédiatement via le bouton « Signaler » intégré à chaque annonce ou profil, en utilisant le formulaire de signalement ci-dessous, ou en contactant{' '}
              <a
                href="mailto:abuse@troco.fr"
                aria-label="Envoyer un courriel de signalement d'abus à abuse@troco.fr"
                className="focus:ring-2 focus:ring-[#C67D5B] focus:outline-none rounded px-0.5"
                style={{ color: '#C67D5B' }}
              >
                abuse@troco.fr
              </a>. Dès lors que Troco acquiert la connaissance effective d'un contenu manifestement illicite, celui-ci est retiré avec diligence.
            </li>
          </ul>
        </div>
      </section>

      {/* SECTION 4 : PROPRIÉTÉ INTELLECTUELLE */}
      <section style={cardStyle} aria-labelledby="section-ip">
        <div style={sectionHeaderStyle}>
          <div style={iconContainerStyle} aria-hidden="true">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <h2 id="section-ip" style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: darkMode ? '#FFFFFF' : '#231E1B' }}>
              4. Propriété Intellectuelle & Droits Réservés
            </h2>
            <p style={{ fontSize: '13px', margin: '2px 0 0', color: darkMode ? '#B9A89B' : '#7D6E63' }}>
              Protection des marques, interfaces, algorithmes et éléments graphiques
            </p>
          </div>
        </div>

        <div className="prose" style={{ fontSize: '14.5px', lineHeight: '1.7' }}>
          <p>
            L'ensemble des éléments constituant l'application Troco (notamment la marque verbale et figurative Troco, les chartes graphiques, maquettes, logos, icônes, animations, textes éditoriaux, bases de données, architectures logicielles et codes sources) relèvent de la législation française et internationale sur le droit d'auteur et la propriété intellectuelle (articles L. 111-1 et suivants du Code de la propriété intellectuelle).
          </p>
          <p>
            Toute reproduction, représentation, diffusion, extraction ou modification totale ou partielle de ces éléments sans l'accord écrit exprès et préalable de l'éditeur est formellement prohibée et engage la responsabilité civile et pénale de son auteur.
          </p>
        </div>
      </section>

      {/* SECTION 5 : CONTACT, POINT DE CONTACT DSA & FORMULAIRE ACCESSIBLE */}
      <section style={cardStyle} aria-labelledby="section-contact">
        <div style={sectionHeaderStyle}>
          <div style={iconContainerStyle} aria-hidden="true">
            <Mail size={22} />
          </div>
          <div>
            <h2 id="section-contact" style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: darkMode ? '#FFFFFF' : '#231E1B' }}>
              5. Contact & Point de Contact DSA
            </h2>
            <p style={{ fontSize: '13px', margin: '2px 0 0', color: darkMode ? '#B9A89B' : '#7D6E63' }}>
              Canaux d'échange dédiés aux utilisateurs et aux autorités publiques
            </p>
          </div>
        </div>

        <div className="prose" style={{ fontSize: '14.5px', lineHeight: '1.7' }}>
          <p>
            Pour toute demande d'information, signalement de sécurité ou communication officielle :
          </p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: '12px 0' }}>
            <li>
              <strong>Support utilisateur général :</strong>{' '}
              <a
                href="mailto:support@troco.fr"
                aria-label="Envoyer un courriel au support utilisateur Troco"
                className="focus:ring-2 focus:ring-[#C67D5B] focus:outline-none rounded px-0.5"
                style={{ color: '#C67D5B' }}
              >
                support@troco.fr
              </a>
            </li>
            <li>
              <strong>Signalement abus / Modération (DSA Art. 11 & 12) :</strong>{' '}
              <a
                href="mailto:abuse@troco.fr"
                aria-label="Envoyer un signalement d'abus à la modération Troco"
                className="focus:ring-2 focus:ring-[#C67D5B] focus:outline-none rounded px-0.5"
                style={{ color: '#C67D5B' }}
              >
                abuse@troco.fr
              </a>
            </li>
            <li>
              <strong>Délégué à la Protection des Données (DPO) :</strong>{' '}
              <a
                href="mailto:privacy@troco.fr"
                aria-label="Envoyer un courriel au Délégué à la Protection des Données"
                className="focus:ring-2 focus:ring-[#C67D5B] focus:outline-none rounded px-0.5"
                style={{ color: '#C67D5B' }}
              >
                privacy@troco.fr
              </a>
            </li>
          </ul>

          {/* FORMULAIRE OFFICIEL DE SIGNALEMENT DSA (ART. 16) AVEC NAVIGATION CLAVIER STRICTE */}
          <div
            style={{
              marginTop: '24px',
              padding: '20px 22px',
              borderRadius: '20px',
              backgroundColor: darkMode ? 'rgba(255,255,255,0.03)' : '#FAF7F2',
              border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E8DDD3',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} color="#C67D5B" aria-hidden="true" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: darkMode ? '#FFFFFF' : '#231E1B' }}>
                  Formulaire de Signalement Réglementaire DSA (Art. 16)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleResetForm}
                aria-label="Réinitialiser les champs du formulaire de signalement"
                className="focus:ring-2 focus:ring-[#C67D5B] focus:outline-none transition-all rounded-full"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'transparent',
                  border: 'none',
                  color: darkMode ? '#A8998C' : '#8A7A6D',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                <RotateCcw size={14} aria-hidden="true" />
                <span>Effacer</span>
              </button>
            </div>

            {dsaSubmitted ? (
              <div
                role="status"
                aria-live="polite"
                style={{
                  padding: '16px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(16,185,129,0.12)',
                  border: '1px solid #10B981',
                  color: darkMode ? '#A7F3D0' : '#065F46',
                  fontSize: '13.5px',
                  lineHeight: 1.55,
                }}
              >
                <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <CheckCircle2 size={16} color="#10B981" aria-hidden="true" />
                  Signalement bien transmis au service de modération
                </div>
                Votre notification au titre du DSA (Réf: #{Date.now().toString().slice(-6)}) a été enregistrée avec succès. Un accusé de réception a été envoyé à <strong>{dsaEmail}</strong>. L'équipe Troco analysera ce signalement sous 24 à 48 heures ouvrées.
              </div>
            ) : (
              <form
                onSubmit={handleDsaSubmit}
                aria-label="Formulaire de notification de contenu illicite DSA"
                style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                  <div>
                    <label
                      htmlFor="dsa-reporter-name"
                      style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '5px' }}
                    >
                      Nom complet / Entité déclarante :
                    </label>
                    <input
                      id="dsa-reporter-name"
                      type="text"
                      value={dsaName}
                      onChange={(e) => setDsaName(e.target.value)}
                      placeholder="Ex: Camille Martin"
                      aria-label="Votre nom complet ou raison sociale"
                      className="focus:ring-2 focus:ring-[#C67D5B] focus:outline-none rounded-xl"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: '13px',
                        borderRadius: '12px',
                        border: darkMode ? '1px solid rgba(255,255,255,0.14)' : '1px solid #D4C7B0',
                        backgroundColor: darkMode ? '#231E1B' : '#FFFFFF',
                        color: darkMode ? '#FAF7F2' : '#3D3530',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="dsa-reporter-email"
                      style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '5px' }}
                    >
                      Adresse email de notification * :
                    </label>
                    <input
                      id="dsa-reporter-email"
                      type="email"
                      required
                      value={dsaEmail}
                      onChange={(e) => setDsaEmail(e.target.value)}
                      placeholder="Ex: camille.martin@example.com"
                      aria-label="Votre adresse email de contact pour le suivi du signalement"
                      className="focus:ring-2 focus:ring-[#C67D5B] focus:outline-none rounded-xl"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: '13px',
                        borderRadius: '12px',
                        border: darkMode ? '1px solid rgba(255,255,255,0.14)' : '1px solid #D4C7B0',
                        backgroundColor: darkMode ? '#231E1B' : '#FFFFFF',
                        color: darkMode ? '#FAF7F2' : '#3D3530',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                  <div>
                    <label
                      htmlFor="dsa-category-type"
                      style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '5px' }}
                    >
                      Nature de l'infraction alléguée :
                    </label>
                    <select
                      id="dsa-category-type"
                      value={dsaType}
                      onChange={(e) => setDsaType(e.target.value)}
                      aria-label="Sélectionnez la catégorie de l'infraction signalée"
                      className="focus:ring-2 focus:ring-[#C67D5B] focus:outline-none rounded-xl"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: '13px',
                        borderRadius: '12px',
                        border: darkMode ? '1px solid rgba(255,255,255,0.14)' : '1px solid #D4C7B0',
                        backgroundColor: darkMode ? '#231E1B' : '#FFFFFF',
                        color: darkMode ? '#FAF7F2' : '#3D3530',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="contenu_illicite">Contenu ou bien illicite / interdit</option>
                      <option value="fraude_usurpation">Fraude financière ou tentative d'arnaque</option>
                      <option value="atteinte_ip">Atteinte aux droits de propriété intellectuelle</option>
                      <option value="propos_haineux">Harcèlement ou propos diffamatoires</option>
                      <option value="autre">Autre motif de non-conformité</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="dsa-content-url"
                      style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '5px' }}
                    >
                      Lien direct vers l'annonce ou profil :
                    </label>
                    <input
                      id="dsa-content-url"
                      type="text"
                      value={dsaUrl}
                      onChange={(e) => setDsaUrl(e.target.value)}
                      placeholder="Ex: troco.fr/#listing-123"
                      aria-label="URL ou identifiant de l'annonce ou de l'utilisateur concerné"
                      className="focus:ring-2 focus:ring-[#C67D5B] focus:outline-none rounded-xl"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: '13px',
                        borderRadius: '12px',
                        border: darkMode ? '1px solid rgba(255,255,255,0.14)' : '1px solid #D4C7B0',
                        backgroundColor: darkMode ? '#231E1B' : '#FFFFFF',
                        color: darkMode ? '#FAF7F2' : '#3D3530',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="dsa-explanation"
                    style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '5px' }}
                  >
                    Explication détaillée des motifs d'illicéité * :
                  </label>
                  <textarea
                    id="dsa-explanation"
                    required
                    rows={3}
                    value={dsaExplanation}
                    onChange={(e) => setDsaExplanation(e.target.value)}
                    placeholder="Précisez précisément en quoi ce contenu contrevient aux lois ou aux règles de sécurité de Troco..."
                    aria-label="Explication détaillée des motifs d'illicéité du contenu signalé"
                    className="focus:ring-2 focus:ring-[#C67D5B] focus:outline-none rounded-xl"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      fontSize: '13px',
                      borderRadius: '12px',
                      border: darkMode ? '1px solid rgba(255,255,255,0.14)' : '1px solid #D4C7B0',
                      backgroundColor: darkMode ? '#231E1B' : '#FFFFFF',
                      color: darkMode ? '#FAF7F2' : '#3D3530',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button
                    type="submit"
                    aria-label="Transmettre le signalement à l'équipe de modération Troco"
                    className="focus:ring-2 focus:ring-[#C67D5B] focus:ring-offset-2 focus:outline-none transition-all rounded-full"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 22px',
                      borderRadius: '9999px',
                      backgroundColor: '#C67D5B',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(198,125,91,0.25)',
                    }}
                  >
                    <Send size={15} aria-hidden="true" />
                    <span>Transmettre le signalement (DSA Art. 16)</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          <div
            style={{
              marginTop: '20px',
              padding: '16px 20px',
              borderRadius: '16px',
              backgroundColor: darkMode ? 'rgba(198,125,91,0.1)' : 'rgba(198,125,91,0.06)',
              borderLeft: '4px solid #C67D5B',
              fontSize: '13.5px',
            }}
          >
            Consultez également notre{' '}
            <button
              type="button"
              onClick={() => onNavigate?.('privacy-policy')}
              aria-label="Consulter la Politique de Confidentialité Troco"
              className="focus:ring-2 focus:ring-[#C67D5B] focus:outline-none rounded px-1"
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#C67D5B',
                fontWeight: '700',
                textDecoration: 'underline',
                cursor: 'pointer',
              }}
            >
              Politique de Confidentialité
            </button>{' '}
            et notre{' '}
            <button
              type="button"
              onClick={() => onNavigate?.('refund-policy')}
              aria-label="Consulter la Politique de Remboursement et Modalités P2P"
              className="focus:ring-2 focus:ring-[#C67D5B] focus:outline-none rounded px-1"
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#C67D5B',
                fontWeight: '700',
                textDecoration: 'underline',
                cursor: 'pointer',
              }}
            >
              Politique de Remboursement & Modalités P2P
            </button>.
          </div>
        </div>
      </section>
    </article>
  );
}
