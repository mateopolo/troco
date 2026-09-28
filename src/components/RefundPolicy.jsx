import React, { useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Coins,
  RefreshCw,
  Scale,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { getRefundPolicyData } from '../data/legal';

const SECTION_ICONS = {
  'section-token-model': Clock,
  'section-fiat-withdrawal': Coins,
  'section-escrow': RefreshCw,
  'section-disputes': Scale,
  'section-deposit': CheckCircle2,
};

/**
 * RefundPolicy.jsx — Politique de Remboursement & Modalités d'Échange P2P
 * Régie par le Code de la consommation français (art. L. 221-18 et suivants),
 * le système contractuel de séquestre (Escrow) et les règles d'équité de Troco.
 * Contenu structurellement modularisé par langue (FR, EN, ES, IT, DE, JA, ZH).
 */
export default function RefundPolicy({
  onBack,
  onNavigate,
  darkMode = false,
}) {
  const { currentLang, t } = useLanguage();
  const refundData = useMemo(() => getRefundPolicyData(currentLang), [currentLang]);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch (e) {}
    }
    document.title = `${refundData.title || 'Politique de Remboursement'} — Troco`;
  }, [refundData.title]);

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
        aria-label="Navigation politique de remboursement"
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
          aria-label={t('legal.back_to_home') || "Retour à l'accueil"}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>{t('legal.back_to_home') || "Retour à l'accueil"}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: darkMode ? '#B9A89B' : '#7D6E63' }}>
          <RefreshCw size={16} color="#C67D5B" aria-hidden="true" />
          <span>{t('legal.refund_badge') || "Cadre Économique & Sécurité"}</span>
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
          <RefreshCw size={14} aria-hidden="true" />
          <span>{refundData.badge || t('legal.refund_badge') || 'Cadre Économique & Sécurité'}</span>
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
          {refundData.title || 'Politique de Remboursement & Deals P2P'}
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
          {refundData.subtitle}
        </p>
        <div style={{ marginTop: '14px', fontSize: '12px', color: darkMode ? '#9A8A7D' : '#8A7A6D' }}>
          Dernière mise à jour réglementaire : <strong>{refundData.lastUpdated}</strong>
        </div>
      </header>

      {/* SECTIONS DE REMBOURSEMENT MODULARISÉES */}
      {refundData.sections.map((section) => {
        const IconComponent = SECTION_ICONS[section.id] || RefreshCw;

        return (
          <section key={section.id} style={cardStyle} aria-labelledby={section.id}>
            <div style={sectionHeaderStyle}>
              <div style={iconContainerStyle} aria-hidden="true">
                <IconComponent size={22} />
              </div>
              <div>
                <h2 id={section.id} style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: darkMode ? '#FFFFFF' : '#231E1B' }}>
                  {section.title}
                </h2>
                {section.subtitle && (
                  <p style={{ fontSize: '13px', margin: '2px 0 0', color: darkMode ? '#B9A89B' : '#7D6E63' }}>
                    {section.subtitle}
                  </p>
                )}
              </div>
            </div>

            <div
              className="prose"
              style={{ fontSize: '14.5px', lineHeight: '1.7' }}
              dangerouslySetInnerHTML={{ __html: section.body }}
            />
          </section>
        );
      })}

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
        {t('legal.see_also') || 'Consultez également notre'}{' '}
        <button
          type="button"
          onClick={() => onNavigate?.('legal-notice')}
          aria-label="Consulter les Mentions Légales"
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
          {t('legal.notice_title') || 'Mentions Légales'}
        </button>{' '}
        {t('legal.and_our') || 'et notre'}{' '}
        <button
          type="button"
          onClick={() => onNavigate?.('privacy-policy')}
          aria-label="Consulter la Politique de Confidentialité"
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
          {t('legal.privacy_policy_link') || 'Politique de Confidentialité'}
        </button>.
      </div>
    </article>
  );
}
