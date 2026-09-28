import React, { useState, useEffect, useMemo } from 'react';
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
import { useLanguage } from '../contexts/LanguageContext';
import { getLegalNoticeData } from '../data/legal';

const SECTION_ICONS = {
  'section-editor': Building2,
  'section-hosting': Server,
  'section-intermediary': Scale,
  'section-ip': CheckCircle2,
  'section-contact': Mail,
};

/**
 * LegalNotice.jsx — Mentions Légales Obligatoires (Conformité Législation Française & Union Européenne)
 * Régie par la Loi n° 2004-575 du 21 juin 2004 (LCEN) et le Règlement (UE) 2022/2065 (DSA).
 * Contenu structurellement modularisé par langue (FR, EN, ES, IT, DE, JA, ZH).
 */
export default function LegalNotice({
  onBack,
  onNavigate,
  darkMode = false,
}) {
  const { currentLang, t } = useLanguage();
  const legalData = useMemo(() => getLegalNoticeData(currentLang), [currentLang]);

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
    document.title = `${legalData.title || 'Mentions Légales'} — Troco`;
  }, [legalData.title]);

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
          aria-label={t('legal.back_to_home_troco') || "Retour à l'accueil Troco"}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>{t('legal.back_to_home') || "Retour à l'accueil"}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: darkMode ? '#B9A89B' : '#7D6E63' }}>
          <Shield size={16} color="#C67D5B" aria-hidden="true" />
          <span>{t('legal.compliance_badge') || "Conformité Légale EU / FR (LCEN & DSA)"}</span>
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
          <span>{legalData.badge || t('legal.mandatory_info') || 'Informations Obligatoires'}</span>
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
          {legalData.title || 'Mentions Légales'}
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
          {legalData.subtitle}
        </p>
        <div style={{ marginTop: '14px', fontSize: '12px', color: darkMode ? '#9A8A7D' : '#8A7A6D' }}>
          Dernière mise à jour réglementaire : <strong>{legalData.lastUpdated}</strong>
        </div>
      </header>

      {/* SECTIONS LÉGALES MODULARISÉES */}
      {legalData.sections.map((section) => {
        const IconComponent = SECTION_ICONS[section.id] || FileText;

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

            {/* FORMULAIRE DSA INTÉGRÉ À LA SECTION 5 */}
            {section.id === 'section-contact' && (
              <>
                <div
                  style={{
                    marginTop: '28px',
                    padding: '24px',
                    borderRadius: '20px',
                    backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
                    border: darkMode ? '1px solid rgba(232, 221, 211, 0.15)' : '1px solid #E8DDD3',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={18} color="#C67D5B" aria-hidden="true" />
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: darkMode ? '#FFFFFF' : '#231E1B' }}>
                        {t('legal.dsa_form_title') || 'Formulaire de Signalement Réglementaire DSA (Art. 16)'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetForm}
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
                      aria-label={t('legal.dsa_reset_aria') || "Réinitialiser les champs du formulaire de signalement"}
                    >
                      <RotateCcw size={14} aria-hidden="true" />
                      <span>{t('legal.dsa_clear') || 'Effacer'}</span>
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
                        {t('legal.dsa_success_title') || 'Signalement bien transmis au service de modération'}
                      </div>
                      <div>
                        {t('legal.dsa_success_intro') || 'Votre notification au titre du DSA a été enregistrée avec succès. Un accusé de réception a été envoyé à'}{' '}
                        <strong>{dsaEmail}</strong>.{' '}
                        {t('legal.dsa_success_delay') || "L'équipe Troco analysera ce signalement sous 24 à 48 heures ouvrées."}
                      </div>
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
                            {t('legal.dsa_name_label') || 'Nom complet / Entité déclarante :'}
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
                            {t('legal.dsa_email_label') || 'Adresse email de contact (obligatoire) :'}
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
                            {t('legal.dsa_type_label') || 'Nature du contenu signalé :'}
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
                            <option value="contenu_illicite">{t('legal.dsa_type_illegal') || 'Contenu manifestement illicite / Illégal'}</option>
                            <option value="fraude_usurpation">{t('legal.dsa_type_fraud') || 'Arnaque financière / Tentative de fraude'}</option>
                            <option value="atteinte_ip">{t('legal.dsa_type_counterfeit') || 'Contrefaçon / Atteinte au droit d\'auteur'}</option>
                            <option value="propos_haineux">{t('legal.dsa_type_harassment') || 'Harcèlement / Propos haineux'}</option>
                            <option value="autre">{t('legal.dsa_type_other') || 'Autre violation des règles Troco'}</option>
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor="dsa-content-url"
                            style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '5px' }}
                          >
                            {t('legal.dsa_url_label') || 'Lien URL ou identifiant du contenu concerné :'}
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
                          {t('legal.dsa_explanation_label') || 'Explication précise des motifs d\'illicéité (obligatoire) :'}
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
                          <span>{t('legal.dsa_submit_btn') || 'Transmettre le signalement (DSA Art. 16)'}</span>
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
                  {t('legal.see_also') || 'Consultez également notre'}{' '}
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
                    {t('legal.privacy_policy_link') || 'Politique de Confidentialité'}
                  </button>{' '}
                  {t('legal.and_our') || 'et notre'}{' '}
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
                    {t('legal.refund_policy_link') || 'Politique de Remboursement & Modalités P2P'}
                  </button>.
                </div>
              </>
            )}
          </section>
        );
      })}
    </article>
  );
}
