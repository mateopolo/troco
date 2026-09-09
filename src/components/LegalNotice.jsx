import React, { useEffect } from 'react';
import { ArrowLeft, Shield, Building2, Server, Scale, Mail, FileText, CheckCircle2 } from 'lucide-react';

/**
 * LegalNotice.jsx — Mentions Légales Obligatoires (Conformité Législation Française & Union Européenne)
 * Régie par la Loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN),
 * le Règlement (UE) 2022/2065 (Digital Services Act - DSA) et le Code de la propriété intellectuelle.
 */
export default function LegalNotice({
  onBack,
  onNavigate,
  darkMode = false,
}) {
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch (e) {}
    }
    document.title = 'Mentions Légales — Troco';
  }, []);

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
          className="focus:ring-2"
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
            <li><strong>Adresse de correspondance électronique :</strong> <a href="mailto:mateo@troco.fr" style={{ color: '#C67D5B', textDecoration: 'underline' }}>mateo@troco.fr</a> ou <a href="mailto:contact@troco.fr" style={{ color: '#C67D5B', textDecoration: 'underline' }}>contact@troco.fr</a></li>
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
                Site officiel : <a href="https://firebase.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#C67D5B' }}>firebase.google.com</a>
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
                Contact : <a href="https://vercel.com/contact" target="_blank" rel="noopener noreferrer" style={{ color: '#C67D5B' }}>vercel.com/contact</a><br />
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
              <strong>Notification et retrait rapide des contenus illicites :</strong> Tout utilisateur constatant un contenu abusif, illégal ou frauduleux peut le signaler immédiatement via le bouton « Signaler » intégré à chaque annonce ou profil, ou en contactant <a href="mailto:abuse@troco.fr" style={{ color: '#C67D5B' }}>abuse@troco.fr</a>. Dès lors que Troco acquiert la connaissance effective d'un contenu manifestement illicite, celui-ci est retiré avec diligence.
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

      {/* SECTION 5 : CONTACT & RÉCLAMATIONS */}
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
            <li><strong>Support utilisateur général :</strong> <a href="mailto:support@troco.fr" style={{ color: '#C67D5B' }}>support@troco.fr</a></li>
            <li><strong>Signalement abus / Modération (DSA Art. 11 & 12) :</strong> <a href="mailto:abuse@troco.fr" style={{ color: '#C67D5B' }}>abuse@troco.fr</a></li>
            <li><strong>Délégué à la Protection des Données (DPO) :</strong> <a href="mailto:privacy@troco.fr" style={{ color: '#C67D5B' }}>privacy@troco.fr</a></li>
          </ul>

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
