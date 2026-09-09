import React, { useEffect } from 'react';
import { ArrowLeft, Lock, Database, Clock, ShieldCheck, UserCheck, Trash2, Download, AlertTriangle, Scale } from 'lucide-react';

/**
 * PrivacyPolicy.jsx — Politique de Confidentialité & Protection des Données Personnelles
 * Strictement conforme au Règlement Général sur la Protection des Données (RGPD - Règlement UE 2016/679)
 * et à la Loi Informatique et Libertés n° 78-17 modifiée.
 */
export default function PrivacyPolicy({
  onBack,
  onNavigate,
  onOpenPrivacyCenter,
  darkMode = false,
}) {
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch (e) {}
    }
    document.title = 'Politique de Confidentialité — Troco';
  }, []);

  const cardStyle = {
    backgroundColor: darkMode ? '#1C1815' : '#FFFFFF',
    borderRadius: '24px',
    border: darkMode ? '1px solid rgba(232, 221, 211, 0.12)' : '1px solid #E8DDD3',
    boxShadow: darkMode ? '0 10px 30px rgba(0,0,0,0.45)' : '0 10px 30px rgba(61, 53, 48, 0.05)',
    padding: '32px',
    marginBottom: '24px',
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
        aria-label="Navigation politique de confidentialité"
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
          <ShieldCheck size={16} color="#C67D5B" aria-hidden="true" />
          <span>Conformité RGPD / CNIL (Règlement UE 2016/679)</span>
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
          <Lock size={14} aria-hidden="true" />
          <span>Protection de vos Données Personnelles</span>
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
          Politique de Confidentialité
        </h1>
        <p
          style={{
            fontSize: '15px',
            color: darkMode ? '#D4C5B5' : '#6B5E54',
            maxWidth: '640px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          Découvrez en toute clarté quelles données sont collectées, pourquoi elles sont traitées, leur durée exacte de conservation sur Firebase et comment exercer vos droits RGPD.
        </p>
        <div style={{ marginTop: '14px', fontSize: '12px', color: darkMode ? '#9A8A7D' : '#8A7A6D' }}>
          Dernière mise à jour réglementaire : <strong>9 septembre 2026</strong>
        </div>
      </header>

      {/* SECTION 1 : RESPONSABLE DE TRAITEMENT */}
      <section style={cardStyle} aria-labelledby="section-controller">
        <div style={sectionHeaderStyle}>
          <div style={iconContainerStyle} aria-hidden="true">
            <UserCheck size={22} />
          </div>
          <div>
            <h2 id="section-controller" style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: darkMode ? '#FFFFFF' : '#231E1B' }}>
              1. Responsable de Traitement & Délégué DPO
            </h2>
            <p style={{ fontSize: '13px', margin: '2px 0 0', color: darkMode ? '#B9A89B' : '#7D6E63' }}>
              Désignation du responsable légal au sens de l'article 4-7 du RGPD
            </p>
          </div>
        </div>

        <div className="prose" style={{ fontSize: '14.5px', lineHeight: '1.7' }}>
          <p>
            Le responsable du traitement des données à caractère personnel collectées sur la plateforme Troco est :
          </p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: '12px 0' }}>
            <li><strong>Responsable du Traitement :</strong> Mateo (Fondateur & Éditeur Troco)</li>
            <li><strong>Courriel dédié à la vie privée & DPO :</strong> <a href="mailto:privacy@troco.fr" style={{ color: '#C67D5B' }}>privacy@troco.fr</a></li>
            <li><strong>Engagement d'éthique :</strong> Vos données personnelles ne sont <strong>JAMAIS vendues, louées ni cédées à des courtiers de données tiers</strong>. Elles sont strictement exploitées pour faire fonctionner le service d'échange P2P.</li>
          </ul>
        </div>
      </section>

      {/* SECTION 2 : DONNÉES STOCKÉES SUR FIREBASE */}
      <section style={cardStyle} aria-labelledby="section-firebase-data">
        <div style={sectionHeaderStyle}>
          <div style={iconContainerStyle} aria-hidden="true">
            <Database size={22} />
          </div>
          <div>
            <h2 id="section-firebase-data" style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: darkMode ? '#FFFFFF' : '#231E1B' }}>
              2. Données Précises Collectées & Stockées sur Google Firebase
            </h2>
            <p style={{ fontSize: '13px', margin: '2px 0 0', color: darkMode ? '#B9A89B' : '#7D6E63' }}>
              Cartographie exhaustive des collections Firestore, Auth et Cloud Storage
            </p>
          </div>
        </div>

        <div className="prose" style={{ fontSize: '14.5px', lineHeight: '1.7' }}>
          <p>
            Troco s'appuie sur la suite cloud sécurisée Google Firebase (localisée au sein de l'Union Européenne, région <code>europe-west</code>). Voici l'inventaire précis des données traitées :
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            {/* Authentification */}
            <div
              style={{
                padding: '18px',
                borderRadius: '16px',
                backgroundColor: darkMode ? 'rgba(255,255,255,0.03)' : '#F7F3EE',
                border: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E8DDD3',
              }}
            >
              <div style={{ fontWeight: '700', fontSize: '15px', color: '#C67D5B', marginBottom: '6px' }}>
                A. Authentification & Sécurité du Compte (Firebase Authentication)
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13.5px' }}>
                <li><strong>Identifiant technique unique (UID) :</strong> Clé anonymisée générée par Firebase.</li>
                <li><strong>Adresse électronique :</strong> Utilisée pour la validation des connexions et notifications de service.</li>
                <li><strong>Numéro de téléphone (optionnel) :</strong> Utilisé pour l'authentification 2FA ou SMS OTP le cas échéant.</li>
                <li><strong>Horodatage des connexions :</strong> Date de création et dernier accès à la plateforme.</li>
              </ul>
            </div>

            {/* Profil Utilisateur */}
            <div
              style={{
                padding: '18px',
                borderRadius: '16px',
                backgroundColor: darkMode ? 'rgba(255,255,255,0.03)' : '#F7F3EE',
                border: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E8DDD3',
              }}
            >
              <div style={{ fontWeight: '700', fontSize: '15px', color: '#C67D5B', marginBottom: '6px' }}>
                B. Profil Public & Compétences (Collection Firestore <code>users</code>)
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13.5px' }}>
                <li><strong>Nom d'affichage et Pseudonyme (@username) :</strong> Renseignés librement par l'utilisateur.</li>
                <li><strong>Photo d'avatar & Portfolio :</strong> Hébergées sur Firebase Cloud Storage.</li>
                <li><strong>Biographie & Compétences partagées :</strong> Tags et descriptions de savoir-faire.</li>
                <li><strong>Localisation approximative :</strong> Nom de commune ou zone floutée pour préserver le domicile privé.</li>
                <li><strong>Solde de Jetons Troco & Historique d'échanges :</strong> Décompte des heures partagées.</li>
              </ul>
            </div>

            {/* Annonces & Deals */}
            <div
              style={{
                padding: '18px',
                borderRadius: '16px',
                backgroundColor: darkMode ? 'rgba(255,255,255,0.03)' : '#F7F3EE',
                border: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E8DDD3',
              }}
            >
              <div style={{ fontWeight: '700', fontSize: '15px', color: '#C67D5B', marginBottom: '6px' }}>
                C. Annonces & Transactions P2P (Collections <code>listings</code> & <code>transactions</code>)
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13.5px' }}>
                <li><strong>Contenu des annonces :</strong> Titres, descriptions, catégories, photos de matériels/projets.</li>
                <li><strong>Transactions d'heures :</strong> Émetteur, destinataire, nombre de jetons engagés, statut du séquestre.</li>
                <li><strong>Évaluations & Commentaires :</strong> Avis laissés à l'issue d'un échange réel conclu.</li>
              </ul>
            </div>

            {/* Messagerie & Notes Vocales */}
            <div
              style={{
                padding: '18px',
                borderRadius: '16px',
                backgroundColor: darkMode ? 'rgba(255,255,255,0.03)' : '#F7F3EE',
                border: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E8DDD3',
              }}
            >
              <div style={{ fontWeight: '700', fontSize: '15px', color: '#C67D5B', marginBottom: '6px' }}>
                D. Messagerie Privée & Médias (Collections <code>chats</code>, <code>messages</code> & Cloud Storage)
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13.5px' }}>
                <li><strong>Messages texte et fichiers échangés :</strong> Chiffrés en transit (TLS 1.3).</li>
                <li><strong>Notes vocales :</strong> Enregistrements audio au format standard (AAC/MP4/WebM) stockés dans Firebase Storage.</li>
                <li><strong>Transcriptions textuelles STT :</strong> Transcriptions automatiques générées à la volée pour l'accessibilité.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 : DURÉES DE CONSERVATION */}
      <section style={cardStyle} aria-labelledby="section-retention">
        <div style={sectionHeaderStyle}>
          <div style={iconContainerStyle} aria-hidden="true">
            <Clock size={22} />
          </div>
          <div>
            <h2 id="section-retention" style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: darkMode ? '#FFFFFF' : '#231E1B' }}>
              3. Durée de Conservation des Données
            </h2>
            <p style={{ fontSize: '13px', margin: '2px 0 0', color: darkMode ? '#B9A89B' : '#7D6E63' }}>
              Principe de minimisation et limitation de la conservation (Art. 5-1-e du RGPD)
            </p>
          </div>
        </div>

        <div className="prose" style={{ fontSize: '14.5px', lineHeight: '1.7' }}>
          <p>
            Les données sont conservées pour une durée strictement proportionnée aux finalités pour lesquelles elles ont été collectées :
          </p>

          <div style={{ overflowX: 'auto', margin: '18px 0' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13.5px',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr style={{ borderBottom: darkMode ? '2px solid rgba(255,255,255,0.1)' : '2px solid #E8DDD3' }}>
                  <th style={{ padding: '10px 14px', color: '#C67D5B' }}>Catégorie de Données</th>
                  <th style={{ padding: '10px 14px', color: '#C67D5B' }}>Durée de Conservation Active</th>
                  <th style={{ padding: '10px 14px', color: '#C67D5B' }}>Sort à l'échéance</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E8DDD3' }}>
                  <td style={{ padding: '10px 14px' }}><strong>Compte Utilisateur actif</strong></td>
                  <td style={{ padding: '10px 14px' }}>Toute la durée d'utilisation du service</td>
                  <td style={{ padding: '10px 14px' }}>Supprimé sur demande ou après inactivité</td>
                </tr>
                <tr style={{ borderBottom: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E8DDD3' }}>
                  <td style={{ padding: '10px 14px' }}><strong>Compte inactif sans connexion</strong></td>
                  <td style={{ padding: '10px 14px' }}>24 mois (avec préavis de 30 jours par e-mail)</td>
                  <td style={{ padding: '10px 14px' }}>Suppression irréversible ou anonymisation</td>
                </tr>
                <tr style={{ borderBottom: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E8DDD3' }}>
                  <td style={{ padding: '10px 14px' }}><strong>Logs techniques de connexion (LCEN)</strong></td>
                  <td style={{ padding: '10px 14px' }}>12 mois (obligation légale française)</td>
                  <td style={{ padding: '10px 14px' }}>Purge automatique des serveurs</td>
                </tr>
                <tr style={{ borderBottom: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E8DDD3' }}>
                  <td style={{ padding: '10px 14px' }}><strong>Factures & transactions payantes (€)</strong></td>
                  <td style={{ padding: '10px 14px' }}>10 ans (Code de commerce art. L. 123-22)</td>
                  <td style={{ padding: '10px 14px' }}>Archivage fiscal intermédiaire sécurisé</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 14px' }}><strong>Consentement traceurs & cookies</strong></td>
                  <td style={{ padding: '10px 14px' }}>6 mois maximum (Recommandation CNIL)</td>
                  <td style={{ padding: '10px 14px' }}>Réinterrogation du consentement</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 4 : BASES LÉGALES DU TRAITEMENT */}
      <section style={cardStyle} aria-labelledby="section-legal-bases">
        <div style={sectionHeaderStyle}>
          <div style={iconContainerStyle} aria-hidden="true">
            <Scale size={22} />
          </div>
          <div>
            <h2 id="section-legal-bases" style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: darkMode ? '#FFFFFF' : '#231E1B' }}>
              4. Bases Légales du Traitement (Article 6 du RGPD)
            </h2>
            <p style={{ fontSize: '13px', margin: '2px 0 0', color: darkMode ? '#B9A89B' : '#7D6E63' }}>
              Justification juridique de chaque traitement effectué
            </p>
          </div>
        </div>

        <div className="prose" style={{ fontSize: '14.5px', lineHeight: '1.7' }}>
          <p>
            Chaque collecte de données repose sur un fondement juridique explicite :
          </p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: '12px 0' }}>
            <li><strong>Exécution d'un contrat (Art. 6-1-b) :</strong> Création de votre compte, diffusion de vos annonces, gestion des transactions en jetons et mise en relation par messagerie.</li>
            <li><strong>Consentement exprès (Art. 6-1-a) :</strong> Dépôt de cookies optionnels de mesure d'audience, activation des notifications push et géolocalisation de proximité.</li>
            <li><strong>Obligation légale (Art. 6-1-c) :</strong> Conservation des adresses IP et logs de connexion imposée par la LCEN et conservation des pièces de facturation.</li>
            <li><strong>Intérêt légitime (Art. 6-1-f) :</strong> Prévention de la fraude, détection des comptes suspects, modération et garantie de la sécurité des infrastructures.</li>
          </ul>
        </div>
      </section>

      {/* SECTION 5 : VOS DROITS ET EXERCICE (CNIL / RGPD) */}
      <section style={cardStyle} aria-labelledby="section-user-rights">
        <div style={sectionHeaderStyle}>
          <div style={iconContainerStyle} aria-hidden="true">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 id="section-user-rights" style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: darkMode ? '#FFFFFF' : '#231E1B' }}>
              5. Vos Droits RGPD & Outils d'Autonomie Intégrés
            </h2>
            <p style={{ fontSize: '13px', margin: '2px 0 0', color: darkMode ? '#B9A89B' : '#7D6E63' }}>
              Articles 15 à 22 du Règlement Général sur la Protection des Données
            </p>
          </div>
        </div>

        <div className="prose" style={{ fontSize: '14.5px', lineHeight: '1.7' }}>
          <p>
            Vous disposez des droits suivants sur vos données personnelles :
          </p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: '12px 0' }}>
            <li><strong>Droit d'accès et de portabilité (Art. 15 & 20) :</strong> Téléchargez l'intégralité de vos données dans un format structuré, couramment utilisé et lisible par machine (JSON).</li>
            <li><strong>Droit de rectification (Art. 16) :</strong> Mettez à jour vos informations en modifiant directement votre profil dans l'application.</li>
            <li><strong>Droit à l'effacement / Droit à l'oubli (Art. 17) :</strong> Supprimez votre compte et toutes les données associées de façon irréversible.</li>
            <li><strong>Droit d'opposition et de limitation (Art. 18 & 21) :</strong> Refusez tout traitement non strictement nécessaire.</li>
          </ul>

          {/* BOUTONS D'ACTION DIRECTE */}
          <div
            style={{
              marginTop: '24px',
              padding: '24px',
              borderRadius: '20px',
              backgroundColor: darkMode ? 'rgba(198,125,91,0.12)' : 'rgba(198,125,91,0.08)',
              border: '1px solid rgba(198,125,91,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#C67D5B' }}>
              Accéder directement à votre Centre de Confidentialité Troco
            </div>
            <p style={{ margin: 0, fontSize: '13.5px' }}>
              Vous pouvez exporter vos données personnelles en 1 clic ou demander la suppression immédiate de votre compte :
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {typeof onOpenPrivacyCenter === 'function' && (
                <button
                  type="button"
                  onClick={onOpenPrivacyCenter}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 22px',
                    borderRadius: '9999px',
                    backgroundColor: '#C67D5B',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(198,125,91,0.3)',
                  }}
                >
                  <Lock size={16} />
                  <span>Ouvrir le Centre de Confidentialité</span>
                </button>
              )}
              <a
                href="mailto:privacy@troco.fr?subject=Demande%20Exercice%20Droits%20RGPD"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 22px',
                  borderRadius: '9999px',
                  backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                  color: darkMode ? '#FAF7F2' : '#3D3530',
                  border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #E8DDD3',
                  fontSize: '14px',
                  fontWeight: '700',
                  textDecoration: 'none',
                }}
              >
                Contacter le DPO par email
              </a>
            </div>
          </div>

          <div style={{ marginTop: '20px', fontSize: '13px', color: darkMode ? '#A8998C' : '#7D6E63' }}>
            <strong>Réclamation auprès de l'autorité de contrôle :</strong> Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous avez le droit d'adresser une réclamation auprès de la <strong>CNIL</strong> (Commission Nationale de l'Informatique et des Libertés — 3 Place de Fontenoy, 75007 Paris — <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" style={{ color: '#C67D5B' }}>www.cnil.fr</a>).
          </div>
        </div>
      </section>
    </article>
  );
}
