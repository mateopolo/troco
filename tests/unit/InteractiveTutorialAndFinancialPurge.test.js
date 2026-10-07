// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { useTutorial } from '../../src/hooks/useTutorial';
import InteractiveTutorial from '../../src/components/onboarding/InteractiveTutorial';
import { translations } from '../../src/data/translationsData';
import { secondaryTranslations } from '../../src/data/translationsSecondary';
import * as firestore from 'firebase/firestore';

vi.mock('../../src/firebase', () => ({
  db: { _mockDb: true },
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, col, id) => ({ db, col, id })),
  updateDoc: vi.fn(() => Promise.resolve()),
}));

describe('JOUR 1 : Purge financière, purge démo et tutoriel interactif IA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TÂCHE 3 : Hook useTutorial', () => {
    it('initialise correctement l’état du tutoriel', () => {
      const { result } = renderHook(() => useTutorial());
      expect(result.current.isTutorialOpen).toBe(false);
      expect(result.current.currentStep).toBe(0);
    });

    it('shouldShowTutorial retourne true uniquement si onboardingCompleted && !tutorialCompleted', () => {
      const { result } = renderHook(() => useTutorial());

      expect(result.current.shouldShowTutorial(null)).toBe(false);
      expect(result.current.shouldShowTutorial({ onboardingCompleted: false, tutorialCompleted: false })).toBe(false);
      expect(result.current.shouldShowTutorial({ onboardingCompleted: true, tutorialCompleted: true })).toBe(false);
      expect(result.current.shouldShowTutorial({ onboardingCompleted: true, tutorialCompleted: false })).toBe(true);
      expect(result.current.shouldShowTutorial({ onboardingCompleted: true })).toBe(true);
    });

    it('gère la progression d’étapes de 0 à 5 sans dépasser', () => {
      const { result } = renderHook(() => useTutorial());

      act(() => {
        result.current.nextStep();
      });
      expect(result.current.currentStep).toBe(1);

      act(() => {
        result.current.nextStep();
        result.current.nextStep();
        result.current.nextStep();
        result.current.nextStep();
        result.current.nextStep(); // Tentative de dépasser 5
      });
      expect(result.current.currentStep).toBe(5);

      act(() => {
        result.current.prevStep();
      });
      expect(result.current.currentStep).toBe(4);

      act(() => {
        result.current.prevStep();
        result.current.prevStep();
        result.current.prevStep();
        result.current.prevStep();
        result.current.prevStep(); // Tentative d'aller en dessous de 0
      });
      expect(result.current.currentStep).toBe(0);
    });

    it('skipTutorial et completeTutorial ferment le modal et mettent à jour Firestore', async () => {
      const { result } = renderHook(() => useTutorial());

      act(() => {
        result.current.setIsTutorialOpen(true);
      });
      expect(result.current.isTutorialOpen).toBe(true);

      await act(async () => {
        await result.current.skipTutorial('user_123');
      });
      expect(result.current.isTutorialOpen).toBe(false);
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user_123' }),
        { tutorialCompleted: true }
      );

      act(() => {
        result.current.setIsTutorialOpen(true);
      });
      await act(async () => {
        await result.current.completeTutorial('user_456');
      });
      expect(result.current.isTutorialOpen).toBe(false);
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user_456' }),
        { tutorialCompleted: true }
      );
    });
  });

  describe('TÂCHE 3 : Composant InteractiveTutorial', () => {
    it('affiche l’étape 0 (Bienvenue) avec les textes traduits et les boutons d’action', () => {
      const onNextMock = vi.fn();
      const onSkipMock = vi.fn();

      render(
        <InteractiveTutorial
          isOpen={true}
          currentStep={0}
          onNext={onNextMock}
          onSkip={onSkipMock}
          t={(k) => translations.FR[k] || k}
          currentLang="FR"
        />
      );

      expect(screen.getByText('Bienvenue sur Troco')).toBeInTheDocument();
      expect(screen.getByText("Découvre l'économie circulaire en 60 secondes")).toBeInTheDocument();

      const startBtn = screen.getByText('Commencer le tutoriel');
      fireEvent.click(startBtn);
      expect(onNextMock).toHaveBeenCalledTimes(1);

      const skipBtn = screen.getByText('Passer');
      fireEvent.click(skipBtn);
      expect(onSkipMock).toHaveBeenCalledTimes(1);
    });

    it('affiche l’étape 1 (Explorer) avec l’annonce animée', () => {
      render(
        <InteractiveTutorial
          isOpen={true}
          currentStep={1}
          t={(k) => translations.FR[k] || k}
          currentLang="FR"
        />
      );

      expect(screen.getByText('Explore les annonces près de chez toi')).toBeInTheDocument();
      expect(screen.getByText('Cours de guitare à Paris')).toBeInTheDocument();
      expect(screen.getByText('1h = 1 Jeton')).toBeInTheDocument();
    });

    it('affiche l’étape 2 (Négocier) avec les bulles de chat IA', () => {
      render(
        <InteractiveTutorial
          isOpen={true}
          currentStep={2}
          t={(k) => translations.FR[k] || k}
          currentLang="FR"
        />
      );

      expect(screen.getByText('Négocie directement dans le chat')).toBeInTheDocument();
      expect(screen.getByText('Bonjour ! Je te propose 1 Jeton pour 1h de cours 🎸')).toBeInTheDocument();
      expect(screen.getByText('Parfait, créneau validé ! Deal conclu 🤝')).toBeInTheDocument();
    });

    it('affiche l’étape 4 (Portefeuille) avec les jetons et confettis', () => {
      render(
        <InteractiveTutorial
          isOpen={true}
          currentStep={4}
          t={(k) => translations.FR[k] || k}
          currentLang="FR"
        />
      );

      expect(screen.getByText('Gère ton portefeuille Troco')).toBeInTheDocument();
      expect(screen.getByText("Solde de bienvenue")).toBeInTheDocument();
    });

    it('affiche l’étape 5 (Fin) et déclenche onComplete lors du clic sur le CTA final', () => {
      const onCompleteMock = vi.fn();
      const profile = { uid: 'user_finish_99' };

      render(
        <InteractiveTutorial
          isOpen={true}
          currentStep={5}
          onComplete={onCompleteMock}
          profile={profile}
          t={(k) => translations.FR[k] || k}
          currentLang="FR"
        />
      );

      expect(screen.getByText('Tu es prêt !')).toBeInTheDocument();
      const finishBtn = screen.getByText('Découvrir Troco');
      fireEvent.click(finishBtn);
      expect(onCompleteMock).toHaveBeenCalledWith('user_finish_99');
    });
  });

  describe('TÂCHE 4 : Traduction du tutoriel dans les 7 langues', () => {
    const requiredKeys = [
      'tutorialWelcomeTitle',
      'tutorialWelcomeSubtitle',
      'tutorialWelcomeCta',
      'tutorialExploreTitle',
      'tutorialExploreSubtitle',
      'tutorialChatTitle',
      'tutorialChatSubtitle',
      'tutorialPostTitle',
      'tutorialPostSubtitle',
      'tutorialWalletTitle',
      'tutorialWalletSubtitle',
      'tutorialFinalTitle',
      'tutorialFinalSubtitle',
      'tutorialFinalCta',
      'tutorialSkip',
      'tutorialNext',
      'tutorialPrev',
      'tutorialStepOf',
    ];

    const allLangs = ['FR', 'EN', 'ES', 'IT', 'DE', 'JA', 'ZH'];

    allLangs.forEach((lang) => {
      it(`contient toutes les clés obligatoires en ${lang}`, () => {
        const langDict = lang === 'FR' ? translations.FR : secondaryTranslations[lang];
        expect(langDict).toBeDefined();

        requiredKeys.forEach((key) => {
          expect(langDict[key], `Clé manquante ${key} en ${lang}`).toBeDefined();
          expect(langDict[key].length).toBeGreaterThan(0);
        });
      });
    });
  });
});
