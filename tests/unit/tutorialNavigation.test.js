// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import InteractiveTutorial from '../../src/components/onboarding/InteractiveTutorial';
import ProfileFeature from '../../src/features/profile/ProfileFeature';
import { useTutorial } from '../../src/hooks/useTutorial';
import { translations } from '../../src/locales/translations';

vi.mock('../../src/firebase', () => ({
  db: { _mock: true },
  auth: { currentUser: { uid: 'user_test_tutorial', displayName: 'Alexandre Troco' } },
}));

vi.mock('../../src/hooks/useAdminGuard', () => ({
  useAdminGuard: vi.fn(() => ({ isAdmin: false, isAdminLoading: false })),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((db, col) => ({ db, col })),
  query: vi.fn((col) => ({ col })),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
  doc: vi.fn((db, col, id) => ({ path: `${col}/${id}` })),
  updateDoc: vi.fn(async () => {}),
}));

describe('Prompt 15 / FAIL-08 — Navigation complète du tutoriel interactif', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche data-testid="tutorial-step-indicator" et data-testid="tutorial-next-button"', () => {
    render(
      <InteractiveTutorial
        isOpen={true}
        currentStep={0}
        t={(k, def) => (translations.FR && translations.FR[k]) || def || k}
        currentLang="FR"
      />
    );

    const indicator = screen.getByTestId('tutorial-step-indicator');
    expect(indicator).toBeDefined();
    expect(indicator.textContent).toBe('Étape 1 sur 6');

    const nextBtn = screen.getByTestId('tutorial-next-button');
    expect(nextBtn).toBeDefined();
  });

  it('progresse à travers les 6 étapes via clic successif sur data-testid="tutorial-next-button"', () => {
    const onNextMock = vi.fn();
    const onCompleteMock = vi.fn();
    const profile = { uid: 'user_tut_test' };

    render(
      <InteractiveTutorial
        isOpen={true}
        currentStep={0}
        onNext={onNextMock}
        onComplete={onCompleteMock}
        profile={profile}
        t={(k, def) => (translations.FR && translations.FR[k]) || def || k}
        currentLang="FR"
      />
    );

    const indicator = screen.getByTestId('tutorial-step-indicator');
    const nextBtn = screen.getByTestId('tutorial-next-button');

    // Étape 1 : Bienvenue
    expect(indicator.textContent).toBe('Étape 1 sur 6');

    // Clic 1 -> Étape 2 (Explorer)
    fireEvent.click(nextBtn);
    expect(indicator.textContent).toBe('Étape 2 sur 6');
    expect(onNextMock).toHaveBeenCalledTimes(1);

    // Clic 2 -> Étape 3 (Négocier)
    fireEvent.click(nextBtn);
    expect(indicator.textContent).toBe('Étape 3 sur 6');
    expect(onNextMock).toHaveBeenCalledTimes(2);

    // Clic 3 -> Étape 4 (Publier)
    fireEvent.click(nextBtn);
    expect(indicator.textContent).toBe('Étape 4 sur 6');
    expect(onNextMock).toHaveBeenCalledTimes(3);

    // Clic 4 -> Étape 5 (Portefeuille)
    fireEvent.click(nextBtn);
    expect(indicator.textContent).toBe('Étape 5 sur 6');
    expect(onNextMock).toHaveBeenCalledTimes(4);

    // Clic 5 -> Étape 6 (Prêt !)
    fireEvent.click(nextBtn);
    expect(indicator.textContent).toBe('Étape 6 sur 6');
    expect(onNextMock).toHaveBeenCalledTimes(5);

    // Clic 6 sur étape 6 -> Déclenche onComplete
    fireEvent.click(nextBtn);
    expect(onCompleteMock).toHaveBeenCalledWith('user_tut_test');
  });

  it('useTutorial hook incrémente bien currentStep jusqu’à l’étape finale 5 (6 étapes)', () => {
    const { result } = renderHook(() => useTutorial());
    expect(result.current.currentStep).toBe(0);

    act(() => { result.current.nextStep(); }); // step 1
    expect(result.current.currentStep).toBe(1);

    act(() => { result.current.nextStep(); }); // step 2
    expect(result.current.currentStep).toBe(2);

    act(() => { result.current.nextStep(); }); // step 3
    expect(result.current.currentStep).toBe(3);

    act(() => { result.current.nextStep(); }); // step 4
    expect(result.current.currentStep).toBe(4);

    act(() => { result.current.nextStep(); }); // step 5 (6e étape)
    expect(result.current.currentStep).toBe(5);

    // Ne dépasse pas 5
    act(() => { result.current.nextStep(); });
    expect(result.current.currentStep).toBe(5);
  });

  it('ProfileFeature affiche le bouton Revoir le tutoriel qui appelle handleReplayTutorial', () => {
    const replayMock = vi.fn();
    render(
      <ProfileFeature
        profile={{ uid: 'user_replay_test', name: 'Alexandre Troco', euroBalance: 50, trocoTokens: 10 }}
        handleReplayTutorial={replayMock}
        t={(k, def) => def || k}
        currentLang="FR"
      />
    );

    const replayBtn = screen.getByTestId('profile-replay-tutorial-button');
    expect(replayBtn).toBeDefined();
    expect(screen.getByText(/Revoir le tutoriel/i)).toBeDefined();

    fireEvent.click(replayBtn);
    expect(replayMock).toHaveBeenCalledTimes(1);
  });
});
