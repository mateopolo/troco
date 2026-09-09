import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import CookieBanner from './CookieBanner';

describe('Phase 130 : Restauration de la Bannière Cookies (Commit e8869bd) & Injection Premier Plan via Portal', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('1. CookieBanner se monte dans document.body via createPortal', () => {
    render(<CookieBanner onOpenPrivacyCenter={jest.fn()} />);

    act(() => {
      jest.advanceTimersByTime(1200);
    });

    // Recherche de l'overlay dans document.body
    const overlay = document.body.querySelector('.fixed.inset-0.z-\\[9999999\\]');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveClass('fixed', 'inset-0', 'flex', 'items-center', 'justify-center');
  });

  test('2. La carte de la modale respecte les classes demandées (max-w-lg, rounded-3xl, shadow-2xl)', () => {
    render(<CookieBanner onOpenPrivacyCenter={jest.fn()} />);

    act(() => {
      jest.advanceTimersByTime(1200);
    });

    const card = document.body.querySelector('.relative.w-full.max-w-lg');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('rounded-3xl', 'shadow-2xl', 'flex', 'flex-col', 'items-center', 'text-center');
  });

  test('3. Les boutons sont centrés en flex-col md:flex-row avec rounded-full', () => {
    render(<CookieBanner onOpenPrivacyCenter={jest.fn()} />);

    act(() => {
      jest.advanceTimersByTime(1200);
    });

    const acceptBtn = screen.getByText('Tout accepter');
    expect(acceptBtn).toBeInTheDocument();
    expect(acceptBtn).toHaveClass('rounded-full', 'font-semibold');

    const buttonsContainer = acceptBtn.parentElement;
    expect(buttonsContainer).toHaveClass('flex', 'flex-col', 'md:flex-row', 'items-center', 'justify-center', 'w-full');

    const declineBtn = screen.getByText('Décliner');
    expect(declineBtn).toBeInTheDocument();
    expect(declineBtn).toHaveClass('rounded-full', 'font-semibold');

    const customizeBtn = screen.getByRole('button', { name: /personnaliser/i });
    expect(customizeBtn).toBeInTheDocument();
    expect(customizeBtn).toHaveClass('rounded-full', 'font-semibold');
  });

  test('4. Clic sur Tout accepter enregistre le consentement et ferme la modale', () => {
    render(<CookieBanner onOpenPrivacyCenter={jest.fn()} />);

    act(() => {
      jest.advanceTimersByTime(1200);
    });

    const acceptBtn = screen.getByText('Tout accepter');
    fireEvent.click(acceptBtn);

    expect(localStorage.getItem('troco_cookie_consent')).toBe('accepted');
    expect(screen.queryByText('Tout accepter')).not.toBeInTheDocument();
  });

  test('5. Clic sur Décliner enregistre le refus et ferme la modale', () => {
    render(<CookieBanner onOpenPrivacyCenter={jest.fn()} />);

    act(() => {
      jest.advanceTimersByTime(1200);
    });

    const declineBtn = screen.getByText('Décliner');
    fireEvent.click(declineBtn);

    expect(localStorage.getItem('troco_cookie_consent')).toBe('declined');
    expect(screen.queryByText('Décliner')).not.toBeInTheDocument();
  });
});
