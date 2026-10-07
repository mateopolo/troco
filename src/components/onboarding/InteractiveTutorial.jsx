import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Search,
  MessageCircle,
  PlusCircle,
  Wallet,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  Star,
  Check,
  Coins,
  ArrowRight,
  MapPin,
  Clock,
  Send,
  SlidersHorizontal,
  Flame
} from 'lucide-react';

export default function InteractiveTutorial({
  isOpen = false,
  currentStep = 0,
  onNext,
  onPrev,
  onSkip,
  onComplete,
  darkMode = false,
  currentLang = 'FR',
  t = (k, def) => def || k,
  profile = null,
}) {
  const [internalStep, setInternalStep] = useState(currentStep);
  const [walletCount, setWalletCount] = useState(0);
  const [showWalletConfetti, setShowWalletConfetti] = useState(false);

  useEffect(() => {
    setInternalStep(currentStep);
  }, [currentStep]);

  // Animation trigger pour le portefeuille (étape 4)
  useEffect(() => {
    if (internalStep === 4) {
      setWalletCount(0);
      setShowWalletConfetti(false);
      const timer1 = setTimeout(() => {
        setWalletCount(10);
        setShowWalletConfetti(true);
      }, 700);
      return () => clearTimeout(timer1);
    }
  }, [internalStep]);

  if (!isOpen) return null;

  const totalSteps = 6;
  const isLastStep = internalStep === totalSteps - 1;

  const handleNext = () => {
    if (isLastStep) {
      if (typeof onComplete === 'function') onComplete(profile?.uid);
    } else {
      if (typeof onNext === 'function') {
        onNext();
      } else {
        setInternalStep(s => Math.min(s + 1, totalSteps - 1));
      }
    }
  };

  const handlePrev = () => {
    if (internalStep > 0) {
      if (typeof onPrev === 'function') {
        onPrev();
      } else {
        setInternalStep(s => Math.max(s - 1, 0));
      }
    }
  };

  const handleSkip = () => {
    if (typeof onSkip === 'function') {
      onSkip(profile?.uid);
    }
  };

  const formatStepOf = (curr, total) => {
    const raw = t('tutorialStepOf', 'Étape {current} sur {total}');
    return raw.replace('{current}', curr).replace('{total}', total);
  };

  // Illustrations animées par Framer Motion pour chaque étape
  const renderIllustration = () => {
    switch (internalStep) {
      case 0:
        // BIENVENUE : Écusson lumineux, flèches circulaires et jetons en suspension
        return (
          <div style={{ position: 'relative', width: '220px', height: '200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Halo lumineux */}
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.65, 0.35] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, var(--accent-primary, #C67D5B) 0%, transparent 70%)',
                filter: 'blur(16px)',
              }}
            />

            {/* Anneau circulaire en rotation */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute',
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                border: '2px dashed var(--accent-primary, #C67D5B)',
                opacity: 0.6,
              }}
            />

            {/* Jeton central géant avec icône Troco */}
            <motion.div
              initial={{ scale: 0.5, rotateY: -90 }}
              animate={{ scale: 1, rotateY: 0 }}
              transition={{ duration: 0.9, ease: [0.19, 1, 0.22, 1] }}
              style={{
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FFDF70 0%, #D49E34 60%, #996B15 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 12px 30px rgba(212, 158, 52, 0.45)',
                border: '3px solid #FFF',
                zIndex: 2,
              }}
            >
              <Coins size={44} color="#5C3D00" strokeWidth={2.4} />
            </motion.div>

            {/* Particules flottantes */}
            {[
              { x: -70, y: -45, delay: 0 },
              { x: 70, y: -40, delay: 0.4 },
              { x: -55, y: 55, delay: 0.8 },
              { x: 65, y: 50, delay: 1.2 },
            ].map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0.5, 1, 0.5],
                  y: [p.y - 6, p.y + 6, p.y - 6],
                  scale: [0.9, 1.1, 0.9],
                }}
                transition={{ duration: 2.8, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  transform: `translate(${p.x}px, ${p.y}px)`,
                  backgroundColor: 'var(--bg-card, #FFF)',
                  padding: '6px 10px',
                  borderRadius: '16px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: '800',
                  color: 'var(--text-main, #222)',
                  zIndex: 3,
                }}
              >
                <Sparkles size={12} color="var(--accent-primary, #C67D5B)" />
                {i % 2 === 0 ? '1h = 1 Jeton' : 'P2P Éthique'}
              </motion.div>
            ))}
          </div>
        );

      case 1:
        // EXPLORER : Carte d'annonce animée en 3D
        return (
          <div style={{ perspective: '1000px', margin: '0 auto', maxWidth: '320px', width: '100%' }}>
            <motion.div
              initial={{ opacity: 0, y: 25, rotateY: -20, rotateX: 10 }}
              animate={{ opacity: 1, y: 0, rotateY: 0, rotateX: 0 }}
              transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
              style={{
                backgroundColor: 'var(--bg-card, #FFF)',
                borderRadius: '20px',
                padding: '16px',
                boxShadow: darkMode ? '0 12px 30px rgba(0,0,0,0.5)' : '0 12px 30px rgba(0,0,0,0.08)',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.06)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Badge IA & Type */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{
                  backgroundColor: 'rgba(198, 125, 91, 0.15)',
                  color: 'var(--accent-primary, #C67D5B)',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '800',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <Sparkles size={12} /> Musique
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary, #777)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <MapPin size={12} /> Paris • 1.2 km
                </span>
              </div>

              {/* Titre & Description */}
              <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main, #222)', marginBottom: '6px' }}>
                {t('tutorialDemoGuitarTitle', 'Cours de guitare à Paris')}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary, #666)', lineHeight: '1.4', marginBottom: '14px' }}>
                Initiation aux accords, blues & pop rock. Matériel fourni sur place ou à distance.
              </div>

              {/* Tarif & Auteur */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--accent-primary, #C67D5B)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '12px' }}>
                    AM
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main, #222)' }}>
                    {t('tutorialDemoGuitarAuthor', 'Alexandre M.')}
                  </span>
                </div>
                <div style={{
                  backgroundColor: 'var(--accent-primary, #C67D5B)',
                  color: '#FFF',
                  padding: '5px 12px',
                  borderRadius: '14px',
                  fontSize: '12px',
                  fontWeight: '800',
                  boxShadow: '0 4px 10px rgba(198, 125, 91, 0.3)',
                }}>
                  {t('tutorialDemoGuitarRate', '1h = 1 Jeton')}
                </div>
              </div>
            </motion.div>
          </div>
        );

      case 2:
        // NÉGOCIER : Chat interactif animé
        return (
          <div style={{ margin: '0 auto', maxWidth: '320px', width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Bulle 1 : Demandeur */}
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{
                alignSelf: 'flex-start',
                backgroundColor: darkMode ? '#2A2622' : '#F4ECE4',
                color: 'var(--text-main, #222)',
                padding: '10px 14px',
                borderRadius: '16px 16px 16px 4px',
                maxWidth: '85%',
                fontSize: '13px',
                fontWeight: '600',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}
            >
              {t('tutorialDemoChatMsg1', 'Bonjour ! Je te propose 1 Jeton pour 1h de cours 🎸')}
            </motion.div>

            {/* Bulle 2 : Réponse Auteur */}
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              style={{
                alignSelf: 'flex-end',
                backgroundColor: 'var(--accent-primary, #C67D5B)',
                color: '#FFF',
                padding: '10px 14px',
                borderRadius: '16px 16px 4px 16px',
                maxWidth: '85%',
                fontSize: '13px',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(198, 125, 91, 0.25)',
              }}
            >
              {t('tutorialDemoChatMsg2', 'Parfait, créneau validé ! Deal conclu 🤝')}
            </motion.div>

            {/* Badge Deal Scellé */}
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.6 }}
              style={{
                alignSelf: 'center',
                backgroundColor: darkMode ? 'rgba(74, 222, 128, 0.15)' : '#DCFCE7',
                color: darkMode ? '#4ADE80' : '#166534',
                border: darkMode ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid #86EFAC',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '6px',
              }}
            >
              <CheckCircle2 size={14} /> Deal scellé • 1 Jeton sécurisé
            </motion.div>
          </div>
        );

      case 3:
        // PUBLIER : Formulaire auto-rempli avec effet typewriter
        return (
          <div style={{ margin: '0 auto', maxWidth: '320px', width: '100%' }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              style={{
                backgroundColor: 'var(--bg-card, #FFF)',
                borderRadius: '18px',
                padding: '16px',
                boxShadow: darkMode ? '0 10px 25px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.06)',
                border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {/* Champ Titre */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary, #777)', textTransform: 'uppercase' }}>
                  Titre
                </label>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  style={{
                    backgroundColor: darkMode ? '#222' : '#F7F7F7',
                    border: '1px solid var(--accent-primary, #C67D5B)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: '700',
                    color: 'var(--text-main, #222)',
                    marginTop: '4px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                  }}
                >
                  Initiation au piano jazz & solfège
                </motion.div>
              </div>

              {/* Champ Catégorie & Tarif */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  style={{
                    flex: 1,
                    backgroundColor: darkMode ? '#222' : '#F7F7F7',
                    border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                    borderRadius: '10px',
                    padding: '8px 10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: 'var(--text-main, #222)',
                  }}
                >
                  🎹 Musique
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 1.1 }}
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(198, 125, 91, 0.15)',
                    border: '1px solid var(--accent-primary, #C67D5B)',
                    borderRadius: '10px',
                    padding: '8px 10px',
                    fontSize: '12px',
                    fontWeight: '800',
                    color: 'var(--accent-primary, #C67D5B)',
                    textAlign: 'center',
                  }}
                >
                  🪙 1 Jeton
                </motion.div>
              </div>

              {/* Bouton simulation IA */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.5 }}
                style={{
                  backgroundColor: 'var(--accent-primary, #C67D5B)',
                  color: '#FFF',
                  borderRadius: '12px',
                  padding: '9px',
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(198, 125, 91, 0.3)',
                }}
              >
                <Check size={14} /> Annonce prête à publier (0,00 €)
              </motion.div>
            </motion.div>
          </div>
        );

      case 4:
        // PORTEFEUILLE : Solde qui s'incrémente avec confettis
        return (
          <div style={{ position: 'relative', width: '280px', margin: '0 auto', textAlign: 'center' }}>
            {/* Confettis animés */}
            {showWalletConfetti && (
              <div style={{ position: 'absolute', inset: '-30px', pointerEvents: 'none', overflow: 'hidden' }}>
                {Array.from({ length: 22 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{
                      top: '50%',
                      left: '50%',
                      opacity: 1,
                      scale: Math.random() * 0.8 + 0.4,
                    }}
                    animate={{
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                      opacity: 0,
                      rotate: Math.random() * 720,
                    }}
                    transition={{ duration: 1.6, ease: 'easeOut' }}
                    style={{
                      position: 'absolute',
                      width: '8px',
                      height: '8px',
                      borderRadius: i % 2 === 0 ? '50%' : '2px',
                      backgroundColor: ['#FFDF70', '#C67D5B', '#4ADE80', '#38BDF8', '#F472B6'][i % 5],
                    }}
                  />
                ))}
              </div>
            )}

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6 }}
              style={{
                backgroundColor: 'var(--bg-card, #FFF)',
                borderRadius: '24px',
                padding: '24px 20px',
                boxShadow: darkMode ? '0 12px 32px rgba(0,0,0,0.5)' : '0 12px 30px rgba(0,0,0,0.08)',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary, #777)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Solde de bienvenue
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '12px 0' }}>
                <Coins size={36} color="var(--accent-primary, #C67D5B)" />
                <motion.span
                  key={walletCount}
                  initial={{ scale: 1.4, color: '#FFDF70' }}
                  animate={{ scale: 1, color: 'var(--text-main, #222)' }}
                  transition={{ duration: 0.4 }}
                  style={{ fontSize: '38px', fontWeight: '900' }}
                >
                  {walletCount}
                </motion.span>
                <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main, #222)' }}>
                  Jetons
                </span>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.9 }}
                style={{
                  backgroundColor: 'rgba(74, 222, 128, 0.15)',
                  color: '#16A34A',
                  padding: '6px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: '800',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Sparkles size={14} /> +10 Jetons offerts à l'inscription
              </motion.div>
            </motion.div>
          </div>
        );

      case 5:
        // FIN : Célébration finale & Prêt à explorer
        return (
          <div style={{ width: '200px', height: '180px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-primary, #C67D5B) 0%, #D49E34 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 16px 36px rgba(198, 125, 91, 0.45)',
                color: '#FFF',
              }}
            >
              <CheckCircle2 size={58} strokeWidth={2.4} />
            </motion.div>
          </div>
        );

      default:
        return null;
    }
  };

  // Titres & sous-titres traduits selon l'étape
  const getStepContent = () => {
    switch (internalStep) {
      case 0:
        return {
          title: t('tutorialWelcomeTitle', 'Bienvenue sur Troco'),
          subtitle: t('tutorialWelcomeSubtitle', "Découvre l'économie circulaire en 60 secondes"),
          cta: t('tutorialWelcomeCta', 'Commencer'),
        };
      case 1:
        return {
          title: t('tutorialExploreTitle', 'Explore les annonces près de chez toi'),
          subtitle: t('tutorialExploreSubtitle', 'Découvre des services, objets et compétences partagés par tes voisins sans dépenser un euro.'),
          cta: t('tutorialNext', 'Suivant'),
        };
      case 2:
        return {
          title: t('tutorialChatTitle', 'Négocie directement dans le chat'),
          subtitle: t('tutorialChatSubtitle', 'Échange en direct, propose des contre-offres et scelle tes deals en toute sécurité.'),
          cta: t('tutorialNext', 'Suivant'),
        };
      case 3:
        return {
          title: t('tutorialPostTitle', 'Publie tes propres annonces en 30 secondes'),
          subtitle: t('tutorialPostSubtitle', 'Formulaire intelligent assisté par IA avec suggestions automatiques de photos et de tags.'),
          cta: t('tutorialNext', 'Suivant'),
        };
      case 4:
        return {
          title: t('tutorialWalletTitle', 'Gère ton portefeuille Troco'),
          subtitle: t('tutorialWalletSubtitle', '1 heure partagée = 1 Jeton. Cumule des Jetons pour accéder à tous les services de la communauté.'),
          cta: t('tutorialNext', 'Suivant'),
        };
      case 5:
        return {
          title: t('tutorialFinalTitle', 'Tu es prêt !'),
          subtitle: t('tutorialFinalSubtitle', 'Bonne exploration sur Troco'),
          cta: t('tutorialFinalCta', 'Découvrir Troco'),
        };
      default:
        return { title: '', subtitle: '', cta: t('tutorialNext', 'Suivant') };
    }
  };

  const { title, subtitle, cta } = getStepContent();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 15 }}
        transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: darkMode ? '#1A1816' : '#FAF7F2',
          borderRadius: '28px',
          padding: '28px 24px 24px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.45)',
          border: darkMode ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(232, 221, 211, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* En-tête : Stepper & bouton fermer/passer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  width: i === internalStep ? '24px' : '7px',
                  backgroundColor: i === internalStep
                    ? 'var(--accent-primary, #C67D5B)'
                    : (i < internalStep ? (darkMode ? '#666' : '#C4B5A5') : (darkMode ? '#333' : '#E8DDD3')),
                }}
                transition={{ duration: 0.3 }}
                style={{
                  height: '7px',
                  borderRadius: '999px',
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary, #888)' }}>
              {formatStepOf(internalStep + 1, totalSteps)}
            </span>
            <button
              onClick={handleSkip}
              aria-label={t('tutorialSkip', 'Passer')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary, #888)',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
                borderRadius: '50%',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Zone Visuelle / Illustration */}
        <div style={{ minHeight: '210px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={internalStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              style={{ width: '100%' }}
            >
              {renderIllustration()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Textes explicatifs */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <motion.h2
            key={`title-${internalStep}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              fontSize: '20px',
              fontWeight: '900',
              color: 'var(--text-main, #222)',
              margin: '0 0 8px 0',
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </motion.h2>
          <motion.p
            key={`sub-${internalStep}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary, #777)',
              margin: 0,
              lineHeight: '1.5',
              maxWidth: '380px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            {subtitle}
          </motion.p>
        </div>

        {/* Actions de navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          {internalStep > 0 ? (
            <button
              onClick={handlePrev}
              className="premium-button"
              style={{
                border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #E8DDD3',
                backgroundColor: 'transparent',
                color: 'var(--text-main, #222)',
                borderRadius: '999px',
                padding: '12px 18px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ChevronLeft size={16} />
              {t('tutorialPrev', 'Précédent')}
            </button>
          ) : (
            <button
              onClick={handleSkip}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary, #888)',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                padding: '12px 8px',
              }}
            >
              {t('tutorialSkip', 'Passer')}
            </button>
          )}

          <button
            onClick={handleNext}
            className="premium-button"
            style={{
              flex: 1,
              maxWidth: internalStep > 0 ? '240px' : '100%',
              backgroundColor: 'var(--accent-primary, #C67D5B)',
              color: '#FFF',
              border: 'none',
              borderRadius: '999px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 6px 20px rgba(198, 125, 91, 0.35)',
              transition: 'transform 0.15s ease',
            }}
          >
            {cta}
            {!isLastStep && <ChevronRight size={16} />}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
