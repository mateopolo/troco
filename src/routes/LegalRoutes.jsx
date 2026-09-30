import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { pageTransitionVariants, pageTransitionConfig } from './pageTransitions';

const LegalNotice = React.lazy(() => import('../components/LegalNotice'));
const PrivacyPolicy = React.lazy(() => import('../components/PrivacyPolicy'));
const CookiePolicy = React.lazy(() => import('../components/CookiePolicy'));
const RefundPolicy = React.lazy(() => import('../components/RefundPolicy'));

export default function LegalRoutes({
  activeTab,
  darkMode,
  currentLang,
  setActiveTab,
  onOpenPrivacyCenter,
  onOpenCookieSettings,
}) {
  const handleNavigate = (tab) => {
    if (typeof window !== 'undefined') window.location.hash = tab;
    setActiveTab(tab);
  };

  const handleBack = () => setActiveTab('feed');

  const defaultCookieSettingsHandler = () => {
    try {
      localStorage.removeItem('troco_cookie_consent');
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  const commonProps = {
    onBack: handleBack,
    onNavigate: handleNavigate,
    darkMode,
  };

  return (
    <>
      {/* ONGLET LÉGAL : MENTIONS LÉGALES (CONFORMITÉ LCEN & DSA) */}
      {activeTab === 'legal-notice' && (
        <motion.div
          key="page-legal-notice"
          variants={pageTransitionVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransitionConfig}
          style={{ width: '100%' }}
        >
          <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
            <LegalNotice {...commonProps} />
          </Suspense>
        </motion.div>
      )}

      {/* ONGLET LÉGAL : POLITIQUE DE CONFIDENTIALITÉ (RGPD / CNIL) */}
      {activeTab === 'privacy-policy' && (
        <motion.div
          key="page-privacy-policy"
          variants={pageTransitionVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransitionConfig}
          style={{ width: '100%' }}
        >
          <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
            <PrivacyPolicy
              {...commonProps}
              onOpenPrivacyCenter={onOpenPrivacyCenter}
            />
          </Suspense>
        </motion.div>
      )}

      {/* ONGLET LÉGAL : POLITIQUE DES COOKIES & TRACEURS */}
      {activeTab === 'cookie-policy' && (
        <motion.div
          key="page-cookie-policy"
          variants={pageTransitionVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransitionConfig}
          style={{ width: '100%' }}
        >
          <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
            <CookiePolicy
              {...commonProps}
              onOpenCookieSettings={onOpenCookieSettings || defaultCookieSettingsHandler}
            />
          </Suspense>
        </motion.div>
      )}

      {/* ONGLET LÉGAL : POLITIQUE DE REMBOURSEMENT & DEALS P2P */}
      {activeTab === 'refund-policy' && (
        <motion.div
          key="page-refund-policy"
          variants={pageTransitionVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransitionConfig}
          style={{ width: '100%' }}
        >
          <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
            <RefundPolicy {...commonProps} />
          </Suspense>
        </motion.div>
      )}
    </>
  );
}
