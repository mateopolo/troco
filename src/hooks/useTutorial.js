import { useState, useCallback } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export function useTutorial() {
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const shouldShowTutorial = useCallback((profile) => {
    return Boolean(profile && !profile.tutorialCompleted && profile.onboardingCompleted);
  }, []);

  const nextStep = useCallback(() => setCurrentStep(s => Math.min(s + 1, 5)), []);
  const prevStep = useCallback(() => setCurrentStep(s => Math.max(s - 1, 0)), []);

  const skipTutorial = useCallback(async (uid) => {
    if (uid && db) {
      try {
        await updateDoc(doc(db, 'users', uid), { tutorialCompleted: true });
      } catch (err) {
        // Non-blocking fail-safe
      }
    }
    setIsTutorialOpen(false);
  }, []);

  const completeTutorial = useCallback(async (uid) => {
    if (uid && db) {
      try {
        await updateDoc(doc(db, 'users', uid), { tutorialCompleted: true });
      } catch (err) {
        // Non-blocking fail-safe
      }
    }
    setIsTutorialOpen(false);
  }, []);

  return {
    isTutorialOpen,
    setIsTutorialOpen,
    currentStep,
    setCurrentStep,
    nextStep,
    prevStep,
    skipTutorial,
    completeTutorial,
    shouldShowTutorial,
  };
}

export default useTutorial;
