import React, { useEffect } from 'react';
import { ArrowLeft, Cookie, Shield, Check, X, Settings, RefreshCw, AlertCircle, Info } from 'lucide-react';

/**
 * CookiePolicy.jsx — Politique de Gestion des Cookies & Traceurs
 * Conforme à la directive européenne ePrivacy 2002/58/CE révisée,
 * au Règlement (UE) 2016/679 (RGPD) et aux lignes directrices et recommandations de la CNIL (septembre 2020).
 */
export default function CookiePolicy({
  onBack,
  onNavigate,
  onOpenCookieSettings,
  darkMode = false,
}) {
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch (e) {}
    }
    document.title = 'Politique des Cookies — Troco';
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

  const handleOpenSettings = () => {
    if (typeof onOpenCookieSettings === 'function') {
      onOpenCookieSettings();
    } else {
      try {
        localStorage.removeItem('troco_cookie_consent');
        window.location.reload();
      } catch (e) {
        window.location.reload();
      }
    }
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
        aria-label="Navigation politique des cookies"
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
          <Cookie size={16} color="#C67D5B" aria-hidden="true" />
          <span>Directive ePrivacy & Recommandations CNIL</span>
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
          <Cookie size={14} aria-hidden="true" />
          <span>Traceurs & Stockage Local</span>
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
          Politique des Cookies & Traceurs
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
          Comprenez comment Troco utilise les technologies de stockage local et les cookies pour maintenir votre session en toute sécurité, sans pistage intrusif.
        </p>
        <div style={{ marginTop: '14px', fontSize: '12px', color: darkMode ? '#9A8A7D' : '#8A7A6D' }}>
          Dernière mise à jour réglementaire : <strong>9 septembre 2026</strong>
        </div>
      </header>

      {/* SECTION 1 : QU'EST-CE QU'UN COOKIE ? */}
      <section style={cardStyle} aria-labelledby="section-definition">
        <div style={sectionHeaderStyle}>
          <div style={iconContainerStyle} aria-hidden="true">
            <Info size={22} />
          </div>
          <div>
            <h2 id="section-definition" style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: darkMode ? '#FFFFFF' : '#231E1B' }}>
              1. Qu'est-ce qu'un Cookie ou Traceur ?
            </h2>
            <p style={{ fontSize: '13px', margin: '2px 0 0', color: darkMode ? '#B9A89B' : '#7D6E63' }}>
              Définition légale au sens de l'article 5-3 de la directive ePrivacy
            </p>
          </div>
        </div>

        <div className="prose" style={{ fontSize: '14.5px', lineHeight: '1.7' }}>
          <p>
            Un traceur ou cookie est une information déposée ou lue sur le terminal de l'utilisateur (ordinateur, smartphone, tablette) lors de la consultation d'un service en ligne. Dans les applications web modernes de type Single Page Application (SPA), ces données peuvent être stockées sous forme de cookies HTTP, d'entrées dans le <code>localStorage</code> ou le <code>sessionStorage</code> du navigateur.
          </p>
          <p>
            Troco applique une politique stricte de <strong>minimisation technique</strong> : nous n'employons aucun cookie publicitaire tiers ni dispositif de ciblage comportemental ou de revente de profil de navigation.
          </p>
        </div>
      </section>

      {/* SECTION 2 : TABLEAU DÉTAILLÉ DES TRACEURS */}
      <section style={cardStyle} aria-labelledby="section-table">
        <div style={sectionHeaderStyle}>
          <div style={iconContainerStyle} aria-hidden="true">
            <Shield size={22} />
          </div>
          <div>
            <h2 id="section-table" style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: darkMode ? '#FFFFFF' : '#231E1B' }}>
              2. Inventaire Exhaustif des Traceurs & Stockages Locaux
            </h2>
            <p style={{ fontSize: '13px', margin: '2px 0 0', color: darkMode ? '#B9A89B' : '#7D6E63' }}>
              Transparence sur les clés locales et leur finalité précise
            </p>
          </div>
        </div>

        <div className="prose" style={{ fontSize: '14.5px', lineHeight: '1.7' }}>
          <div style={{ overflowX: 'auto', margin: '18px 0' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr style={{ borderBottom: darkMode ? '2px solid rgba(255,255,255,0.1)' : '2px solid #E8DDD3' }}>
                  <th style={{ padding: '10px 12px', color: '#C67D5B' }}>Clé / Nom</th>
                  <th style={{ padding: '10px 12px', color: '#C67D5B' }}>Type</th>
                  <th style={{ padding: '10px 12px', color: '#C67D5B' }}>Finalité</th>
                  <th style={{ padding: '10px 12px', color: '#C67D5B' }}>Durée</th>
                  <th style={{ padding: '10px 12px', color: '#C67D5B' }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E8DDD3' }}>
                  <td style={{ padding: '10px 12px' }}><code>firebase:authUser:...</code></td>
                  <td style={{ padding: '10px 12px' }}>LocalStorage / IndexedDB</td>
                  <td style={{ padding: '10px 12px' }}>Maintien sécurisé de la session d'authentification utilisateur</td>
                  <td style={{ padding: '10px 12px' }}>Session / Persistant</td>
                  <td style={{ padding: '10px 12px' }}><span style={{ color: '#10B981', fontWeight: '700' }}>Strictement Nécessaire</span></td>
                </tr>
                <tr style={{ borderBottom: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E8DDD3' }}>
                  <td style={{ padding: '10px 12px' }}><code>troco_cookie_consent</code></td>
                  <td style={{ padding: '10px 12px' }}>LocalStorage</td>
                  <td style={{ padding: '10px 12px' }}>Mémorisation de vos choix de consentement pour les traceurs</td>
                  <td style={{ padding: '10px 12px' }}>6 mois (Norme CNIL)</td>
                  <td style={{ padding: '10px 12px' }}><span style={{ color: '#10B981', fontWeight: '700' }}>Strictement Nécessaire</span></td>
                </tr>
                <tr style={{ borderBottom: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E8DDD3' }}>
                  <td style={{ padding: '10px 12px' }}><code>troco_theme</code></td>
                  <td style={{ padding: '10px 12px' }}>LocalStorage</td>
                  <td style={{ padding: '10px 12px' }}>Conservation du choix du thème d'affichage (Clair ou Sombre)</td>
                  <td style={{ padding: '10px 12px' }}>12 mois</td>
                  <td style={{ padding: '10px 12px' }}><span style={{ color: '#C67D5B', fontWeight: '700' }}>Fonctionnel / Confort</span></td>
                </tr>
                <tr style={{ borderBottom: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E8DDD3' }}>
                  <td style={{ padding: '10px 12px' }}><code>troco_language</code></td>
                  <td style={{ padding: '10px 12px' }}>LocalStorage</td>
                  <td style={{ padding: '10px 12px' }}>Mémorisation de la langue sélectionnée pour l'interface</td>
                  <td style={{ padding: '10px 12px' }}>12 mois</td>
                  <td style={{ padding: '10px 12px' }}><span style={{ color: '#C67D5B', fontWeight: '700' }}>Fonctionnel / Confort</span></td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 12px' }}><code>troco_analytics_optin</code></td>
                  <td style={{ padding: '10px 12px' }}>LocalStorage</td>
                  <td style={{ padding: '10px 12px' }}>Mesure anonymisée de l'utilisation et détection d'erreurs (bloqué par défaut)</td>
                  <td style={{ padding: '10px 12px' }}>6 mois</td>
                  <td style={{ padding: '10px 12px' }}><span style={{ color: '#3B82F6', fontWeight: '700' }}>Soumis à Consentement</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 3 : CONSENTEMENT ET GESTION */}
      <section style={cardStyle} aria-labelledby="section-manage">
        <div style={sectionHeaderStyle}>
          <div style={iconContainerStyle} aria-hidden="true">
            <Settings size={22} />
          </div>
          <div>
            <h2 id="section-manage" style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: darkMode ? '#FFFFFF' : '#231E1B' }}>
              3. Comment Gérer ou Révoquer votre Consentement ?
            </h2>
            <p style={{ fontSize: '13px', margin: '2px 0 0', color: darkMode ? '#B9A89B' : '#7D6E63' }}>
              Liberté de choix garantie à tout instant sans dégradation du service principal
            </p>
          </div>
        </div>

        <div className="prose" style={{ fontSize: '14.5px', lineHeight: '1.7' }}>
          <p>
            Conformément aux directives de la CNIL, <strong>le refus des traceurs non nécessaires est aussi simple que leur acceptation</strong>.
          </p>
          <p>
            Vous pouvez à tout moment modifier vos choix, réinitialiser vos préférences ou réafficher la bannière de consentement :
          </p>

          <div
            style={{
              marginTop: '20px',
              padding: '22px',
              borderRadius: '18px',
              backgroundColor: darkMode ? 'rgba(198,125,91,0.12)' : 'rgba(198,125,91,0.08)',
              border: '1px solid rgba(198,125,91,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ fontWeight: '700', fontSize: '15px', color: '#C67D5B' }}>
              Action instantanée sur vos préférences :
            </div>
            <div>
              <button
                type="button"
                onClick={handleOpenSettings}
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
                <RefreshCw size={16} />
                <span>Réinitialiser & Configurer mes préférences de traceurs</span>
              </button>
            </div>
            <div style={{ fontSize: '12.5px', color: darkMode ? '#B9A89B' : '#7D6E63' }}>
              Ce bouton efface le choix de cookie précédemment enregistré et fait réapparaître la modale de consentement pour vous permettre de reconfigurer vos choix.
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}
