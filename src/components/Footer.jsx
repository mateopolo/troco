import React from 'react';
import { Shield, Lock, Scale, FileText, Heart, Sparkles, Globe, Coins, ExternalLink, HelpCircle } from 'lucide-react';
import TrocoLogoNativeSvg from './common/TrocoLogoNativeSvg';

/**
 * Footer.jsx — Pied de page global institutionnel & conformité légale
 * Fournit les points d'accès obligatoires aux mentions légales, politiques de confidentialité,
 * politique de remboursement et gestion des cookies, dans le respect des directives européennes.
 */
export default function Footer({
  onNavigate = () => {},
  onOpenCgu = () => {},
  onOpenPrivacyCenter = () => {},
  darkMode = false,
  currentLang = 'FR',
}) {
  const currentYear = new Date().getFullYear();

  const linkStyle = {
    color: darkMode ? '#D4C5B5' : '#6B5E54',
    fontSize: '13.5px',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: '4px 0',
    textAlign: 'left',
    fontFamily: 'inherit',
  };

  const handleLinkClick = (e, tabName) => {
    e.preventDefault();
    if (typeof onNavigate === 'function') {
      onNavigate(tabName);
    }
  };

  return (
    <footer
      role="contentinfo"
      aria-label="Informations légales et navigation secondaire"
      style={{
        width: '100%',
        marginTop: '60px',
        paddingTop: '48px',
        paddingBottom: '100px', // Marge pour ne pas être masqué par la barre de navigation mobile fixe
        borderTop: darkMode ? '1px solid rgba(232, 221, 211, 0.1)' : '1px solid #E8DDD3',
        backgroundColor: darkMode ? 'rgba(28, 24, 21, 0.85)' : 'rgba(250, 247, 242, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        color: darkMode ? '#FAF7F2' : '#3D3530',
        transition: 'background-color 0.3s ease, border-color 0.3s ease',
      }}
    >
      <div
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '0 24px',
        }}
      >
        {/* GRILLE PRINCIPALE */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '36px',
            marginBottom: '40px',
          }}
        >
          {/* COLONNE 1 : PRÉSENTATION TROCO & ÉDITEUR */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '10px',
                  backgroundColor: '#C67D5B',
                  color: '#FFF',
                }}
                aria-hidden="true"
              >
                <Coins size={20} />
              </div>
              <span
                style={{
                  fontSize: '22px',
                  fontWeight: '800',
                  letterSpacing: '-0.02em',
                  fontFamily: 'var(--font-editorial, "Cormorant Garamond", Georgia, serif)',
                  color: darkMode ? '#FFFFFF' : '#231E1B',
                }}
              >
                Troco
              </span>
            </div>

            <p
              style={{
                fontSize: '13.5px',
                lineHeight: 1.6,
                color: darkMode ? '#B9A89B' : '#7D6E63',
                margin: '0 0 16px',
              }}
            >
              L'économie collaborative fondée sur le partage de temps, de savoir-faire et l'entraide de proximité. <strong>1 heure partagée = 1 Jeton Troco</strong>.
            </p>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '9999px',
                backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : '#F5EAE4',
                fontSize: '12px',
                color: '#C67D5B',
                fontWeight: '700',
              }}
            >
              <span>Édité par Mateo</span>
              <span aria-hidden="true">•</span>
              <span>Plateforme P2P Éthique</span>
            </div>
          </div>

          {/* COLONNE 2 : CONFORMITÉ & MENTIONS LÉGALES (OBLIGATOIRES) */}
          <div>
            <h3
              style={{
                fontSize: '14px',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '16px',
                color: '#C67D5B',
              }}
            >
              Conformité & Légal
            </h3>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <a
                  href="#legal-notice"
                  onClick={(e) => handleLinkClick(e, 'legal-notice')}
                  style={linkStyle}
                  className="focus:ring-2 hover:text-[#C67D5B]"
                  aria-label="Consulter les Mentions Légales"
                >
                  <FileText size={15} color="#C67D5B" aria-hidden="true" />
                  <span>Mentions Légales (LCEN / DSA)</span>
                </a>
              </li>
              <li>
                <a
                  href="#privacy-policy"
                  onClick={(e) => handleLinkClick(e, 'privacy-policy')}
                  style={linkStyle}
                  className="focus:ring-2 hover:text-[#C67D5B]"
                  aria-label="Consulter la Politique de Confidentialité"
                >
                  <Lock size={15} color="#C67D5B" aria-hidden="true" />
                  <span>Politique de Confidentialité (RGPD)</span>
                </a>
              </li>
              <li>
                <a
                  href="#cookie-policy"
                  onClick={(e) => handleLinkClick(e, 'cookie-policy')}
                  style={linkStyle}
                  className="focus:ring-2 hover:text-[#C67D5B]"
                  aria-label="Consulter la Politique des Cookies"
                >
                  <Shield size={15} color="#C67D5B" aria-hidden="true" />
                  <span>Politique des Cookies & Traceurs</span>
                </a>
              </li>
              <li>
                <a
                  href="#refund-policy"
                  onClick={(e) => handleLinkClick(e, 'refund-policy')}
                  style={linkStyle}
                  className="focus:ring-2 hover:text-[#C67D5B]"
                  aria-label="Consulter la Politique de Remboursement et litiges"
                >
                  <Scale size={15} color="#C67D5B" aria-hidden="true" />
                  <span>Politique de Remboursement & Litiges</span>
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenCgu}
                  style={linkStyle}
                  className="focus:ring-2 hover:text-[#C67D5B]"
                  aria-label="Ouvrir les Conditions Générales d'Utilisation"
                >
                  <Sparkles size={15} color="#C67D5B" aria-hidden="true" />
                  <span>Conditions Générales (CGU 2026.1)</span>
                </button>
              </li>
            </ul>
          </div>

          {/* COLONNE 3 : VOS DONNÉES & TRANSPARENCE */}
          <div>
            <h3
              style={{
                fontSize: '14px',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '16px',
                color: '#C67D5B',
              }}
            >
              Vos Données Personnelles
            </h3>

            <p style={{ fontSize: '13px', color: darkMode ? '#B9A89B' : '#7D6E63', lineHeight: 1.55, margin: '0 0 14px' }}>
              Exercez vos droits RGPD directement depuis la plateforme : exportez vos données en 1 clic ou gérez vos préférences.
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <button
                  type="button"
                  onClick={onOpenPrivacyCenter}
                  style={linkStyle}
                  className="focus:ring-2 hover:text-[#C67D5B]"
                  aria-label="Ouvrir le Centre de Confidentialité et export de données"
                >
                  <Lock size={15} color="#C67D5B" aria-hidden="true" />
                  <span>Centre de Confidentialité & Export JSON</span>
                </button>
              </li>
              <li>
                <a
                  href="#cookie-policy"
                  onClick={(e) => handleLinkClick(e, 'cookie-policy')}
                  style={linkStyle}
                  className="focus:ring-2 hover:text-[#C67D5B]"
                  aria-label="Gérer mes préférences de cookies"
                >
                  <Shield size={15} color="#C67D5B" aria-hidden="true" />
                  <span>Gérer mes préférences de cookies</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@troco.fr"
                  style={linkStyle}
                  className="focus:ring-2 hover:text-[#C67D5B]"
                  aria-label="Contacter le support d'assistance Troco"
                >
                  <HelpCircle size={15} color="#C67D5B" aria-hidden="true" />
                  <span>Assistance & Médiation : support@troco.fr</span>
                </a>
              </li>
            </ul>
          </div>

          {/* COLONNE 4 : ENGAGEMENTS DE SÉCURITÉ & HÉBERGEMENT */}
          <div>
            <h3
              style={{
                fontSize: '14px',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '16px',
                color: '#C67D5B',
              }}
            >
              Garanties & Hébergement
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  padding: '12px',
                  borderRadius: '14px',
                  backgroundColor: darkMode ? 'rgba(255,255,255,0.03)' : '#F7F3EE',
                  border: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E8DDD3',
                  fontSize: '12.5px',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: '700', color: '#7A8F6A', marginBottom: '2px' }}>
                  ✓ Hébergement Souverain UE
                </div>
                Données chiffrées au repos et en transit. Serveurs cloud Google Firebase situés en Union Européenne.
              </div>

              <div
                style={{
                  padding: '12px',
                  borderRadius: '14px',
                  backgroundColor: darkMode ? 'rgba(255,255,255,0.03)' : '#F7F3EE',
                  border: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E8DDD3',
                  fontSize: '12.5px',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: '700', color: '#C67D5B', marginBottom: '2px' }}>
                  ✓ Zéro Revente de Données
                </div>
                Vos coordonnées et contenus restent privés et protégés.
              </div>
            </div>
          </div>
        </div>

        {/* LIGNE DE COPYRIGHT INFÉRIEURE */}
        <div
          style={{
            paddingTop: '24px',
            borderTop: darkMode ? '1px solid rgba(252, 247, 242, 0.08)' : '1px solid #E8DDD3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '12.5px',
            color: darkMode ? '#A8998C' : '#8A7A6D',
          }}
        >
          <div>
            © {currentYear} <strong>Troco</strong>. Fondé et édité par <strong>Mateo</strong>. Tous droits réservés.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span>Conformité Loi LCEN & RGPD</span>
            <span aria-hidden="true">•</span>
            <span>Version 2026.1</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
